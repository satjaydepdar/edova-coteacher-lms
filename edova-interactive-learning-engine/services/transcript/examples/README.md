# Examples

`sample-transcript.json` and `sample-transcript.md` are hand-authored examples
showing the exact shape produced by the service — they illustrate the schema
and formatting, they are not generated from a real video.

To produce real output, run the CLI against any local MP4:

```bash
cd services/transcript
npm install
npm run transcript -- /path/to/your-video.mp4
```

This repository already contains a sample lesson video you can point at for a
quick smoke test (read-only — do not modify or move it):

```bash
npm run transcript -- "../../lessons/decoding-river-width/assets/explainer-video- decoding-river_width.mp4"
```

Results are written to `services/transcript/output/transcript.json` and
`services/transcript/output/transcript.md`.
