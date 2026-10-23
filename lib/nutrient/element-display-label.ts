/** User-facing element / ion labels (solver keys unchanged). */
const ELEMENT_LABEL_KEYS: Record<string, string> = {
  N: 'nutrient.elementLabels.N',
  P: 'nutrient.elementLabels.P',
  K: 'nutrient.elementLabels.K',
  Ca: 'nutrient.elementLabels.Ca',
  Mg: 'nutrient.elementLabels.Mg',
  S: 'nutrient.elementLabels.S',
  N_NO3: 'nutrient.elementLabels.N_NO3',
  N_NH4: 'nutrient.elementLabels.N_NH4',
  N_UREA: 'nutrient.elementLabels.N_UREA',
  Fe: 'nutrient.elementLabels.Fe',
  Mn: 'nutrient.elementLabels.Mn',
  Zn: 'nutrient.elementLabels.Zn',
  Cu: 'nutrient.elementLabels.Cu',
  B: 'nutrient.elementLabels.B',
  Mo: 'nutrient.elementLabels.Mo',
  Si: 'nutrient.elementLabels.Si',
  Na: 'nutrient.elementLabels.Na',
  Cl: 'nutrient.elementLabels.Cl',
  SO4: 'nutrient.elementLabels.SO4',
  HCO3: 'nutrient.elementLabels.HCO3',
};

export function elementDisplayLabel(element: string, t: (key: string) => string): string {
  const key = ELEMENT_LABEL_KEYS[element];
  return key ? t(key) : element;
}
