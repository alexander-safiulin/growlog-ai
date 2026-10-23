const SHOW_SI_CL_NA_KEY = 'growlog_nutrient_show_si_cl_na';

export function readShowSiClNaPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SHOW_SI_CL_NA_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeShowSiClNaPreference(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOW_SI_CL_NA_KEY, value ? '1' : '0');
  } catch {
    /* ignore quota */
  }
}
