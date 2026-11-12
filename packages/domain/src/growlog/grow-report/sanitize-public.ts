const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function sanitizePublicReportText(input: string): string {
  return input.replace(UUID_RE, '[…]').replace(/\bfarm_id\b/gi, 'project');
}
