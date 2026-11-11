function isGoogleAuthCallback(path: string): boolean {
  const value = path.toLowerCase();
  return (
    value.includes('googleusercontent') ||
    value.includes('oauth2callback') ||
    value.includes('oauth2redirect')
  );
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    if (isGoogleAuthCallback(path)) return null;
    return path;
  } catch {
    return path;
  }
}
