import { z } from 'zod';
import type { Transcript } from './types';

export const TranscriptSegmentSchema = z.object({
  id: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().nonnegative(),
  speaker: z.string().min(1),
  text: z.string().min(1),
});

export const TranscriptMetadataSchema = z.object({
  sourceFile: z.string().min(1),
  durationSeconds: z.number().nonnegative(),
  segmentCount: z.number().int().nonnegative(),
  provider: z.string().min(1),
  generatedAt: z.string().min(1),
});

export const TranscriptSchema = z.object({
  metadata: TranscriptMetadataSchema,
  segments: z.array(TranscriptSegmentSchema),
});

export class TranscriptValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Transcript validation failed:\n- ${issues.join('\n- ')}`);
    this.name = 'TranscriptValidationError';
  }
}

/**
 * Validates transcript shape and content rules: increasing timestamps, no
 * overlaps, no empty text, and JSON-serializability. Throws
 * TranscriptValidationError with every issue found (not just the first).
 */
export function validateTranscript(transcript: Transcript): Transcript {
  const structural = TranscriptSchema.safeParse(transcript);
  if (!structural.success) {
    const issues = structural.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new TranscriptValidationError(issues);
  }

  const issues: string[] = [];
  const { segments } = structural.data;

  segments.forEach((segment, index) => {
    if (segment.endSeconds <= segment.startSeconds) {
      issues.push(
        `segment ${segment.id} (index ${index}): endSeconds must be greater than startSeconds`,
      );
    }
    if (!segment.text.trim()) {
      issues.push(`segment ${segment.id} (index ${index}): text must not be empty`);
    }

    const previous = segments[index - 1];
    if (previous) {
      if (segment.startSeconds < previous.startSeconds) {
        issues.push(
          `segment ${segment.id} (index ${index}): timestamps are not increasing relative to previous segment ${previous.id}`,
        );
      } else if (segment.startSeconds < previous.endSeconds) {
        issues.push(
          `segment ${segment.id} (index ${index}): overlaps with previous segment ${previous.id}`,
        );
      }
    }
  });

  try {
    JSON.parse(JSON.stringify(structural.data));
  } catch (error) {
    issues.push(`transcript is not valid JSON: ${(error as Error).message}`);
  }

  if (issues.length > 0) {
    throw new TranscriptValidationError(issues);
  }

  return structural.data;
}
