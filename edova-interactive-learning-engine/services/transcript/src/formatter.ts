import type { Transcript } from './types';

/** Formats a duration in seconds as HH:MM:SS.mmm. */
export function formatClockTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const wholeSeconds = Math.floor(seconds);
  const millis = Math.round((seconds - wholeSeconds) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(wholeSeconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/** Renders a validated transcript as a human-readable Markdown document. */
export function formatTranscriptAsMarkdown(transcript: Transcript): string {
  const { metadata, segments } = transcript;
  const lines: string[] = [];

  lines.push(`# Transcript — ${metadata.sourceFile}`);
  lines.push('');
  lines.push(`- **Duration:** ${formatClockTime(metadata.durationSeconds)}`);
  lines.push(`- **Segments:** ${metadata.segmentCount}`);
  lines.push(`- **Provider:** ${metadata.provider}`);
  lines.push(`- **Generated:** ${metadata.generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const segment of segments) {
    lines.push(`**[${segment.startTime} – ${segment.endTime}] ${segment.speaker}:**  `);
    lines.push(segment.text);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
