export interface TranscriptSegment {
  id: string;
  startTime: string;
  endTime: string;
  startSeconds: number;
  endSeconds: number;
  speaker: string;
  text: string;
}

export interface TranscriptMetadata {
  sourceFile: string;
  durationSeconds: number;
  segmentCount: number;
  provider: string;
  generatedAt: string;
}

export interface Transcript {
  metadata: TranscriptMetadata;
  segments: TranscriptSegment[];
}

/** A single segment as returned by a transcription provider, before sentence splitting/cleanup. */
export interface RawWhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface RawTranscriptionResult {
  segments: RawWhisperSegment[];
  language?: string;
  durationSeconds?: number;
}

/**
 * Provider abstraction so the transcription backend can be swapped (e.g. OpenAI
 * Whisper API today, local Whisper.cpp later) without touching calling code.
 */
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audioFilePath: string): Promise<RawTranscriptionResult>;
}
