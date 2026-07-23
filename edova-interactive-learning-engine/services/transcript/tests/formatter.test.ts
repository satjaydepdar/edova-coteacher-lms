import { describe, expect, it } from 'vitest';
import { formatClockTime, formatTranscriptAsMarkdown } from '../src/formatter';
import type { Transcript } from '../src/types';

describe('formatClockTime', () => {
  it('formats sub-minute durations', () => {
    expect(formatClockTime(0)).toBe('00:00:00.000');
    expect(formatClockTime(4.5)).toBe('00:00:04.500');
  });

  it('formats durations that cross minute and hour boundaries', () => {
    expect(formatClockTime(65)).toBe('00:01:05.000');
    expect(formatClockTime(3661.25)).toBe('01:01:01.250');
  });

  it('clamps negative input to zero', () => {
    expect(formatClockTime(-5)).toBe('00:00:00.000');
  });
});

describe('formatTranscriptAsMarkdown', () => {
  const transcript: Transcript = {
    metadata: {
      sourceFile: 'sample.mp4',
      durationSeconds: 6,
      segmentCount: 2,
      provider: 'test-provider',
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
    segments: [
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
    ],
  };

  it('includes metadata, timestamps, and segment text', () => {
    const markdown = formatTranscriptAsMarkdown(transcript);

    expect(markdown).toContain('# Transcript — sample.mp4');
    expect(markdown).toContain('- **Segments:** 2');
    expect(markdown).toContain('[00:00:00.000 – 00:00:03.000] narrator:');
    expect(markdown).toContain('Rivers shape the land.');
    expect(markdown).toContain('But today we measure one.');
  });
});
