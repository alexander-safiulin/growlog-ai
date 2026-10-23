import { resolveAppBuildId } from '@/lib/growlog/resolve-app-build-id';
import type { NextApiRequest, NextApiResponse } from 'next';

export type AppBuildPayload = {
  buildId: string;
  builtAt: string | null;
};

export default function handler(_req: NextApiRequest, res: NextApiResponse<AppBuildPayload>) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    buildId: resolveAppBuildId(),
    builtAt: process.env.BUILD_TIMESTAMP ?? null,
  });
}
