import type { NutrientHelpWorkedExample } from './types';
import { fmtHelpNumber, type HelpExampleLocale } from './example-locale';

export type HelpExampleNumbers = {
  k2oFactor: number;
  p2o5Factor: number;
  na2oFactor: number;
  kPctElemental: number;
  doseK: number;
  manualKFromDose: number;
  achievedK: number;
  targetK: number;
  waterNetK: number;
  waterNetCa: number;
  caAchieved: number;
  ec: number;
  kMmol: number;
  kMeq: number;
};

export function buildHelpExamples(
  locale: HelpExampleLocale,
  n: HelpExampleNumbers,
): NutrientHelpWorkedExample[] {
  const f = (value: number, max = 3) => fmtHelpNumber(locale, value, max);

  const oxide: NutrientHelpWorkedExample = {
    id: 'oxide-factors',
    title:
      locale === 'ru'
        ? 'Пример: пересчёт оксидов с этикетки в элемент'
        : locale === 'fr'
          ? 'Exemple : oxydes sur l’étiquette → élément'
          : locale === 'de'
            ? 'Beispiel: Oxide auf dem Etikett → Element'
            : locale === 'es'
              ? 'Ejemplo: óxidos en la etiqueta → elemento'
              : locale === 'it'
                ? 'Esempio: ossidi sull’etichetta → elemento'
                : locale === 'th'
                  ? 'ตัวอย่าง: ออกไซด์บนฉลาก → ธาตุ'
                  : locale === 'vi'
                    ? 'Ví dụ: oxit trên nhãn → nguyên tố'
                    : 'Example: label oxides → element',
    lines: [
      locale === 'ru'
        ? `K₂O в K: умножьте долю на ${f(n.k2oFactor, 4)}.`
        : locale === 'fr'
          ? `K₂O → K : multipliez la fraction par ${f(n.k2oFactor, 4)}.`
          : locale === 'de'
            ? `K₂O → K: Anteil mit ${f(n.k2oFactor, 4)} multiplizieren.`
            : locale === 'es'
              ? `K₂O → K: multiplique la fracción por ${f(n.k2oFactor, 4)}.`
              : locale === 'it'
                ? `K₂O → K: moltiplica la frazione per ${f(n.k2oFactor, 4)}.`
                : locale === 'th'
                  ? `K₂O → K: คูณสัดส่วนด้วย ${f(n.k2oFactor, 4)}`
                  : locale === 'vi'
                    ? `K₂O → K: nhân phần hàm lượng với ${f(n.k2oFactor, 4)}.`
                    : `K₂O → K: multiply the fraction by ${f(n.k2oFactor, 4)}.`,
      locale === 'ru'
        ? `P₂O₅ в P: умножьте на ${f(n.p2o5Factor, 4)}.`
        : locale === 'fr'
          ? `P₂O₅ → P : multipliez par ${f(n.p2o5Factor, 4)}.`
          : locale === 'de'
            ? `P₂O₅ → P: mit ${f(n.p2o5Factor, 4)} multiplizieren.`
            : locale === 'es'
              ? `P₂O₅ → P: multiplique por ${f(n.p2o5Factor, 4)}.`
              : locale === 'it'
                ? `P₂O₅ → P: moltiplica per ${f(n.p2o5Factor, 4)}.`
                : locale === 'th'
                  ? `P₂O₅ → P: คูณด้วย ${f(n.p2o5Factor, 4)}`
                  : locale === 'vi'
                    ? `P₂O₅ → P: nhân với ${f(n.p2o5Factor, 4)}.`
                    : `P₂O₅ → P: multiply by ${f(n.p2o5Factor, 4)}.`,
      locale === 'ru'
        ? `Na₂O в Na: умножьте на ${f(n.na2oFactor, 4)}.`
        : locale === 'fr'
          ? `Na₂O → Na : multipliez par ${f(n.na2oFactor, 4)}.`
          : locale === 'de'
            ? `Na₂O → Na: mit ${f(n.na2oFactor, 4)} multiplizieren.`
            : locale === 'es'
              ? `Na₂O → Na: multiplique por ${f(n.na2oFactor, 4)}.`
              : locale === 'it'
                ? `Na₂O → Na: moltiplica per ${f(n.na2oFactor, 4)}.`
                : locale === 'th'
                  ? `Na₂O → Na: คูณด้วย ${f(n.na2oFactor, 4)}`
                  : locale === 'vi'
                    ? `Na₂O → Na: nhân với ${f(n.na2oFactor, 4)}.`
                    : `Na₂O → Na: multiply by ${f(n.na2oFactor, 4)}.`,
    ],
  };

  const ppmFromDose: NutrientHelpWorkedExample = {
    id: 'ppm-from-dose',
    title:
      locale === 'ru'
        ? 'Пример: ppm калия из дозы'
        : locale === 'fr'
          ? 'Exemple : ppm de K à partir de la dose'
          : locale === 'de'
            ? 'Beispiel: K-ppm aus der Dosis'
            : locale === 'es'
              ? 'Ejemplo: ppm de K a partir de la dosis'
              : locale === 'it'
                ? 'Esempio: ppm di K dalla dose'
                : locale === 'th'
                  ? 'ตัวอย่าง: ppm K จากปริมาณ'
                  : locale === 'vi'
                    ? 'Ví dụ: ppm K từ liều'
                    : 'Example: potassium ppm from dose',
    lines: [
      locale === 'ru'
        ? `У KNO₃ на этикетке обычно K₂O ≈ 46% и общий азот ≈ 13%; здесь считаем только калий.`
        : locale === 'fr'
          ? `Sur KNO₃, l’étiquette indique souvent K₂O ≈ 46 % et azote total ≈ 13 % ; ici seul le potassium compte.`
          : locale === 'de'
            ? `Bei KNO₃ stehen auf dem Etikett oft K₂O ≈ 46 % und Gesamt-N ≈ 13 %; hier zählt nur Kalium.`
            : locale === 'es'
              ? `En KNO₃ la etiqueta suele indicar K₂O ≈ 46 % y N total ≈ 13 %; aquí solo contamos potasio.`
              : locale === 'it'
                ? `Su KNO₃ l’etichetta indica spesso K₂O ≈ 46 % e N totale ≈ 13 %; qui contiamo solo il potassio.`
                : locale === 'th'
                  ? `KNO₃ มักมี K₂O ≈ 46% และ N รวม ≈ 13% บนฉลาก ที่นี่คิดเฉพาะ K`
                  : locale === 'vi'
                    ? `KNO₃ trên nhãn thường có K₂O ≈ 46% và tổng N ≈ 13%; ở đây chỉ tính K.`
                    : `On KNO₃ labels, K₂O is often ≈ 46% and total N ≈ 13%; here we count potassium only.`,
      locale === 'ru'
        ? `После пересчёта K₂O это ≈ ${f(n.kPctElemental, 1)}% K по массе.`
        : locale === 'fr'
          ? `Après conversion K₂O, cela fait ≈ ${f(n.kPctElemental, 1)} % K en masse.`
          : locale === 'de'
            ? `Nach K₂O-Umrechnung sind das ≈ ${f(n.kPctElemental, 1)} % K (Massenanteil).`
            : locale === 'es'
              ? `Tras convertir K₂O, son ≈ ${f(n.kPctElemental, 1)} % K en masa.`
              : locale === 'it'
                ? `Dopo ricalcolo K₂O, sono ≈ ${f(n.kPctElemental, 1)} % K in massa.`
                : locale === 'th'
                  ? `หลังแปลง K₂O ได้ ≈ ${f(n.kPctElemental, 1)}% K ตามมวล`
                  : locale === 'vi'
                    ? `Sau quy đổi K₂O, tương đương ≈ ${f(n.kPctElemental, 1)}% K theo khối lượng.`
                    : `After K₂O conversion, that is ≈ ${f(n.kPctElemental, 1)}% K by mass.`,
      locale === 'ru'
        ? `При дозе ${f(n.doseK, 3)} г/л получается около ${f(n.manualKFromDose, 1)} ppm K (в расчёте: ${f(n.achievedK, 1)} ppm при цели ${f(n.targetK, 0)} ppm).`
        : locale === 'fr'
          ? `À ${f(n.doseK, 3)} g/L, environ ${f(n.manualKFromDose, 1)} ppm K (${f(n.achievedK, 1)} ppm calculés pour une cible ${f(n.targetK, 0)} ppm).`
          : locale === 'de'
            ? `Bei ${f(n.doseK, 3)} g/L etwa ${f(n.manualKFromDose, 1)} ppm K (berechnet: ${f(n.achievedK, 1)} ppm bei Ziel ${f(n.targetK, 0)} ppm).`
            : locale === 'es'
              ? `Con ${f(n.doseK, 3)} g/L, unos ${f(n.manualKFromDose, 1)} ppm K (cálculo: ${f(n.achievedK, 1)} ppm con meta ${f(n.targetK, 0)} ppm).`
              : locale === 'it'
                ? `A ${f(n.doseK, 3)} g/L, circa ${f(n.manualKFromDose, 1)} ppm K (calcolo: ${f(n.achievedK, 1)} ppm con target ${f(n.targetK, 0)} ppm).`
                : locale === 'th'
                  ? `ที่ ${f(n.doseK, 3)} g/L ได้ประมาณ ${f(n.manualKFromDose, 1)} ppm K (คำนวณ ${f(n.achievedK, 1)} ppm เป้า ${f(n.targetK, 0)} ppm)`
                  : locale === 'vi'
                    ? `Với ${f(n.doseK, 3)} g/L, khoảng ${f(n.manualKFromDose, 1)} ppm K (tính: ${f(n.achievedK, 1)} ppm, mục tiêu ${f(n.targetK, 0)} ppm).`
                    : `At ${f(n.doseK, 3)} g/L, about ${f(n.manualKFromDose, 1)} ppm K (solver: ${f(n.achievedK, 1)} ppm vs target ${f(n.targetK, 0)} ppm).`,
    ],
  };

  const sourceWater: NutrientHelpWorkedExample = {
    id: 'source-water-net',
    title:
      locale === 'ru'
        ? 'Пример: вычитание воды'
        : locale === 'fr'
          ? 'Exemple : soustraire l’eau'
          : locale === 'de'
            ? 'Beispiel: Wasser abziehen'
            : locale === 'es'
              ? 'Ejemplo: restar el agua'
              : locale === 'it'
                ? 'Esempio: sottrarre l’acqua'
                : locale === 'th'
                  ? 'ตัวอย่าง: หักค่าน้ำต้นทาง'
                  : locale === 'vi'
                    ? 'Ví dụ: trừ nước nguồn'
                    : 'Example: subtract source water',
    lines: [
      locale === 'ru'
        ? `Цель: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Вода: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
        : locale === 'fr'
          ? `Cible : K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Eau : K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
          : locale === 'de'
            ? `Ziel: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Wasser: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
            : locale === 'es'
              ? `Meta: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Agua: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
              : locale === 'it'
                ? `Target: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Acqua: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
                : locale === 'th'
                  ? `เป้า: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm น้ำ: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm`
                  : locale === 'vi'
                    ? `Mục tiêu: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Nước: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`
                    : `Target: K = ${f(200, 0)} ppm, Ca = ${f(150, 0)} ppm. Water: K = ${f(12, 0)}, Ca = ${f(40, 0)} ppm.`,
      locale === 'ru'
        ? `Программа считает дозы под K = ${f(n.waterNetK, 1)} ppm и Ca = ${f(n.waterNetCa, 1)} ppm.`
        : locale === 'fr'
          ? `Le calculateur vise K = ${f(n.waterNetK, 1)} ppm et Ca = ${f(n.waterNetCa, 1)} ppm.`
          : locale === 'de'
            ? `Der Rechner zielt auf K = ${f(n.waterNetK, 1)} ppm und Ca = ${f(n.waterNetCa, 1)} ppm.`
            : locale === 'es'
              ? `La calculadora apunta a K = ${f(n.waterNetK, 1)} ppm y Ca = ${f(n.waterNetCa, 1)} ppm.`
              : locale === 'it'
                ? `Il calcolatore punta a K = ${f(n.waterNetK, 1)} ppm e Ca = ${f(n.waterNetCa, 1)} ppm.`
                : locale === 'th'
                  ? `โปรแกรมคำนวณ K = ${f(n.waterNetK, 1)} ppm และ Ca = ${f(n.waterNetCa, 1)} ppm`
                  : locale === 'vi'
                    ? `Máy tính nhắm K = ${f(n.waterNetK, 1)} ppm và Ca = ${f(n.waterNetCa, 1)} ppm.`
                    : `The solver targets K = ${f(n.waterNetK, 1)} ppm and Ca = ${f(n.waterNetCa, 1)} ppm.`,
    ],
  };

  const ecEstimate: NutrientHelpWorkedExample = {
    id: 'ec-estimate',
    title:
      locale === 'ru'
        ? 'Пример: оценка EC'
        : locale === 'fr'
          ? 'Exemple : estimation EC'
          : locale === 'de'
            ? 'Beispiel: EC-Schätzung'
            : locale === 'es'
              ? 'Ejemplo: estimación de EC'
              : locale === 'it'
                ? 'Esempio: stima EC'
                : locale === 'th'
                  ? 'ตัวอย่าง: ประมาณการ EC'
                  : locale === 'vi'
                    ? 'Ví dụ: ước tính EC'
                    : 'Example: EC estimate',
    lines: [
      locale === 'ru'
        ? `Для кальциевой смеси с Ca ≈ ${f(n.caAchieved, 1)} ppm оценка EC ≈ ${f(n.ec, 2)} мСм/см.`
        : locale === 'fr'
          ? `Pour un mélange calcique avec Ca ≈ ${f(n.caAchieved, 1)} ppm, EC estimée ≈ ${f(n.ec, 2)} mS/cm.`
          : locale === 'de'
            ? `Für Ca-Mischung mit Ca ≈ ${f(n.caAchieved, 1)} ppm: EC-Schätzung ≈ ${f(n.ec, 2)} mS/cm.`
            : locale === 'es'
              ? `Para mezcla con Ca ≈ ${f(n.caAchieved, 1)} ppm, EC estimada ≈ ${f(n.ec, 2)} mS/cm.`
              : locale === 'it'
                ? `Per miscela con Ca ≈ ${f(n.caAchieved, 1)} ppm, EC stimata ≈ ${f(n.ec, 2)} mS/cm.`
                : locale === 'th'
                  ? `สำหรับ Ca ≈ ${f(n.caAchieved, 1)} ppm ประมาณ EC ≈ ${f(n.ec, 2)} mS/cm`
                  : locale === 'vi'
                    ? `Với Ca ≈ ${f(n.caAchieved, 1)} ppm, EC ước tính ≈ ${f(n.ec, 2)} mS/cm.`
                    : `For a calcium mix with Ca ≈ ${f(n.caAchieved, 1)} ppm, EC estimate ≈ ${f(n.ec, 2)} mS/cm.`,
      locale === 'ru'
        ? 'После смешивания сверьте с EC-метром.'
        : locale === 'fr'
          ? 'Après mélange, vérifiez avec un EC-mètre.'
          : locale === 'de'
            ? 'Nach dem Mischen mit EC-Meter prüfen.'
            : locale === 'es'
              ? 'Tras mezclar, compruebe con medidor EC.'
              : locale === 'it'
                ? 'Dopo la miscelazione, verifica con EC-meter.'
                : locale === 'th'
                  ? 'หลังผสม วัด EC ด้วยมิเตอร์'
                  : locale === 'vi'
                    ? 'Sau khi pha, đo EC bằng máy.'
                    : 'After mixing, check with an EC meter.',
    ],
  };

  const units: NutrientHelpWorkedExample = {
    id: 'units-mmol-meq',
    title:
      locale === 'ru'
        ? 'Пример: ммоль/л и мг-экв/л'
        : locale === 'fr'
          ? 'Exemple : mmol/L et mg-eq/L'
          : locale === 'de'
            ? 'Beispiel: mmol/L und mg-Äq/L'
            : locale === 'es'
              ? 'Ejemplo: mmol/L y mg-eq/L'
              : locale === 'it'
                ? 'Esempio: mmol/L e mg-eq/L'
                : locale === 'th'
                  ? 'ตัวอย่าง: mmol/L และ mg-eq/L'
                  : locale === 'vi'
                    ? 'Ví dụ: mmol/L và mg-eq/L'
                    : 'Example: mmol/L and mg-eq/L',
    lines: [
      locale === 'ru'
        ? `При K = ${f(n.achievedK, 1)} ppm это примерно ${f(n.kMmol, 3)} ммоль/л и ${f(n.kMeq, 3)} мг-экв/л.`
        : locale === 'fr'
          ? `Pour K = ${f(n.achievedK, 1)} ppm, environ ${f(n.kMmol, 3)} mmol/L et ${f(n.kMeq, 3)} mg-eq/L.`
          : locale === 'de'
            ? `Bei K = ${f(n.achievedK, 1)} ppm etwa ${f(n.kMmol, 3)} mmol/L und ${f(n.kMeq, 3)} mg-Äq/L.`
            : locale === 'es'
              ? `Con K = ${f(n.achievedK, 1)} ppm, unos ${f(n.kMmol, 3)} mmol/L y ${f(n.kMeq, 3)} mg-eq/L.`
              : locale === 'it'
                ? `A K = ${f(n.achievedK, 1)} ppm, circa ${f(n.kMmol, 3)} mmol/L e ${f(n.kMeq, 3)} mg-eq/L.`
                : locale === 'th'
                  ? `ที่ K = ${f(n.achievedK, 1)} ppm ประมาณ ${f(n.kMmol, 3)} mmol/L และ ${f(n.kMeq, 3)} mg-eq/L`
                  : locale === 'vi'
                    ? `Với K = ${f(n.achievedK, 1)} ppm, khoảng ${f(n.kMmol, 3)} mmol/L và ${f(n.kMeq, 3)} mg-eq/L.`
                    : `At K = ${f(n.achievedK, 1)} ppm, about ${f(n.kMmol, 3)} mmol/L and ${f(n.kMeq, 3)} mg-eq/L.`,
    ],
  };

  return [oxide, ppmFromDose, sourceWater, ecEstimate, units];
}
