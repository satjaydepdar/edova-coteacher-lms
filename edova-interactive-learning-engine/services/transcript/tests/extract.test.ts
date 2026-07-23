import { describe, expect, it } from 'vitest';
import { buildTranscript, cleanText, splitIntoSentenceSegments } from '../src/extract';
import rawFixture from './fixtures/sample-raw-segments.json';
import type { RawWhisperSegment } from '../src/types';

describe('cleanText', () => {
  it('strips bracketed and parenthesized non-speech tags', () => {
    expect(cleanText('[Music]  Hello   world  ')).toBe('Hello world');
    expect(cleanText('Wait (background noise) really?')).toBe('Wait really?');
  });

  it('removes stray whitespace before punctuation', () => {
    expect(cleanText('Hello , world .')).toBe('Hello, world.');
  });

  it('returns an empty string for input that is entirely non-speech', () => {
    expect(cleanText('[Music]')).toBe('');
  });
});

describe('splitIntoSentenceSegments', () => {
  it('splits a multi-sentence raw segment into separate, non-overlapping sentence segments', () => {
    const result = splitIntoSentenceSegments([
      { start: 0, end: 6, text: 'Rivers shape the land. But today we measure one.' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Rivers shape the land.');
    expect(result[1].text).toBe('But today we measure one.');
    expect(result[0].start).toBe(0);
    expect(result[1].end).toBe(6);
    expect(result[1].start).toBeGreaterThanOrEqual(result[0].end);
  });

  it('keeps single-sentence segments intact', () => {
    const result = splitIntoSentenceSegments([{ start: 1, end: 3, text: 'Just one sentence.' }]);
    expect(result).toEqual([{ start: 1, end: 3, text: 'Just one sentence.' }]);
  });

  it('drops raw segments that clean to empty text', () => {
    const result = splitIntoSentenceSegments([{ start: 0, end: 1, text: '[Music]' }]);
    expect(result).toHaveLength(0);
  });
});

describe('buildTranscript', () => {
  it('produces sequential ids, default speaker, and formatted timestamps from raw fixture data', () => {
    const transcript = buildTranscript(
      { segments: rawFixture as RawWhisperSegment[] },
      { sourceFile: 'sample.mp4', provider: 'test-provider', speaker: 'narrator' },
    );

    expect(transcript.metadata.sourceFile).toBe('sample.mp4');
    expect(transcript.metadata.provider).toBe('test-provider');
    expect(transcript.metadata.segmentCount).toBe(transcript.segments.length);
    expect(transcript.segments.length).toBeGreaterThan(0);

    transcript.segments.forEach((segment, index) => {
      expect(segment.id).toBe(`seg-${String(index + 1).padStart(4, '0')}`);
      expect(segment.speaker).toBe('narrator');
      expect(segment.text.length).toBeGreaterThan(0);
      expect(segment.startTime).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
      expect(segment.endSeconds).toBeGreaterThan(segment.startSeconds);
    });

    for (let i = 1; i < transcript.segments.length; i += 1) {
      expect(transcript.segments[i].startSeconds).toBeGreaterThanOrEqual(
        transcript.segments[i - 1].endSeconds,
      );
    }
  });
});
