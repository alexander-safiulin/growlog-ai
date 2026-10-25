import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const enPath = path.join(root, 'lib/nutrient/help/locales/en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

/** @type {Record<string, { pageTitle: string; pageIntro: string; sections: Record<string, { title: string; summary: string }> }>} */
const META = {
  fr: {
    pageTitle: 'Aide — calculateur nutritif',
    pageIntro: 'Que vérifier dans les résultats et comment verser les doses calculées sans surprise.',
    sections: {
      'quick-start': { title: 'Démarrage rapide : de l’eau au réservoir', summary: 'Ordre des onglets et scénario court.' },
      solver: { title: 'Comment les doses sont calculées', summary: 'Eau, étiquettes et cibles en éléments.' },
      wand: { title: 'Baguette magique', summary: 'Jusqu’à cinq mélanges et le pourcentage de correspondance.' },
      deviations: { title: 'Tableau des écarts', summary: 'Cible, obtenu et écart en pourcent.' },
      water: { title: 'Eau', summary: 'Pourquoi votre analyse compte (Na, Cl, alcalinité, pH).' },
      elements: { title: 'Éléments et composition des sels', summary: 'Référence et apport réel depuis l’étiquette.' },
      systems: { title: 'Systèmes de nutrition et cycles', summary: 'Étapes, lien au cycle, répétition après récolte.' },
      'data-trust': { title: 'Sources et fiabilité', summary: 'Origine des chiffres d’étiquette et confiance.' },
      practical: { title: 'Notes pratiques', summary: 'Ordre de mélange, A/B, chélates, sécurité.' },
      faq: { title: 'FAQ', summary: 'Réponses courtes aux questions fréquentes.' },
    },
  },
  de: {
    pageTitle: 'Hilfe — Nährstoffrechner',
    pageIntro: 'Was in den Ergebnissen wichtig ist und wie Sie berechnete Dosen sicher ins Becken geben.',
    sections: {
      'quick-start': { title: 'Schnellstart: von Wasser zur Lösung', summary: 'Tab-Reihenfolge und kurzer Ablauf.' },
      solver: { title: 'So werden Dosen berechnet', summary: 'Wasser, Etiketten und Elementziele.' },
      wand: { title: 'Zauberstab', summary: 'Bis zu fünf Mischungen und Match-Prozent.' },
      deviations: { title: 'Abweichungstabelle', summary: 'Ziel, erreicht und Prozentdifferenz.' },
      water: { title: 'Wasser', summary: 'Eigene Analyse (Na, Cl, Alkalinität, pH).' },
      elements: { title: 'Elemente und Salzzusammensetzung', summary: 'Referenz und Elementanteil vom Etikett.' },
      systems: { title: 'Düngesysteme und Zyklen', summary: 'Schritte, Zyklusbezug, Wiederholung nach Ernte.' },
      'data-trust': { title: 'Datenquellen und Vertrauen', summary: 'Herkunft der Etikettenwerte.' },
      practical: { title: 'Praxis-Hinweise', summary: 'Mischreihenfolge, A/B, Chelate, Sicherheit.' },
      faq: { title: 'FAQ', summary: 'Kurze Antworten auf typische Fragen.' },
    },
  },
  es: {
    pageTitle: 'Ayuda — calculadora de nutrientes',
    pageIntro: 'Qué revisar en los resultados y cómo pasar las dosis calculadas al depósito sin sorpresas.',
    sections: {
      'quick-start': { title: 'Inicio rápido: del agua al tanque', summary: 'Orden de pestañas y flujo corto.' },
      solver: { title: 'Cómo se calculan las dosis', summary: 'Agua, etiquetas y metas por elemento.' },
      wand: { title: 'Varita mágica', summary: 'Hasta cinco mezclas y el porcentaje de coincidencia.' },
      deviations: { title: 'Tabla de desviaciones', summary: 'Meta, logrado y diferencia en porcentaje.' },
      water: { title: 'Agua', summary: 'Por qué importa su análisis (Na, Cl, alcalinidad, pH).' },
      elements: { title: 'Elementos y composición de sales', summary: 'Referencia y aporte real desde la etiqueta.' },
      systems: { title: 'Sistemas de riego y ciclos', summary: 'Pasos, enlace al ciclo, repetir tras cosecha.' },
      'data-trust': { title: 'Fuentes y confianza', summary: 'Origen de cifras de etiqueta.' },
      practical: { title: 'Notas prácticas', summary: 'Orden de mezcla, A/B, quelatos, seguridad.' },
      faq: { title: 'Preguntas frecuentes', summary: 'Respuestas breves a dudas comunes.' },
    },
  },
  it: {
    pageTitle: 'Guida — calcolatore nutrienti',
    pageIntro: 'Cosa controllare nei risultati e come portare le dosi calcolate nel serbatoio senza sorprese.',
    sections: {
      'quick-start': { title: 'Avvio rapido: dall’acqua al serbatoio', summary: 'Ordine schede e flusso breve.' },
      solver: { title: 'Come si calcolano le dosi', summary: 'Acqua, etichette e target elementi.' },
      wand: { title: 'Bacchetta magica', summary: 'Fino a cinque mix e percentuale di match.' },
      deviations: { title: 'Tabella scostamenti', summary: 'Target, raggiunto e differenza percentuale.' },
      water: { title: 'Acqua', summary: 'Perché serve la vostra analisi (Na, Cl, alcalinità, pH).' },
      elements: { title: 'Elementi e composizione sali', summary: 'Riferimento e contributo reale da etichetta.' },
      systems: { title: 'Sistemi nutritivi e cicli', summary: 'Passi, legame al ciclo, ripetere dopo raccolto.' },
      'data-trust': { title: 'Fonti dati e affidabilità', summary: 'Origine numeri etichetta e fiducia.' },
      practical: { title: 'Note pratiche', summary: 'Ordine miscelazione, A/B, chelati, sicurezza.' },
      faq: { title: 'Domande frequenti', summary: 'Risposte brevi alle domande tipiche.' },
    },
  },
  th: {
    pageTitle: 'ความช่วยเหลือ — เครื่องคำนวณสารละลาย',
    pageIntro: 'สิ่งที่ควรดูในผลลัพธ์และวิธีเทปริมาณที่คำนวณลงถังอย่างปลอดภัย',
    sections: {
      'quick-start': { title: 'เริ่มต้นเร็ว: จากน้ำสู่สารละลาย', summary: 'ลำดับแท็บและขั้นตอนสั้นๆ' },
      solver: { title: 'วิธีคำนวณปริมาณ', summary: 'น้ำ ฉลาก และเป้าหมายธาตุ' },
      wand: { title: 'ไม้กายสิทธิ์', summary: 'สูงสุดห้าชุดสูตรและความหมายของเปอร์เซ็นต์ตรง' },
      deviations: { title: 'ตารางความเบี่ยงเบน', summary: 'เป้า ได้จริง และส่วนต่างเป็นเปอร์เซ็นต์' },
      water: { title: 'น้ำ', summary: 'ทำไมต้องวิเคราะห์ของคุณ (Na, Cl, ความเป็นด่าง, pH)' },
      elements: { title: 'ธาตุและองค์ประกอบเกลือ', summary: 'อ้างอิงและส่วนจากฉลาก' },
      systems: { title: 'ระบบปุ๋ยและรอบปลูก', summary: 'ขั้นตอน ผูกรอบ ทำซ้ำหลังเก็บเกี่ยว' },
      'data-trust': { title: 'แหล่งข้อมูลและความน่าเชื่อถือ', summary: 'ที่มาตัวเลขบนฉลาก' },
      practical: { title: 'เคล็ดลับปฏิบัติ', summary: 'ลำดับผสม A/B คีเลต ความปลอดภัย' },
      faq: { title: 'คำถามที่พบบ่อย', summary: 'คำตอบสั้นๆ' },
    },
  },
  vi: {
    pageTitle: 'Trợ giúp — máy tính dinh dưỡng',
    pageIntro: 'Cần xem gì trong kết quả và cách đổ liều đã tính vào bể mà không bất ngờ.',
    sections: {
      'quick-start': { title: 'Bắt đầu nhanh: từ nước đến dung dịch', summary: 'Thứ tự tab và quy trình ngắn.' },
      solver: { title: 'Cách tính liều', summary: 'Nước, nhãn và mục tiêu nguyên tố.' },
      wand: { title: 'Đũa thần', summary: 'Tối đa năm phương án và phần trăm khớp.' },
      deviations: { title: 'Bảng lệch', summary: 'Mục tiêu, đạt được và phần trăm chênh.' },
      water: { title: 'Nước', summary: 'Vì sao cần phân tích của bạn (Na, Cl, kiềm, pH).' },
      elements: { title: 'Nguyên tố và thành phần muối', summary: 'Tham chiếu và đóng góp thực từ nhãn.' },
      systems: { title: 'Hệ thống dinh dưỡng và chu kỳ', summary: 'Bước, gắn chu kỳ, lặp sau thu hoạch.' },
      'data-trust': { title: 'Nguồn dữ liệu và độ tin cậy', summary: 'Nguồn số trên nhãn.' },
      practical: { title: 'Ghi chú thực hành', summary: 'Thứ tự pha, A/B, chelate, an toàn.' },
      faq: { title: 'Câu hỏi thường gặp', summary: 'Trả lời ngắn.' },
    },
  },
};

function buildLocale(code, meta) {
  const out = structuredClone(en);
  out.locale = code;
  out.pageTitle = meta.pageTitle;
  out.pageIntro = meta.pageIntro;
  for (const section of out.sections) {
    const m = meta.sections[section.id];
    if (m) {
      section.title = m.title;
      section.summary = m.summary;
    }
  }
  return out;
}

for (const [code, meta] of Object.entries(META)) {
  const outPath = path.join(root, 'lib/nutrient/help/locales', `${code}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(buildLocale(code, meta), null, 2)}\n`);
}

console.log('Wrote help locales:', Object.keys(META).join(', '));
