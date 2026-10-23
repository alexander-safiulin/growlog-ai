/** Athena Pro stock concentrate: 2 lb dry per US gallon stock solution (manufacturer default). */
export const ATHENA_PRO_STOCK_LB_PER_GAL = 2;

const ML_PER_US_GAL = 3785.411784;
const G_PER_LB = 453.59237;

/** Dry grams per mL of stock concentrate (2 lb/gal). */
export function athenaProStockGramsPerMl(lbPerGal = ATHENA_PRO_STOCK_LB_PER_GAL): number {
  return (lbPerGal * G_PER_LB) / ML_PER_US_GAL;
}

/** Convert feed-chart stock dose (mL stock per US gal of final solution) to dry g/L in final solution. */
export function athenaProStockMlPerGalToDryGramsPerL(
  mlStockPerUsGal: number,
  lbPerGal = ATHENA_PRO_STOCK_LB_PER_GAL,
): number {
  const mlStockPerL = (mlStockPerUsGal * 1000) / ML_PER_US_GAL;
  return mlStockPerL * athenaProStockGramsPerMl(lbPerGal);
}
