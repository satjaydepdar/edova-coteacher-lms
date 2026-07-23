# Transcript Extraction Service

Converts a local MP4 video into a clean, timestamped transcript
(`transcript.json` + `transcript.md`). This is Sprint 2 / Task 2.1 of the
Edova pipeline. It does **not** perform scene detection, concept extraction,
curriculum mapping, interaction planning, question generation, or lesson
packaging — those are separate downstream services.

## Pipeline

```
MP4 video
  -> extract mono audio (ffmpeg)
  -> transcribe audio (pluggable TranscriptionProvider, default: OpenAI Whisper API)
  -> clean transcription artifacts + split into sentence-level segments
  -> validate (timestamps, overlaps, empty text, JSON shape)
  -> write output/transcript.json + output/transcript.md
```

## Installation

```bash
cd services/transcript
npm install
```

FFmpeg does not need to be installed separately — `ffmpeg-static` bundles a
platform binary. Set `FFMPEG_PATH` (see below) to use a different one.

## Configuration

Copy `.env.example` to `.env` and fill in real values (`.env` is gitignored):

```bash
cp .env.example .env
```

### Environment variables

| Variable                | Default      | Description                                                                 |
| ------------------------ | ------------ | ----------------------------------------------------------------------------- |
| `TRANSCRIPTION_PROVIDER` | `openai`     | `openai` or `whisper-cpp` (whisper-cpp is a scaffolded extension point, not yet implemented). |
| `OPENAI_API_KEY`         | —            | Required when `TRANSCRIPTION_PROVIDER=openai`.                                |
| `WHISPER_MODEL`          | `whisper-1`  | OpenAI Whisper model name.                                                    |
| `WHISPER_CPP_BINARY`     | —            | Reserved for the future Whisper.cpp provider.                                 |
| `WHISPER_CPP_MODEL`      | —            | Reserved for the future Whisper.cpp provider.                                 |
| `FFMPEG_PATH`            | bundled path | Override the ffmpeg binary used for audio extraction.                         |
| `AUDIO_SAMPLE_RATE`      | `16000`      | Sample rate (Hz) of the mono WAV extracted for transcription.                 |
| `OUTPUT_DIR`             | `output`     | Output directory (relative to cwd unless absolute), overridable via `--output`. |
| `DEFAULT_SPEAKER`        | `narrator`   | Speaker label applied to every segment, overridable via `--speaker`.          |

Config is parsed and validated with Zod (`src/config.ts`) — invalid or
missing required values fail fast with a descriptive error.

## CLI usage

```bash
npm run transcript -- assets/video.mp4
```

> npm requires `--` to forward arguments to the underlying script.

Options:

```bash
npm run transcript -- <video.mp4> [-o|--output <dir>] [-s|--speaker <name>] [--keep-audio]
```

- `-o, --output <dir>` — output directory (default: `OUTPUT_DIR`, i.e. `services/transcript/output`)
- `-s, --speaker <name>` — speaker label for every segment (default: `narrator`)
- `--keep-audio` — keep the intermediate extracted `.wav` instead of deleting it

For a compiled/production build:

```bash
npm run build
node dist/cli.js assets/video.mp4
```

## Output format

Written to `services/transcript/output/` (or `--output <dir>`).

### `transcript.json`

```json
{
  "metadata": {
    "sourceFile": "video.mp4",
    "durationSeconds": 9.8,
    "segmentCount": 3,
    "provider": "openai-whisper",
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "segments": [
    {
      "id": "seg-0001",
      "startTime": "00:00:00.000",
      "endTime": "00:00:03.200",
      "startSeconds": 0,
      "endSeconds": 3.2,
      "speaker": "narrator",
      "text": "Rivers shape the land in ways we rarely notice."
    }
  ]
}
```

Each segment has `id`, `startTime`/`endTime` (human-readable `HH:MM:SS.mmm`),
`startSeconds`/`endSeconds` (numeric, for programmatic use), `speaker`
(defaults to `narrator`), and `text`.

### `transcript.md`

A human-readable Markdown rendering with a metadata header followed by one
`[start – end] speaker:` block per segment. See `examples/sample-transcript.md`
for a full example.

## Validation

Every transcript is validated (`src/validator.ts`, Zod-backed) before any
file is written:

- Segment `endSeconds` must be greater than `startSeconds`
- Timestamps must be non-decreasing across segments, and segments must not overlap
- `text` must not be empty (or whitespace-only)
- The result must be valid, serializable JSON

Validation failures raise a `TranscriptValidationError` listing every issue
found (not just the first), and no files are written.

## Error handling

- Missing/unreadable video file -> descriptive error before any audio extraction is attempted
- `ffmpeg` failure (bad codec, corrupt file, etc.) -> error includes the tail of ffmpeg's stderr
- Missing `OPENAI_API_KEY` with `TRANSCRIPTION_PROVIDER=openai` -> fails at config/provider resolution, before touching the video
- Provider transcription failure -> propagated as-is from the provider
- Validation failure -> `TranscriptValidationError` with a full issue list; no partial output is written
- The CLI catches all of the above, prints a message to stderr, and exits with a non-zero code

## Testing

```bash
npm test
```

Unit tests (`tests/`) cover:

- `cleanText` / `splitIntoSentenceSegments` / `buildTranscript` (`extract.test.ts`) using a sample raw provider fixture (`tests/fixtures/sample-raw-segments.json`)
- `formatClockTime` / `formatTranscriptAsMarkdown` (`formatter.test.ts`)
- `validateTranscript` — valid input, overlaps, non-increasing timestamps, empty text, zero-length segments (`validator.test.ts`)

Tests are pure/offline — they do not call ffmpeg or the OpenAI API.

## Extension points

- **New transcription providers**: implement the `TranscriptionProvider`
  interface (`src/types.ts`) — `{ name, transcribe(audioFilePath) }` — and
  either pass an instance via `runTranscriptExtraction({ provider })` or wire
  it into `resolveProvider` in `src/index.ts`. `WhisperCppProvider`
  (`src/extract.ts`) is a scaffolded-but-unimplemented example for local
  Whisper.cpp support.
- **Programmatic use**: `import { runTranscriptExtraction } from '@edova/transcript-service'`
  runs the full pipeline and returns `{ transcript, jsonPath, markdownPath, audioPath }`.
- **Segmentation/cleaning tuning**: `cleanText` and `splitIntoSentenceSegments`
  (`src/extract.ts`) are pure functions, independently testable and
  replaceable without touching audio extraction or file I/O.

## Directory structure

```
services/transcript/
    README.md
    package.json
    tsconfig.json
    .gitignore
    src/
        index.ts       # public API + pipeline orchestration
        cli.ts          # CLI entrypoint
        config.ts       # env var loading/validation (Zod)
        types.ts        # shared types + TranscriptionProvider interface
        extract.ts       # ffmpeg audio extraction, providers, cleaning/segmentation
        formatter.ts     # timestamp formatting + Markdown rendering
        validator.ts     # transcript validation (Zod + rule checks)
    tests/
    examples/
    output/
```
