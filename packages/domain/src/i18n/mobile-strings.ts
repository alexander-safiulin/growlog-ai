export type ProductLocale = 'en' | 'ru' | 'th' | 'my';

export const PRODUCT_LOCALES: ProductLocale[] = ['en', 'ru', 'th', 'my'];

export type MobileStrings = {
  tabs: {
    focus: string;
    timeline: string;
    ai: string;
    sop: string;
    more: string;
  };
  headers: {
    dailyFocus: string;
    assistant: string;
  };
  handover: {
    title: string;
    autonomy: string;
  };
  more: {
    photos: string;
    sensors: string;
    reports: string;
    settings: string;
    handover: string;
    calendar: string;
  };
  smartLife: {
    title: string;
    desc: string;
    loading: string;
    empty: string;
    unconfigured: string;
    error: string;
    online: string;
    offline: string;
    refresh: string;
    sub: string;
  };
};

const en: MobileStrings = {
  tabs: {
    focus: 'Focus',
    timeline: 'Timeline',
    ai: 'AI',
    sop: 'SOP',
    more: 'More',
  },
  headers: {
    dailyFocus: 'Daily Focus',
    assistant: 'Assistant',
  },
  handover: {
    title: 'Shift handover',
    autonomy: 'Autonomy readiness',
  },
  more: {
    photos: 'Photos',
    sensors: 'Sensors',
    reports: 'Reports',
    settings: 'Settings',
    handover: 'Shift handover',
    calendar: 'Calendar',
  },
  smartLife: {
    title: 'SmartLife devices',
    desc: 'Live list from the linked account. Readings are not saved yet.',
    loading: 'Loading devices…',
    empty: 'No linked devices.',
    unconfigured: 'The server is missing TUYA_ACCESS_ID and TUYA_ACCESS_SECRET.',
    error: 'Could not load devices.',
    online: 'Online',
    offline: 'Offline',
    refresh: 'Refresh',
    sub: 'Zigbee',
  },
};

const ru: MobileStrings = {
  tabs: {
    focus: 'Фокус',
    timeline: 'Лента',
    ai: 'AI',
    sop: 'SOP',
    more: 'Ещё',
  },
  headers: {
    dailyFocus: 'Фокус дня',
    assistant: 'Ассистент',
  },
  handover: {
    title: 'Передача смены',
    autonomy: 'Готовность к автономии',
  },
  more: {
    photos: 'Фото',
    sensors: 'Датчики',
    reports: 'Отчёты',
    settings: 'Настройки',
    handover: 'Передача смены',
    calendar: 'Календарь',
  },
  smartLife: {
    title: 'Устройства SmartLife',
    desc: 'Живой список привязанного аккаунта. Показания пока не сохраняются.',
    loading: 'Загрузка устройств…',
    empty: 'Нет привязанных устройств.',
    unconfigured: 'На сервере не заданы TUYA_ACCESS_ID и TUYA_ACCESS_SECRET.',
    error: 'Не удалось загрузить устройства.',
    online: 'Онлайн',
    offline: 'Не в сети',
    refresh: 'Обновить',
    sub: 'Zigbee',
  },
};

const th: MobileStrings = {
  tabs: {
    focus: 'โฟกัส',
    timeline: 'ไทม์ไลน์',
    ai: 'AI',
    sop: 'SOP',
    more: 'เพิ่มเติม',
  },
  headers: {
    dailyFocus: 'โฟกัสรายวัน',
    assistant: 'ผู้ช่วย',
  },
  handover: {
    title: 'ส่งมอบกะ',
    autonomy: 'ความพร้อมทำงานอัตโนมัติ',
  },
  more: {
    photos: 'รูปภาพ',
    sensors: 'เซนเซอร์',
    reports: 'รายงาน',
    settings: 'ตั้งค่า',
    handover: 'ส่งมอบกะ',
    calendar: 'ปฏิทิน',
  },
  smartLife: {
    title: 'อุปกรณ์ SmartLife',
    desc: 'รายการสดจากบัญชีที่เชื่อมไว้ ยังไม่บันทึกค่าที่อ่านได้',
    loading: 'กำลังโหลดอุปกรณ์…',
    empty: 'ไม่มีอุปกรณ์ที่เชื่อมไว้',
    unconfigured: 'เซิร์ฟเวอร์ยังไม่มี TUYA_ACCESS_ID และ TUYA_ACCESS_SECRET',
    error: 'โหลดอุปกรณ์ไม่สำเร็จ',
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    refresh: 'รีเฟรช',
    sub: 'Zigbee',
  },
};

const my: MobileStrings = {
  tabs: {
    focus: 'အာရုံ',
    timeline: 'အချိန်ဇယား',
    ai: 'AI',
    sop: 'SOP',
    more: 'ပိုမို',
  },
  headers: {
    dailyFocus: 'နေ့စဉ် အာရုံ',
    assistant: 'လက်ထောက်',
  },
  handover: {
    title: 'လဲလှယ်မှု',
    autonomy: 'ကိုယ်တိုင်လည်ပတ်နိုင်မှု',
  },
  more: {
    photos: 'ဓာတ်ပုံ',
    sensors: 'အာရုံခံ',
    reports: 'အစီရင်ခံစာ',
    settings: 'ဆက်တင်',
    handover: 'လဲလှယ်မှု',
    calendar: 'ပြက္ခဒိန်',
  },
  smartLife: {
    title: 'SmartLife စက်များ',
    desc: 'ချိတ်ဆက်ထားသော အကောင့်မှ လက်ရှိစာရင်း။ ဖတ်ရှုချက်များကို မသိမ်းရသေးပါ။',
    loading: 'စက်များ တင်နေသည်…',
    empty: 'ချိတ်ဆက်ထားသော စက်မရှိပါ။',
    unconfigured: 'ဆာဗာတွင် TUYA_ACCESS_ID နှင့် TUYA_ACCESS_SECRET မရှိပါ။',
    error: 'စက်များကို တင်မရပါ။',
    online: 'အွန်လိုင်း',
    offline: 'အော့ဖ်လိုင်း',
    refresh: 'ပြန်တင်ရန်',
    sub: 'Zigbee',
  },
};

export const MOBILE_STRINGS: Record<ProductLocale, MobileStrings> = {
  en,
  ru,
  th,
  my,
};

export function normalizeProductLocale(value: string | null | undefined): ProductLocale {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'uk') return 'ru';
  if ((PRODUCT_LOCALES as readonly string[]).includes(v)) return v as ProductLocale;
  return 'en';
}

export function mobileStrings(locale: ProductLocale): MobileStrings {
  return MOBILE_STRINGS[locale] ?? MOBILE_STRINGS.en;
}
