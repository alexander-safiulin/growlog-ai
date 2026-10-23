import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Resolve deploy build id for update banner (Coolify / Docker / local). */
export function resolveAppBuildId(): string {
  const fromEnv =
    process.env.BUILD_ID?.trim() ||
    process.env.SOURCE_COMMIT?.trim() ||
    process.env.COOLIFY_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_BUILD_ID?.trim();
  if (fromEnv) return fromEnv;

  const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
  if (existsSync(buildIdPath)) {
    const fileId = readFileSync(buildIdPath, 'utf8').trim();
    if (fileId) return fileId;
  }

  if (process.env.NODE_ENV === 'development') return 'development';
  return 'unknown-build';
}
