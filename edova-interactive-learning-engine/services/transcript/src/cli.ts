#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { getConfig } from './config';
import { runTranscriptExtraction } from './index';

interface CliOptions {
  output?: string;
  speaker?: string;
  keepAudio?: boolean;
}

const program = new Command();

program
  .name('transcript')
  .description('Extract a clean, timestamped transcript from a local MP4 video.')
  .argument('<video>', 'path to a local MP4 video file')
  .option('-o, --output <dir>', 'output directory for transcript.json and transcript.md')
  .option('-s, --speaker <name>', 'speaker label applied to every segment (default: narrator)')
  .option('--keep-audio', 'keep the intermediate extracted audio file', false)
  .action(async (video: string, opts: CliOptions) => {
    try {
      const config = getConfig();
      const result = await runTranscriptExtraction(
        {
          videoPath: path.resolve(process.cwd(), video),
          outputDir: opts.output ? path.resolve(process.cwd(), opts.output) : undefined,
          speaker: opts.speaker,
          keepAudio: opts.keepAudio,
        },
        config,
      );

      console.log(`Wrote ${result.transcript.segments.length} segment(s)`);
      console.log(`  JSON:     ${result.jsonPath}`);
      console.log(`  Markdown: ${result.markdownPath}`);
    } catch (error) {
      console.error('Transcript extraction failed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
