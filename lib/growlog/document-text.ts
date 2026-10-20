import { inflateSync } from 'node:zlib';

export function extractDocumentText(bytes: Buffer, mime: string): string {
  const kind = mime.toLowerCase();
  if (kind.startsWith('text/') || kind === 'application/json' || kind === 'text/markdown') {
    return bytes.toString('utf8').trim();
  }
  if (kind === 'application/pdf' || bytes.subarray(0, 5).toString('utf8') === '%PDF-') {
    return extractPdfText(bytes);
  }
  return '';
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function textFromPdfBytes(data: Buffer): string {
  const src = data.toString('latin1');
  const parts: string[] = [];
  const re = /\((?:\\\)|\\.|[^)]){2,}\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    const literal = match[0].slice(1, match[0].lastIndexOf(')'));
    const text = decodePdfLiteral(literal).trim();
    if (text) parts.push(text);
  }
  return parts.join('\n').trim();
}

function extractPdfText(bytes: Buffer): string {
  const direct = textFromPdfBytes(bytes);
  if (direct.length > 40) return direct;

  const src = bytes.toString('latin1');
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(src)) !== null) {
    const raw = Buffer.from(match[1] ?? '', 'latin1');
    try {
      const inflated = inflateSync(raw);
      const text = textFromPdfBytes(inflated);
      if (text) parts.push(text);
    } catch {
      const plain = textFromPdfBytes(raw);
      if (plain) parts.push(plain);
    }
  }
  return parts.join('\n').trim();
}
