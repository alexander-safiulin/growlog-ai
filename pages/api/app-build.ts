import type { NextApiRequest, NextApiResponse } from 'next';

export type AppBuildPayload = {
  buildId: string;
  builtAt: string | null;
};

export default function handler(_req: NextApiRequest, res: NextApiResponse<AppBuildPayload>) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    buildId: process.env.BUILD_ID ?? process.env.NEXT_PUBLIC_BUILD_ID ?? 'development',
    builtAt: process.env.BUILD_TIMESTAMP ?? null,
  });
}
