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
    cycle: string;
    reports: string;
    settings: string;
    handover: string;
    calendar: string;
    nutrient: string;
  };
  nutrient: {
    tabs: Record<'wand' | 'fertilizers' | 'systems' | 'water' | 'elements' | 'solutions', string>;
    hintFertilizers: string;
    volumeL: string;
    cycleLinked: string;
    results: string;
    alternatives: string;
    tab_water: string;
    tab_elements: string;
    tab_solutions: string;
    searchFertilizers: string;
    favoritesOnly: string;
    newFarmProduct: string;
    saveRecipe: string;
    recipeName: string;
    feedingEventBody: string;
    updateBanner?: { message: string; install: string; dismiss: string };
    solutions?: { copySuffix: string };
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
  dailyFocus: {
    loading: string;
    onboardingRequired: string;
    keySnapshot: string;
    dayMeta: string;
    eventsToday: string;
    viewCycle: string;
    alertsRisks: string;
    noRisks: string;
    todaySop: string;
    loadingTasks: string;
    noSopRuns: string;
    createSop: string;
  };
  manualReading: {
    cycleRequired: string;
    metric: string;
    value: string;
    valuePlaceholder: string;
    save: string;
    saving: string;
    saved: string;
    invalidNumber: string;
    saveFailed: string;
  };
  cycle: {
    noActive: string;
    cultivar: string;
    since: string;
    tabOverview: string;
    tabTimeline: string;
    tabNutrition: string;
    newCycle: string;
    logWatering: string;
    logFeeding: string;
    dayOfCycle: string;
    formTitleNew: string;
    formSubmit: string;
  };
  vpd: {
    title: string;
    desc: string;
    loading: string;
    unconfigured: string;
    error: string;
    empty: string;
    preview: string;
    vpdLabel: string;
    kpa: string;
    airTemp: string;
    leafTemp: string;
    humidity: string;
    targetBand: string;
    pickAirSource: string;
    pickLeafSource: string;
    pickRhSource: string;
    clearLeaf: string;
    longPressHint: string;
    changeSensor: string;
    searchSensors: string;
    pickerEmpty: string;
    autoSelected: string;
    zoneMismatchWarning: string;
    staleWarning: string;
    leafEstimatedOption: string;
    leafEstimatedHint: string;
    leafEstimatedShort: string;
    noValue: string;
    close: string;
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
    cycle: 'Grow cycle',
    reports: 'Reports',
    settings: 'Settings',
    handover: 'Shift handover',
    calendar: 'Calendar',
    nutrient: 'Nutrient calculator',
  },
  nutrient: {
    tabs: {
      wand: 'Magic wand',
      fertilizers: 'Fertilizers',
      systems: 'Feed systems',
      water: 'Water',
      elements: 'Elements',
      solutions: 'Solutions',
    },
    hintFertilizers: 'Select products for the solver (scroll for more in catalog).',
    volumeL: 'Tank volume (L)',
    cycleLinked: 'Linked to active grow cycle',
    results: 'Doses',
    alternatives: 'Alternatives',
    tab_water: 'Water profiles sync when signed in (web or mobile).',
    tab_elements: 'Element reference is bundled with the catalog.',
    tab_solutions: 'Saved farm solutions appear when signed in.',
    searchFertilizers: 'Search fertilizers',
    favoritesOnly: 'Favorites only',
    newFarmProduct: 'Quick-add farm product',
    saveRecipe: 'Save recipe',
    recipeName: 'Recipe name',
    feedingEventBody: 'Nutrient mix: {name} ({volume} L)',
    updateBanner: {
      message: 'A new app build is available.',
      install: 'Install',
      dismiss: 'Dismiss',
    },
    solutions: {
      copySuffix: ' (copy)',
    },
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
  dailyFocus: {
    loading: 'Loading…',
    onboardingRequired: 'Complete onboarding first.',
    keySnapshot: 'Key snapshot',
    dayMeta: 'Day {day} · {stage}',
    eventsToday: '{count} events logged today',
    viewCycle: 'Grow cycle details',
    alertsRisks: 'Alerts & risks',
    noRisks: 'No recent risk signals.',
    todaySop: 'Today SOP',
    loadingTasks: 'Loading tasks…',
    noSopRuns: 'No open SOP runs for today.',
    createSop: 'Create a SOP',
  },
  manualReading: {
    cycleRequired: 'An active cycle is required to save a reading.',
    metric: 'Metric',
    value: 'Value',
    valuePlaceholder: 'e.g. 6.2',
    save: 'Save reading',
    saving: 'Saving…',
    saved: 'Reading saved.',
    invalidNumber: 'Enter a valid number',
    saveFailed: 'Save failed',
  },
  cycle: {
    noActive: 'No active grow cycle.',
    cultivar: 'Cultivar: {name}',
    since: 'since',
    tabOverview: 'Overview',
    tabTimeline: 'Timeline',
    tabNutrition: 'Nutrition',
    newCycle: 'New cycle',
    logWatering: 'Log watering',
    logFeeding: 'Log feeding',
    dayOfCycle: 'Day {day}',
    formTitleNew: 'New cycle',
    formSubmit: 'Start cycle',
  },
  vpd: {
    title: 'VPD',
    desc: 'Live climate from linked devices. Preview resets in 3 s; nothing is saved to the journal.',
    loading: 'Loading climate…',
    unconfigured: 'Server is missing TUYA credentials.',
    error: 'Could not load devices.',
    empty: 'No temperature or humidity on linked devices.',
    preview: 'Preview',
    vpdLabel: 'VPD',
    kpa: 'kPa',
    airTemp: 'Air',
    leafTemp: 'Leaf',
    humidity: 'RH',
    targetBand: 'Target ({stage})',
    pickAirSource: 'Air temperature sensor',
    pickLeafSource: 'Leaf temperature sensor',
    pickRhSource: 'Humidity sensor',
    clearLeaf: 'No leaf sensor',
    longPressHint: 'Long-press to choose sensor',
    changeSensor: 'Change sensor',
    searchSensors: 'Search sensors',
    pickerEmpty: 'No matching sensors',
    autoSelected: 'selected automatically',
    zoneMismatchWarning: 'Air temperature and humidity come from different zones.',
    staleWarning: 'Readings are stale or offline — VPD is not updated.',
    leafEstimatedOption: 'No sensor, leaf ≈ air − 2 °C',
    leafEstimatedHint: 'Estimated from air temperature',
    leafEstimatedShort: 'estimated from air',
    noValue: '—',
    close: 'Close',
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
    cycle: 'Цикл',
    reports: 'Отчёты',
    settings: 'Настройки',
    handover: 'Передача смены',
    calendar: 'Календарь',
    nutrient: 'Калькулятор питания',
  },
  nutrient: {
    tabs: {
      wand: 'Волшебная палочка',
      fertilizers: 'Удобрения',
      systems: 'Системы питания',
      water: 'Вода',
      elements: 'Элементы',
      solutions: 'Растворы',
    },
    hintFertilizers: 'Выберите продукты для подбора доз.',
    volumeL: 'Объём бака (л)',
    cycleLinked: 'Привязано к активному циклу',
    results: 'Дозы',
    alternatives: 'Альтернативы',
    tab_water: 'Профили воды синхронизируются при входе.',
    tab_elements: 'Справочник элементов в каталоге.',
    tab_solutions: 'Сохранённые растворы фермы при входе.',
    searchFertilizers: 'Поиск удобрений',
    favoritesOnly: 'Только избранное',
    newFarmProduct: 'Быстрое farm-удобрение',
    saveRecipe: 'Сохранить рецепт',
    recipeName: 'Название рецепта',
    feedingEventBody: 'Питательный раствор: {name} ({volume} л)',
    updateBanner: {
      message: 'Вышло обновление приложения.',
      install: 'Установить',
      dismiss: 'Скрыть',
    },
    solutions: {
      copySuffix: ' (копия)',
    },
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
  dailyFocus: {
    loading: 'Загрузка…',
    onboardingRequired: 'Сначала завершите онбординг.',
    keySnapshot: 'Ключевой снимок',
    dayMeta: 'День {day} · {stage}',
    eventsToday: 'Событий сегодня: {count}',
    viewCycle: 'Подробнее о цикле',
    alertsRisks: 'Тревоги и риски',
    noRisks: 'Нет недавних сигналов риска.',
    todaySop: 'SOP на сегодня',
    loadingTasks: 'Загрузка задач…',
    noSopRuns: 'Нет открытых SOP на сегодня.',
    createSop: 'Создать SOP',
  },
  manualReading: {
    cycleRequired: 'Чтобы сохранить замер, нужен активный цикл.',
    metric: 'Метрика',
    value: 'Значение',
    valuePlaceholder: 'например 6,2',
    save: 'Сохранить замер',
    saving: 'Сохранение…',
    saved: 'Замер сохранён.',
    invalidNumber: 'Введите корректное число',
    saveFailed: 'Не удалось сохранить',
  },
  cycle: {
    noActive: 'Нет активного цикла.',
    cultivar: 'Сорт: {name}',
    since: 'с',
    tabOverview: 'Обзор',
    tabTimeline: 'Хронология',
    tabNutrition: 'Питание',
    newCycle: 'Новый цикл',
    logWatering: 'Записать полив',
    logFeeding: 'Записать подкормку',
    dayOfCycle: 'День {day}',
    formTitleNew: 'Новый цикл',
    formSubmit: 'Запустить цикл',
  },
  vpd: {
    title: 'Дефицит влаги (VPD)',
    desc: 'Температура и влажность с датчиков. Короткое изменение цифр — только на 3 с, в журнал не попадает.',
    loading: 'Загрузка климата…',
    unconfigured: 'Подключите датчики в настройках хозяйства.',
    error: 'Не удалось загрузить устройства.',
    empty: 'Нет температуры или влажности на устройствах.',
    preview: 'Проба',
    vpdLabel: 'Дефицит влаги',
    kpa: 'кПа',
    airTemp: 'Воздух',
    leafTemp: 'Лист',
    humidity: 'Влажность',
    targetBand: 'Цель для стадии «{stage}»',
    pickAirSource: 'Датчик температуры воздуха',
    pickLeafSource: 'Температура листа',
    pickRhSource: 'Датчик влажности',
    clearLeaf: 'Без датчика на листе',
    longPressHint: 'Удерживайте значение для выбора датчика',
    changeSensor: 'Сменить датчик',
    searchSensors: 'Поиск датчика',
    pickerEmpty: 'Нет подходящих датчиков',
    autoSelected: 'выбран автоматически',
    zoneMismatchWarning: 'Температура и влажность сняты в разных зонах.',
    staleWarning:
      'Показания устарели или датчик офлайн — дефицит влаги (VPD) не пересчитывается.',
    leafEstimatedOption: 'Без датчика, лист ≈ воздух − 2 °C',
    leafEstimatedHint: 'Оценка по температуре воздуха',
    leafEstimatedShort: 'оценка по воздуху',
    noValue: '—',
    close: 'Закрыть',
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
    cycle: en.more.cycle,
    reports: 'รายงาน',
    settings: 'ตั้งค่า',
    handover: 'ส่งมอบกะ',
    calendar: 'ปฏิทิน',
    nutrient: 'Nutrient calculator',
  },
  nutrient: en.nutrient,
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
  dailyFocus: en.dailyFocus,
  manualReading: en.manualReading,
  cycle: en.cycle,
  vpd: en.vpd,
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
    cycle: en.more.cycle,
    reports: 'အစီရင်ခံစာ',
    settings: 'ဆက်တင်',
    handover: 'လဲလှယ်မှု',
    calendar: 'ပြက္ခဒိန်',
    nutrient: 'Nutrient calculator',
  },
  nutrient: en.nutrient,
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
  dailyFocus: en.dailyFocus,
  manualReading: en.manualReading,
  cycle: en.cycle,
  vpd: en.vpd,
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
