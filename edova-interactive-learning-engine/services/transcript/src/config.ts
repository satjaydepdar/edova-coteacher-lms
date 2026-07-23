import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const EnvSchema = z.object({
  TRANSCRIPTION_PROVIDER: z.enum(['openai', 'whisper-cpp']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  WHISPER_MODEL: z.string().default('whisper-1'),
  WHISPER_CPP_BINARY: z.string().optional(),
  WHISPER_CPP_MODEL: z.string().optional(),
  FFMPEG_PATH: z.string().optional(),
  AUDIO_SAMPLE_RATE: z.coerce.number().int().positive().default(16000),
  OUTPUT_DIR: z.string().default('output'),
  DEFAULT_SPEAKER: z.string().default('narrator'),
});

export type Config = z.infer<typeof EnvSchema>;

let cachedConfig: Config | undefined;

/** Parses and validates env vars. Pass overrides for tests or programmatic use. */
export function loadConfig(overrides: Record<string, string | undefined> = {}): Config {
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid transcript service configuration: ${details}`);
  }

  if (parsed.data.TRANSCRIPTION_PROVIDER === 'openai' && !parsed.data.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when TRANSCRIPTION_PROVIDER=openai');
  }

  cachedConfig = parsed.data;
  return parsed.data;
}

/** Returns the cached config, loading it from process.env on first access. */
export function getConfig(): Config {
  return cachedConfig ?? loadConfig();
}

/** Test/programmatic helper to force a reload on next getConfig() call. */
export function resetConfigCache(): void {
  cachedConfig = undefined;
}
