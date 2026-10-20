import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const openai = new OpenAI({ apiKey: key });
  const input = text.trim().slice(0, 8000);
  if (!input) return null;
  const res = await openai.embeddings.create({ model: MODEL, input });
  return res.data[0]?.embedding ?? null;
}
