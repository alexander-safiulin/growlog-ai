/** Map catalog source `license` strings to i18n keys (locale-aware via `t`). */
export function catalogSourceLicenseText(license: string, t: (key: string) => string): string {
  const norm = license.trim().toLowerCase();

  const pick = (key: string) => {
    const full = `nutrient.sources.licenses.${key}`;
    const translated = t(full);
    return translated === full ? license : translated;
  };

  if (norm.includes('third-party, attribution')) return pick('thirdPartyAttribution');
  if (norm.startsWith('cc-by-sa')) return pick('ccBySaGrowlog');
  if (norm.includes('manufacturer published label/chart')) return pick('manufacturerLabelChart');
  if (norm.includes('facts transcribed independently')) return pick('factsTranscribed');
  if (norm.includes('manufacturer tds')) return pick('manufacturerTds');
  if (norm.includes('retailer copies marked medium trust')) return pick('manufacturerLabelRetailer');
  if (norm.includes('authorized distributor page')) return pick('manufacturerDistributor');
  if (norm.includes('partial composition flagged')) return pick('manufacturerPartial');
  if (norm.includes('no guaranteed analysis imported')) return pick('manufacturerNoGuaranteedAnalysis');
  if (norm.includes('verify a/b split')) return pick('manufacturerAbSplit');
  if (norm.includes('manufacturer site') || norm.includes('manufacturer label')) {
    return pick('manufacturerGeneric');
  }

  return license;
}

export function shortenSourceUrl(url: string, maxLen = 48): string {
  if (url.length <= maxLen) return url;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.length > 1 ? u.pathname : '';
    const compact = `${host}${path}`;
    if (compact.length <= maxLen) return compact;
    const keep = Math.max(8, Math.floor((maxLen - 1) / 2));
    return `${compact.slice(0, keep)}…${compact.slice(-keep)}`;
  } catch {
    const keep = Math.max(8, Math.floor((maxLen - 1) / 2));
    return `${url.slice(0, keep)}…${url.slice(-keep)}`;
  }
}
