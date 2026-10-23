/** True when `remote` is a higher semver than `installed` (major.minor.patch). */
export function semverGreaterThan(remote: string, installed: string): boolean {
  const parse = (v: string) =>
    v
      .split('.')
      .map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ''), 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const a = parse(remote);
  const b = parse(installed);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return false;
}
