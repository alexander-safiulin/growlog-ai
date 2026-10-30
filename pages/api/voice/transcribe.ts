import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI, { toFile } from 'openai';
import { getUserFromBearer } from '@/lib/api/auth-from-request';
import { isBlankTranscript } from '@/lib/voice/detect-audio-format';
import { prepareTranscribeInput } from '@/lib/voice/prepare-transcribe-input';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'openai_not_configured' });
    }

    const { user, error: authError } = await getUserFromBearer(req);
    if (!user || authError) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const prepared = prepareTranscribeInput(req.body ?? {});
    if (!prepared.ok) {
      const status =
        prepared.error === 'audio_too_large' ? 413 : prepared.error === 'audio_too_short' ? 400 : 400;
      return res.status(status).json({ error: prepared.error });
    }

    let file: Awaited<ReturnType<typeof toFile>>;
    try {
      file = await toFile(Buffer.from(prepared.bytes), `recording.${prepared.ext}`, {
        type: prepared.fileType,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'invalid_audio';
      return res.status(400).json({ error: 'invalid_audio', detail: msg });
    }

    try {
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: prepared.language,
      });
      const text = transcription.text?.trim() ?? '';
      if (!text || isBlankTranscript(text)) {
        return res.status(422).json({ error: 'empty_transcription' });
      }
      return res.status(200).json({ text });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'transcription_failed';
      const lower = msg.toLowerCase();
      console.error('[voice.transcribe]', {
        ext: prepared.ext,
        bytes: prepared.bytes.length,
        error: msg,
      });
      if (lower.includes('too short')) {
        return res.status(400).json({ error: 'audio_too_short', detail: msg });
      }
      if (lower.includes('invalid file format') || lower.includes('unsupported')) {
        return res.status(400).json({ error: 'invalid_audio', detail: msg });
      }
      return res.status(502).json({ error: 'transcription_failed', detail: msg });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
