import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import OpenAI, { toFile } from 'openai';
import type { Config } from './config';
import { formatClockTime } from './formatter';
import type {
  RawTranscriptionResult,
  RawWhisperSegment,
  Transcript,
  TranscriptSegment,
  TranscriptionProvider,
} from './types';

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z0-9"'])/;
const NON_SPEECH_TAG = /\[[^\]]*\]|\([^)]*\)/g;

/** Resolves the ffmpeg binary to invoke, preferring an explicit override. */
export function resolveFfmpegPath(config: Pick<Config, 'FFMPEG_PATH'>): string {
  if (config.FFMPEG_PATH) return config.FFMPEG_PATH;
  if (!ffmpegStatic) {
    throw new Error('Unable to resolve an ffmpeg binary. Set FFMPEG_PATH or reinstall ffmpeg-static.');
  }
  return ffmpegStatic;
}

export interface ExtractAudioOptions {
  ffmpegPath: string;
  sampleRate: number;
  workDir?: string;
}

/** Extracts mono PCM WAV audio from a video file into a temp file, returning its path. */
export async function extractAudio(videoPath: string, options: ExtractAudioOptions): Promise<string> {
  try {
    await fs.access(videoPath);
  } catch {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const workDir = options.workDir ?? os.tmpdir();
  const audioPath = path.join(workDir, `transcript-audio-${randomUUID()}.wav`);

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(options.ffmpegPath, [
      '-y',
      '-i', videoPath,
      '-vn',
      '-ac', '1',
      '-ar', String(options.sampleRate),
      '-f', 'wav',
      audioPath,
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });

  return audioPath;
}

/** Transcription provider backed by the OpenAI Whisper API. */
export class OpenAIWhisperProvider implements TranscriptionProvider {
  readonly name = 'openai-whisper';
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'whisper-1') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async transcribe(audioFilePath: string): Promise<RawTranscriptionResult> {
    const buffer = await fs.readFile(audioFilePath);
    const response = await this.client.audio.transcriptions.create({
      file: await toFile(buffer, path.basename(audioFilePath)),
      model: this.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // The SDK's verbose_json response includes `segments`, which is not yet
    // reflected in all published type definitions.
    const raw = response as unknown as {
      language?: string;
      duration?: number;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    return {
      language: raw.language,
      durationSeconds: raw.duration,
      segments: (raw.segments ?? []).map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: String(segment.text ?? '').trim(),
      })),
    };
  }
}

/**
 * Extension point for local Whisper.cpp transcription. Implements the same
 * TranscriptionProvider interface as OpenAIWhisperProvider so it can be
 * swapped in via TRANSCRIPTION_PROVIDER=whisper-cpp without any caller
 * changes. Not implemented yet — wire this up to shell out to the
 * whisper.cpp binary and parse its output into RawWhisperSegment[].
 */
export class WhisperCppProvider implements TranscriptionProvider {
  readonly name = 'whisper-cpp';

  constructor(
    private readonly binaryPath?: string,
    private readonly modelPath?: string,
  ) {}

  async transcribe(_audioFilePath: string): Promise<RawTranscriptionResult> {
    throw new Error(
      'WhisperCppProvider is not implemented yet. It is a scaffolded extension point: ' +
        'implement transcribe() to shell out to a local whisper.cpp binary and map its ' +
        'output into RawWhisperSegment[].',
    );
  }
}

/** Strips bracket/paren non-speech annotations and normalizes whitespace/punctuation spacing. */
export function cleanText(rawText: string): string {
  return rawText
    .replace(NON_SPEECH_TAG, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

export interface SentenceSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Splits provider-level (often multi-sentence) segments into sentence-level
 * segments, distributing each raw segment's time range across its sentences
 * proportionally to sentence length.
 */
export function splitIntoSentenceSegments(raw: RawWhisperSegment[]): SentenceSegment[] {
  const result: SentenceSegment[] = [];

  for (const segment of raw) {
    const cleaned = cleanText(segment.text);
    if (!cleaned) continue;

    const sentences = cleaned
      .split(SENTENCE_BOUNDARY)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    if (sentences.length === 0) continue;

    const [onlySentence] = sentences;
    if (sentences.length === 1 && onlySentence !== undefined) {
      result.push({ start: segment.start, end: segment.end, text: onlySentence });
      continue;
    }

    const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    const duration = segment.end - segment.start;
    let cursor = segment.start;

    sentences.forEach((sentence, index) => {
      const share = totalChars > 0 ? sentence.length / totalChars : 1 / sentences.length;
      const isLast = index === sentences.length - 1;
      const start = cursor;
      const end = isLast ? segment.end : Math.min(segment.end, cursor + duration * share);
      result.push({ start, end: Math.max(end, start), text: sentence });
      cursor = end;
    });
  }

  return result;
}

export interface BuildTranscriptMeta {
  sourceFile: string;
  provider: string;
  speaker: string;
}

/** Converts a raw provider transcription into a fully-formed, id-assigned Transcript. */
export function buildTranscript(raw: RawTranscriptionResult, meta: BuildTranscriptMeta): Transcript {
  const sentenceSegments = splitIntoSentenceSegments(raw.segments);

  const segments: TranscriptSegment[] = sentenceSegments.map((sentence, index) => ({
    id: `seg-${String(index + 1).padStart(4, '0')}`,
    startTime: formatClockTime(sentence.start),
    endTime: formatClockTime(sentence.end),
    startSeconds: roundSeconds(sentence.start),
    endSeconds: roundSeconds(sentence.end),
    speaker: meta.speaker,
    text: sentence.text,
  }));

  const lastSegment = segments[segments.length - 1];
  const durationSeconds = lastSegment ? lastSegment.endSeconds : (raw.durationSeconds ?? 0);

  return {
    metadata: {
      sourceFile: meta.sourceFile,
      durationSeconds,
      segmentCount: segments.length,
      provider: meta.provider,
      generatedAt: new Date().toISOString(),
    },
    segments,
  };
}

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}
