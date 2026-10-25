export type ProductLocale = 'en' | 'ru' | 'th' | 'my';

export const PRODUCT_LOCALES: ProductLocale[] = ['en', 'ru', 'th', 'my'];

export type MobileStrings = {
  tabs: {
    focus: string;
    timeline: string;
    ai: string;
    nutrient: string;
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
    signIn: string;
    signInHint: string;
    signOut: string;
    signOutTitle: string;
    signOutBody: string;
    cancel: string;
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
    starterLead: string;
    composition: string;
    compositionMeta: string;
    stepVolume: string;
    stepVolumeHint: string;
    saveVolume: string;
    volumeSaved: string;
    chooseSolution: string;
    chooseSolutionHint: string;
    targetOptional: string;
    savedSolutions: string;
    savedSolutionsHint: string;
    recipeOpen: string;
    recipeRename: string;
    recipeRenameSave: string;
    recipeDelete: string;
    recipeDuplicate: string;
    recipeLiters: string;
    wandNeedsSolution: string;
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
    eventsShort: string;
    placeFarms: string;
    placeRooms: string;
  };
  appearance: {
    theme: string;
    themeLight: string;
    themeDark: string;
    themeHarvest: string;
    themeSystem: string;
  };
  cloudGate: {
    title: string;
    sync: string;
    sensors: string;
    assistant: string;
    sop: string;
    reports: string;
    signIn: string;
  };
  loginTagline: string;
  workspace: {
    syncTitle: string;
    syncDesc: string;
    syncAction: string;
    syncDone: string;
    syncFailed: string;
    exportPdf: string;
    exportPdfEmpty: string;
    saveRecipeLocal: string;
    onDevice: string;
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
    screenTitle: string;
    logTitleWater: string;
    logTitleFeed: string;
    formName: string;
    formStrain: string;
    formPlantCount: string;
    formZone: string;
    formZoneNone: string;
    formStartMaterial: string;
    materialSeed: string;
    materialClone: string;
    formStartDate: string;
    formLightPreset: string;
    preset186: string;
    preset1212: string;
    presetCustom: string;
    formLightOn: string;
    formLightOff: string;
    formLightsOnAt: string;
    logVolume: string;
    logPh: string;
    logEc: string;
    logRecipe: string;
    logRecipeNone: string;
    logDoses: string;
    logComment: string;
    logChangeStage: string;
    logChangeLight: string;
    logSubmit: string;
    logAirTemp: string;
    logAirRh: string;
    addDoseRow: string;
    invalidPhotoperiod: string;
    lastWatering: string;
    lastFeeding: string;
    never: string;
    lightsCountdown: string;
    lightSchedule: string;
    stageDays: string;
    lightHistory: string;
    calPrev: string;
    calNext: string;
    calWeekday: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string>;
    calDayTitle: string;
    calAddWatering: string;
    calAddFeeding: string;
    calDayEmpty: string;
    harvestTitle: string;
    harvestWet: string;
    harvestDry: string;
    harvestDate: string;
    harvestSave: string;
    endDrying: string;
    completeCycle: string;
    summaryTitle: string;
    summaryTotalDays: string;
    summaryWater: string;
    summaryLiters: string;
    summaryFeedings: string;
    summaryGramsPerPlant: string;
    logPrefillDate: string;
    stageActionsTitle: string;
    fixStage: string;
    fixStageApply: string;
    stageAdvance: Record<
      'propagation' | 'veg' | 'preflower' | 'flower' | 'drying' | 'curing' | 'completed',
      string
    >;
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
    manualDesc: string;
    manualSuggested: string;
    manualSaved: string;
    useSensor: string;
    useSensorHint: string;
  };
};

const en: MobileStrings = {
  tabs: {
    focus: 'Focus',
    timeline: 'Timeline',
    ai: 'AI',
    nutrient: 'NPK',
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
    signIn: 'Sign in',
    signInHint: 'Sync this device and connect sensors.',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutBody: 'The account stays. Cloud sync pauses until you sign in again.',
    cancel: 'Cancel',
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
    favoritesOnly: 'Favorites',
    newFarmProduct: 'Quick-add farm product',
    saveRecipe: 'Save recipe',
    recipeName: 'Recipe name',
    feedingEventBody: 'Nutrient mix: {name} ({volume} L)',
    starterLead: 'A starting mix is already calculated for this tank. Name it if you want to keep it.',
    composition: 'Composition',
    compositionMeta: '{count} · {score}% match',
    stepVolume: 'Tank volume',
    stepVolumeHint: 'How many liters are we mixing?',
    saveVolume: 'Save tank volume',
    volumeSaved: 'Saved in this app.',
    chooseSolution: 'Target profile',
    chooseSolutionHint: 'How many mg/L of each element this tank should reach.',
    targetOptional: 'Optional',
    savedSolutions: 'Saved mixes',
    savedSolutionsHint: 'Mixes you saved earlier. The title is the name you gave each one.',
    recipeOpen: 'Open',
    recipeRename: 'Rename',
    recipeRenameSave: 'Save',
    recipeDelete: 'Delete',
    recipeDuplicate: 'Duplicate',
    recipeLiters: '{volume} L',
    wandNeedsSolution: 'Choose a target profile first.',
    updateBanner: {
      message: 'A new app build is available.',
      install: 'Install',
      dismiss: 'Dismiss',
    },
    solutions: {
      copySuffix: ' (copy)',
    },
  },
  appearance: {
    theme: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeHarvest: 'Harvest',
    themeSystem: 'System',
  },
  cloudGate: {
    title: 'Sign in when you are ready',
    sync: 'Sync copies this device journal and saved recipes to your farm account on other phones.',
    sensors: 'Connecting SmartLife sensors requires a signed-in farm account.',
    assistant: 'The assistant needs your farm journal in the cloud.',
    sop: 'SOP tasks and reminders need a signed-in farm account.',
    reports: 'Reports are generated from your cloud journal.',
    signIn: 'Continue with Google or email',
  },
  loginTagline: 'The log that knows your room',
  workspace: {
    syncTitle: 'Sync between devices',
    syncDesc: 'Optional. Your local calendar and recipes upload to your farm when you choose.',
    syncAction: 'Sync now',
    syncDone: 'Sync finished.',
    syncFailed: 'Sync failed. Try again.',
    exportPdf: 'Save recipes as PDF',
    exportPdfEmpty: 'Save at least one recipe first.',
    saveRecipeLocal: 'Save on this device',
    onDevice: 'On this device',
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
    eventsShort: '{count} events',
    placeFarms: 'Farm',
    placeRooms: 'Room',
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
    screenTitle: 'Grow cycle',
    logTitleWater: 'Watering log',
    logTitleFeed: 'Feeding log',
    formName: 'Cycle name',
    formStrain: 'Strain',
    formPlantCount: 'Plant count',
    formZone: 'Grow zone',
    formZoneNone: 'No zone',
    formStartMaterial: 'Start material',
    materialSeed: 'Seeds',
    materialClone: 'Clone',
    formStartDate: 'Start date',
    formLightPreset: 'Photoperiod',
    preset186: '18 h light / 6 h dark',
    preset1212: '12 h light / 12 h dark',
    presetCustom: 'Custom',
    formLightOn: 'Light hours',
    formLightOff: 'Dark hours',
    formLightsOnAt: 'Lights-on time',
    logVolume: 'Volume, ml',
    logPh: 'pH',
    logEc: 'EC, mS/cm',
    logRecipe: 'Recipe',
    logRecipeNone: 'No recipe',
    logDoses: 'Products',
    logComment: 'Comment',
    logChangeStage: 'Change stage',
    logChangeLight: 'Change light schedule',
    logSubmit: 'Save entry',
    logAirTemp: 'Air temp., °C',
    logAirRh: 'Air RH, %',
    addDoseRow: 'Add product',
    invalidPhotoperiod: 'Light and dark hours must add up to 24.',
    lastWatering: 'Last watering',
    lastFeeding: 'Last feeding',
    never: 'Not yet',
    lightsCountdown: 'Until {event}',
    lightSchedule: 'Light',
    stageDays: '{days} days in stage',
    lightHistory: 'Light schedule history',
    calPrev: 'Previous month',
    calNext: 'Next month',
    calWeekday: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
    calDayTitle: 'Day {date}',
    calAddWatering: 'Add watering',
    calAddFeeding: 'Add feeding',
    calDayEmpty: 'No entries on this day.',
    harvestTitle: 'Harvest',
    harvestWet: 'Wet weight (kg)',
    harvestDry: 'Dry weight (kg)',
    harvestDate: 'Harvest date',
    harvestSave: 'Save harvest',
    endDrying: 'Finish drying',
    completeCycle: 'Complete cycle',
    summaryTitle: 'Cycle summary',
    summaryTotalDays: 'Total days',
    summaryWater: 'Total water',
    summaryLiters: 'L',
    summaryFeedings: 'Feedings',
    summaryGramsPerPlant: 'Dry weight per plant',
    logPrefillDate: 'Date: {date}',
    stageActionsTitle: 'Stage',
    fixStage: 'Correct stage',
    fixStageApply: 'Apply correction',
    stageAdvance: {
      propagation: 'Move to propagation',
      veg: 'Move to vegetative',
      preflower: 'Move to pre-flower',
      flower: 'Move to flowering',
      drying: 'Start drying',
      curing: 'Start curing',
      completed: 'Complete cycle',
    },
  },
  vpd: {
    title: 'VPD',
    desc: 'Live sensor reading. Type a number to try it for 3 seconds — then the sensor value returns. That try is not written to the journal.',
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
    targetBand: 'Target {range} kPa',
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
    leafEstimatedShort: '≈ air − 2 °C',
    noValue: '—',
    close: 'Close',
    manualDesc: 'Tap a number and type yours. Each change is kept and added to the journal with the time.',
    manualSuggested: 'suggested for this stage',
    manualSaved: 'saved in the journal',
    useSensor: 'Use a sensor',
    useSensorHint: 'Sign in with Google, then pick a sensor.',
  },
};

const ru: MobileStrings = {
  tabs: {
    focus: 'Фокус',
    timeline: 'Лента',
    ai: 'AI',
    nutrient: 'NPK',
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
    signIn: 'Войти',
    signInHint: 'Синхронизация этого устройства и подключение датчиков.',
    signOut: 'Выйти',
    signOutTitle: 'Выйти?',
    signOutBody: 'Аккаунт не удаляется. Облако отключится, пока не войдёте снова.',
    cancel: 'Отмена',
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
    favoritesOnly: 'Избранное',
    newFarmProduct: 'Быстрое farm-удобрение',
    saveRecipe: 'Сохранить рецепт',
    recipeName: 'Название рецепта',
    feedingEventBody: 'Питательный раствор: {name} ({volume} л)',
    starterLead: 'Для этого бака уже посчитан стартовый раствор. Если хотите его оставить — дайте имя.',
    composition: 'Состав',
    compositionMeta: '{count} · совпадение {score}%',
    stepVolume: 'Объём бака',
    stepVolumeHint: 'Сколько литров смешиваем?',
    saveVolume: 'Сохранить объём бака',
    volumeSaved: 'Сохранено в приложении.',
    chooseSolution: 'Целевой профиль',
    chooseSolutionHint: 'Сколько мг/л каждого элемента должно получиться в баке.',
    targetOptional: 'Необязательно',
    savedSolutions: 'Сохранённые замесы',
    savedSolutionsHint: 'Замесы, которые вы уже сохранили. Заголовок — имя, которое вы им дали.',
    recipeOpen: 'Открыть',
    recipeRename: 'Переименовать',
    recipeRenameSave: 'Сохранить',
    recipeDelete: 'Удалить',
    recipeDuplicate: 'Скопировать',
    recipeLiters: '{volume} л',
    wandNeedsSolution: 'Сначала выберите целевой профиль.',
    updateBanner: {
      message: 'Вышло обновление приложения.',
      install: 'Установить',
      dismiss: 'Скрыть',
    },
    solutions: {
      copySuffix: ' (копия)',
    },
  },
  appearance: {
    theme: 'Оформление',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeHarvest: 'Урожай',
    themeSystem: 'Как в системе',
  },
  cloudGate: {
    title: 'Вход — когда сами решите',
    sync: 'Синхронизация переносит журнал и рецепты с этого телефона в аккаунт фермы на других устройствах.',
    sensors: 'Подключение датчиков SmartLife требует входа в аккаунт фермы.',
    assistant: 'Ассистенту нужен журнал фермы в облаке.',
    sop: 'SOP и напоминания работают после входа в аккаунт фермы.',
    reports: 'Отчёты строятся из облачного журнала.',
    signIn: 'Google или почта',
  },
  loginTagline: 'Лог, который знает твою комнату',
  workspace: {
    syncTitle: 'Синхронизация между устройствами',
    syncDesc: 'По желанию. Локальный календарь и рецепты загрузятся в ферму, когда вы нажмёте.',
    syncAction: 'Синхронизировать',
    syncDone: 'Готово.',
    syncFailed: 'Не удалось. Попробуйте снова.',
    exportPdf: 'Сохранить рецепты в PDF',
    exportPdfEmpty: 'Сначала сохраните хотя бы один рецепт.',
    saveRecipeLocal: 'Сохранить на этом устройстве',
    onDevice: 'На этом устройстве',
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
    eventsShort: '{count} событий',
    placeFarms: 'Ферма',
    placeRooms: 'Комната',
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
    screenTitle: 'Цикл выращивания',
    logTitleWater: 'Запись полива',
    logTitleFeed: 'Запись подкормки',
    formName: 'Название цикла',
    formStrain: 'Сорт',
    formPlantCount: 'Количество растений',
    formZone: 'Зона выращивания',
    formZoneNone: 'Без зоны',
    formStartMaterial: 'Стартовый материал',
    materialSeed: 'Семена',
    materialClone: 'Клон',
    formStartDate: 'Дата старта',
    formLightPreset: 'Фотопериод',
    preset186: '18 ч света / 6 ч темноты',
    preset1212: '12 ч света / 12 ч темноты',
    presetCustom: 'Свой режим',
    formLightOn: 'Часов света',
    formLightOff: 'Часов темноты',
    formLightsOnAt: 'Время включения света',
    logVolume: 'Объём, мл',
    logPh: 'pH',
    logEc: 'EC, мС/см',
    logRecipe: 'Рецепт',
    logRecipeNone: 'Без рецепта',
    logDoses: 'Продукты',
    logComment: 'Комментарий',
    logChangeStage: 'Сменить стадию',
    logChangeLight: 'Сменить режим света',
    logSubmit: 'Сохранить запись',
    logAirTemp: 'Температура воздуха, °C',
    logAirRh: 'Влажность воздуха, %',
    addDoseRow: 'Добавить продукт',
    invalidPhotoperiod: 'Часы света и темноты должны в сумме давать 24.',
    lastWatering: 'Последний полив',
    lastFeeding: 'Последняя подкормка',
    never: 'Ещё не было',
    lightsCountdown: 'До {event}',
    lightSchedule: 'Свет',
    stageDays: '{days} дн. на стадии',
    lightHistory: 'История режима света',
    calPrev: 'Предыдущий месяц',
    calNext: 'Следующий месяц',
    calWeekday: { mon: 'пн', tue: 'вт', wed: 'ср', thu: 'чт', fri: 'пт', sat: 'сб', sun: 'вс' },
    calDayTitle: 'День {date}',
    calAddWatering: 'Добавить полив',
    calAddFeeding: 'Добавить подкормку',
    calDayEmpty: 'За этот день записей нет.',
    harvestTitle: 'Урожай',
    harvestWet: 'Сырая масса, кг',
    harvestDry: 'Сухая масса, кг',
    harvestDate: 'Дата сбора',
    harvestSave: 'Сохранить урожай',
    endDrying: 'Закончить сушку',
    completeCycle: 'Завершить цикл',
    summaryTitle: 'Итоги цикла',
    summaryTotalDays: 'Всего дней',
    summaryWater: 'Всего воды',
    summaryLiters: 'л',
    summaryFeedings: 'Подкормок',
    summaryGramsPerPlant: 'Сухой вес на растение',
    logPrefillDate: 'Дата: {date}',
    stageActionsTitle: 'Стадия',
    fixStage: 'Исправить стадию',
    fixStageApply: 'Применить',
    stageAdvance: {
      propagation: 'Перевести в проращивание',
      veg: 'Перевести в вегетацию',
      preflower: 'Перевести в предцвет',
      flower: 'Перевести в цветение',
      drying: 'Начать сушку',
      curing: 'Начать доводку',
      completed: 'Завершить цикл',
    },
  },
  vpd: {
    title: 'Дефицит влаги (VPD)',
    desc: 'Показание датчика. Введённая цифра держится 3 секунды, потом возвращается значение датчика. Эта проба в журнал не пишется.',
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
    targetBand: 'Цель {range} кПа',
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
    leafEstimatedShort: '≈ воздух − 2 °C',
    noValue: '—',
    close: 'Закрыть',
    manualDesc: 'Нажмите цифру и введите свою. Каждое изменение останется и попадёт в журнал со временем.',
    manualSuggested: 'подсказка для этой стадии',
    manualSaved: 'записано в журнал',
    useSensor: 'Подключить датчик',
    useSensorHint: 'Войдите через Google и выберите датчик.',
  },
};

const th: MobileStrings = {
  tabs: {
    focus: 'โฟกัส',
    timeline: 'ไทม์ไลน์',
    ai: 'AI',
    nutrient: en.tabs.nutrient,
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
    signIn: 'เข้าสู่ระบบ',
    signInHint: en.more.signInHint,
    signOut: 'ออกจากระบบ',
    signOutTitle: 'ออกจากระบบ?',
    signOutBody: 'บัญชีไม่ถูกลบ การซิงก์คลาวด์หยุดจนกว่าจะเข้าสู่ระบบอีกครั้ง',
    cancel: 'ยกเลิก',
  },
  nutrient: en.nutrient,
  appearance: en.appearance,
  cloudGate: en.cloudGate,
  loginTagline: en.loginTagline,
  workspace: en.workspace,
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
    nutrient: en.tabs.nutrient,
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
    signIn: 'ဝင်မည်',
    signInHint: en.more.signInHint,
    signOut: 'ထွက်မည်',
    signOutTitle: 'ထွက်မလား?',
    signOutBody: 'အကောင့် မပျက်ပါ။ ပြန်ဝင်သည်အထိ ကလောက်ဒ်စင့်ခ် ရပ်ပါမည်။',
    cancel: 'မလုပ်တော့ပါ',
  },
  nutrient: en.nutrient,
  appearance: en.appearance,
  cloudGate: en.cloudGate,
  loginTagline: en.loginTagline,
  workspace: en.workspace,
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
