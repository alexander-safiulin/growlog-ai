import { productDisplayName } from './product-display-names';

type UnpublishedProduct = {
  id: string;
  external_key: string;
  name: string;
  lines: readonly unknown[];
};

const NOTE: Record<string, string> = {
  en: 'Some fertilizers in this mix have no published composition ({names}). The manufacturer does not list it, so they do not add elements to this solution. Where the brand gives a dose, the ml/L ratio stays on the feed chart.',
  ru: 'В этой смеси у части удобрений состав не расписан ({names}): производитель его не указывает, поэтому они не добавляют элементы в раствор. Соотношение мл/л, если марка его даёт, остаётся в схеме кормления.',
  de: 'In dieser Mischung fehlt bei manchen Düngern die Zusammensetzung ({names}). Der Hersteller gibt sie nicht an, deshalb fließen sie nicht in die Nährstoffrechnung ein. Ein ml/L-Verhältnis bleibt in der Futtertabelle, wenn die Marke eines angibt.',
  fr: 'Dans ce mélange, certains engrais n’ont pas de composition publiée ({names}). Le fabricant ne la donne pas, donc ils n’ajoutent pas d’éléments à cette solution. Le ratio ml/L, quand la marque le publie, reste sur le tableau de nutrition.',
  es: 'En esta mezcla, algunos fertilizantes no tienen composición publicada ({names}). El fabricante no la indica, así que no suman elementos a esta solución. La proporción ml/L, si la marca la da, sigue en la tabla de alimentación.',
  it: 'In questa miscela alcuni fertilizzanti non hanno una composizione pubblicata ({names}). Il produttore non la indica, quindi non aggiungono elementi a questa soluzione. Il rapporto ml/L, se la marca lo fornisce, resta nello schema di nutrizione.',
  th: 'ในส่วนผสมนี้ปุ๋ยบางตัวไม่มีองค์ประกอบที่ผู้ผลิตเผยแพร่ ({names}) จึงไม่ถูกนับในสารละลาย อัตรา มล./ล. ถ้าแบรนด์ระบุไว้ ยังอยู่ในตารางให้อาหาร',
  vi: 'Trong hỗn hợp này, một số phân bón không có thành phần được công bố ({names}). Nhà sản xuất không ghi, nên chúng không cộng nguyên tố vào dung dịch. Tỷ lệ ml/L, nếu hãng có đưa, vẫn nằm ở bảng cho ăn.',
};

function joinNames(locale: string, names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}

export function unpublishedCompositionNames(
  products: readonly UnpublishedProduct[],
  selectedIds: readonly string[],
  locale: string,
): string[] {
  const selected = new Set(selectedIds);
  const displayLocale = locale === 'ru' ? 'ru' : 'en';
  return products
    .filter((product) => selected.has(product.id) && product.lines.length === 0)
    .map((product) =>
      productDisplayName(product.external_key, product.name, displayLocale, { preserveFallback: true }),
    );
}

export function unpublishedCompositionNote(locale: string, names: readonly string[]): string | null {
  if (names.length === 0) return null;
  const template = NOTE[locale] ?? NOTE.en;
  return template.replaceAll('{names}', joinNames(locale, names));
}
