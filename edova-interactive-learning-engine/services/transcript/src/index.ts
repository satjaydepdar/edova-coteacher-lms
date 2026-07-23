import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Config } from './config';
import { getConfig } from './config';
import {
  OpenAIWhisperProvider,
  WhisperCppProvider,
  buildTranscript,
  extractAudio,
  resolveFfmpegPath,
} from './extract';
import { formatTranscriptAsMarkdown } from './formatter';
import type { Transcript, TranscriptionProvider } from './types';
import { validateTranscript } from './validator';

export * from './types';
export {
  TranscriptSchema,
  TranscriptSegmentSchema,
  TranscriptValidationError,
  validateTranscript,
} from './validator';
export { formatClockTime, formatTranscriptAsMarkdown } from './formatter';
export {
  OpenAIWhisperProvider,
  WhisperCppProvider,
  buildTranscript,
  cleanText,
  extractAudio,
  resolveFfmpegPath,
  splitIntoSentenceSegments,
} from './extract';
export { getConfig, loadConfig, resetConfigCache } from './config';
export type { Config } from './config';

export interface RunTranscriptExtractionOptions {
  /** Path to the local MP4 (or any ffmpeg-readable) video file. */
  videoPath: string;
  /** Output directory for transcript.json / transcript.md. Defaults to config.OUTPUT_DIR. */
  outputDir?: string;
  /** Speaker label applied to every segment. Defaults to config.DEFAULT_SPEAKER. */
  speaker?: string;
  /** Keep the intermediate extracted audio file instead of deleting it. */
  keepAudio?: boolean;
  /** Override the transcription provider (mainly for tests/programmatic use). */
  provider?: TranscriptionProvider;
}

export interface RunTranscriptExtractionResult {
  transcript: Transcript;
  jsonPath: string;
  markdownPath: string;
  audioPath: string;
}

function resolveProvider(config: Config, override?: TranscriptionProvider): TranscriptionProvider {
  if (override) return override;

  if (config.TRANSCRIPTION_PROVIDER === 'whisper-cpp') {
    return new WhisperCppProvider(config.WHISPER_CPP_BINARY, config.WHISPER_CPP_MODEL);
  }

  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for the openai transcription provider');
  }
  return new OpenAIWhisperProvider(config.OPENAI_API_KEY, config.WHISPER_MODEL);
}

/**
 * Orchestrates the full pipeline: extract audio -> transcribe -> clean and
 * split into sentence-level segments -> validate -> write transcript.json
 * and transcript.md.
 */
export async function runTranscriptExtraction(
  options: RunTranscriptExtractionOptions,
  config: Config = getConfig(),
): Promise<RunTranscriptExtractionResult> {
  const outputDir = options.outputDir ?? path.resolve(process.cwd(), config.OUTPUT_DIR);
  const speaker = options.speaker ?? config.DEFAULT_SPEAKER;
  const provider = resolveProvider(config, options.provider);
  const ffmpegPath = resolveFfmpegPath(config);

  const audioPath = await extractAudio(options.videoPath, {
    ffmpegPath,
    sampleRate: config.AUDIO_SAMPLE_RATE,
  });

  try {
    const raw = await provider.transcribe(audioPath);
    const transcript = buildTranscript(raw, {
      sourceFile: path.basename(options.videoPath),
      provider: provider.name,
      speaker,
    });

    const validated = validateTranscript(transcript);

    await fs.mkdir(outputDir, { recursive: true });
    const jsonPath = path.join(outputDir, 'transcript.json');
    const markdownPath = path.join(outputDir, 'transcript.md');

    await fs.writeFile(jsonPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');
    await fs.writeFile(markdownPath, formatTranscriptAsMarkdown(validated), 'utf-8');

    return { transcript: validated, jsonPath, markdownPath, audioPath };
  } finally {
    if (!options.keepAudio) {
      await fs.rm(audioPath, { force: true }).catch(() => undefined);
    }
  }
}
