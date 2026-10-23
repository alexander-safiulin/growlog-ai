/** Dev/internal terms that must not appear in grower-facing help (outside «Для любопытных»). */
export const NUTRIENT_HELP_BANNED_PATTERNS: RegExp[] = [
  /@growlog/i,
  /nutrient-calc/i,
  /ADR-\d+/i,
  /в коде/i,
  /коды из/i,
  /\bMAX_MACRO/i,
  /\bseed\b/i,
  /\btrace\b/i,
  /\bRMS\b/i,
  /стабильный порядок каталога/i,
  /forward/i,
  /best effort/i,
  /\bbadge\b/i,
  /\blegacy\b/i,
  /\bgolden\b/i,
  /Supabase/i,
  /\bGPL\b/i,
  /HydroBuddy/i,
  /\bNNLS\b/i,
  /другой оптимизатор/i,
  /LMCv2/i,
  /0[,.]7025/,
  /ion pairing/i,
  /без «магии» на сервере/i,
  /grow cycle/i,
  /\bfeeding\b/i,
  /\bmatch\b/i,
  /\bProvenance\b/i,
  /\bprovenance\b/i,
  /forward-решатель/i,
  /\bhigh\b|\bmedium\b|\blow\b|\bunverified\b/i,
  /net-цел/i,
  /матриц/i,
  /оптимизатор/i,
  /регрессионн/i,
  /побитов/i,
  /water_exceeds_target/i,
  /target_clamped_zero/i,
  /_[a-z]+:[A-Za-z0-9_]+/i,
];

/** Allowed only inside curious collapsible blocks. */
export const NUTRIENT_HELP_CURIOUS_ONLY_FRAGMENTS = [
  'многостартовый поиск',
  'проекционный градиентный спуск',
  'симплекс Нелдера',
  'Нелдера–Мида',
  'доводка по сетке 0,001',
  'модель EC с ионной силой',
  'решатель',
];

export function findBannedTermsInGrowerText(text: string): string[] {
  const hits: string[] = [];
  for (const re of NUTRIENT_HELP_BANNED_PATTERNS) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}
