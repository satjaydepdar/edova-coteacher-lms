import { describe, expect, it } from 'vitest';
import { TranscriptValidationError, validateTranscript } from '../src/validator';
import type { Transcript, TranscriptSegment } from '../src/types';

function makeTranscript(segments: TranscriptSegment[]): Transcript {
  return {
    metadata: {
      sourceFile: 'sample.mp4',
      durationSeconds: segments[segments.length - 1]?.endSeconds ?? 0,
      segmentCount: segments.length,
      provider: 'test-provider',
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
    segments,
  };
}

const validSegments: TranscriptSegment[] = [
  {
    id: 'seg-0001',
    startTime: '00:00:00.000',
    endTime: '00:00:03.000',
    startSeconds: 0,
    endSeconds: 3,
    speaker: 'narrator',
    text: 'Rivers shape the land.',
  },
  {
    id: 'seg-0002',
    startTime: '00:00:03.000',
    endTime: '00:00:06.000',
    startSeconds: 3,
    endSeconds: 6,
    speaker: 'narrator',
    text: 'But today we measure one.',
  },
];

describe('validateTranscript', () => {
  it('accepts a well-formed transcript', () => {
    expect(() => validateTranscript(makeTranscript(validSegments))).not.toThrow();
  });

  it('rejects overlapping segments', () => {
    const transcript = makeTranscript([
      validSegments[0],
      { ...validSegments[1], startSeconds: 2, startTime: '00:00:02.000' },
    ]);
    expect(() => validateTranscript(transcript)).toThrow(TranscriptValidationError);
  });

  it('rejects non-increasing timestamps', () => {
    const transcript = makeTranscript([validSegments[1], validSegments[0]]);
    expect(() => validateTranscript(transcript)).toThrow(TranscriptValidationError);
  });

  it('rejects empty (whitespace-only) text', () => {
    const transcript = makeTranscript([{ ...validSegments[0], text: '   ' }]);
    expect(() => validateTranscript(transcript)).toThrow(TranscriptValidationError);
  });

  it('rejects a segment whose end is not after its start', () => {
    const transcript = makeTranscript([
      { ...validSegments[0], endSeconds: 0, endTime: '00:00:00.000' },
    ]);
    expect(() => validateTranscript(transcript)).toThrow(TranscriptValidationError);
  });

  it('collects multiple issues in a single error', () => {
    const transcript = makeTranscript([
      { ...validSegments[0], endSeconds: 0, endTime: '00:00:00.000' },
      { ...validSegments[1], text: '   ' },
    ]);

    try {
      validateTranscript(transcript);
      throw new Error('expected validateTranscript to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TranscriptValidationError);
      expect((error as TranscriptValidationError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
