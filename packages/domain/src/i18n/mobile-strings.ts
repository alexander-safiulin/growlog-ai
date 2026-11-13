export type ProductLocale = 'en' | 'ru' | 'th' | 'it' | 'fr' | 'es' | 'de' | 'vi' | 'my';

export const PRODUCT_LOCALES: ProductLocale[] = ['en', 'ru', 'th', 'it', 'fr', 'es', 'de', 'vi', 'my'];

export const PRODUCT_LOCALE_LABELS: Record<ProductLocale, string> = {
  en: 'English',
  ru: 'Русский',
  th: 'ไทย',
  it: 'Italiano',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  vi: 'Tiếng Việt',
  my: 'မြန်မာ',
};

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
    growReport: string;
  };
  growReport: {
    title: string;
    subtitle: string;
    build: string;
    building: string;
    period7d: string;
    period30d: string;
    periodCycle: string;
    periodCustom: string;
    periodSection: string;
    audience: string;
    audiencePersonal: string;
    audienceManager: string;
    audiencePublic: string;
    recent: string;
    empty: string;
    needCycle: string;
    intro: string;
    outro: string;
    customTitle: string;
    sectionNote: string;
    hideSection: string;
    showSection: string;
    photoCaption: string;
    hidePhoto: string;
    eventNote: string;
    save: string;
    saving: string;
    saved: string;
    exportPdf: string;
    exportingPdf: string;
    generating: string;
    authorLabel: string;
    invalidPeriod: string;
    buildFailed: string;
    reportFailed: string;
    saveFailed: string;
    exportFailed: string;
    exportStillDraft: string;
    exportSharingUnavailable: string;
    stepsTitle: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    audienceHintPersonal: string;
    audienceHintManager: string;
    audienceHintPublic: string;
    cycleContext: string;
    statusReady: string;
    statusDraft: string;
    statusFailed: string;
    introPlaceholder: string;
    outroPlaceholder: string;
    editorCoach: string;
    editorCoachDismiss: string;
    editorReady: string;
    pdfPreview: string;
    eventNotesSection: string;
    publicSanitizeNote: string;
    pdfLabelIntroduction: string;
    pdfLabelClosing: string;
    pdfLabelPhotos: string;
    shareDialogTitle: string;
    sectionInPdf: string;
  };
  nutrient: {
    tabs: Record<'fertilizers' | 'systems' | 'water' | 'elements' | 'solutions', string>;
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
    favoritesShowAll: string;
    favoritesEmpty: string;
    toggleFavorite: string;
    clearSelection: string;
    clearFavorites: string;
    fertilizerSortByMacro: string;
    fertilizerCompositionEmpty: string;
    fertilizerCompositionMacros: string;
    fertilizerCompositionMicros: string;
    fertilizerCompositionAdd: string;
    compositionEdited: string;
    newFarmProduct: string;
    fertilizerName: string;
    fertilizerDraftMissing: string;
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
    targetProfileMine: string;
    targetProfileCatalog: string;
    saveTargetProfile: string;
    saveTargetProfileHint: string;
    saveTargetProfileName: string;
    saveTargetProfileDone: string;
    saveTargetProfileNeedMix: string;
    savedSolutions: string;
    savedSolutionsHint: string;
    recipeOpen: string;
    recipeRename: string;
    recipeRenameSave: string;
    recipeDelete: string;
    recipeDuplicate: string;
    recipeLiters: string;
    wandLead: string;
    wandNeedsSolution: string;
    wandNeedsFertilizers: string;
    wandComputing: string;
    wandEmptyTarget: string;
    wandNoDoses: string;
    saveMixHint: string;
    wandSectionMix: string;
    wandSectionTarget: string;
    save: string;
    doseUnitMass: string;
    doseUnitVolume: string;
    doseStockLine: string;
    saveMixDone: string;
    variantBest: string;
    variantAlt: string;
    variantsHeading: string;
    elementTarget: string;
    elementAchieved: string;
    elementDelta: string;
    elementNUnknown: string;
    elementMass: string;
    elementValence: string;
    elementsInSolution: string;
    elementsInSolutionUnit: string;
    elementFractions: string;
    doseUnitMassShort: string;
    doseUnitVolumeShort: string;
    doseTankLine: string;
    ecLine: string;
    saltOne: string;
    saltFew: string;
    saltMany: string;
    variantsOnlyOne: string;
    assembleShort: string;
    assembleBlocked: string;
    assembleBlockedMulti: string;
    assembleMissing: string;
    assembleFloor: string;
    nitrogenFormGap: string;
    helpOpen: string;
    helpClose: string;
    helpCurious: string;
    mixFavoritesLabel: string;
    mixFavoriteAdd: string;
    mixFavoriteRemove: string;
    mixFavoritesClear: string;
    mixFavoritesClearBody: string;
    mixFavoritesHint: string;
    manualDose: string;
    feedSystemsEmpty: string;
    feedSystemCreate: string;
    feedSystemDefaultName: string;
    feedSystemWeek: string;
    feedSystemStepSolution: string;
    feedSystemStepSolutionNone: string;
    deleteFeedSystemTitle: string;
    deleteFeedSystemBody: string;
    attachCycle: string;
    attachCycleHint: string;
    systemNamePlaceholder: string;
    waterProfile: {
      lead: string;
      none: string;
      add: string;
      compositionHint: string;
      namePlaceholder: string;
      nameRequired: string;
      applied: string;
      allZero: string;
      edit: string;
      deleteLabel: string;
      deleteTitle: string;
      deleteBody: string;
      unit: string;
      ec: string;
      ph: string;
    };
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
    noLinks: string;
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
    sopNeedsAccount: string;
    loadingTasks: string;
    noSopRuns: string;
    createSop: string;
    eventsShort: string;
    placeFarms: string;
    placeRooms: string;
    mergedTitle: string;
    refresh: string;
    soon: string;
    aiComment: string;
    aiStale: string;
    overdueBadge: string;
    viewAllSop: string;
    noAiInsight: string;
    noAiInsightHint: string;
    openAssistant: string;
    readMore: string;
    showLess: string;
    confidence: string;
    confidenceLow: string;
    confidenceMedium: string;
    confidenceHigh: string;
    confidenceUnknown: string;
    showEvidence: string;
    hideEvidence: string;
    listen: string;
    insightTitleFallback: string;
    insightTypeDailyFocus: string;
    groundingLoadError: string;
    noGrounding: string;
    notSignedIn: string;
    speakError: string;
  };
  language: {
    label: string;
    uiLabel: string;
    aiLabel: string;
    aiHint: string;
  };
  commonMobile: {
    saved: string;
    error: string;
    saving: string;
    add: string;
    cancel: string;
    loading: string;
  };
  settingsScreen: {
    localJournalHint: string;
    farm: string;
    saveFarmName: string;
    activeFarm: string;
    activeCycle: string;
    since: string;
    scope: string;
    offlineSync: string;
    notifications: string;
    enablePush: string;
    pushEnabled: string;
    pushDenied: string;
    pushUnavailable: string;
    onThisDevice: string;
    tokenRegistered: string;
    logOut: string;
    tuyaLinks: {
      title: string;
      desc: string;
      empty: string;
      managedByGrowlog: string;
      accounts: string;
      devices: string;
    };
    createOwnFarm: string;
    membersLink: string;
  };
  farmMembersScreen: {
    title: string;
    desc: string;
    inviteByEmail: string;
    inviteeEmail: string;
    role: string;
    roleAdmin: string;
    roleManager: string;
    roleGrower: string;
    roleViewer: string;
    inviteSubmit: string;
    inviteSignInHint: string;
    pendingStatus: string;
    revokeInvite: string;
    membersList: string;
    joined: string;
    removeMember: string;
    leaveFarm: string;
    confirmRemove: string;
    confirmLeave: string;
    lastAdminError: string;
    alreadyMember: string;
    invalidEmail: string;
    inviteSent: string;
    bannerAdded: string;
    bannerOpen: string;
    bannerDismiss: string;
    bannerLeave: string;
    mergeTargetLabel: string;
  };
  onboardingScreen: {
    title: string;
    subtitle: string;
    farmName: string;
    farmNamePlaceholder: string;
    farmNameRequired: string;
    cycleName: string;
    startDate: string;
    startDateHint: string;
    startDateInvalid: string;
    startMaterial: string;
    fromSeed: string;
    fromClone: string;
    startOnDevice: string;
    startInCloud: string;
    signInForSync: string;
    signedInAs: string;
    creating: string;
    setupFailed: string;
  };
  timelineScreen: {
    loading: string;
    empty: string;
    today: string;
    expandMonth: string;
    collapseMonth: string;
    noCycle: string;
    headerMeta: string;
    addA11y: string;
    addMenuTitle: string;
    changeStage: string;
    close: string;
    openEventA11y: string;
    viewPhotoA11y: string;
    emptyDayDoubleTapHint: string;
    futureDayNoAdd: string;
    charts: {
      modeEvents: string;
      modeCharts: string;
      period24h: string;
      period48h: string;
      period7d: string;
      period30d: string;
      periodCycle: string;
      periodPrevious: string;
      periodAll: string;
      noPreviousCycle: string;
      periodLegend: string;
      anchorRolling: string;
      anchorCycle: string;
      anchorPrevious: string;
      anchorAll: string;
      climateTitle: string;
      climateTemp: string;
      climateRh: string;
      climateEmpty: string;
      climateFooter: string;
      vpdTitle: string;
      vpdEmpty: string;
      phecTitle: string;
      phecLegend: string;
      phecEmpty: string;
      activityTitle: string;
      activityEmpty: string;
      activityTruncated: string;
      noScope: string;
      fromDailyAvg: string;
    };
  };
  leafSkill: {
    title: string;
    disclaimer: string;
    confirmHypothesis: string;
    confirmed: string;
    nextStep: string;
    noHypotheses: string;
    saveFailed: string;
    needScope: string;
    analysisPending: string;
    analysisFailed: string;
    analysisQueued: string;
  };
  sopScreen: {
    needCycle: string;
    intro: string;
    activeRuns: string;
    noRuns: string;
    execute: string;
    statusAcknowledged?: string;
    definitions: string;
    noDefinitions: string;
    scheduleUnparsed: string;
    scopeUnconfirmed: string;
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
    offlineNote: string;
    sync: string;
    sensors: string;
    assistant: string;
    sop: string;
    reports: string;
    photos: string;
    handover: string;
    signIn: string;
    signedInTitle: string;
    createFarm: string;
  };
  loginTagline: string;
  login: {
    signInTitle: string;
    signUpTitle: string;
    google: string;
    googlePending: string;
    or: string;
    email: string;
    password: string;
    submitPending: string;
    noAccount: string;
    hasAccount: string;
    back: string;
    skip: string;
    offlineReminder: string;
    notices: {
      googleUnavailable: string;
      googleCancelled: string;
      googleBusy: string;
      playServices: string;
      googleRejected: string;
      googleFailed: string;
      providerOff: string;
      signupsClosed: string;
      confirmEmail: string;
      badCredentials: string;
      alreadyRegistered: string;
      shortPassword: string;
      badEmail: string;
      missingFields: string;
      rateLimit: string;
      offline: string;
      blocked: string;
      checkInbox: string;
      generic: string;
    };
  };
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
    logProcedure: string;
    dayOfCycle: string;
    formTitleNew: string;
    formSubmit: string;
    localNewCycleWarning: string;
    screenTitle: string;
    logTitleWater: string;
    logTitleFeed: string;
    logTitleProcedure: string;
    procedureLabel: string;
    procedurePlaceholder: string;
    procedureRequired: string;
    procedureFeedLabel: string;
    procedureVoicePrompt: string;
    procedureRecording: string;
    procedureTranscribing: string;
    procedureVoiceNeedSignIn: string;
    procedureVoiceFailed: string;
    procedureVoiceTooShort: string;
    procedureVoiceEmpty: string;
    procedureVoiceBadAudio: string;
    procedureVoiceNetwork: string;
    procedureVoiceMicDenied: string;
    procedureVoiceNoFile: string;
    procedureVoiceTooLarge: string;
    procedureVoiceUnavailable: string;
    procedureVoiceA11y: string;
    procedureVoiceStopA11y: string;
    procedureVoiceSendA11y: string;
    procedureVoiceCancelA11y: string;
    procedurePhotoA11y: string;
    procedurePhotoNeedSignIn: string;
    procedureRemovePhoto: string;
    procedurePhotoAttachFailed: string;
    formName: string;
    formStrain: string;
    formPlantCount: string;
    formVarietiesTitle: string;
    formVarietyPlantCount: string;
    formVarietyComment: string;
    formVarietyAdd: string;
    formVarietyRemove: string;
    formVarietyNameRequired: string;
    formZone: string;
    formZoneNone: string;
    formStartMaterial: string;
    materialSeed: string;
    materialClone: string;
    formStartDate: string;
    formStartDateFromCalendar: string;
    formLightPreset: string;
    preset186: string;
    preset1212: string;
    presetCustom: string;
    formLightOn: string;
    formLightOff: string;
    formLightsOnAt: string;
    formPhotoperiodChart: string;
    formPhotoperiodChartInvalid: string;
    formPhotoperiodChartA11y: string;
    formPhotoperiodLight: string;
    formPhotoperiodDark: string;
    formVarietyQrTitle: string;
    formVarietyQrHint: string;
    formVarietyQrNeedCloud: string;
    plantLabelsTitle: string;
    plantLabelsPrint: string;
    plantLabelsSharePdf: string;
    plantLabelsEmpty: string;
    plantLabelsLoading: string;
    scanPlantTitle: string;
    scanPlantHint: string;
    scanPlantOk: string;
    scanPlantInvalid: string;
    scanPlantNotFound: string;
    scanPlantWrongFarm: string;
    scanPlantPermission: string;
    scanPlantEnableCamera: string;
    scanPlantFocused: string;
    scanPlantClear: string;
    eyeModeScanTitle: string;
    eyeModeClose: string;
    logVolume: string;
    logPh: string;
    logEc: string;
    logRecipe: string;
    logRecipeNone: string;
    logRecipeEmpty: string;
    logRecipeWeekChip: string;
    logRecipeMissing: string;
    logRecipeShow: string;
    logRecipeHide: string;
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
    harvestNeedsAccount: string;
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
    stageOtherPick: string;
    stageOtherApply: string;
    trimmingStart: string;
    trimmingStop: string;
    trimmingActiveLabel: string;
    stageAdvance: Record<
      | 'propagation'
      | 'cloning'
      | 'veg'
      | 'preflower'
      | 'flower'
      | 'harvest'
      | 'drying'
      | 'trimming'
      | 'curing'
      | 'completed',
      string
    >;
    stageStepHint: Record<'flower' | 'harvest' | 'drying' | 'curing', string>;
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
    saveHint: string;
    saveJournal: string;
    manualSuggested: string;
    manualSaved: string;
    useSensor: string;
    useSensorHint: string;
  };
  captureScreen: {
    needOnboarding: string;
    eventType: string;
    whatHappened: string;
    bodyPlaceholder: string;
    saveJournal: string;
    savedOffline: string;
    saveFailed: string;
    eventTypes: {
      note: string;
      observation: string;
      action_taken: string;
      watering: string;
      feeding: string;
      issue_detected: string;
    };
  };
  advisorScreen: {
    recording: string;
    addingPhoto: string;
    working: string;
    text: string;
    takePhoto: string;
    choosePhoto: string;
    addA11y: string;
    inputPlaceholder: string;
    send: string;
    closeTextComposerA11y: string;
    listening: string;
    hint: string;
    emptyHint: string;
    emptyTitle: string;
    emptyLead: string;
    starterPrompt1: string;
    starterPrompt2: string;
    starterPrompt3: string;
    bannerNote: string;
    voiceHint: string;
    textComposerHint: string;
    photoA11y: string;
    removePhoto: string;
    removePhotoA11y: string;
    photoOnlyQuestion: string;
    photoNeedsOnline: string;
    photoNeedCycle: string;
    askingAssistant: string;
    extractingLog: string;
    orbit: {
      photoA11y: string;
      leafA11y: string;
      keyboardA11y: string;
      qrA11y: string;
      eyeA11y: string;
      plusA11y: string;
    };
    journalPlus: {
      title: string;
      voice: string;
      text: string;
    };
    journalSaved: {
      title: string;
      subtitle: string;
      quoteLabel: string;
      details: string;
      journalDay: string;
      occurredAt: string;
      savedAt: string;
      farm: string;
      cycle: string;
      scope: string;
      stage: string;
      entryId: string;
      ok: string;
      cancel: string;
    };
    leafCapture: {
      working: string;
      needScope: string;
      failed: string;
      retry: string;
      defaultCaption: string;
      uploading: string;
      analyzing: string;
      analyzingHint: string;
      openJournal: string;
      readyTitle: string;
      readyWithHypotheses: string;
      readyNoHypotheses: string;
      analysisFailed: string;
      analysisTakingLong: string;
      savedOffline: string;
    };
    leafSyncNotice: {
      title: string;
      subtitle: string;
      openJournal: string;
      dismiss: string;
    };
  };
  photosScreen: {
    needOnboarding: string;
    maxSize: string;
    captionLabel: string;
    captionPlaceholder: string;
    takePhoto: string;
    chooseGallery: string;
    permissionRequired: string;
    tooLarge: string;
    savedOffline: string;
    uploaded: string;
    uploadFailed: string;
  };
  sopNewScreen: {
    needCycle: string;
    screenTitle: string;
    intro: string;
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    stepsLabel: string;
    stepsHint: string;
    stepPlaceholder: string;
    addStep: string;
    stepRequired: string;
    stepOptional: string;
    removeStep: string;
    dueTimeLabel: string;
    scheduleLabel: string;
    scheduleDaily: string;
    scheduleWeekdays: string;
    scheduleMonthDay: string;
    scheduleStageEnter: string;
    scheduleStageExit: string;
    monthDayLabel: string;
    stageLabel: string;
    timeHint: string;
    schedulePreviewTitle: string;
    schedulePreviewDaily: string;
    schedulePreviewWeekdays: string;
    schedulePreviewMonthDay: string;
    schedulePreviewStageEnter: string;
    schedulePreviewStageExit: string;
    createFailed: string;
    create: string;
  };
  sopRunScreen: {
    notFound: string;
    due: string;
    noDueDate: string;
    alreadyClosed: string;
    statusLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    requiredInputs: string;
    checklistTitle: string;
    checklistProgress: string;
    stepOptional: string;
    missingSteps: string;
    back: string;
    saveFailed: string;
    submit: string;
    statuses: {
      done: string;
      delayed: string;
      partially_done: string;
      skipped: string;
      blocked: string;
    };
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
    signInHint: 'Sign in for sensors, sync between devices, and the AI advisor.',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutBody: 'The account stays. Cloud sync pauses until you sign in again.',
    cancel: 'Cancel',
    growReport: 'Grow Report',
  },
  growReport: {
    title: 'Grow Report',
    subtitle: 'Pick a period — we turn journal entries, climate, and photos into a PDF you can share.',
    build: 'Build report',
    building: 'Building…',
    period7d: 'Last 7 days',
    period30d: 'Last 30 days',
    periodCycle: 'Whole cycle',
    periodCustom: 'Custom dates',
    periodSection: 'Period',
    audience: 'Audience',
    audiencePersonal: 'Personal archive',
    audienceManager: 'For manager',
    audiencePublic: 'Community / publish',
    recent: 'Recent grow reports',
    empty: 'No grow reports yet.',
    needCycle: 'An active cycle is required.',
    intro: 'Introduction (your words)',
    outro: 'Closing notes',
    customTitle: 'Report title (optional)',
    sectionNote: 'Section note',
    hideSection: 'Hide in PDF',
    showSection: 'Show in PDF',
    photoCaption: 'Caption',
    hidePhoto: 'Hide photo',
    eventNote: 'Your note',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    exportPdf: 'Export PDF',
    exportingPdf: 'Preparing PDF…',
    generating: 'Still generating from cloud data…',
    authorLabel: 'Your comment',
    invalidPeriod: 'Start date must be on or before end date.',
    buildFailed: 'Could not start report generation.',
    reportFailed: 'Report generation failed. Try another period or check worker logs.',
    saveFailed: 'Could not save your edits.',
    exportFailed: 'PDF export failed.',
    exportStillDraft: 'Wait until the report finishes generating.',
    exportSharingUnavailable: 'Sharing is not available on this device.',
    stepsTitle: 'How it works',
    step1: 'Pick the period and audience',
    step2: 'Growlog pulls events, climate & photos from your journal',
    step3: 'Add your intro, notes, and hide sections you don’t need',
    step4: 'Export PDF and share',
    audienceHintPersonal: 'Full detail for your archive — all farm data stays private.',
    audienceHintManager: 'Hand-off snapshot for your lead: facts plus your commentary.',
    audienceHintPublic: 'Community share — IDs and internal names are scrubbed from your text.',
    cycleContext: '{cycle} · {scope}',
    statusReady: 'Ready',
    statusDraft: 'Building…',
    statusFailed: 'Failed',
    introPlaceholder: 'What stood out this week? Wins, issues, what’s next…',
    outroPlaceholder: 'Closing thoughts, thanks, or plans for the next period…',
    editorCoach: 'Your text appears in the PDF as “your comment”. Use the switches to hide sections or photos.',
    editorCoachDismiss: 'Got it',
    editorReady: 'Data is in — add a short intro, tweak sections, then export PDF.',
    pdfPreview: '{sections} sections · {photos} photos in PDF',
    eventNotesSection: 'Notes on journal events',
    publicSanitizeNote: 'Public audience: sensitive words in your notes are auto-scrubbed in the PDF.',
    pdfLabelIntroduction: 'Introduction',
    pdfLabelClosing: 'Closing notes',
    pdfLabelPhotos: 'Photos',
    shareDialogTitle: 'Share Grow Report',
    sectionInPdf: 'Include in PDF',
  },
  nutrient: {
    tabs: {
      fertilizers: 'Fertilizers',
      systems: 'Feed systems',
      water: 'Water',
      elements: 'Elements',
      solutions: 'Recipes',
    },
    hintFertilizers: 'Select products for the solver (scroll for more in catalog).',
    volumeL: 'Tank volume (L)',
    cycleLinked: 'Linked to active grow cycle',
    results: 'Doses',
    alternatives: 'Alternatives',
    tab_water: 'Water profiles sync when signed in (web or mobile).',
    tab_elements: 'Element reference is bundled with the catalog.',
    tab_solutions: 'Saved farm recipes appear when signed in.',
    searchFertilizers: 'Search fertilizers',
    favoritesOnly: 'Favorites',
    favoritesShowAll: 'All',
    favoritesEmpty: 'Nothing starred yet.',
    toggleFavorite: 'Toggle favorite',
    clearSelection: 'Clear selection',
    clearFavorites: 'Clear favorites',
    fertilizerSortByMacro: 'Sort by {macro}',
    fertilizerCompositionEmpty: 'No composition on file.',
    fertilizerCompositionMacros: 'Macronutrients',
    fertilizerCompositionMicros: 'Micronutrients',
    fertilizerCompositionAdd: 'Add element',
    compositionEdited: 'Edited',
    newFarmProduct: 'Add new',
    fertilizerName: 'Name',
    fertilizerDraftMissing: 'Enter a name and at least one percent.',
    saveRecipe: 'Save recipe',
    recipeName: 'Recipe name',
    feedingEventBody: 'Nutrient mix: {name} ({volume} L)',
    starterLead: 'A starting mix is already calculated for this tank. Name it if you want to keep it.',
    composition: 'Composition',
    compositionMeta: '{score}% match',
    stepVolume: 'Tank volume',
    stepVolumeHint: 'How many liters are we mixing?',
    saveVolume: 'Save tank volume',
    volumeSaved: 'Saved in this app.',
    chooseSolution: 'Target profile',
    chooseSolutionHint: 'How many mg/L of each element this tank should reach.',
    targetProfileMine: 'Mine',
    targetProfileCatalog: 'Reference',
    saveTargetProfile: 'Save as target',
    saveTargetProfileHint:
      'Save what this mix achieved (mg/L) under Mine — next time you can match it with other fertilizers.',
    saveTargetProfileName: 'Target name',
    saveTargetProfileDone: 'Saved under Mine. It is selected as your target.',
    saveTargetProfileNeedMix: 'Select fertilizers and calculate a mix first.',
    savedSolutions: 'Saved mixes',
    savedSolutionsHint: 'Mixes you saved earlier. The title is the name you gave each one.',
    recipeOpen: 'Open',
    recipeRename: 'Rename',
    recipeRenameSave: 'Save',
    recipeDelete: 'Delete',
    recipeDuplicate: 'Duplicate',
    recipeLiters: '{volume} L',
    wandLead: 'A mix appears here only from a target and fertilizers. A name alone does not create one.',
    wandNeedsSolution: 'Pick a target profile above.',
    wandNeedsFertilizers: 'Select fertilizers. The mix is built from those.',
    wandComputing: 'Building the mix…',
    wandEmptyTarget: 'This target has no mg/L yet. Pick a profile above (for example OLK Vegetative).',
    wandNoDoses:
      'The calculator ran, but none of the checked fertilizers get a dose for this target. Often you need more salts (for example N and Ca sources for a full veg profile).',
    saveMixHint: 'Save the variant on screen. Grams per liter go to Saved mixes.',
    wandSectionMix: 'Mixes',
    wandSectionTarget: 'Goals',
    save: 'Save',
    doseUnitMass: 'g/L',
    doseUnitVolume: 'mL/L',
    doseStockLine: 'stock {amount} {unit} · tank {tank}',
    saveMixDone: 'Saved. Find it under Saved mixes.',
    variantBest: 'Best',
    variantAlt: 'Alt {n}',
    variantsHeading: 'Calculated mixes',
    elementTarget: 'Target',
    elementAchieved: 'Got',
    elementDelta: 'Δ%',
    elementNUnknown: 'unknown form',
    elementMass: 'g/mol',
    elementValence: 'valence',
    elementsInSolution: 'In the solution',
    elementsInSolutionUnit: 'mg/L',
    elementFractions: 'Elemental fractions (selected products)',
    doseUnitMassShort: 'g',
    doseUnitVolumeShort: 'mL',
    doseTankLine: 'tank {amount} {unit}',
    ecLine: 'EC {value} mS/cm',
    saltOne: 'salt',
    saltFew: 'salts',
    saltMany: 'salts',
    variantsOnlyOne: 'No other mix from these fertilizers.',
    assembleShort: '{element} is {pct}% of target.',
    assembleBlocked:
      '{element} is {pct}% of target.\nRaising it to 90% would push {blocker} over its ceiling. Use a {element} salt without {blocker}.',
    assembleBlockedMulti:
      '{entries} cannot reach 90% without pushing {blocker} over its ceiling. Use {salts} salts without {blocker}.',
    assembleMissing: 'None of the selected fertilizers supply {element}.',
    assembleFloor: 'N, P, K, Ca and Mg count as assembled from 90%.',
    nitrogenFormGap:
      'The target asks for nitrogen forms, but these fertilizers only list total N. That nitrogen does not fill nitrate, ammonium, or urea.',
    helpOpen: 'How this is calculated',
    helpClose: 'Close',
    helpCurious: 'For the curious',
    mixFavoritesLabel: 'Favorites',
    mixFavoriteAdd: 'Add to favorites',
    mixFavoriteRemove: 'Remove from favorites',
    mixFavoritesClear: 'Clear favorites',
    mixFavoritesClearBody: 'Remove every comparison mix saved on this device?',
    mixFavoritesHint: 'Kept across calculations until you clear favorites. Open one to keep it as a goal or a mix.',
    manualDose: 'Edited',
    feedSystemsEmpty:
      'No feed systems yet. Here you keep week-by-week mg/L goals for a grow. Link a saved recipe to each week; mixes with grams live under Saved mixes on Recipes.',
    feedSystemCreate: 'Create feed system',
    feedSystemDefaultName: 'My program',
    feedSystemWeek: 'Week {label}',
    feedSystemStepSolution: 'Recipe for this week',
    feedSystemStepSolutionNone: 'No recipe linked',
    deleteFeedSystemTitle: 'Delete feed system?',
    deleteFeedSystemBody: 'Remove feed system “{name}”? This cannot be undone.',
    attachCycle: 'Use for this grow',
    attachCycleHint: 'The current grow cycle takes its target from this program.',
    updateBanner: {
      message: 'A new app build is available.',
      install: 'Install',
      dismiss: 'Dismiss',
    },
    solutions: {
      copySuffix: ' (copy)',
    },
    systemNamePlaceholder: 'System name',
    waterProfile: {
      lead: 'Minerals already in the water are subtracted from the target. Reverse osmosis, or no lab report: choose “Do not account for water”.',
      none: 'Do not account for water',
      add: 'Enter a water analysis',
      compositionHint: 'Milligrams per litre from the water test. An empty box means that ion is not on the report.',
      namePlaceholder: 'Name, for example home tap',
      nameRequired: 'Name this water before saving. A name alone does not change the mix.',
      applied: 'These mg/L are subtracted from the target on Recipes.',
      allZero: 'All zeros: doses will not change. That is right for reverse osmosis — or fill in the analysis.',
      edit: 'Edit analysis',
      deleteLabel: 'Delete',
      deleteTitle: 'Delete this water?',
      deleteBody: 'Delete “{name}”? This cannot be undone.',
      unit: 'mg/L',
      ec: 'EC, mS/cm',
      ph: 'pH',
    },
  },
  language: {
    label: 'Language',
    uiLabel: 'Interface language',
    aiLabel: 'AI language',
    aiHint: 'Daily Focus, assistant, and voice replies use this language for the farm.',
  },
  commonMobile: {
    saved: 'Saved.',
    error: 'Error',
    saving: 'Saving…',
    add: 'Add',
    cancel: 'Cancel',
    loading: 'Loading…',
  },
  settingsScreen: {
    localJournalHint:
      'Farm, cycle, and journal stay on this phone — no account, no sensors required.',
    farm: 'Farm',
    saveFarmName: 'Save farm name',
    activeFarm: 'Active farm',
    activeCycle: 'Active cycle',
    since: 'since',
    scope: 'Scope',
    offlineSync: 'Offline sync',
    notifications: 'Notifications',
    enablePush: 'Enable push notifications',
    pushEnabled: 'Push notifications enabled and registered.',
    pushDenied: 'Push permission denied.',
    pushUnavailable: 'Push notifications require a physical device.',
    onThisDevice: 'On this device',
    tokenRegistered: 'Token registered (local)',
    logOut: 'Log out',
    tuyaLinks: {
      title: 'Smart home sensors',
      desc: 'Smart Life accounts linked to this farm. Matching devices appear in sensors and VPD.',
      empty: 'No sensor accounts linked yet.',
      managedByGrowlog: 'Sensor linking is configured by the Growlog administrator.',
      accounts: 'Linked accounts',
      devices: 'Explicit devices',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: {
    title: 'Farm members',
    desc: 'People who can see this farm’s data.',
    inviteByEmail: 'Invite by email',
    inviteeEmail: 'Person’s email',
    role: 'Role',
    roleAdmin: 'Owner (full access)',
    roleManager: 'Manager',
    roleGrower: 'Grower',
    roleViewer: 'View only',
    inviteSubmit: 'Send invitation',
    inviteSignInHint: 'They will see the farm after signing in with this email.',
    pendingStatus: 'Waiting for sign-in',
    revokeInvite: 'Cancel invitation',
    membersList: 'Members',
    joined: 'Joined',
    removeMember: 'Remove from farm',
    leaveFarm: 'Leave farm',
    confirmRemove: 'Remove this person from the farm?',
    confirmLeave: 'Leave this farm?',
    lastAdminError: 'Cannot remove the last farm owner.',
    alreadyMember: 'Already a member.',
    invalidEmail: 'Enter a real email, like name@mail.com.',
    inviteSent: 'Invitation saved.',
    bannerAdded: 'You were added to farm «{farm}».',
    bannerOpen: 'Open',
    bannerDismiss: 'Dismiss',
    bannerLeave: 'Leave farm',
    mergeTargetLabel: 'Data will be added to farm «{farm}».',
  },
  onboardingScreen: {
    title: 'Your farm on this phone',
    subtitle:
      'This cycle’s journal stays on your phone. Sign in only for sensors, sync, and AI.',
    farmName: 'Farm name',
    farmNamePlaceholder: 'My farm',
    farmNameRequired: 'Enter a farm name.',
    cycleName: 'Cycle name',
    startDate: 'Start date',
    startDateHint:
      'Already growing? Use the day the cycle started, not today. Stage and cultivars can be set later.',
    startDateInvalid: 'Enter a date as DD.MM.YYYY, not after today.',
    startMaterial: 'Cycle started from',
    fromSeed: 'Seeds',
    fromClone: 'Clones',
    startOnDevice: 'Start journaling',
    startInCloud: 'Create in cloud (this account)',
    signInForSync: 'Have an account? Sign in',
    signedInAs:
      'Signed in as {email}. Create a cloud farm below or keep journaling on this device.',
    creating: 'Saving…',
    setupFailed: 'Could not save setup.',
  },
  timelineScreen: {
    loading: 'Loading timeline…',
    empty: 'No events yet. Tap + or the mic to log something.',
    today: 'Today',
    expandMonth: 'Show month',
    collapseMonth: 'Show week',
    noCycle: 'No active grow cycle.',
    headerMeta: 'Day {day} · {stage}',
    addA11y: 'Add event',
    addMenuTitle: 'Add',
    changeStage: 'Change stage',
    close: 'Close',
    openEventA11y: 'Open entry',
    viewPhotoA11y: 'View photo',
    emptyDayDoubleTapHint: 'Press here twice to add an entry.',
    futureDayNoAdd: 'Entries cannot be added for future dates.',
    charts: {
      modeEvents: 'Events',
      modeCharts: 'Charts',
      period24h: '24h',
      period48h: '48h',
      period7d: '7d',
      period30d: '30d',
      periodCycle: 'Cycle',
      periodPrevious: 'Previous cycle',
      periodAll: 'All',
      noPreviousCycle: 'No earlier cycle on this farm.',
      periodLegend: 't°C · RH · VPD · pH',
      anchorRolling: 'Rolling window',
      anchorCycle: 'From cycle start',
      anchorPrevious: 'Previous cycle',
      anchorAll: 'Whole farm history',
      climateTitle: 'Climate',
      climateTemp: 'Air',
      climateRh: 'Humidity',
      climateEmpty: 'No sensor or manual climate readings for this scope yet.',
      climateFooter: '{label} {last} ({min}–{max})',
      vpdTitle: 'VPD',
      vpdEmpty: 'Need paired temperature and humidity readings to chart VPD.',
      phecTitle: 'pH & EC',
      phecLegend: 'Dots: watering (gray) vs feeding (green).',
      phecEmpty: 'No watering or feeding logs with pH/EC in this period.',
      activityTitle: 'Activity',
      activityEmpty: 'No journal entries in this cycle yet.',
      activityTruncated: 'Last {days} days of the cycle.',
      noScope: 'Select an active grow scope to load sensor charts.',
      fromDailyAvg: 'Based on daily averages',
    },
  },
  leafSkill: {
    title: 'Leaf check (hypotheses)',
    disclaimer: 'Not a diagnosis — confirm only if it matches what you see.',
    confirmHypothesis: 'Log this hypothesis',
    confirmed: 'Saved to journal',
    nextStep: 'Next step',
    noHypotheses: 'No strong leaf hypotheses from this photo yet.',
    saveFailed: 'Could not save',
    needScope: 'Select a farm scope before saving a hypothesis.',
    analysisPending: 'Leaf analysis is running… pull to refresh in a moment.',
    analysisFailed: 'Leaf analysis failed. You can re-upload the photo.',
    analysisQueued: 'Photo saved. Leaf analysis will appear after the worker runs.',
  },
  sopScreen: {
    needCycle: 'An active grow cycle is required.',
    intro: 'Execute procedures and track compliance.',
    activeRuns: 'Active runs',
    noRuns: 'No open SOP runs for today.',
    execute: 'Execute',
    statusAcknowledged: 'Acknowledged',
    definitions: 'Definitions',
    noDefinitions: 'No SOP definitions yet.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
  appearance: {
    theme: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeHarvest: 'Harvest',
    themeSystem: 'System',
  },
  cloudGate: {
    title: 'Cloud features need an account',
    offlineNote: 'Your farm, cycles, and journal on this phone work without signing in.',
    sync: 'Sign in to sync your journal and recipes across devices.',
    sensors: 'SmartLife and live climate sensors link to a signed-in cloud farm.',
    assistant: 'The AI advisor reads your cloud journal and uses server-side models.',
    sop: 'SOP tasks and reminders need a signed-in farm account.',
    reports: 'Reports are generated from your cloud journal.',
    photos: 'Photos are stored in your cloud farm.',
    handover: 'Shift handover is built from the cloud farm.',
    signIn: 'Continue with Google or email',
    signedInTitle: 'A cloud farm is needed',
    createFarm: 'Set up the cloud farm',
  },
  loginTagline: 'Journal · SOPs · advisor',
  login: {
    signInTitle: 'Sign in',
    signUpTitle: 'Sign up',
    google: 'Continue with Google',
    googlePending: 'Opening Google…',
    or: 'or',
    email: 'Email',
    password: 'Password',
    submitPending: 'One moment…',
    noAccount: 'No account? Sign up',
    hasAccount: 'Have an account? Sign in',
    back: 'Back',
    skip: 'Skip',
    offlineReminder: 'Without an account, everything stays on this phone.',
    notices: {
      googleUnavailable: 'Google sign-in is not available in this app yet. Use email and password below.',
      googleCancelled: 'Google sign-in was cancelled. You can try again or use email.',
      googleBusy: 'A Google sign-in window is already open. Close it, then tap the button again.',
      playServices: 'This phone has no Google Play services, so Google sign-in cannot open. Use email instead.',
      googleRejected: 'Google accepted the account, but Growlog did not. Use email, or try again later.',
      googleFailed: 'Google sign-in did not finish. Try again, or use email below.',
      providerOff: 'Google sign-in is turned off. Use email and password.',
      signupsClosed: 'New accounts cannot be created right now. If you already registered, sign in.',
      confirmEmail: 'This email is not confirmed yet. Open the Growlog message, follow the link, then sign in.',
      badCredentials:
        'That email or password does not match. If you do not have an account yet, tap “No account? Sign up”.',
      alreadyRegistered: 'An account with this email already exists. Tap “Have an account? Sign in” and enter the password.',
      shortPassword: 'That password is too short or too easy to guess. Make it longer and try again.',
      badEmail: 'That email does not look valid. Check the address — it needs an @ and a domain.',
      missingFields: 'Enter your email and password, then tap the button below.',
      rateLimit: 'Too many attempts in a row. Wait a minute and try again.',
      offline: 'The server could not be reached. Check your connection and try again.',
      blocked: 'This account is blocked, so it cannot sign in right now.',
      checkInbox: 'We sent a confirmation link. Open it, confirm the email, then come back and sign in.',
      generic: 'Sign-in did not work. Check the details and try again. If you do not have an account yet, sign up.',
    },
  },
  workspace: {
    syncTitle: 'Sync between devices',
    syncDesc: 'Sign in to sync this phone, connect sensors, and use the AI advisor in the cloud.',
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
    noLinks: 'Link a Smart Life account in Settings under Smart home sensors.',
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
    alertsRisks: 'Notifications',
    noRisks: 'No recent risk signals.',
    todaySop: 'Today SOP',
    sopNeedsAccount: 'Checklists and reminders for the grow. Sign in to turn them on.',
    loadingTasks: 'Loading tasks…',
    noSopRuns: 'No open SOP runs for today.',
    createSop: 'Create a SOP',
    eventsShort: '{count} events',
    placeFarms: 'Farm',
    placeRooms: 'Room',
    mergedTitle: 'Daily focus',
    refresh: 'Refresh',
    soon: 'Soon',
    aiComment: 'AI comment',
    aiStale: 'AI comment may be outdated after SOP changes.',
    overdueBadge: 'overdue',
    viewAllSop: 'View all SOP',
    noAiInsight: 'No AI comment yet for today.',
    noAiInsightHint: 'Tap Refresh after you log work or finish a checklist.',
    openAssistant: 'Open Assistant',
    readMore: 'Read more',
    showLess: 'Show less',
    confidence: 'Confidence',
    confidenceLow: 'Low',
    confidenceMedium: 'Medium',
    confidenceHigh: 'High',
    confidenceUnknown: 'Unknown',
    showEvidence: 'Sources',
    hideEvidence: 'Hide sources',
    listen: 'Listen',
    insightTitleFallback: 'Today’s note',
    insightTypeDailyFocus: 'Daily focus',
    groundingLoadError: 'Could not load sources',
    noGrounding: 'No linked farm records for this note.',
    notSignedIn: 'Sign in required',
    speakError: 'Could not play audio',
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
    logProcedure: 'Log procedure',
    dayOfCycle: 'Day {day}',
    formTitleNew: 'New cycle',
    formSubmit: 'Start cycle',
    localNewCycleWarning: 'This replaces the cycle on this phone and clears its journal. The farm name stays.',
    screenTitle: 'Grow cycle',
    logTitleWater: 'Watering log',
    logTitleFeed: 'Feeding log',
    logTitleProcedure: 'Procedure',
    procedureLabel: 'What procedure?',
    procedurePlaceholder: 'e.g. defoliation, pest treatment, training…',
    procedureRequired: 'Describe what you did.',
    procedureFeedLabel: 'Procedure',
    procedureVoicePrompt: 'Describe by voice',
    procedureRecording: 'Recording… tap the mic to stop',
    procedureTranscribing: 'Transcribing…',
    procedureVoiceNeedSignIn: 'Sign in to use voice input.',
    procedureVoiceFailed: 'Transcription failed. Try again.',
    procedureVoiceTooShort: 'Recording is too short. Speak for at least a second.',
    procedureVoiceEmpty: 'Could not hear speech. Try again closer to the mic.',
    procedureVoiceBadAudio: 'Could not read the recording. Try again.',
    procedureVoiceNetwork: 'No network. Check the connection and try again.',
    procedureVoiceMicDenied: 'Microphone permission is required.',
    procedureVoiceNoFile: 'Recording file is missing. Try again.',
    procedureVoiceTooLarge: 'Recording is too large. Keep it under two minutes.',
    procedureVoiceUnavailable: 'Voice transcription is unavailable right now.',
    procedureVoiceA11y: 'Dictate procedure',
    procedureVoiceStopA11y: 'Stop recording',
    procedureVoiceSendA11y: 'Send recording for transcription',
    procedureVoiceCancelA11y: 'Cancel recording',
    procedurePhotoA11y: 'Add photo',
    procedurePhotoNeedSignIn: 'Sign in to attach a photo.',
    procedureRemovePhoto: 'Remove photo',
    procedurePhotoAttachFailed: 'The entry was saved, but the photo was not attached. Tap save again.',
    formName: 'Cycle name',
    formStrain: 'Strain',
    formPlantCount: 'Plant count',
    formVarietiesTitle: 'Variety',
    formVarietyPlantCount: 'Plant count',
    formVarietyComment: 'Comment',
    formVarietyAdd: 'Add another variety',
    formVarietyRemove: 'Remove variety',
    formVarietyNameRequired: 'Enter a variety name for each row with plants.',
    formZone: 'Grow zone',
    formZoneNone: 'No zone',
    formStartMaterial: 'Start material',
    materialSeed: 'Seeds',
    materialClone: 'Clone',
    formStartDate: 'Start date',
    formStartDateFromCalendar: 'From calendar: {date}',
    formLightPreset: 'Photoperiod',
    preset186: '18 h light / 6 h dark',
    preset1212: '12 h light / 12 h dark',
    presetCustom: 'Custom',
    formLightOn: 'Light hours',
    formLightOff: 'Dark hours',
    formLightsOnAt: 'Lights-on time',
    formPhotoperiodChart: 'Daily schedule',
    formPhotoperiodChartInvalid: 'Enter light and dark hours (24 h total) and lights-on time as HH:MM.',
    formPhotoperiodChartA11y: '24-hour light and dark schedule preview',
    formPhotoperiodLight: 'Light',
    formPhotoperiodDark: 'Dark',
    formVarietyQrTitle: 'Plant labels',
    formVarietyQrHint: 'QR codes appear after you set plant count. Print labels after starting the cycle.',
    formVarietyQrNeedCloud: 'Sign in and sync a farm to use plant QR labels.',
    plantLabelsTitle: 'Print plant labels',
    plantLabelsPrint: 'Print',
    plantLabelsSharePdf: 'Save PDF',
    plantLabelsEmpty: 'No plants in this cycle yet.',
    plantLabelsLoading: 'Loading plants…',
    scanPlantTitle: 'Scan plant QR',
    scanPlantHint: 'Point the camera at a plant label QR code.',
    scanPlantOk: 'Plant recognized.',
    scanPlantInvalid: 'This QR is not a Growlog plant label.',
    scanPlantNotFound: 'Plant not found on this farm.',
    scanPlantWrongFarm: 'This label belongs to another farm.',
    scanPlantPermission: 'Camera access is needed to scan plant labels.',
    scanPlantEnableCamera: 'Allow camera',
    scanPlantFocused: 'You are at',
    scanPlantClear: 'Clear selection',
    eyeModeScanTitle: 'Scan plant label',
    eyeModeClose: 'Close',
    logVolume: 'Volume, ml',
    logPh: 'pH',
    logEc: 'EC, mS/cm',
    logRecipe: 'Recipe',
    logRecipeNone: 'No recipe',
    logRecipeEmpty: 'No saved mixes yet. Save one under NPK → Recipes, then it shows up here. A feed-system week fills this in only after that recipe is linked to the week and the program is used for this grow.',
    logRecipeWeekChip: '{name} · week {week}',
    logRecipeMissing: 'Selected recipe was removed. Choose another or save without one.',
    logRecipeShow: 'Recipe & products',
    logRecipeHide: 'Collapse',
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
    harvestNeedsAccount: 'Wet and dry weights are stored in the cloud. Sign in when you want to record them.',
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
    stageOtherPick: 'Other stage',
    stageOtherApply: 'Apply stage',
    trimmingStart: 'Start trimming',
    trimmingStop: 'Finish trimming',
    trimmingActiveLabel: 'Trimming in progress',
    stageAdvance: {
      propagation: 'Move to propagation',
      cloning: 'Move to cloning',
      veg: 'Move to vegetative',
      preflower: 'Move to pre-flower',
      flower: 'Move to flowering',
      harvest: 'Harvest',
      drying: 'Start drying',
      trimming: 'Start trimming',
      curing: 'Start curing',
      completed: 'Complete cycle',
    },
    stageStepHint: {
      flower: 'Tap Harvest when plants are cut.',
      harvest: 'Save wet and dry weights in Harvest below, then start drying.',
      drying: 'You can trim in parallel — use the trimming toggle below.',
      curing: 'Trimming can continue during curing. When done, complete the cycle.',
    },
  },
  vpd: {
    title: 'VPD',
    desc: 'Live sensor reading. If you enter your own number, it is only a guide and is not written to the journal. After a few seconds the sensor reading returns.',
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
    manualDesc: 'You can enter your own value.',
    saveHint: 'Tap save to add the value to the journal.',
    saveJournal: 'Save to journal',
    manualSuggested: 'suggested for this stage',
    manualSaved: 'saved in the journal',
    useSensor: 'Use a sensor',
    useSensorHint: 'Sign in with Google, then pick a sensor.',
  },
  captureScreen: {
    needOnboarding: 'Complete onboarding first.',
    eventType: 'Event type',
    whatHappened: 'What happened?',
    bodyPlaceholder: 'Describe the observation or action…',
    saveJournal: 'Save to journal',
    savedOffline: 'Saved offline — will sync when online.',
    saveFailed: 'Save failed',
    eventTypes: {
      note: 'Note',
      observation: 'Observation',
      action_taken: 'Action taken',
      watering: 'Watering',
      feeding: 'Feeding',
      issue_detected: 'Issue detected',
    },
  },
  advisorScreen: {
    recording: 'Recording… tap the mic to stop',
    addingPhoto: 'Adding photo…',
    working: 'Working…',
    text: 'Text',
    takePhoto: 'Take photo',
    choosePhoto: 'Choose photo',
    addA11y: 'Add text or photo',
    inputPlaceholder: 'Log a fact or ask…',
    send: 'Send',
    closeTextComposerA11y: 'Close text input and return to actions',
    listening: 'Listening',
    hint: 'Mic logs and asks. + adds text or a photo.',
    emptyHint: 'Voice: hold the green button below. Keyboard — type text, photo on the left.',
    emptyTitle: 'What can I help with?',
    emptyLead: 'Hold the green button for voice. Use the orbit below for photo, leaf, QR, journal, and text.',
    starterPrompt1: 'What should I check today?',
    starterPrompt2: 'Log a watering',
    starterPrompt3: 'Help with leaf issues',
    bannerNote: 'Answers from farm facts and trust checks',
    voiceHint: 'Green button below — dictate. Keyboard — type text, photo on the left.',
    textComposerHint: 'Type your question and tap Send. Photo on the left; hold the green button below for voice.',
    photoA11y: 'Attach photo',
    removePhoto: 'Remove photo',
    removePhotoA11y: 'Remove attached photo',
    photoOnlyQuestion: 'Analyze this photo in the context of the current farm and cycle.',
    photoNeedsOnline: 'Photo must upload online before asking the assistant.',
    photoNeedCycle: 'Select an active cycle and scope before sending a photo.',
    askingAssistant: 'Uploading photo and getting answer…',
    extractingLog: 'Extracting journal draft…',
    orbit: {
      photoA11y: 'Attach photo to question',
      leafA11y: 'Leaf diagnosis skill',
      keyboardA11y: 'Type a question',
      qrA11y: 'Scan plant QR label',
      eyeA11y: 'Live vision (coming soon)',
      plusA11y: 'Log to journal',
    },
    journalPlus: {
      title: 'Log to journal',
      voice: 'Voice log',
      text: 'Text log',
    },
    journalSaved: {
      title: 'Saved to journal',
      subtitle: 'Check the text and time — it’s already on this cycle’s journal.',
      quoteLabel: 'Your entry',
      details: 'Entry details',
      journalDay: 'Journal day',
      occurredAt: 'Event time',
      savedAt: 'Saved',
      farm: 'Farm',
      cycle: 'Cycle',
      scope: 'Scope',
      stage: 'Stage',
      entryId: 'Entry',
      ok: 'OK',
      cancel: 'Cancel',
    },
    leafCapture: {
      working: 'Opening camera for leaf skill…',
      needScope: 'Select an active cycle and scope first.',
      failed: 'Could not save leaf photo.',
      retry: 'Try again',
      defaultCaption: 'Leaf diagnosis',
      uploading: 'Saving photo…',
      analyzing: 'Analyzing the leaf…',
      analyzingHint: 'Results land in the journal entry for this photo — usually under a minute.',
      openJournal: 'Open in journal',
      readyTitle: 'Analysis ready',
      readyWithHypotheses: 'Open the entry to review ranked hypotheses and log one if it fits.',
      readyNoHypotheses: 'Open the entry to see the observation summary.',
      analysisFailed: 'Analysis did not finish. You can still open the photo in the journal.',
      analysisTakingLong: 'Still running — open the entry and pull to refresh if needed.',
      savedOffline: 'Saved offline. It will sync and analyze when you are back online.',
    },
    leafSyncNotice: {
      title: 'Leaf photo synced',
      subtitle: 'Open the journal entry to watch analysis finish and review hypotheses.',
      openJournal: 'Open in journal',
      dismiss: 'Later',
    },
  },
  photosScreen: {
    needOnboarding: 'Complete onboarding first.',
    maxSize: 'Max size:',
    captionLabel: 'Caption (optional)',
    captionPlaceholder: 'What does this show?',
    takePhoto: 'Take photo',
    chooseGallery: 'Choose from gallery',
    permissionRequired: 'Permission required',
    tooLarge: 'Too large ({size}). Max {max}.',
    savedOffline: 'Saved offline — will sync when online.',
    uploaded: 'Photo uploaded.',
    uploadFailed: 'Upload failed',
  },
  sopNewScreen: {
    needCycle: 'An active cycle and scope are required.',
    screenTitle: 'New SOP',
    intro: 'Choose when this procedure is due for the current cycle and scope.',
    titleLabel: 'Title',
    titlePlaceholder: 'e.g. Morning VPD check',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'What should the operator do?',
    stepsLabel: 'Steps',
    stepsHint: 'Each step becomes a checkbox when the task is done. Paste a list to split it into steps.',
    stepPlaceholder: 'e.g. Check the AC filter',
    addStep: '+ Add step',
    stepRequired: 'Required',
    stepOptional: 'Optional',
    removeStep: 'Remove step',
    dueTimeLabel: 'Due time (local)',
    scheduleLabel: 'Schedule',
    scheduleDaily: 'Every day',
    scheduleWeekdays: 'Weekdays',
    scheduleMonthDay: 'Day of month',
    scheduleStageEnter: 'When a stage starts',
    scheduleStageExit: 'When a stage ends',
    monthDayLabel: 'Day of the month',
    stageLabel: 'Stage',
    timeHint: '24-hour time, for example 09:00 or 14:30',
    schedulePreviewTitle: 'You will get runs like',
    schedulePreviewDaily: 'Every day at {time}',
    schedulePreviewWeekdays: '{days} at {time}',
    schedulePreviewMonthDay: 'Day {day} of the month at {time}',
    schedulePreviewStageEnter: 'When {stage} starts at {time}',
    schedulePreviewStageExit: 'When {stage} ends at {time}',
    createFailed: 'Could not create SOP',
    create: 'Create SOP',
  },
  sopRunScreen: {
    notFound: 'SOP run not found',
    due: 'Due {when}',
    noDueDate: 'No due date',
    alreadyClosed: 'Already closed',
    statusLabel: 'Status',
    notesLabel: 'Notes',
    notesPlaceholder: 'What happened during execution?',
    requiredInputs: 'Required inputs',
    checklistTitle: 'Steps',
    checklistProgress: '{done} of {total} done',
    stepOptional: 'optional',
    missingSteps: 'Check off every required step, or choose “Partially done”.',
    back: 'Back',
    saveFailed: 'Save failed',
    submit: 'Record execution',
    statuses: {
      done: 'Done',
      delayed: 'Delayed',
      partially_done: 'Partially done',
      skipped: 'Skipped',
      blocked: 'Blocked',
    },
  },
};

const ru: MobileStrings = {
  tabs: {
    focus: 'Фокус',
    timeline: 'Лента',
    ai: 'ИИ',
    nutrient: 'NPK',
    sop: 'Регламенты',
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
    signInHint: 'Вход — для датчиков, синхронизации между устройствами и ИИ-советника.',
    signOut: 'Выйти',
    signOutTitle: 'Выйти?',
    signOutBody: 'Аккаунт не удаляется. Облако отключится, пока не войдёте снова.',
    cancel: 'Отмена',
    growReport: 'Отчёт о цикле',
  },
  growReport: {
    title: 'Отчёт о цикле',
    subtitle: 'Выберите период — соберём журнал, климат и фото в PDF для отправки.',
    build: 'Собрать отчёт',
    building: 'Сборка…',
    period7d: '7 дней',
    period30d: '30 дней',
    periodCycle: 'Весь цикл',
    periodCustom: 'Свои даты',
    periodSection: 'Период',
    audience: 'Аудитория',
    audiencePersonal: 'Личный архив',
    audienceManager: 'Для руководителя',
    audiencePublic: 'Публикация',
    recent: 'Недавние отчёты о цикле',
    empty: 'Пока нет отчётов.',
    needCycle: 'Нужен активный цикл.',
    intro: 'Вступление (ваш текст)',
    outro: 'Заключение',
    customTitle: 'Заголовок (необязательно)',
    sectionNote: 'Заметка к секции',
    hideSection: 'Скрыть в PDF',
    showSection: 'Показать в PDF',
    photoCaption: 'Подпись к фото',
    hidePhoto: 'Скрыть фото',
    eventNote: 'Ваш комментарий',
    save: 'Сохранить',
    saving: 'Сохранение…',
    saved: 'Сохранено',
    exportPdf: 'Экспорт PDF',
    exportingPdf: 'Готовим PDF…',
    generating: 'Данные ещё собираются в облаке…',
    authorLabel: 'Комментарий',
    invalidPeriod: 'Дата начала не позже даты конца.',
    buildFailed: 'Не удалось запустить сборку отчёта.',
    reportFailed: 'Сборка отчёта не удалась. Проверьте период и воркер.',
    saveFailed: 'Не удалось сохранить правки.',
    exportFailed: 'Не удалось экспортировать PDF.',
    exportStillDraft: 'Дождитесь окончания сборки отчёта.',
    exportSharingUnavailable: 'На этом устройстве недоступен общий доступ.',
    stepsTitle: 'Как это работает',
    step1: 'Выберите период и аудиторию',
    step2: 'Growlog соберёт события, климат и фото из журнала',
    step3: 'Добавьте вступление и заметки, скройте лишние секции',
    step4: 'Экспортируйте PDF и отправьте кому нужно',
    audienceHintPersonal: 'Полный архив для себя — данные фермы остаются приватными.',
    audienceHintManager: 'Срез для руководителя: факты из журнала плюс ваши комментарии.',
    audienceHintPublic: 'Для публикации — из вашего текста убираются ID и внутренние названия.',
    cycleContext: '{cycle} · {scope}',
    statusReady: 'Готов',
    statusDraft: 'Сборка…',
    statusFailed: 'Ошибка',
    introPlaceholder: 'Что было главным за период? Удачи, проблемы, планы…',
    outroPlaceholder: 'Итог, благодарности или планы на следующий отрезок…',
    editorCoach: 'Ваш текст в PDF помечен как «ваш комментарий». Переключателями скрывайте секции и фото.',
    editorCoachDismiss: 'Понятно',
    editorReady: 'Данные собраны — напишите вступление, подправьте секции и экспортируйте PDF.',
    pdfPreview: 'В PDF: {sections} секций · {photos} фото',
    eventNotesSection: 'Комментарии к событиям',
    publicSanitizeNote: 'Публичная аудитория: чувствительные слова в заметках будут очищены в PDF.',
    pdfLabelIntroduction: 'Вступление',
    pdfLabelClosing: 'Заключение',
    pdfLabelPhotos: 'Фото',
    shareDialogTitle: 'Поделиться отчётом о цикле',
    sectionInPdf: 'Включить в PDF',
  },
  nutrient: {
    tabs: {
      fertilizers: 'Удобрения',
      systems: 'Системы питания',
      water: 'Вода',
      elements: 'Элементы',
      solutions: 'Рецепты',
    },
    hintFertilizers: 'Отметьте продукты — по ним подберутся дозы.',
    volumeL: 'Объём бака (л)',
    cycleLinked: 'Привязано к активному циклу',
    results: 'Дозы',
    alternatives: 'Альтернативы',
    tab_water: 'Профили воды синхронизируются при входе.',
    tab_elements: 'Справочник элементов в каталоге.',
    tab_solutions: 'Сохранённые рецепты фермы при входе.',
    searchFertilizers: 'Поиск удобрений',
    favoritesOnly: 'Избранное',
    favoritesShowAll: 'Все',
    favoritesEmpty: 'В избранном пока ничего.',
    toggleFavorite: 'В избранное',
    clearSelection: 'Снять все отметки',
    clearFavorites: 'Убрать все из избранного',
    fertilizerSortByMacro: 'Сортировка по {macro}',
    fertilizerCompositionEmpty: 'Состав не указан.',
    fertilizerCompositionMacros: 'Макроэлементы',
    fertilizerCompositionMicros: 'Микроэлементы',
    fertilizerCompositionAdd: 'Добавить элемент',
    compositionEdited: 'Изменено',
    newFarmProduct: 'Добавить новый',
    fertilizerName: 'Название',
    fertilizerDraftMissing: 'Укажите название и хотя бы один процент.',
    saveRecipe: 'Сохранить рецепт',
    recipeName: 'Название рецепта',
    feedingEventBody: 'Рецепт: {name} ({volume} л)',
    starterLead: 'Для этого бака уже есть стартовый расчёт. Чтобы сохранить — задайте имя.',
    composition: 'Состав',
    compositionMeta: 'совпадение {score}%',
    stepVolume: 'Объём бака',
    stepVolumeHint: 'Сколько литров смешиваем?',
    saveVolume: 'Сохранить объём бака',
    volumeSaved: 'Сохранено в приложении.',
    chooseSolution: 'Целевой профиль',
    chooseSolutionHint: 'Сколько мг/л каждого элемента должно получиться в баке.',
    targetProfileMine: 'Мои',
    targetProfileCatalog: 'Справочник',
    saveTargetProfile: 'Сохранить как цель',
    saveTargetProfileHint:
      'Сохранить мг/л из этого замеса в «Мои» — потом можно подобрать другими удобрениями.',
    saveTargetProfileName: 'Название цели',
    saveTargetProfileDone: 'Сохранено в «Мои», цель выбрана.',
    saveTargetProfileNeedMix: 'Сначала отметьте удобрения и дождитесь расчёта.',
    savedSolutions: 'Сохранённые замесы',
    savedSolutionsHint: 'Замесы, которые вы уже сохранили. Заголовок — имя, которое вы им дали.',
    recipeOpen: 'Открыть',
    recipeRename: 'Переименовать',
    recipeRenameSave: 'Сохранить',
    recipeDelete: 'Удалить',
    recipeDuplicate: 'Скопировать',
    recipeLiters: '{volume} л',
    wandLead: 'Смесь появляется здесь только из цели и удобрений. Из одного названия она не создаётся.',
    wandNeedsSolution: 'Выберите целевой профиль в карточке выше.',
    wandNeedsFertilizers: 'Отметьте удобрения — из них соберётся смесь.',
    wandComputing: 'Собираем смесь…',
    wandEmptyTarget:
      'У цели нет мг/л. Выберите профиль выше (например OLK Вегетация), не пустую программу.',
    wandNoDoses:
      'Расчёт прошёл, но из отмеченных солей не выходит ни одной дозы. Для такой цели часто не хватает источников N и Ca — добавьте соли или смените цель.',
    saveMixHint: 'Сохранить вариант на экране. Граммы на литр попадут в сохранённые замесы.',
    wandSectionMix: 'Замесы',
    wandSectionTarget: 'Цели',
    save: 'Сохранить',
    doseUnitMass: 'г/л',
    doseUnitVolume: 'мл/л',
    doseStockLine: 'концентрат {amount} {unit} · бак {tank}',
    saveMixDone: 'Сохранено. Замес лежит в списке замесов.',
    variantBest: 'Лучший',
    variantAlt: 'Вариант {n}',
    variantsHeading: 'Варианты расчёта',
    elementTarget: 'Цель',
    elementAchieved: 'Факт',
    elementDelta: 'Δ%',
    elementNUnknown: 'форма неизвестна',
    elementMass: 'г/моль',
    elementValence: 'валент.',
    elementsInSolution: 'В растворе',
    elementsInSolutionUnit: 'мг/л',
    elementFractions: 'Элементный состав (выбранные продукты)',
    doseUnitMassShort: 'г',
    doseUnitVolumeShort: 'мл',
    doseTankLine: 'на бак {amount} {unit}',
    ecLine: 'EC {value} мСм/см',
    saltOne: 'соль',
    saltFew: 'соли',
    saltMany: 'солей',
    variantsOnlyOne: 'Других вариантов из этих удобрений нет.',
    assembleShort: '{element} набран на {pct}% цели.',
    assembleBlocked:
      '{element} набран на {pct}% цели.\nДобрать до 90% нельзя — {blocker} уйдёт выше потолка. Нужна соль {element} без {blocker}.',
    assembleBlockedMulti:
      '{entries} не выходят на 90%: {blocker} уйдёт выше потолка. Нужны соли {salts} без {blocker}.',
    assembleMissing: 'Среди отмеченных удобрений нет источника {element}.',
    assembleFloor: 'Азот, фосфор, калий, кальций и магний считаются собранными от 90%.',
    nitrogenFormGap:
      'В цели азот задан формами, а у удобрений только общий N. Он не закрывает нитрат, аммоний и мочевину.',
    helpOpen: 'Как это считается',
    helpClose: 'Закрыть',
    helpCurious: 'Для любопытных',
    mixFavoritesLabel: 'Избранное',
    mixFavoriteAdd: 'В избранное',
    mixFavoriteRemove: 'Убрать из избранного',
    mixFavoritesClear: 'Очистить избранное',
    mixFavoritesClearBody: 'Убрать все рецепты, сохранённые для сравнения на этом устройстве?',
    mixFavoritesHint: 'Хранятся между расчётами, пока не очистите избранное. Откройте, чтобы сохранить как цель или замес.',
    manualDose: 'Вручную',
    feedSystemsEmpty:
      'Систем питания пока нет. Здесь — недели и цель в мг/л для цикла. К неделе можно привязать сохранённый рецепт; граммы — в «Сохранённые замесы» на «Рецептах».',
    feedSystemCreate: 'Создать систему',
    feedSystemDefaultName: 'Моя программа',
    feedSystemWeek: 'Неделя {label}',
    feedSystemStepSolution: 'Рецепт на эту неделю',
    feedSystemStepSolutionNone: 'Рецепт не выбран',
    deleteFeedSystemTitle: 'Удалить систему питания?',
    deleteFeedSystemBody: 'Удалить систему питания «{name}»? Отменить будет нельзя.',
    attachCycle: 'Использовать в этом цикле',
    attachCycleHint: 'Текущий цикл возьмёт цель из этой программы.',
    systemNamePlaceholder: 'Название системы',
    waterProfile: {
      lead: 'Калькулятор вычитает из цели соли, которые уже есть в воде. Осмос или нет анализа — оставьте «Воду не учитывать».',
      none: 'Воду не учитывать',
      add: 'Внести анализ воды',
      compositionHint: 'Миллиграммы на литр из анализа. Пустое поле — этого иона в отчёте нет.',
      namePlaceholder: 'Название, например кран дома',
      nameRequired: 'Сначала дайте воде название. Одно название состав не задаёт и расчёт не меняет.',
      applied: 'Эти мг/л вычитаются из цели на вкладке «Рецепты».',
      allZero: 'Все нули: дозы не изменятся. Так и нужно для осмоса — или заполните анализ.',
      edit: 'Изменить состав',
      deleteLabel: 'Удалить',
      deleteTitle: 'Удалить эту воду?',
      deleteBody: 'Удалить «{name}»? Отменить будет нельзя.',
      unit: 'мг/л',
      ec: 'EC, мСм/см',
      ph: 'pH',
    },
    updateBanner: {
      message: 'Вышло обновление приложения.',
      install: 'Установить',
      dismiss: 'Скрыть',
    },
    solutions: {
      copySuffix: ' (копия)',
    },
  },
  language: {
    label: 'Язык',
    uiLabel: 'Язык интерфейса',
    aiLabel: 'Язык ИИ',
    aiHint: 'Фокус дня, ассистент и голосовые ответы — на этом языке для фермы.',
  },
  commonMobile: {
    saved: 'Сохранено.',
    error: 'Ошибка',
    saving: 'Сохранение…',
    add: 'Добавить',
    cancel: 'Отмена',
    loading: 'Загрузка…',
  },
  settingsScreen: {
    localJournalHint:
      'Ферма, цикл и журнал на этом телефоне — без аккаунта и без датчиков.',
    farm: 'Ферма',
    saveFarmName: 'Сохранить название фермы',
    activeFarm: 'Активная ферма',
    activeCycle: 'Активный цикл',
    since: 'с',
    scope: 'Область',
    offlineSync: 'Синхронизация офлайн',
    notifications: 'Уведомления',
    enablePush: 'Включить push-уведомления',
    pushEnabled: 'Push-уведомления включены и зарегистрированы.',
    pushDenied: 'Разрешение на push-уведомления отклонено.',
    pushUnavailable: 'Push-уведомления доступны только на реальном устройстве.',
    onThisDevice: 'На этом устройстве',
    tokenRegistered: 'Токен зарегистрирован (локально)',
    logOut: 'Выйти',
    tuyaLinks: {
      title: 'Датчики умного дома',
      desc: 'Учётные записи умного дома, привязанные к хозяйству. В датчиках и дефиците влаги видны только подходящие устройства.',
      empty: 'К хозяйству пока не привязаны учётные записи датчиков.',
      managedByGrowlog: 'Подключение датчиков настраивает администратор growlog.',
      accounts: 'Привязанные учётные записи',
      devices: 'Отдельные устройства',
    },
    createOwnFarm: 'Создать свою ферму',
    membersLink: 'Участники и приглашения',
  },
  farmMembersScreen: {
    title: 'Участники фермы',
    desc: 'Люди, которые видят данные этой фермы.',
    inviteByEmail: 'Пригласить по почте',
    inviteeEmail: 'Почта человека',
    role: 'Роль',
    roleAdmin: 'Владелец (полный доступ)',
    roleManager: 'Управляющий',
    roleGrower: 'Гровер',
    roleViewer: 'Только просмотр',
    inviteSubmit: 'Отправить приглашение',
    inviteSignInHint: 'Человек увидит ферму после входа с этой почтой.',
    pendingStatus: 'Приглашение ждёт входа',
    revokeInvite: 'Отменить приглашение',
    membersList: 'Участники',
    joined: 'Вступил',
    removeMember: 'Удалить из фермы',
    leaveFarm: 'Выйти из фермы',
    confirmRemove: 'Удалить этого человека из фермы?',
    confirmLeave: 'Выйти из этой фермы?',
    lastAdminError: 'Нельзя убрать последнего владельца фермы.',
    alreadyMember: 'Уже участник.',
    invalidEmail: 'Нужна настоящая почта, например name@mail.com.',
    inviteSent: 'Приглашение сохранено.',
    bannerAdded: 'Вас добавили в ферму «{farm}».',
    bannerOpen: 'Открыть',
    bannerDismiss: 'Скрыть',
    bannerLeave: 'Выйти из фермы',
    mergeTargetLabel: 'Данные попадут в ферму «{farm}».',
  },
  onboardingScreen: {
    title: 'Ферма на этом телефоне',
    subtitle:
      'Журнал цикла — на этом телефоне. Вход только для датчиков, синхронизации и ИИ.',
    farmName: 'Название фермы',
    farmNamePlaceholder: 'Моя ферма',
    farmNameRequired: 'Укажите название фермы.',
    cycleName: 'Название цикла',
    startDate: 'Дата старта',
    startDateHint:
      'Цикл уже идёт — укажите день старта, не сегодня. Стадию и сорта можно задать позже.',
    startDateInvalid: 'Укажите дату в формате ДД.ММ.ГГГГ, не позже сегодняшнего дня.',
    startMaterial: 'С чего начался цикл',
    fromSeed: 'Семена',
    fromClone: 'Клоны',
    startOnDevice: 'Начать вести журнал',
    startInCloud: 'Создать в облаке (этот аккаунт)',
    signInForSync: 'Есть аккаунт — войти',
    signedInAs:
      'Вы вошли как {email}. Создайте ферму в облаке ниже или продолжайте вести журнал на этом телефоне.',
    creating: 'Сохраняем…',
    setupFailed: 'Не удалось сохранить.',
  },
  timelineScreen: {
    loading: 'Загрузка ленты…',
    empty: 'Событий пока нет. Нажмите + или микрофон, чтобы добавить запись.',
    today: 'Сегодня',
    expandMonth: 'Показать месяц',
    collapseMonth: 'Показать неделю',
    noCycle: 'Нет активного цикла.',
    headerMeta: 'День {day} · {stage}',
    addA11y: 'Добавить событие',
    addMenuTitle: 'Добавить',
    changeStage: 'Сменить стадию',
    close: 'Закрыть',
    openEventA11y: 'Открыть запись',
    viewPhotoA11y: 'Открыть фото',
    emptyDayDoubleTapHint: 'Дважды нажмите здесь, чтобы добавить запись.',
    futureDayNoAdd: 'Записи на будущие даты добавить нельзя.',
    charts: {
      modeEvents: 'События',
      modeCharts: 'Графики',
      period24h: '24ч',
      period48h: '48ч',
      period7d: '7д',
      period30d: '30д',
      periodCycle: 'Цикл',
      periodPrevious: 'Перед этим',
      periodAll: 'Все',
      noPreviousCycle: 'На ферме нет более раннего цикла.',
      periodLegend: 't°C · RH · VPD · pH',
      anchorRolling: 'Скользящее окно',
      anchorCycle: 'От старта цикла',
      anchorPrevious: 'Предыдущий цикл',
      anchorAll: 'Вся история фермы',
      climateTitle: 'Климат',
      climateTemp: 'Воздух',
      climateRh: 'Влажность',
      climateEmpty: 'Пока нет данных датчиков или ручных замеров для этой зоны.',
      climateFooter: '{label} {last} ({min}–{max})',
      vpdTitle: 'VPD',
      vpdEmpty: 'Нужны согласованные температура и влажность для графика VPD.',
      phecTitle: 'pH и EC',
      phecLegend: 'Точки: полив (серый) и подкормка (зелёный).',
      phecEmpty: 'В этом периоде нет записей полива/подкормки с pH/EC.',
      activityTitle: 'Активность',
      activityEmpty: 'В цикле пока нет записей в журнале.',
      activityTruncated: 'Последние {days} дней цикла.',
      noScope: 'Выберите активную зону, чтобы загрузить графики датчиков.',
      fromDailyAvg: 'По средним за день',
    },
  },
  leafSkill: {
    title: 'Разбор листа (гипотезы)',
    disclaimer: 'Это не диагноз — сохраняйте только если совпадает с тем, что видите.',
    confirmHypothesis: 'Записать гипотезу',
    confirmed: 'Сохранено в журнал',
    nextStep: 'Следующий шаг',
    noHypotheses: 'По этому фото пока нет уверенных гипотез.',
    saveFailed: 'Не удалось сохранить',
    needScope: 'Выберите scope фермы, прежде чем сохранять гипотезу.',
    analysisPending: 'Разбор листа выполняется… обновите ленту через минуту.',
    analysisFailed: 'Разбор не удался. Можно загрузить фото снова.',
    analysisQueued: 'Фото сохранено. Разбор появится после worker.',
  },
  sopScreen: {
    needCycle: 'Нужен активный цикл выращивания.',
    intro: 'Выполняйте регламенты и отмечайте, что сделано.',
    activeRuns: 'Задачи на сегодня',
    noRuns: 'На сегодня открытых задач нет.',
    execute: 'Выполнить',
    statusAcknowledged: 'Принята',
    definitions: 'Все регламенты',
    noDefinitions: 'Регламентов пока нет.',
    scheduleUnparsed: 'Неразобранное расписание',
    scopeUnconfirmed: 'Уточните область применения',
  },
  appearance: {
    theme: 'Оформление',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeHarvest: 'Урожай',
    themeSystem: 'Как в системе',
  },
  cloudGate: {
    title: 'Облачные функции — после входа',
    offlineNote: 'Ферма, циклы и журнал на этом телефоне работают без входа.',
    sync: 'Войдите — журнал и рецепты появятся в облаке и на других устройствах.',
    sensors: 'Датчики SmartLife и live-климат привязаны к облачной ферме после входа.',
    assistant: 'ИИ-советник читает облачный журнал и работает на сервере.',
    sop: 'Регламенты и напоминания доступны после входа в аккаунт фермы.',
    reports: 'Отчёты строятся из облачного журнала.',
    photos: 'Фото хранятся в облачной ферме.',
    handover: 'Сдача смены собирается из облачной фермы.',
    signIn: 'Google или почта',
    signedInTitle: 'Нужна облачная ферма',
    createFarm: 'Создать облачную ферму',
  },
  loginTagline: 'Журнал · регламенты · советник',
  login: {
    signInTitle: 'Вход',
    signUpTitle: 'Регистрация',
    google: 'Продолжить с Google',
    googlePending: 'Открываем Google…',
    or: 'или',
    email: 'Почта',
    password: 'Пароль',
    submitPending: 'Секунду…',
    noAccount: 'Нет аккаунта? Зарегистрироваться',
    hasAccount: 'Уже есть аккаунт? Войти',
    back: 'Назад',
    skip: 'Пропустить',
    offlineReminder: 'Без входа всё остаётся только на этом телефоне.',
    notices: {
      googleUnavailable: 'Вход через Google в этом приложении сейчас недоступен. Войдите по почте — поля ниже.',
      googleCancelled: 'Вход через Google отменён. Можно выбрать аккаунт ещё раз или войти по почте.',
      googleBusy: 'Окно входа Google уже открыто. Закройте его и нажмите кнопку ещё раз.',
      playServices: 'На телефоне нет сервисов Google Play, поэтому войти через Google нельзя. Используйте почту.',
      googleRejected: 'Google подтвердил аккаунт, но Growlog его не принял. Войдите по почте или попробуйте позже.',
      googleFailed: 'Вход через Google не завершился. Попробуйте ещё раз или войдите по почте ниже.',
      providerOff: 'Вход через Google выключен. Войдите по почте и паролю.',
      signupsClosed: 'Новые аккаунты сейчас не создаются. Если вы уже регистрировались, войдите.',
      confirmEmail: 'Почта ещё не подтверждена. Откройте письмо от Growlog, перейдите по ссылке и войдите снова.',
      badCredentials:
        'Почта или пароль не подходят. Если аккаунта ещё нет, нажмите «Нет аккаунта? Зарегистрироваться».',
      alreadyRegistered: 'Аккаунт с этой почтой уже есть. Нажмите «Уже есть аккаунт? Войти» и введите пароль.',
      shortPassword: 'Пароль слишком короткий или слишком простой. Сделайте его длиннее и попробуйте снова.',
      badEmail: 'Почта выглядит неверной. Проверьте адрес: в нём должны быть @ и домен.',
      missingFields: 'Введите почту и пароль, затем нажмите кнопку внизу.',
      rateLimit: 'Слишком много попыток подряд. Подождите минуту и попробуйте снова.',
      offline: 'Нет связи с сервером. Проверьте интернет и попробуйте снова.',
      blocked: 'Этот аккаунт заблокирован, войти им сейчас нельзя.',
      checkInbox: 'Мы отправили письмо со ссылкой. Откройте его, подтвердите почту и вернитесь сюда, чтобы войти.',
      generic: 'Войти не получилось. Проверьте данные и попробуйте ещё раз. Если аккаунта нет — зарегистрируйтесь.',
    },
  },
  workspace: {
    syncTitle: 'Синхронизация между устройствами',
    syncDesc: 'Войдите, чтобы синхронизировать телефон, подключить датчики и пользоваться ИИ в облаке.',
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
    empty: 'Нет подходящих устройств среди привязанных аккаунтов.',
    noLinks: 'Привяжите учётную запись в настройках, раздел «Датчики умного дома».',
    unconfigured: 'На сервере не заданы TUYA_ACCESS_ID и TUYA_ACCESS_SECRET.',
    error: 'Не удалось загрузить устройства.',
    online: 'Онлайн',
    offline: 'Не в сети',
    refresh: 'Обновить',
    sub: 'Zigbee',
  },
  dailyFocus: {
    loading: 'Загрузка…',
    onboardingRequired: 'Сначала завершите начальную настройку.',
    keySnapshot: 'Ключевой снимок',
    dayMeta: 'День {day} · {stage}',
    eventsToday: 'Событий сегодня: {count}',
    viewCycle: 'Подробнее о цикле',
    alertsRisks: 'Уведомления',
    noRisks: 'Недавних сигналов риска нет.',
    todaySop: 'Регламенты на сегодня',
    sopNeedsAccount: 'Чек-листы и напоминания по циклу. Чтобы включить, войдите в аккаунт.',
    loadingTasks: 'Загрузка задач…',
    noSopRuns: 'На сегодня открытых задач нет.',
    createSop: 'Создать регламент',
    eventsShort: '{count} событий',
    placeFarms: 'Ферма',
    placeRooms: 'Комната',
    mergedTitle: 'Фокус дня',
    refresh: 'Обновить',
    soon: 'Скоро',
    aiComment: 'Комментарий ИИ',
    aiStale: 'Комментарий ИИ мог устареть после изменений в регламентах.',
    overdueBadge: 'просрочено',
    viewAllSop: 'Все регламенты',
    noAiInsight: 'Комментария ИИ на сегодня пока нет.',
    noAiInsightHint: 'Нажмите «Обновить» после записей в журнале или выполнения регламентов.',
    openAssistant: 'Открыть ассистента',
    readMore: 'Подробнее',
    showLess: 'Свернуть',
    confidence: 'Уверенность',
    confidenceLow: 'Низкая',
    confidenceMedium: 'Средняя',
    confidenceHigh: 'Высокая',
    confidenceUnknown: 'не указана',
    showEvidence: 'Источники',
    hideEvidence: 'Скрыть источники',
    listen: 'Озвучить',
    insightTitleFallback: 'Заметка на сегодня',
    insightTypeDailyFocus: 'Фокус дня',
    groundingLoadError: 'Не удалось загрузить источники',
    noGrounding: 'К записи не привязаны данные фермы.',
    notSignedIn: 'Нужен вход',
    speakError: 'Не удалось воспроизвести',
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
    logProcedure: 'Записать процедуру',
    dayOfCycle: 'День {day}',
    formTitleNew: 'Новый цикл',
    formSubmit: 'Запустить цикл',
    localNewCycleWarning: 'Это заменит цикл на телефоне и очистит его журнал. Название фермы сохранится.',
    screenTitle: 'Цикл выращивания',
    logTitleWater: 'Запись полива',
    logTitleFeed: 'Запись подкормки',
    logTitleProcedure: 'Процедура',
    procedureLabel: 'Какая процедура?',
    procedurePlaceholder: 'Например: дефолиация, обработка, подвязка…',
    procedureRequired: 'Опишите, что сделали.',
    procedureFeedLabel: 'Процедура',
    procedureVoicePrompt: 'Опишите голосом',
    procedureRecording: 'Запись… нажмите микрофон, чтобы остановить',
    procedureTranscribing: 'Расшифровка…',
    procedureVoiceNeedSignIn: 'Авторизуйтесь, чтобы пользоваться голосовым вводом.',
    procedureVoiceFailed: 'Не удалось расшифровать голос. Попробуйте ещё раз.',
    procedureVoiceTooShort: 'Запись слишком короткая. Говорите хотя бы секунду.',
    procedureVoiceEmpty: 'Речь не распознана. Повторите ближе к микрофону.',
    procedureVoiceBadAudio: 'Не получилось прочитать запись. Попробуйте ещё раз.',
    procedureVoiceNetwork: 'Нет сети. Проверьте соединение и попробуйте снова.',
    procedureVoiceMicDenied: 'Нужен доступ к микрофону.',
    procedureVoiceNoFile: 'Файл записи не найден. Попробуйте ещё раз.',
    procedureVoiceTooLarge: 'Запись слишком большая. Говорите не дольше двух минут.',
    procedureVoiceUnavailable: 'Расшифровка голоса сейчас недоступна.',
    procedureVoiceA11y: 'Диктовка процедуры',
    procedureVoiceStopA11y: 'Остановить запись',
    procedureVoiceSendA11y: 'Отправить запись на расшифровку',
    procedureVoiceCancelA11y: 'Отменить запись',
    procedurePhotoA11y: 'Добавить фото',
    procedurePhotoNeedSignIn: 'Авторизуйтесь, чтобы прикрепить фото.',
    procedureRemovePhoto: 'Убрать фото',
    procedurePhotoAttachFailed: 'Запись сохранена, но фото не прикрепилось. Нажмите «Сохранить» ещё раз.',
    formName: 'Название цикла',
    formStrain: 'Сорт',
    formPlantCount: 'Количество растений',
    formVarietiesTitle: 'Сорт',
    formVarietyPlantCount: 'Количество растений',
    formVarietyComment: 'Комментарий',
    formVarietyAdd: 'Добавить сорт',
    formVarietyRemove: 'Удалить сорт',
    formVarietyNameRequired: 'Укажите название сорта, если заполнено количество растений.',
    formZone: 'Зона выращивания',
    formZoneNone: 'Без зоны',
    formStartMaterial: 'Стартовый материал',
    materialSeed: 'Семена',
    materialClone: 'Клон',
    formStartDate: 'Дата старта',
    formStartDateFromCalendar: 'Из календаря ленты: {date}',
    formLightPreset: 'Фотопериод',
    preset186: '18 ч света / 6 ч темноты',
    preset1212: '12 ч света / 12 ч темноты',
    presetCustom: 'Свой режим',
    formLightOn: 'Часов света',
    formLightOff: 'Часов темноты',
    formLightsOnAt: 'Время включения света',
    formPhotoperiodChart: 'Суточный график',
    formPhotoperiodChartInvalid:
      'Укажите часы света и темноты (в сумме 24) и время включения в формате ЧЧ:ММ.',
    formPhotoperiodChartA11y: 'Предпросмотр суточного режима света и темноты',
    formPhotoperiodLight: 'Свет',
    formPhotoperiodDark: 'Темнота',
    formVarietyQrTitle: 'Этикетки растений',
    formVarietyQrHint: 'QR появятся после указания количества. Печать — после запуска цикла.',
    formVarietyQrNeedCloud: 'Войдите и выберите ферму в облаке, чтобы использовать QR-этикетки.',
    plantLabelsTitle: 'Печать этикеток',
    plantLabelsPrint: 'Печать',
    plantLabelsSharePdf: 'Сохранить PDF',
    plantLabelsEmpty: 'В этом цикле пока нет растений.',
    plantLabelsLoading: 'Загрузка растений…',
    scanPlantTitle: 'Сканировать QR растения',
    scanPlantHint: 'Наведите камеру на QR-код на этикетке.',
    scanPlantOk: 'Растение распознано.',
    scanPlantInvalid: 'Это не QR-этикетка Growlog.',
    scanPlantNotFound: 'Растение не найдено на этой ферме.',
    scanPlantWrongFarm: 'Этикетка от другой фермы.',
    scanPlantPermission: 'Для сканирования нужен доступ к камере.',
    scanPlantEnableCamera: 'Разрешить камеру',
    scanPlantFocused: 'Вы у растения',
    scanPlantClear: 'Сбросить',
    eyeModeScanTitle: 'Скан этикетки',
    eyeModeClose: 'Закрыть',
    logVolume: 'Объём, мл',
    logPh: 'pH',
    logEc: 'EC, мС/см',
    logRecipe: 'Рецепт',
    logRecipeNone: 'Без рецепта',
    logRecipeEmpty: 'Сохранённых рецептов нет. Сохраните замес на NPK → «Рецепты» — он появится здесь. Неделя системы подставит его сама, только если рецепт привязан к неделе и программа назначена этому циклу.',
    logRecipeWeekChip: '{name} · нед. {week}',
    logRecipeMissing: 'Выбранный рецепт удалён. Выберите другой или сохраните без рецепта.',
    logRecipeShow: 'Рецепт и продукты',
    logRecipeHide: 'Свернуть',
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
    harvestNeedsAccount: 'Сырой и сухой вес хранятся в облаке. Войдите, когда будете готовы их записать.',
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
    stageOtherPick: 'Другая стадия',
    stageOtherApply: 'Применить стадию',
    trimmingStart: 'Начать тримминг',
    trimmingStop: 'Завершить тримминг',
    trimmingActiveLabel: 'Тримминг идёт',
    stageAdvance: {
      propagation: 'Перевести в проращивание',
      cloning: 'Перевести в клонирование',
      veg: 'Перевести в вегетацию',
      preflower: 'Перевести в предцвет',
      flower: 'Перевести в цветение',
      harvest: 'Харвест',
      drying: 'Начать сушку',
      trimming: 'Начать тримминг',
      curing: 'Начать пролечку',
      completed: 'Завершить цикл',
    },
    stageStepHint: {
      flower: 'Нажмите «Харвест», когда срезали.',
      harvest: 'Сырую и сухую массу можно указать в «Урожай» ниже, затем — сушка.',
      drying: 'Тримминг можно вести параллельно — переключатель ниже.',
      curing: 'На пролечке тримминг тоже можно продолжать. Затем — завершите цикл.',
    },
  },
  vpd: {
    title: 'Дефицит влаги (VPD)',
    desc: 'Данные с датчика. Если подставить своё число — это только для ориентира, в журнал проба не идёт. Через несколько секунд вернётся показание с датчика.',
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
    manualDesc: 'Можно ввести своё значение.',
    saveHint: 'Нажмите сохранить, чтобы значение попало в журнал.',
    saveJournal: 'Сохранить в журнал',
    manualSuggested: 'подсказка для этой стадии',
    manualSaved: 'записано в журнал',
    useSensor: 'Подключить датчик',
    useSensorHint: 'Войдите через Google и выберите датчик.',
  },
  captureScreen: {
    needOnboarding: 'Сначала завершите начальную настройку.',
    eventType: 'Тип события',
    whatHappened: 'Что произошло?',
    bodyPlaceholder: 'Опишите наблюдение или действие…',
    saveJournal: 'Сохранить в журнал',
    savedOffline: 'Сохранено офлайн — синхронизируется при подключении.',
    saveFailed: 'Не удалось сохранить',
    eventTypes: {
      note: 'Заметка',
      observation: 'Наблюдение',
      action_taken: 'Действие',
      watering: 'Полив',
      feeding: 'Подкормка',
      issue_detected: 'Проблема',
    },
  },
  advisorScreen: {
    recording: 'Запись… нажмите микрофон, чтобы остановить',
    addingPhoto: 'Добавление фото…',
    working: 'Обработка…',
    text: 'Текст',
    takePhoto: 'Сделать фото',
    choosePhoto: 'Выбрать фото',
    addA11y: 'Добавить текст или фото',
    inputPlaceholder: 'Запись факта или вопрос…',
    send: 'Отправить',
    closeTextComposerA11y: 'Закрыть ввод и вернуться к орбите',
    listening: 'Слушаю',
    hint: 'Микрофон пишет и отвечает. + — текст или фото.',
    emptyHint:
      'Голосом: удерживайте зелёную кнопку внизу. Клавиатура — набрать текст, фото слева.',
    emptyTitle: 'Чем помочь?',
    emptyLead:
      'Голос — удерживайте зелёную кнопку. Ниже орбита: фото, лист, QR, журнал, текст и зрение.',
    starterPrompt1: 'Что проверить сегодня?',
    starterPrompt2: 'Записать полив',
    starterPrompt3: 'Что не так с листьями?',
    bannerNote: 'Ответы на фактах фермы и проверке доверия',
    voiceHint: 'Зелёную кнопку внизу — диктовка. Клавиатура — набрать текст, фото слева.',
    textComposerHint: 'Наберите вопрос и «Отправить». Фото слева, голос — кнопка внизу.',
    photoA11y: 'Прикрепить фото',
    removePhoto: 'Убрать фото',
    removePhotoA11y: 'Убрать прикреплённое фото',
    photoOnlyQuestion: 'Проанализируй это фото в контексте текущей фермы и цикла.',
    photoNeedsOnline: 'Чтобы спросить с фото, нужна онлайн-загрузка.',
    photoNeedCycle: 'Выберите активный цикл и зону перед отправкой фото.',
    askingAssistant: 'Загружаю фото и получаю ответ…',
    extractingLog: 'Черновик записи в журнал…',
    orbit: {
      photoA11y: 'Прикрепить фото к вопросу',
      leafA11y: 'Диагностика листа',
      keyboardA11y: 'Набрать вопрос',
      qrA11y: 'Скан QR-метки растения',
      eyeA11y: 'Живое зрение (скоро)',
      plusA11y: 'Запись в журнал',
    },
    journalPlus: {
      title: 'Запись в журнал',
      voice: 'Голосом',
      text: 'Текстом',
    },
    journalSaved: {
      title: 'Сохранено в журнал',
      subtitle: 'Проверьте текст и время — запись уже в журнале этого цикла.',
      quoteLabel: 'Ваша запись',
      details: 'Реквизиты записи',
      journalDay: 'День в журнале',
      occurredAt: 'Время события',
      savedAt: 'Сохранено',
      farm: 'Ферма',
      cycle: 'Цикл',
      scope: 'Зона',
      stage: 'Стадия',
      entryId: 'Запись',
      ok: 'ОК',
      cancel: 'Отмена',
    },
    leafCapture: {
      working: 'Открываю камеру для skill листа…',
      needScope: 'Сначала выберите активный цикл и зону.',
      failed: 'Не удалось сохранить фото листа.',
      retry: 'Повторить',
      defaultCaption: 'Диагностика листа',
      uploading: 'Сохраняю фото…',
      analyzing: 'Разбираю лист…',
      analyzingHint: 'Результат появится в записи журнала с этим фото — обычно до минуты.',
      openJournal: 'Открыть в журнале',
      readyTitle: 'Разбор готов',
      readyWithHypotheses: 'Откройте запись: там гипотезы и кнопка «Записать гипотезу».',
      readyNoHypotheses: 'Откройте запись, чтобы увидеть наблюдение.',
      analysisFailed: 'Разбор не завершился. Фото всё равно можно открыть в журнале.',
      analysisTakingLong: 'Ещё идёт — откройте запись и потяните ленту для обновления.',
      savedOffline: 'Сохранено офлайн. Синхронизация и разбор — когда появится сеть.',
    },
    leafSyncNotice: {
      title: 'Фото листа синхронизировано',
      subtitle: 'Откройте запись в журнале — разбор догонит и появятся гипотезы.',
      openJournal: 'Открыть в журнале',
      dismiss: 'Позже',
    },
  },
  photosScreen: {
    needOnboarding: 'Сначала завершите начальную настройку.',
    maxSize: 'Макс. размер:',
    captionLabel: 'Подпись (необязательно)',
    captionPlaceholder: 'Что на фото?',
    takePhoto: 'Сделать фото',
    chooseGallery: 'Выбрать из галереи',
    permissionRequired: 'Нужно разрешение',
    tooLarge: 'Слишком большой файл ({size}). Макс. {max}.',
    savedOffline: 'Сохранено офлайн — синхронизируется при подключении.',
    uploaded: 'Фото загружено.',
    uploadFailed: 'Не удалось загрузить',
  },
  sopNewScreen: {
    needCycle: 'Нужны активный цикл и область.',
    screenTitle: 'Новый регламент',
    intro: 'Выберите, когда регламент должен появляться в этом цикле и области.',
    titleLabel: 'Название',
    titlePlaceholder: 'График обслуживания оборудования',
    descriptionLabel: 'Описание (необязательно)',
    descriptionPlaceholder: 'Что должен сделать оператор?',
    stepsLabel: 'Шаги',
    stepsHint: 'Каждый шаг станет галочкой при выполнении. Вставьте список — он разобьётся на шаги.',
    stepPlaceholder: 'Например: проверить фильтр кондиционера',
    addStep: '+ Добавить шаг',
    stepRequired: 'Обязательный',
    stepOptional: 'Необязательный',
    removeStep: 'Удалить шаг',
    dueTimeLabel: 'Время (локальное)',
    scheduleLabel: 'Расписание',
    scheduleDaily: 'Каждый день',
    scheduleWeekdays: 'По дням недели',
    scheduleMonthDay: 'Число месяца',
    scheduleStageEnter: 'Старт стадии',
    scheduleStageExit: 'Конец стадии',
    monthDayLabel: 'Число месяца',
    stageLabel: 'Стадия',
    timeHint: 'Время в 24-часовом формате, например 09:00 или 14:30',
    schedulePreviewTitle: 'Такие задачи появятся в календаре',
    schedulePreviewDaily: 'Каждый день в {time}',
    schedulePreviewWeekdays: '{days} в {time}',
    schedulePreviewMonthDay: '{day}-го числа в {time}',
    schedulePreviewStageEnter: 'Старт «{stage}» в {time}',
    schedulePreviewStageExit: 'Конец «{stage}» в {time}',
    createFailed: 'Не удалось создать регламент',
    create: 'Создать регламент',
  },
  sopRunScreen: {
    notFound: 'Задача не найдена',
    due: 'Срок: {when}',
    noDueDate: 'Без срока',
    alreadyClosed: 'Уже закрыт',
    statusLabel: 'Статус',
    notesLabel: 'Заметки',
    notesPlaceholder: 'Что произошло при выполнении?',
    requiredInputs: 'Обязательные поля',
    checklistTitle: 'Шаги',
    checklistProgress: 'Сделано {done} из {total}',
    stepOptional: 'необязательно',
    missingSteps: 'Отметьте все обязательные шаги или выберите «Частично».',
    back: 'Назад',
    saveFailed: 'Не удалось сохранить',
    submit: 'Записать выполнение',
    statuses: {
      done: 'Выполнено',
      delayed: 'С задержкой',
      partially_done: 'Частично',
      skipped: 'Пропущено',
      blocked: 'Заблокировано',
    },
  },
};

const th: MobileStrings = {
  tabs: {
    focus: 'โฟกัส',
    timeline: 'ไทม์ไลน์',
    ai: 'AI',
    nutrient: en.tabs.nutrient,
    sop: 'SOP',
    more: 'เมนู',
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
    growReport: en.more.growReport,
  },
  growReport: en.growReport,
  nutrient: en.nutrient,
  language: { ...en.language, label: 'ภาษา' },
  commonMobile: {
    saved: 'บันทึกแล้ว',
    error: 'ข้อผิดพลาด',
    saving: 'กำลังบันทึก…',
    add: 'เพิ่ม',
    cancel: 'ยกเลิก',
    loading: 'กำลังโหลด…',
  },
  settingsScreen: {
    localJournalHint: 'บันทึกและปฏิทินเก็บบนอุปกรณ์นี้จนกว่าจะซิงก์',
    farm: 'ฟาร์ม',
    saveFarmName: 'บันทึกชื่อฟาร์ม',
    activeFarm: 'ฟาร์มที่ใช้งาน',
    activeCycle: 'รอบที่ใช้งาน',
    since: 'ตั้งแต่',
    scope: 'Scope',
    offlineSync: 'ซิงก์ออฟไลน์',
    notifications: 'การแจ้งเตือน',
    enablePush: 'เปิดการแจ้งเตือน push',
    pushEnabled: 'เปิด push และลงทะเบียนแล้ว',
    pushDenied: 'ไม่ได้รับอนุญาต push',
    pushUnavailable: 'การแจ้งเตือน push ใช้ได้บนอุปกรณ์จริงเท่านั้น',
    onThisDevice: 'บนอุปกรณ์นี้',
    tokenRegistered: 'ลงทะเบียนโทเค็นแล้ว (local)',
    logOut: 'ออกจากระบบ',
    tuyaLinks: {
      title: 'เซ็นเซอร์บ้านอัจฉริยะ',
      desc: 'บัญชี Smart Life ที่ผูกกับฟาร์มนี้ อุปกรณ์ที่ตรงจะแสดงในเซ็นเซอร์และ VPD',
      empty: 'ยังไม่มีบัญชีเซ็นเซอร์ที่ผูกกับฟาร์ม',
      managedByGrowlog: 'การเชื่อมเซ็นเซอร์ตั้งค่าโดยผู้ดูแล Growlog',
      accounts: 'บัญชีที่ผูกแล้ว',
      devices: 'อุปกรณ์ที่ระบุไว้',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'ต้องมีรอบการปลูกที่ใช้งานอยู่',
    intro: 'ดำเนินการตามขั้นตอนและติดตามการปฏิบัติตาม',
    activeRuns: 'รันการทำงานที่เปิดอยู่',
    noRuns: 'ไม่มี SOP ที่เปิดสำหรับวันนี้',
    execute: 'ดำเนินการ',
    definitions: 'คำจำกัดความ',
    noDefinitions: 'ยังไม่มี SOP',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
  appearance: en.appearance,
  cloudGate: en.cloudGate,
  loginTagline: en.loginTagline,
  login: en.login,
  workspace: en.workspace,
  smartLife: {
    title: 'อุปกรณ์ SmartLife',
    desc: 'รายการสดจากบัญชีที่เชื่อมไว้ ยังไม่บันทึกค่าที่อ่านได้',
    loading: 'กำลังโหลดอุปกรณ์…',
    empty: 'ไม่มีอุปกรณ์ที่เชื่อมไว้',
    noLinks: en.smartLife.noLinks,
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
  captureScreen: en.captureScreen,
  advisorScreen: en.advisorScreen,
  photosScreen: en.photosScreen,
  sopNewScreen: en.sopNewScreen,
  sopRunScreen: en.sopRunScreen,
  leafSkill: en.leafSkill,
};

const my: MobileStrings = {
  tabs: {
    focus: 'အာရုံ',
    timeline: 'အချိန်ဇယား',
    ai: 'AI',
    nutrient: en.tabs.nutrient,
    sop: 'SOP',
    more: 'မီနူး',
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
    growReport: en.more.growReport,
  },
  growReport: en.growReport,
  nutrient: en.nutrient,
  language: { ...en.language, label: 'ဘာသာစကား' },
  commonMobile: en.commonMobile,
  settingsScreen: en.settingsScreen,
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  leafSkill: en.leafSkill,
  sopScreen: en.sopScreen,
  appearance: en.appearance,
  cloudGate: en.cloudGate,
  loginTagline: en.loginTagline,
  login: en.login,
  workspace: en.workspace,
  smartLife: {
    title: 'SmartLife စက်များ',
    desc: 'ချိတ်ဆက်ထားသော အကောင့်မှ လက်ရှိစာရင်း။ ဖတ်ရှုချက်များကို မသိမ်းရသေးပါ။',
    loading: 'စက်များ တင်နေသည်…',
    empty: 'ချိတ်ဆက်ထားသော စက်မရှိပါ။',
    noLinks: en.smartLife.noLinks,
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
  captureScreen: en.captureScreen,
  advisorScreen: en.advisorScreen,
  photosScreen: en.photosScreen,
  sopNewScreen: en.sopNewScreen,
  sopRunScreen: en.sopRunScreen,
};

function cloneMobileStrings(source: MobileStrings): MobileStrings {
  return JSON.parse(JSON.stringify(source)) as MobileStrings;
}

/** English clone until locale-specific copy is filled in mobile-strings. */
const fr = cloneMobileStrings(en);
const es = cloneMobileStrings(en);
const de = cloneMobileStrings(en);
const it = cloneMobileStrings(en);
const vi = cloneMobileStrings(en);

type ScreenLocalePack = Partial<
  Pick<
    MobileStrings,
    | 'language'
    | 'commonMobile'
    | 'settingsScreen'
    | 'farmMembersScreen'
    | 'onboardingScreen'
    | 'timelineScreen'
    | 'sopScreen'
    | 'captureScreen'
    | 'advisorScreen'
    | 'photosScreen'
    | 'sopNewScreen'
    | 'sopRunScreen'
    | 'nutrient'
  >
> & {
  tabs?: Partial<MobileStrings['tabs']>;
  more?: Partial<MobileStrings['more']>;
};

function applyScreenPack(target: MobileStrings, pack: ScreenLocalePack): void {
  if (pack.language) target.language = pack.language;
  if (pack.commonMobile) target.commonMobile = pack.commonMobile;
  if (pack.settingsScreen) target.settingsScreen = pack.settingsScreen;
  if (pack.farmMembersScreen) target.farmMembersScreen = pack.farmMembersScreen;
  if (pack.onboardingScreen) target.onboardingScreen = pack.onboardingScreen;
  if (pack.timelineScreen) target.timelineScreen = pack.timelineScreen;
  if (pack.sopScreen) target.sopScreen = pack.sopScreen;
  if (pack.captureScreen) target.captureScreen = pack.captureScreen;
  if (pack.advisorScreen) target.advisorScreen = pack.advisorScreen;
  if (pack.photosScreen) target.photosScreen = pack.photosScreen;
  if (pack.sopNewScreen) target.sopNewScreen = pack.sopNewScreen;
  if (pack.sopRunScreen) target.sopRunScreen = pack.sopRunScreen;
  if (pack.nutrient) target.nutrient = pack.nutrient;
  if (pack.tabs) target.tabs = { ...target.tabs, ...pack.tabs };
  if (pack.more) target.more = { ...target.more, ...pack.more };
}

const FR_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'Langue' },
  commonMobile: {
    saved: 'Enregistré.',
    error: 'Erreur',
    saving: 'Enregistrement…',
    add: 'Ajouter',
    cancel: 'Annuler',
    loading: 'Chargement…',
  },
  settingsScreen: {
    localJournalHint: 'Le journal et le calendrier restent sur cet appareil jusqu’à la synchronisation.',
    farm: 'Ferme',
    saveFarmName: 'Enregistrer le nom de la ferme',
    activeFarm: 'Ferme active',
    activeCycle: 'Cycle actif',
    since: 'depuis',
    scope: 'Scope',
    offlineSync: 'Sync hors ligne',
    notifications: 'Notifications',
    enablePush: 'Activer les notifications push',
    pushEnabled: 'Notifications push activées et enregistrées.',
    pushDenied: 'Autorisation push refusée.',
    pushUnavailable: 'Les notifications push nécessitent un appareil physique.',
    onThisDevice: 'Sur cet appareil',
    tokenRegistered: 'Jeton enregistré (local)',
    logOut: 'Se déconnecter',
    tuyaLinks: {
      title: 'Capteurs maison connectée',
      desc: 'Comptes Smart Life liés à cette ferme. Les appareils correspondants apparaissent dans les capteurs et le VPD.',
      empty: 'Aucun compte capteur lié à cette ferme.',
      managedByGrowlog: 'La liaison des capteurs est configurée par l’administrateur Growlog.',
      accounts: 'Comptes liés',
      devices: 'Appareils explicites',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Un cycle de culture actif est requis.',
    intro: 'Exécutez les procédures et suivez la conformité.',
    activeRuns: 'Exécutions actives',
    noRuns: 'Aucune SOP ouverte pour aujourd’hui.',
    execute: 'Exécuter',
    definitions: 'Définitions',
    noDefinitions: 'Aucune définition SOP.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
};

const ES_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'Idioma' },
  commonMobile: {
    saved: 'Guardado.',
    error: 'Error',
    saving: 'Guardando…',
    add: 'Añadir',
    cancel: 'Cancelar',
    loading: 'Cargando…',
  },
  settingsScreen: {
    localJournalHint: 'El diario y el calendario se guardan en este dispositivo hasta sincronizar.',
    farm: 'Granja',
    saveFarmName: 'Guardar nombre de la granja',
    activeFarm: 'Granja activa',
    activeCycle: 'Ciclo activo',
    since: 'desde',
    scope: 'Scope',
    offlineSync: 'Sincronización offline',
    notifications: 'Notificaciones',
    enablePush: 'Activar notificaciones push',
    pushEnabled: 'Notificaciones push activadas y registradas.',
    pushDenied: 'Permiso push denegado.',
    pushUnavailable: 'Las notificaciones push requieren un dispositivo físico.',
    onThisDevice: 'En este dispositivo',
    tokenRegistered: 'Token registrado (local)',
    logOut: 'Cerrar sesión',
    tuyaLinks: {
      title: 'Sensores del hogar inteligente',
      desc: 'Cuentas Smart Life vinculadas a esta granja. Los dispositivos coincidentes aparecen en sensores y VPD.',
      empty: 'Aún no hay cuentas de sensores vinculadas a esta granja.',
      managedByGrowlog: 'La vinculación de sensores la configura el administrador de Growlog.',
      accounts: 'Cuentas vinculadas',
      devices: 'Dispositivos explícitos',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Se requiere un ciclo de cultivo activo.',
    intro: 'Ejecute procedimientos y controle el cumplimiento.',
    activeRuns: 'Ejecuciones activas',
    noRuns: 'No hay SOP abiertas para hoy.',
    execute: 'Ejecutar',
    definitions: 'Definiciones',
    noDefinitions: 'Aún no hay definiciones SOP.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
};

const DE_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'Sprache' },
  commonMobile: {
    saved: 'Gespeichert.',
    error: 'Fehler',
    saving: 'Speichern…',
    add: 'Hinzufügen',
    cancel: 'Abbrechen',
    loading: 'Laden…',
  },
  settingsScreen: {
    localJournalHint: 'Journal und Kalender bleiben auf diesem Gerät, bis Sie synchronisieren.',
    farm: 'Farm',
    saveFarmName: 'Farmnamen speichern',
    activeFarm: 'Aktive Farm',
    activeCycle: 'Aktiver Zyklus',
    since: 'seit',
    scope: 'Scope',
    offlineSync: 'Offline-Sync',
    notifications: 'Benachrichtigungen',
    enablePush: 'Push-Benachrichtigungen aktivieren',
    pushEnabled: 'Push aktiviert und registriert.',
    pushDenied: 'Push-Berechtigung verweigert.',
    pushUnavailable: 'Push-Benachrichtigungen erfordern ein physisches Gerät.',
    onThisDevice: 'Auf diesem Gerät',
    tokenRegistered: 'Token registriert (lokal)',
    logOut: 'Abmelden',
    tuyaLinks: {
      title: 'Smart-Home-Sensoren',
      desc: 'Mit dieser Farm verknüpfte Smart-Life-Konten. Passende Geräte erscheinen unter Sensoren und VPD.',
      empty: 'Noch keine Sensorkonten mit dieser Farm verknüpft.',
      managedByGrowlog: 'Die Sensorverknüpfung richtet der Growlog-Administrator ein.',
      accounts: 'Verknüpfte Konten',
      devices: 'Explizite Geräte',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Ein aktiver Grow-Zyklus ist erforderlich.',
    intro: 'Prozeduren ausführen und Compliance verfolgen.',
    activeRuns: 'Aktive Läufe',
    noRuns: 'Keine offenen SOP für heute.',
    execute: 'Ausführen',
    definitions: 'Definitionen',
    noDefinitions: 'Noch keine SOP-Definitionen.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
  tabs: { nutrient: 'Nährstoffe' },
  more: { nutrient: 'Nährstoffrechner', cycle: 'Zyklus' },
  nutrient: {
    tabs: {
      fertilizers: 'Düngemittel',
      systems: 'Fütterungssysteme',
      water: 'Wasser',
      elements: 'Elemente',
      solutions: 'Rezepte',
    },
    hintFertilizers: 'Produkte auswählen — daraus werden Dosen berechnet.',
    volumeL: 'Tankvolumen (L)',
    cycleLinked: 'Mit aktivem Zyklus verknüpft',
    results: 'Dosen',
    alternatives: 'Alternativen',
    tab_water: 'Wasserprofile synchronisieren nach Anmeldung.',
    tab_elements: 'Elementreferenz im Katalog.',
    tab_solutions: 'Gespeicherte Farm-Rezepte nach Anmeldung.',
    searchFertilizers: 'Düngemittel suchen',
    favoritesOnly: 'Nur Favoriten',
    favoritesShowAll: 'Alle',
    favoritesEmpty: 'Noch keine Favoriten.',
    toggleFavorite: 'Favorit umschalten',
    clearSelection: 'Auswahl aufheben',
    clearFavorites: 'Favoriten leeren',
    fertilizerSortByMacro: 'Nach {macro}',
    fertilizerCompositionEmpty: 'Keine Zusammensetzung hinterlegt.',
    fertilizerCompositionMacros: 'Makronährstoffe',
    fertilizerCompositionMicros: 'Mikronährstoffe',
    fertilizerCompositionAdd: 'Element hinzufügen',
    compositionEdited: 'Geändert',
    newFarmProduct: 'Neu hinzufügen',
    fertilizerName: 'Name',
    fertilizerDraftMissing: 'Name und mindestens einen Prozentwert angeben.',
    saveRecipe: 'Rezept speichern',
    recipeName: 'Rezeptname',
    feedingEventBody: 'Nährstoffmix: {name} ({volume} L)',
    starterLead: 'Für diesen Tank gibt es bereits einen Startlauf. Zum Speichern einen Namen vergeben.',
    composition: 'Zusammensetzung',
    compositionMeta: 'Etikett / Hersteller',
    stepVolume: 'Tankvolumen',
    stepVolumeHint: 'Für Dosen pro Tank und Timeline-Einträge.',
    saveVolume: 'Volumen speichern',
    volumeSaved: 'Volumen gespeichert',
    chooseSolution: 'Lösung wählen',
    chooseSolutionHint: 'Gespeichertes Rezept oder Profil als Ziel.',
    targetProfileMine: 'Eigene',
    targetProfileCatalog: 'Referenz',
    saveTargetProfile: 'Als Ziel speichern',
    saveTargetProfileHint: 'Erreichte mg/L unter Eigene speichern.',
    saveTargetProfileName: 'Zielname',
    saveTargetProfileDone: 'Unter Eigene gespeichert.',
    saveTargetProfileNeedMix: 'Zuerst Dünger wählen und berechnen.',
    savedSolutions: 'Gespeicherte Rezepte',
    savedSolutionsHint: 'Rezepte, die Sie für die Farm gespeichert haben.',
    recipeOpen: 'Öffnen',
    recipeRename: 'Umbenennen',
    recipeRenameSave: 'Speichern',
    recipeDelete: 'Löschen',
    recipeDuplicate: 'Duplizieren',
    recipeLiters: 'Liter',
    wandLead: 'Eine Mischung entsteht hier nur aus Ziel und Dünger. Ein Name allein reicht nicht.',
    wandNeedsSolution: 'Wählen Sie oben ein Zielprofil.',
    wandNeedsFertilizers: 'Dünger auswählen. Daraus wird die Mischung berechnet.',
    wandComputing: 'Mischung wird berechnet…',
    wandEmptyTarget: 'Dieses Ziel hat noch keine mg/L. Wählen Sie oben ein Profil.',
    wandNoDoses:
      'Berechnet, aber keine Dosis aus den markierten Düngern. Oft fehlen N- oder Ca-Quellen für dieses Ziel.',
    saveMixHint: 'Diese Variante speichern. Gramm pro Liter landen bei den gespeicherten Mischungen.',
    wandSectionMix: 'Mischungen',
    wandSectionTarget: 'Ziele',
    save: 'Speichern',
    doseUnitMass: 'g/L',
    doseUnitVolume: 'ml/L',
    doseStockLine: 'Stammlösung {amount} {unit} · Tank {tank}',
    saveMixDone: 'Gespeichert. Die Mischung liegt bei den Rezepten.',
    variantBest: 'Beste',
    variantAlt: 'Variante {n}',
    variantsHeading: 'Berechnete Mischungen',
    elementTarget: 'Ziel',
    elementAchieved: 'Ist',
    elementDelta: 'Δ%',
    elementNUnknown: 'Form unbekannt',
    elementMass: 'g/mol',
    elementValence: 'Valenz',
    elementsInSolution: 'In der Lösung',
    elementsInSolutionUnit: 'mg/L',
    elementFractions: 'Elementanteile (ausgewählte Produkte)',
    doseUnitMassShort: 'g',
    doseUnitVolumeShort: 'ml',
    doseTankLine: 'Tank {amount} {unit}',
    ecLine: 'EC {value} mS/cm',
    saltOne: 'Salz',
    saltFew: 'Salze',
    saltMany: 'Salze',
    variantsOnlyOne: 'Keine weitere Mischung aus diesen Düngern.',
    assembleShort: '{element} liegt bei {pct}% des Ziels.',
    assembleBlocked:
      '{element} liegt bei {pct}% des Ziels.\nBis 90% würde {blocker} die Obergrenze überschreiten. Es braucht ein {element}-Salz ohne {blocker}.',
    assembleBlockedMulti:
      '{entries} erreichen 90% nicht, ohne {blocker} über die Obergrenze zu heben. Es brauchen {salts}-Salze ohne {blocker}.',
    assembleMissing: 'Keiner der gewählten Dünger liefert {element}.',
    assembleFloor: 'N, P, K, Ca und Mg gelten ab 90% als gedeckt.',
    nitrogenFormGap:
      'Das Ziel verlangt Stickstoffformen, die Dünger nennen aber nur Gesamt-N. Der füllt Nitrat, Ammonium und Harnstoff nicht.',
    helpOpen: 'So wird gerechnet',
    helpClose: 'Schließen',
    helpCurious: 'Für Neugierige',
    mixFavoritesLabel: 'Favoriten',
    mixFavoriteAdd: 'Zu Favoriten',
    mixFavoriteRemove: 'Aus Favoriten entfernen',
    mixFavoritesClear: 'Favoriten leeren',
    mixFavoritesClearBody: 'Alle Vergleichsmischungen auf diesem Gerät entfernen?',
    mixFavoritesHint: 'Bleiben zwischen Berechnungen, bis Sie die Favoriten leeren. Öffnen, um als Ziel oder Mischung zu speichern.',
    manualDose: 'Manuell',
    feedSystemsEmpty:
      'Noch kein Fütterungssystem. Hier: Wochenziele in mg/L. Pro Woche ein gespeichertes Rezept verknüpfen; Gramm unter Gespeicherte Mischungen auf Rezepte.',
    feedSystemCreate: 'Fütterungssystem anlegen',
    feedSystemDefaultName: 'Mein Programm',
    feedSystemWeek: 'Woche {label}',
    feedSystemStepSolution: 'Rezept für diese Woche',
    feedSystemStepSolutionNone: 'Kein Rezept verknüpft',
    deleteFeedSystemTitle: 'Fütterungssystem löschen?',
    deleteFeedSystemBody: 'Fütterungssystem „{name}“ entfernen? Das lässt sich nicht rückgängig machen.',
    attachCycle: 'Für diesen Grow nutzen',
    attachCycleHint: 'Der aktuelle Zyklus übernimmt das Ziel aus diesem Programm.',
    systemNamePlaceholder: 'z. B. Hersteller A+B Woche 3',
    waterProfile: {
      lead: 'Mineralien im Wasser werden vom Ziel abgezogen. Umkehrosmose oder kein Laborbefund: „Wasser nicht berücksichtigen“ lassen.',
      none: 'Wasser nicht berücksichtigen',
      add: 'Wasseranalyse eintragen',
      compositionHint: 'Milligramm pro Liter aus dem Befund. Ein leeres Feld heißt, dieses Ion fehlt im Bericht.',
      namePlaceholder: 'Name, zum Beispiel Leitung zu Hause',
      nameRequired: 'Zuerst einen Namen. Der Name allein ändert die Mischung nicht.',
      applied: 'Diese mg/L werden auf „Rezepte“ vom Ziel abgezogen.',
      allZero: 'Alles null: die Dosen ändern sich nicht. Das passt für Osmose — oder die Analyse eintragen.',
      edit: 'Analyse ändern',
      deleteLabel: 'Löschen',
      deleteTitle: 'Dieses Wasser löschen?',
      deleteBody: '„{name}“ löschen? Das lässt sich nicht rückgängig machen.',
      unit: 'mg/L',
      ec: 'EC, mS/cm',
      ph: 'pH',
    },
    solutions: { copySuffix: ' (Kopie)' },
  },
  captureScreen: {
    needOnboarding: 'Schließen Sie zuerst das Onboarding ab.',
    eventType: 'Event-Typ',
    whatHappened: 'Was ist passiert?',
    bodyPlaceholder: 'Beobachtung oder Aktion beschreiben…',
    saveJournal: 'Im Tagebuch speichern',
    savedOffline: 'Offline gespeichert — synchronisiert bei Verbindung.',
    saveFailed: 'Speichern fehlgeschlagen',
    eventTypes: {
      note: 'Notiz',
      observation: 'Beobachtung',
      action_taken: 'Maßnahme',
      watering: 'Bewässerung',
      feeding: 'Düngung',
      issue_detected: 'Problem',
    },
  },
  advisorScreen: {
    recording: 'Aufnahme… Tippen Sie auf das Mikro zum Stoppen',
    addingPhoto: 'Foto wird hinzugefügt…',
    working: 'Verarbeitung…',
    text: 'Text',
    takePhoto: 'Foto aufnehmen',
    choosePhoto: 'Foto wählen',
    addA11y: 'Text oder Foto hinzufügen',
    inputPlaceholder: 'Fakt protokollieren oder fragen…',
    send: 'Senden',
    closeTextComposerA11y: 'Texteingabe schließen und zu Aktionen zurück',
    listening: 'Hört zu',
    hint: 'Mikro protokolliert und fragt. + für Text oder Foto.',
    emptyHint: 'Voice: hold the green button below. Keyboard — type text, photo on the left.',
    emptyTitle: 'What can I help with?',
    emptyLead: 'Hold the green button for voice. Use the orbit below for photo, leaf, QR, journal, and text.',
    starterPrompt1: 'What should I check today?',
    starterPrompt2: 'Log a watering',
    starterPrompt3: 'Help with leaf issues',
    bannerNote: 'Answers from farm facts and trust checks',
    voiceHint: 'Green button below — dictate. Keyboard — type text, photo on the left.',
    textComposerHint: 'Type your question and tap Send. Photo on the left; hold the green button below for voice.',
    photoA11y: 'Attach photo',
    removePhoto: 'Remove photo',
    removePhotoA11y: 'Remove attached photo',
    photoOnlyQuestion: 'Analyze this photo in the context of the current farm and cycle.',
    photoNeedsOnline: 'Photo must upload online before asking the assistant.',
    photoNeedCycle: 'Select an active cycle and scope before sending a photo.',
    askingAssistant: 'Uploading photo and getting answer…',
    extractingLog: 'Extracting journal draft…',
    orbit: en.advisorScreen.orbit,
    journalPlus: en.advisorScreen.journalPlus,
    journalSaved: en.advisorScreen.journalSaved,
    leafCapture: en.advisorScreen.leafCapture,
    leafSyncNotice: en.advisorScreen.leafSyncNotice,
  },
  photosScreen: {
    needOnboarding: 'Schließen Sie zuerst das Onboarding ab.',
    maxSize: 'Max. Größe:',
    captionLabel: 'Beschriftung (optional)',
    captionPlaceholder: 'Was zeigt das Bild?',
    takePhoto: 'Foto aufnehmen',
    chooseGallery: 'Aus Galerie wählen',
    permissionRequired: 'Berechtigung erforderlich',
    tooLarge: 'Zu groß ({size}). Max. {max}.',
    savedOffline: 'Offline gespeichert — synchronisiert bei Verbindung.',
    uploaded: 'Foto hochgeladen.',
    uploadFailed: 'Upload fehlgeschlagen',
  },
  sopNewScreen: {
    needCycle: 'Aktiver Zyklus und Scope erforderlich.',
    screenTitle: 'Neuer SOP',
    intro: 'Choose when this procedure is due for the current cycle and scope.',
    titleLabel: 'Titel',
    titlePlaceholder: 'z. B. Morgendlicher VPD-Check',
    descriptionLabel: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Was soll der Operator tun?',
    stepsLabel: 'Schritte',
    stepsHint: 'Jeder Schritt wird bei der Ausführung zu einem Häkchen. Eine eingefügte Liste wird in Schritte aufgeteilt.',
    stepPlaceholder: 'z. B. Klimaanlagenfilter prüfen',
    addStep: '+ Schritt hinzufügen',
    stepRequired: 'Pflicht',
    stepOptional: 'Optional',
    removeStep: 'Schritt entfernen',
    dueTimeLabel: 'Fälligkeitszeit (lokal)',
    scheduleLabel: 'Schedule',
    scheduleDaily: 'Every day',
    scheduleWeekdays: 'Weekdays',
    scheduleMonthDay: 'Day of month',
    scheduleStageEnter: 'When a stage starts',
    scheduleStageExit: 'When a stage ends',
    monthDayLabel: 'Day of the month',
    stageLabel: 'Stage',
    timeHint: '24-hour time, for example 09:00 or 14:30',
    schedulePreviewTitle: 'You will get runs like',
    schedulePreviewDaily: 'Every day at {time}',
    schedulePreviewWeekdays: '{days} at {time}',
    schedulePreviewMonthDay: 'Day {day} of the month at {time}',
    schedulePreviewStageEnter: 'When {stage} starts at {time}',
    schedulePreviewStageExit: 'When {stage} ends at {time}',
    createFailed: 'SOP konnte nicht erstellt werden',
    create: 'SOP erstellen',
  },
  sopRunScreen: {
    notFound: 'SOP-Run nicht gefunden',
    due: 'Fällig {when}',
    noDueDate: 'Kein Fälligkeitsdatum',
    alreadyClosed: 'Bereits geschlossen',
    statusLabel: 'Status',
    notesLabel: 'Notizen',
    notesPlaceholder: 'Was ist bei der Ausführung passiert?',
    requiredInputs: 'Pflichtfelder',
    checklistTitle: 'Schritte',
    checklistProgress: '{done} von {total} erledigt',
    stepOptional: 'optional',
    missingSteps: 'Alle Pflichtschritte abhaken oder „Teilweise“ wählen.',
    back: 'Zurück',
    saveFailed: 'Speichern fehlgeschlagen',
    submit: 'Ausführung erfassen',
    statuses: {
      done: 'Erledigt',
      delayed: 'Verzögert',
      partially_done: 'Teilweise',
      skipped: 'Übersprungen',
      blocked: 'Blockiert',
    },
  },
};

const IT_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'Lingua' },
  commonMobile: {
    saved: 'Salvato.',
    error: 'Errore',
    saving: 'Salvataggio…',
    add: 'Aggiungi',
    cancel: 'Annulla',
    loading: 'Caricamento…',
  },
  settingsScreen: {
    localJournalHint: 'Diario e calendario restano su questo dispositivo finché non sincronizzi.',
    farm: 'Azienda',
    saveFarmName: 'Salva nome azienda',
    activeFarm: 'Azienda attiva',
    activeCycle: 'Ciclo attivo',
    since: 'dal',
    scope: 'Scope',
    offlineSync: 'Sync offline',
    notifications: 'Notifiche',
    enablePush: 'Attiva notifiche push',
    pushEnabled: 'Notifiche push attivate e registrate.',
    pushDenied: 'Permesso push negato.',
    pushUnavailable: 'Le notifiche push richiedono un dispositivo fisico.',
    onThisDevice: 'Su questo dispositivo',
    tokenRegistered: 'Token registrato (locale)',
    logOut: 'Esci',
    tuyaLinks: {
      title: 'Sensori casa intelligente',
      desc: 'Account Smart Life collegati a questa azienda. I dispositivi corrispondenti compaiono in sensori e VPD.',
      empty: 'Nessun account sensori collegato a questa azienda.',
      managedByGrowlog: 'Il collegamento dei sensori è configurato dall’amministratore Growlog.',
      accounts: 'Account collegati',
      devices: 'Dispositivi espliciti',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'È richiesto un ciclo colturale attivo.',
    intro: 'Esegui procedure e monitora la conformità.',
    activeRuns: 'Esecuzioni attive',
    noRuns: 'Nessuna SOP aperta per oggi.',
    execute: 'Esegui',
    definitions: 'Definizioni',
    noDefinitions: 'Nessuna definizione SOP.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
  tabs: { nutrient: 'Nutrienti' },
  more: { nutrient: 'Calcolatore nutrienti', cycle: 'Ciclo' },
  nutrient: {
    tabs: {
      fertilizers: 'Fertilizzanti',
      systems: 'Sistemi nutrizione',
      water: 'Acqua',
      elements: 'Elementi',
      solutions: 'Ricette',
    },
    hintFertilizers: 'Seleziona i prodotti — da lì si calcolano le dosi.',
    volumeL: 'Volume vasca (L)',
    cycleLinked: 'Collegato al ciclo attivo',
    results: 'Dosi',
    alternatives: 'Alternative',
    tab_water: 'I profili acqua si sincronizzano dopo l’accesso.',
    tab_elements: 'Riferimento elementi nel catalogo.',
    tab_solutions: 'Ricette azienda salvate dopo l’accesso.',
    searchFertilizers: 'Cerca fertilizzanti',
    favoritesOnly: 'Solo preferiti',
    favoritesShowAll: 'Tutti',
    favoritesEmpty: 'Nessun preferito.',
    toggleFavorite: 'Preferito',
    clearSelection: 'Deseleziona tutto',
    clearFavorites: 'Svuota preferiti',
    fertilizerSortByMacro: 'Ordina per {macro}',
    fertilizerCompositionEmpty: 'Composizione non indicata.',
    fertilizerCompositionMacros: 'Macronutrienti',
    fertilizerCompositionMicros: 'Micronutrienti',
    fertilizerCompositionAdd: 'Aggiungi elemento',
    compositionEdited: 'Modificato',
    newFarmProduct: 'Aggiungi nuovo',
    fertilizerName: 'Nome',
    fertilizerDraftMissing: 'Inserisci un nome e almeno una percentuale.',
    saveRecipe: 'Salva ricetta',
    recipeName: 'Nome ricetta',
    feedingEventBody: 'Mix nutrienti: {name} ({volume} L)',
    starterLead: 'Per questo serbatoio c’è già un calcolo iniziale. Per salvare, assegna un nome.',
    composition: 'Composizione',
    compositionMeta: 'Etichetta / produttore',
    stepVolume: 'Volume vasca',
    stepVolumeHint: 'Per dosi per vasca e voci timeline.',
    saveVolume: 'Salva volume',
    volumeSaved: 'Volume salvato',
    chooseSolution: 'Scegli soluzione',
    chooseSolutionHint: 'Ricetta o profilo salvato come obiettivo.',
    targetProfileMine: 'Mie',
    targetProfileCatalog: 'Riferimento',
    saveTargetProfile: 'Salva come obiettivo',
    saveTargetProfileHint: 'Salva i mg/L raggiunti in Mie.',
    saveTargetProfileName: 'Nome obiettivo',
    saveTargetProfileDone: 'Salvato in Mie.',
    saveTargetProfileNeedMix: 'Seleziona fertilizzanti e calcola prima.',
    savedSolutions: 'Ricette salvate',
    savedSolutionsHint: 'Ricette salvate per l’azienda.',
    recipeOpen: 'Apri',
    recipeRename: 'Rinomina',
    recipeRenameSave: 'Salva',
    recipeDelete: 'Elimina',
    recipeDuplicate: 'Duplica',
    recipeLiters: 'Litri',
    wandLead: 'Una miscela compare qui solo da un obiettivo e dai fertilizzanti. Il solo nome non la crea.',
    wandNeedsSolution: 'Scegli un profilo obiettivo nella scheda sopra.',
    wandNeedsFertilizers: 'Seleziona i fertilizzanti. La miscela si calcola da quelli.',
    wandComputing: 'Calcolo della miscela…',
    wandEmptyTarget: 'Obiettivo senza mg/L. Scegli un profilo nella scheda sopra.',
    wandNoDoses:
      'Calcolo ok, ma nessuna dose dalle salse selezionate. Spesso mancano fonti di N o Ca per questo obiettivo.',
    saveMixHint: 'Salva la variante sullo schermo. I grammi per litro vanno nelle miscele salvate.',
    wandSectionMix: 'Miscele',
    wandSectionTarget: 'Obiettivi',
    save: 'Salva',
    doseUnitMass: 'g/L',
    doseUnitVolume: 'ml/L',
    doseStockLine: 'stock {amount} {unit} · vasca {tank}',
    saveMixDone: 'Salvato. La miscela è nell’elenco.',
    variantBest: 'Migliore',
    variantAlt: 'Variante {n}',
    variantsHeading: 'Varianti calcolate',
    elementTarget: 'Obiettivo',
    elementAchieved: 'Ottenuto',
    elementDelta: 'Δ%',
    elementNUnknown: 'forma sconosciuta',
    elementMass: 'g/mol',
    elementValence: 'valenza',
    elementsInSolution: 'Nella soluzione',
    elementsInSolutionUnit: 'mg/L',
    elementFractions: 'Frazioni elementali (prodotti selezionati)',
    doseUnitMassShort: 'g',
    doseUnitVolumeShort: 'ml',
    doseTankLine: 'vasca {amount} {unit}',
    ecLine: 'EC {value} mS/cm',
    saltOne: 'sale',
    saltFew: 'sali',
    saltMany: 'sali',
    variantsOnlyOne: 'Nessun’altra miscela da questi fertilizzanti.',
    assembleShort: '{element} è al {pct}% dell’obiettivo.',
    assembleBlocked:
      '{element} è al {pct}% dell’obiettivo.\nPortarlo al 90% spingerebbe {blocker} oltre il tetto. Serve un sale di {element} senza {blocker}.',
    assembleBlockedMulti:
      '{entries} non raggiungono il 90% senza spingere {blocker} oltre il tetto. Servono sali di {salts} senza {blocker}.',
    assembleMissing: 'Nessun fertilizzante selezionato apporta {element}.',
    assembleFloor: 'N, P, K, Ca e Mg contano come coperti dal 90%.',
    nitrogenFormGap:
      'L’obiettivo chiede forme di azoto, ma i fertilizzanti indicano solo N totale. Non copre nitrato, ammonio o urea.',
    helpOpen: 'Come viene calcolato',
    helpClose: 'Chiudi',
    helpCurious: 'Per chi vuole il dettaglio',
    mixFavoritesLabel: 'Preferiti',
    mixFavoriteAdd: 'Aggiungi ai preferiti',
    mixFavoriteRemove: 'Rimuovi dai preferiti',
    mixFavoritesClear: 'Svuota preferiti',
    mixFavoritesClearBody: 'Rimuovere tutte le miscele di confronto salvate su questo dispositivo?',
    mixFavoritesHint: 'Restano tra un calcolo e l’altro finché non svuoti i preferiti. Apri per salvarla come obiettivo o miscela.',
    manualDose: 'Manuale',
    feedSystemsEmpty:
      'Nessun sistema. Qui: obiettivi mg/L per settimana. Collega una ricetta salvata a ogni settimana; grammi in Ricette salvate.',
    feedSystemCreate: 'Crea sistema',
    feedSystemDefaultName: 'Il mio programma',
    feedSystemWeek: 'Settimana {label}',
    feedSystemStepSolution: 'Ricetta per questa settimana',
    feedSystemStepSolutionNone: 'Nessuna ricetta collegata',
    deleteFeedSystemTitle: 'Eliminare il sistema di nutrizione?',
    deleteFeedSystemBody: 'Rimuovere il sistema «{name}»? Non si può annullare.',
    attachCycle: 'Usa in questo ciclo',
    attachCycleHint: 'Il ciclo attuale prende l’obiettivo da questo programma.',
    systemNamePlaceholder: 'es. Produttore A+B settimana 3',
    waterProfile: {
      lead: 'I minerali già presenti nell’acqua vengono sottratti dall’obiettivo. Osmosi, o nessun referto: lascia “Non considerare l’acqua”.',
      none: 'Non considerare l’acqua',
      add: 'Inserisci un’analisi dell’acqua',
      compositionHint: 'Milligrammi per litro dal referto. Una casella vuota significa che quello ione non c’è.',
      namePlaceholder: 'Nome, per esempio rubinetto di casa',
      nameRequired: 'Prima dai un nome all’acqua. Il nome da solo non cambia la miscela.',
      applied: 'Questi mg/L vengono sottratti dall’obiettivo in Ricette.',
      allZero: 'Tutti zeri: le dosi non cambiano. Va bene per l’osmosi — oppure compila l’analisi.',
      edit: 'Modifica analisi',
      deleteLabel: 'Elimina',
      deleteTitle: 'Eliminare quest’acqua?',
      deleteBody: 'Eliminare «{name}»? Non si può annullare.',
      unit: 'mg/L',
      ec: 'EC, mS/cm',
      ph: 'pH',
    },
    solutions: { copySuffix: ' (copia)' },
  },
  captureScreen: {
    needOnboarding: 'Completa prima l’onboarding.',
    eventType: 'Tipo evento',
    whatHappened: 'Cosa è successo?',
    bodyPlaceholder: 'Descrivi osservazione o azione…',
    saveJournal: 'Salva nel diario',
    savedOffline: 'Salvato offline — si sincronizza quando online.',
    saveFailed: 'Salvataggio non riuscito',
    eventTypes: {
      note: 'Nota',
      observation: 'Osservazione',
      action_taken: 'Azione',
      watering: 'Irrigazione',
      feeding: 'Concimazione',
      issue_detected: 'Problema',
    },
  },
  advisorScreen: {
    recording: 'Registrazione… tocca il microfono per fermare',
    addingPhoto: 'Aggiunta foto…',
    working: 'Elaborazione…',
    text: 'Testo',
    takePhoto: 'Scatta foto',
    choosePhoto: 'Scegli foto',
    addA11y: 'Aggiungi testo o foto',
    inputPlaceholder: 'Registra un fatto o chiedi…',
    send: 'Invia',
    closeTextComposerA11y: 'Chiudi testo e torna alle azioni',
    listening: 'In ascolto',
    hint: 'Il microfono registra e risponde. + per testo o foto.',
    emptyHint: 'Voice: hold the green button below. Keyboard — type text, photo on the left.',
    emptyTitle: 'What can I help with?',
    emptyLead: 'Hold the green button for voice. Use the orbit below for photo, leaf, QR, journal, and text.',
    starterPrompt1: 'What should I check today?',
    starterPrompt2: 'Log a watering',
    starterPrompt3: 'Help with leaf issues',
    bannerNote: 'Answers from farm facts and trust checks',
    voiceHint: 'Green button below — dictate. Keyboard — type text, photo on the left.',
    textComposerHint: 'Type your question and tap Send. Photo on the left; hold the green button below for voice.',
    photoA11y: 'Attach photo',
    removePhoto: 'Remove photo',
    removePhotoA11y: 'Remove attached photo',
    photoOnlyQuestion: 'Analyze this photo in the context of the current farm and cycle.',
    photoNeedsOnline: 'Photo must upload online before asking the assistant.',
    photoNeedCycle: 'Select an active cycle and scope before sending a photo.',
    askingAssistant: 'Uploading photo and getting answer…',
    extractingLog: 'Extracting journal draft…',
    orbit: en.advisorScreen.orbit,
    journalPlus: en.advisorScreen.journalPlus,
    journalSaved: en.advisorScreen.journalSaved,
    leafCapture: en.advisorScreen.leafCapture,
    leafSyncNotice: en.advisorScreen.leafSyncNotice,
  },
  photosScreen: {
    needOnboarding: 'Completa prima l’onboarding.',
    maxSize: 'Dimensione max:',
    captionLabel: 'Didascalia (opzionale)',
    captionPlaceholder: 'Cosa mostra la foto?',
    takePhoto: 'Scatta foto',
    chooseGallery: 'Scegli dalla galleria',
    permissionRequired: 'Permesso richiesto',
    tooLarge: 'Troppo grande ({size}). Max {max}.',
    savedOffline: 'Salvato offline — si sincronizza quando online.',
    uploaded: 'Foto caricata.',
    uploadFailed: 'Caricamento non riuscito',
  },
  sopNewScreen: {
    needCycle: 'Servono ciclo attivo e scope.',
    screenTitle: 'Nuova SOP',
    intro: 'Choose when this procedure is due for the current cycle and scope.',
    titleLabel: 'Titolo',
    titlePlaceholder: 'es. Controllo VPD mattutino',
    descriptionLabel: 'Descrizione (opzionale)',
    descriptionPlaceholder: 'Cosa deve fare l’operatore?',
    stepsLabel: 'Passaggi',
    stepsHint: 'Ogni passaggio diventa una casella da spuntare. Incolla un elenco per dividerlo in passaggi.',
    stepPlaceholder: 'es. Controllare il filtro del condizionatore',
    addStep: '+ Aggiungi passaggio',
    stepRequired: 'Obbligatorio',
    stepOptional: 'Facoltativo',
    removeStep: 'Rimuovi passaggio',
    dueTimeLabel: 'Orario scadenza (locale)',
    scheduleLabel: 'Schedule',
    scheduleDaily: 'Every day',
    scheduleWeekdays: 'Weekdays',
    scheduleMonthDay: 'Day of month',
    scheduleStageEnter: 'When a stage starts',
    scheduleStageExit: 'When a stage ends',
    monthDayLabel: 'Day of the month',
    stageLabel: 'Stage',
    timeHint: '24-hour time, for example 09:00 or 14:30',
    schedulePreviewTitle: 'You will get runs like',
    schedulePreviewDaily: 'Every day at {time}',
    schedulePreviewWeekdays: '{days} at {time}',
    schedulePreviewMonthDay: 'Day {day} of the month at {time}',
    schedulePreviewStageEnter: 'When {stage} starts at {time}',
    schedulePreviewStageExit: 'When {stage} ends at {time}',
    createFailed: 'Impossibile creare la SOP',
    create: 'Crea SOP',
  },
  sopRunScreen: {
    notFound: 'Esecuzione SOP non trovata',
    due: 'Scadenza {when}',
    noDueDate: 'Nessuna scadenza',
    alreadyClosed: 'Già chiusa',
    statusLabel: 'Stato',
    notesLabel: 'Note',
    notesPlaceholder: 'Cosa è successo durante l’esecuzione?',
    requiredInputs: 'Campi obbligatori',
    checklistTitle: 'Passaggi',
    checklistProgress: '{done} di {total} fatti',
    stepOptional: 'facoltativo',
    missingSteps: 'Spunta tutti i passaggi obbligatori o scegli «Parziale».',
    back: 'Indietro',
    saveFailed: 'Salvataggio non riuscito',
    submit: 'Registra esecuzione',
    statuses: {
      done: 'Completato',
      delayed: 'In ritardo',
      partially_done: 'Parziale',
      skipped: 'Saltato',
      blocked: 'Bloccato',
    },
  },
};

const TH_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'ภาษา' },
  commonMobile: {
    saved: 'บันทึกแล้ว',
    error: 'ข้อผิดพลาด',
    saving: 'กำลังบันทึก…',
    add: 'เพิ่ม',
    cancel: 'ยกเลิก',
    loading: 'กำลังโหลด…',
  },
  settingsScreen: {
    localJournalHint: 'บันทึกและปฏิทินเก็บบนอุปกรณ์นี้จนกว่าจะซิงก์',
    farm: 'ฟาร์ม',
    saveFarmName: 'บันทึกชื่อฟาร์ม',
    activeFarm: 'ฟาร์มที่ใช้งาน',
    activeCycle: 'รอบที่ใช้งาน',
    since: 'ตั้งแต่',
    scope: 'Scope',
    offlineSync: 'ซิงก์ออฟไลน์',
    notifications: 'การแจ้งเตือน',
    enablePush: 'เปิดการแจ้งเตือน push',
    pushEnabled: 'เปิด push และลงทะเบียนแล้ว',
    pushDenied: 'ไม่ได้รับอนุญาต push',
    pushUnavailable: 'การแจ้งเตือน push ใช้ได้บนอุปกรณ์จริงเท่านั้น',
    onThisDevice: 'บนอุปกรณ์นี้',
    tokenRegistered: 'ลงทะเบียนโทเค็นแล้ว (local)',
    logOut: 'ออกจากระบบ',
    tuyaLinks: {
      title: 'เซ็นเซอร์บ้านอัจฉริยะ',
      desc: 'บัญชี Smart Life ที่ผูกกับฟาร์มนี้ อุปกรณ์ที่ตรงจะแสดงในเซ็นเซอร์และ VPD',
      empty: 'ยังไม่มีบัญชีเซ็นเซอร์ที่ผูกกับฟาร์ม',
      managedByGrowlog: 'การเชื่อมเซ็นเซอร์ตั้งค่าโดยผู้ดูแล Growlog',
      accounts: 'บัญชีที่ผูกแล้ว',
      devices: 'อุปกรณ์ที่ระบุไว้',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'ต้องมีรอบการปลูกที่ใช้งานอยู่',
    intro: 'ดำเนินการตามขั้นตอนและติดตามการปฏิบัติตาม',
    activeRuns: 'รันการทำงานที่เปิดอยู่',
    noRuns: 'ไม่มี SOP ที่เปิดสำหรับวันนี้',
    execute: 'ดำเนินการ',
    definitions: 'คำจำกัดความ',
    noDefinitions: 'ยังไม่มี SOP',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
  tabs: { ai: 'ผู้ช่วย', nutrient: 'สารละลาย' },
  more: {
    nutrient: 'เครื่องคำนวณสารละลาย',
    cycle: 'รอบการปลูก',
    signInHint: 'ซิงก์อุปกรณ์นี้และเชื่อมต่อเซนเซอร์',
  },
  nutrient: {
    tabs: {
      fertilizers: 'ปุ๋ย',
      systems: 'ระบบให้อาหาร',
      water: 'น้ำ',
      elements: 'ธาตุ',
      solutions: 'สูตร',
    },
    hintFertilizers: 'เลือกผลิตภัณฑ์ — ระบบจะคำนวณปริมาณให้',
    volumeL: 'ปริมาตรถัง (ลิตร)',
    cycleLinked: 'เชื่อมกับรอบที่ใช้งาน',
    results: 'ปริมาณ',
    alternatives: 'ทางเลือก',
    tab_water: 'โปรไฟล์น้ำซิงก์หลังเข้าสู่ระบบ',
    tab_elements: 'อ้างอิงธาตุในแคตตาล็อก',
    tab_solutions: 'สูตรฟาร์มที่บันทึกหลังเข้าสู่ระบบ',
    searchFertilizers: 'ค้นหาปุ๋ย',
    favoritesOnly: 'เฉพาะรายการโปรด',
    favoritesShowAll: 'ทั้งหมด',
    favoritesEmpty: 'ยังไม่มีรายการโปรด',
    toggleFavorite: 'รายการโปรด',
    clearSelection: 'ยกเลิกการเลือกทั้งหมด',
    clearFavorites: 'ล้างรายการโปรด',
    fertilizerSortByMacro: 'เรียงตาม {macro}',
    fertilizerCompositionEmpty: 'ไม่มีข้อมูลองค์ประกอบ',
    fertilizerCompositionMacros: 'ธาตุอาหารหลัก',
    fertilizerCompositionMicros: 'จุลธาตุ',
    fertilizerCompositionAdd: 'เพิ่มธาตุ',
    compositionEdited: 'แก้ไขแล้ว',
    newFarmProduct: 'เพิ่มใหม่',
    fertilizerName: 'ชื่อ',
    fertilizerDraftMissing: 'ระบุชื่อและอย่างน้อยหนึ่งเปอร์เซ็นต์',
    saveRecipe: 'บันทึกสูตร',
    recipeName: 'ชื่อสูตร',
    feedingEventBody: 'สูตร: {name} ({volume} ล.)',
    starterLead: 'มีการคำนวณเริ่มต้นสำหรับถังนี้แล้ว ตั้งชื่อก่อนบันทึก',
    composition: 'องค์ประกอบ',
    compositionMeta: 'ฉลาก / ผู้ผลิต',
    stepVolume: 'ปริมาตรถัง',
    stepVolumeHint: 'สำหรับปริมาณต่อถังและบันทึกไทม์ไลน์',
    saveVolume: 'บันทึกปริมาตร',
    volumeSaved: 'บันทึกปริมาตรแล้ว',
    chooseSolution: 'เลือกสูตร',
    chooseSolutionHint: 'สูตรหรือโปรไฟล์ที่บันทึกเป็นเป้าหมาย',
    targetProfileMine: 'ของฉัน',
    targetProfileCatalog: 'อ้างอิง',
    saveTargetProfile: 'บันทึกเป็นเป้าหมาย',
    saveTargetProfileHint: 'บันทึก mg/L ที่ได้ไว้ใน ของฉัน',
    saveTargetProfileName: 'ชื่อเป้าหมาย',
    saveTargetProfileDone: 'บันทึกใน ของฉัน แล้ว',
    saveTargetProfileNeedMix: 'เลือกปุ๋ยและคำนวณก่อน',
    savedSolutions: 'สูตรที่บันทึก',
    savedSolutionsHint: 'สูตรที่บันทึกของฟาร์ม',
    recipeOpen: 'เปิด',
    recipeRename: 'เปลี่ยนชื่อ',
    recipeRenameSave: 'บันทึก',
    recipeDelete: 'ลบ',
    recipeDuplicate: 'ทำสำเนา',
    recipeLiters: 'ลิตร',
    wandLead: 'ส่วนผสมปรากฏที่นี่เมื่อมีเป้าหมายและปุ๋ยแล้ว ชื่ออย่างเดียวไม่สร้างส่วนผสม',
    wandNeedsSolution: 'เลือกโปรไฟล์เป้าหมายในการ์ดด้านบน',
    wandNeedsFertilizers: 'เลือกปุ๋ย จะคำนวณส่วนผสมจากรายการนั้น',
    wandComputing: 'กำลังคำนวณส่วนผสม…',
    wandEmptyTarget: 'เป้าหมายยังไม่มี mg/L เลือกโปรไฟล์ในการ์ดด้านบน',
    wandNoDoses:
      'คำนวณแล้ว แต่ปุ๋ยที่เลือกไม่ให้โดสสำหรับเป้าหมายนี้ มักขาดแหล่ง N หรือ Ca',
    saveMixHint: 'บันทึกตัวเลือกบนหน้าจอ กรัมต่อลิตรไปอยู่ที่ส่วนผสมที่บันทึกไว้',
    wandSectionMix: 'ส่วนผสม',
    wandSectionTarget: 'เป้าหมาย',
    save: 'บันทึก',
    doseUnitMass: 'g/L',
    doseUnitVolume: 'mL/L',
    doseStockLine: 'สต็อก {amount} {unit} · ถัง {tank}',
    saveMixDone: 'บันทึกแล้ว ดูในรายการส่วนผสมที่บันทึก',
    variantBest: 'ดีที่สุด',
    variantAlt: 'ตัวเลือก {n}',
    variantsHeading: 'สูตรที่คำนวณ',
    elementTarget: 'เป้าหมาย',
    elementAchieved: 'ที่ได้',
    elementDelta: 'Δ%',
    elementNUnknown: 'ไม่ทราบรูป',
    elementMass: 'g/mol',
    elementValence: 'วาเลนซ์',
    elementsInSolution: 'ในสารละลาย',
    elementsInSolutionUnit: 'mg/L',
    elementFractions: 'สัดส่วนธาตุ (ปุ๋ยที่เลือก)',
    doseUnitMassShort: 'g',
    doseUnitVolumeShort: 'mL',
    doseTankLine: 'ถัง {amount} {unit}',
    ecLine: 'EC {value} mS/cm',
    saltOne: 'เกลือ',
    saltFew: 'เกลือ',
    saltMany: 'เกลือ',
    variantsOnlyOne: 'ไม่มีสูตรอื่นจากปุ๋ยที่เลือก',
    assembleShort: '{element} อยู่ที่ {pct}% ของเป้าหมาย',
    assembleBlocked:
      '{element} อยู่ที่ {pct}% ของเป้าหมาย\nเติมถึง 90% จะดัน {blocker} เกินเพดาน ใช้เกลือ {element} ที่ไม่มี {blocker}',
    assembleBlockedMulti:
      '{entries} ถึง 90% ไม่ได้โดยไม่ดัน {blocker} เกินเพดาน ใช้เกลือ {salts} ที่ไม่มี {blocker}',
    assembleMissing: 'ปุ๋ยที่เลือกไม่มีตัวที่ให้ {element}',
    assembleFloor: 'N, P, K, Ca และ Mg นับว่าครบตั้งแต่ 90%',
    nitrogenFormGap:
      'เป้าหมายแยกไนโตรเจนตามรูป แต่ปุ๋ยระบุแค่ N รวม จึงไม่นับเป็นไนเตรต แอมโมเนียม หรือยูเรีย',
    helpOpen: 'วิธีคำนวณ',
    helpClose: 'ปิด',
    helpCurious: 'สำหรับผู้สนใจ',
    mixFavoritesLabel: 'รายการโปรด',
    mixFavoriteAdd: 'เพิ่มในรายการโปรด',
    mixFavoriteRemove: 'เอาออกจากรายการโปรด',
    mixFavoritesClear: 'ล้างรายการโปรด',
    mixFavoritesClearBody: 'ลบสูตรสำหรับเปรียบเทียบที่บันทึกบนอุปกรณ์นี้ทั้งหมดหรือไม่',
    mixFavoritesHint: 'อยู่ข้ามการคำนวณจนกว่าจะล้างรายการโปรด เปิดแล้วบันทึกเป็นเป้าหมายหรือส่วนผสมได้',
    manualDose: 'แก้เอง',
    feedSystemsEmpty:
      'ยังไม่มีระบบ ที่นี่คือเป้าหมาย mg/L รายสัปดาห์ เชื่อมสูตรที่บันทึกกับแต่ละสัปดาห์ ส่วนผสมกรัมอยู่ในแท็บสูตร',
    feedSystemCreate: 'สร้างระบบให้อาหาร',
    feedSystemDefaultName: 'โปรแกรมของฉัน',
    feedSystemWeek: 'สัปดาห์ {label}',
    feedSystemStepSolution: 'สูตรสำหรับสัปดาห์นี้',
    feedSystemStepSolutionNone: 'ยังไม่เชื่อมสูตร',
    deleteFeedSystemTitle: 'ลบระบบให้อาหาร?',
    deleteFeedSystemBody: 'ลบระบบ «{name}» ไหม? ย้อนกลับไม่ได้',
    attachCycle: 'ใช้กับรอบนี้',
    attachCycleHint: 'รอบปลูกปัจจุบันจะใช้เป้าหมายจากโปรแกรมนี้',
    systemNamePlaceholder: 'เช่น ผู้ผลิต A+B สัปดาห์ 3',
    waterProfile: {
      lead: 'แร่ที่มีในน้ำอยู่แล้วจะถูกหักออกจากเป้าหมาย ออสโมซิสหรือไม่มีผลแล็บ: เลือก «ไม่นับน้ำ»',
      none: 'ไม่นับน้ำ',
      add: 'ใส่ผลวิเคราะห์น้ำ',
      compositionHint: 'มิลลิกรัมต่อลิตรจากผลวิเคราะห์ ช่องว่างหมายถึงไม่มีไอออนนั้นในรายงาน',
      namePlaceholder: 'ชื่อ เช่น น้ำก๊อกที่บ้าน',
      nameRequired: 'ตั้งชื่อน้ำก่อนบันทึก ชื่ออย่างเดียวไม่เปลี่ยนสูตร',
      applied: 'ค่า mg/L เหล่านี้จะถูกหักจากเป้าหมายในแท็บสูตร',
      allZero: 'เป็นศูนย์ทั้งหมด: โดสไม่เปลี่ยน เหมาะกับออสโมซิส หรือกรอกผลวิเคราะห์',
      edit: 'แก้ผลวิเคราะห์',
      deleteLabel: 'ลบ',
      deleteTitle: 'ลบน้ำนี้?',
      deleteBody: 'ลบ «{name}»? ย้อนกลับไม่ได้',
      unit: 'mg/L',
      ec: 'EC, mS/cm',
      ph: 'pH',
    },
    solutions: { copySuffix: ' (สำเนา)' },
  },
  captureScreen: {
    needOnboarding: 'ทำ onboarding ให้เสร็จก่อน',
    eventType: 'ประเภทเหตุการณ์',
    whatHappened: 'เกิดอะไรขึ้น?',
    bodyPlaceholder: 'อธิบายสิ่งที่เห็นหรือสิ่งที่ทำ…',
    saveJournal: 'บันทึกลงไดอารี่',
    savedOffline: 'บันทึกออฟไลน์ — จะซิงก์เมื่อออนไลน์',
    saveFailed: 'บันทึกไม่สำเร็จ',
    eventTypes: {
      note: 'บันทึก',
      observation: 'การสังเกต',
      action_taken: 'การดำเนินการ',
      watering: 'รดน้ำ',
      feeding: 'ให้ปุ๋ย',
      issue_detected: 'พบปัญหา',
    },
  },
  advisorScreen: {
    recording: 'กำลังบันทึก… แตะไมค์เพื่อหยุด',
    addingPhoto: 'กำลังเพิ่มรูป…',
    working: 'กำลังประมวลผล…',
    text: 'ข้อความ',
    takePhoto: 'ถ่ายรูป',
    choosePhoto: 'เลือกรูป',
    addA11y: 'เพิ่มข้อความหรือรูป',
    inputPlaceholder: 'บันทึกข้อเท็จจริงหรือถาม…',
    send: 'ส่ง',
    closeTextComposerA11y: 'ปิดการพิมพ์และกลับไปยังการดำเนินการ',
    listening: 'กำลังฟัง',
    hint: 'ไมค์บันทึกและตอบ + สำหรับข้อความหรือรูป',
    emptyHint: 'Voice: hold the green button below. Keyboard — type text, photo on the left.',
    emptyTitle: 'What can I help with?',
    emptyLead: 'Hold the green button for voice. Use the orbit below for photo, leaf, QR, journal, and text.',
    starterPrompt1: 'What should I check today?',
    starterPrompt2: 'Log a watering',
    starterPrompt3: 'Help with leaf issues',
    bannerNote: 'Answers from farm facts and trust checks',
    voiceHint: 'Green button below — dictate. Keyboard — type text, photo on the left.',
    textComposerHint: 'Type your question and tap Send. Photo on the left; hold the green button below for voice.',
    photoA11y: 'Attach photo',
    removePhoto: 'Remove photo',
    removePhotoA11y: 'Remove attached photo',
    photoOnlyQuestion: 'Analyze this photo in the context of the current farm and cycle.',
    photoNeedsOnline: 'Photo must upload online before asking the assistant.',
    photoNeedCycle: 'Select an active cycle and scope before sending a photo.',
    askingAssistant: 'Uploading photo and getting answer…',
    extractingLog: 'Extracting journal draft…',
    orbit: en.advisorScreen.orbit,
    journalPlus: en.advisorScreen.journalPlus,
    journalSaved: en.advisorScreen.journalSaved,
    leafCapture: en.advisorScreen.leafCapture,
    leafSyncNotice: en.advisorScreen.leafSyncNotice,
  },
  photosScreen: {
    needOnboarding: 'ทำ onboarding ให้เสร็จก่อน',
    maxSize: 'ขนาดสูงสุด:',
    captionLabel: 'คำบรรยาย (ไม่บังคับ)',
    captionPlaceholder: 'รูปนี้แสดงอะไร?',
    takePhoto: 'ถ่ายรูป',
    chooseGallery: 'เลือกจากแกลเลอรี',
    permissionRequired: 'ต้องได้รับอนุญาต',
    tooLarge: 'ใหญ่เกินไป ({size}) สูงสุด {max}',
    savedOffline: 'บันทึกออฟไลน์ — จะซิงก์เมื่อออนไลน์',
    uploaded: 'อัปโหลดรูปแล้ว',
    uploadFailed: 'อัปโหลดไม่สำเร็จ',
  },
  sopNewScreen: {
    needCycle: 'ต้องมีรอบและ scope ที่ใช้งาน',
    screenTitle: 'SOP ใหม่',
    intro: 'Choose when this procedure is due for the current cycle and scope.',
    titleLabel: 'ชื่อ',
    titlePlaceholder: 'เช่น ตรวจ VPD ตอนเช้า',
    descriptionLabel: 'คำอธิบาย (ไม่บังคับ)',
    descriptionPlaceholder: 'ผู้ปฏิบัติต้องทำอะไร?',
    stepsLabel: 'ขั้นตอน',
    stepsHint: 'แต่ละขั้นตอนจะเป็นช่องติ๊กตอนทำงาน วางรายการเพื่อแยกเป็นขั้นตอน',
    stepPlaceholder: 'เช่น ตรวจไส้กรองแอร์',
    addStep: '+ เพิ่มขั้นตอน',
    stepRequired: 'บังคับ',
    stepOptional: 'ไม่บังคับ',
    removeStep: 'ลบขั้นตอน',
    dueTimeLabel: 'เวลาครบกำหนด (ท้องถิ่น)',
    scheduleLabel: 'Schedule',
    scheduleDaily: 'Every day',
    scheduleWeekdays: 'Weekdays',
    scheduleMonthDay: 'Day of month',
    scheduleStageEnter: 'When a stage starts',
    scheduleStageExit: 'When a stage ends',
    monthDayLabel: 'Day of the month',
    stageLabel: 'Stage',
    timeHint: '24-hour time, for example 09:00 or 14:30',
    schedulePreviewTitle: 'You will get runs like',
    schedulePreviewDaily: 'Every day at {time}',
    schedulePreviewWeekdays: '{days} at {time}',
    schedulePreviewMonthDay: 'Day {day} of the month at {time}',
    schedulePreviewStageEnter: 'When {stage} starts at {time}',
    schedulePreviewStageExit: 'When {stage} ends at {time}',
    createFailed: 'สร้าง SOP ไม่สำเร็จ',
    create: 'สร้าง SOP',
  },
  sopRunScreen: {
    notFound: 'ไม่พบการรัน SOP',
    due: 'ครบกำหนด {when}',
    noDueDate: 'ไม่มีวันครบกำหนด',
    alreadyClosed: 'ปิดแล้ว',
    statusLabel: 'สถานะ',
    notesLabel: 'บันทึก',
    notesPlaceholder: 'เกิดอะไรขึ้นระหว่างดำเนินการ?',
    requiredInputs: 'ข้อมูลที่ต้องกรอก',
    checklistTitle: 'ขั้นตอน',
    checklistProgress: 'ทำแล้ว {done} จาก {total}',
    stepOptional: 'ไม่บังคับ',
    missingSteps: 'ติ๊กขั้นตอนที่บังคับให้ครบ หรือเลือก “บางส่วน”',
    back: 'กลับ',
    saveFailed: 'บันทึกไม่สำเร็จ',
    submit: 'บันทึกการดำเนินการ',
    statuses: {
      done: 'เสร็จ',
      delayed: 'ล่าช้า',
      partially_done: 'บางส่วน',
      skipped: 'ข้าม',
      blocked: 'ถูกบล็อก',
    },
  },
};

const VI_PACK: ScreenLocalePack = {
  language: { ...en.language, label: 'Ngôn ngữ' },
  commonMobile: {
    saved: 'Đã lưu.',
    error: 'Lỗi',
    saving: 'Đang lưu…',
    add: 'Thêm',
    cancel: 'Hủy',
    loading: 'Đang tải…',
  },
  settingsScreen: {
    localJournalHint: 'Nhật ký và lịch lưu trên thiết bị này cho đến khi bạn đồng bộ.',
    farm: 'Trang trại',
    saveFarmName: 'Lưu tên trang trại',
    activeFarm: 'Trang trại đang dùng',
    activeCycle: 'Chu kỳ đang dùng',
    since: 'từ',
    scope: 'Scope',
    offlineSync: 'Đồng bộ ngoại tuyến',
    notifications: 'Thông báo',
    enablePush: 'Bật thông báo push',
    pushEnabled: 'Đã bật và đăng ký push.',
    pushDenied: 'Quyền push bị từ chối.',
    pushUnavailable: 'Thông báo push cần thiết bị thật.',
    onThisDevice: 'Trên thiết bị này',
    tokenRegistered: 'Đã đăng ký token (local)',
    logOut: 'Đăng xuất',
    tuyaLinks: {
      title: 'Cảm biến nhà thông minh',
      desc: 'Tài khoản Smart Life gắn với trang trại này. Thiết bị khớp hiển thị trong cảm biến và VPD.',
      empty: 'Chưa có tài khoản cảm biến gắn với trang trại.',
      managedByGrowlog: 'Liên kết cảm biến do quản trị viên Growlog cấu hình.',
      accounts: 'Tài khoản đã liên kết',
      devices: 'Thiết bị chỉ định',
    },
    createOwnFarm: 'Create my own farm',
    membersLink: 'Members and invites',
  },
  farmMembersScreen: en.farmMembersScreen,
  onboardingScreen: en.onboardingScreen,
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Cần một chu kỳ trồng đang hoạt động.',
    intro: 'Thực hiện quy trình và theo dõi tuân thủ.',
    activeRuns: 'Lượt chạy đang mở',
    noRuns: 'Không có SOP mở cho hôm nay.',
    execute: 'Thực hiện',
    definitions: 'Định nghĩa',
    noDefinitions: 'Chưa có định nghĩa SOP.',
    scheduleUnparsed: 'Schedule notes',
    scopeUnconfirmed: 'Confirm which scope this applies to',
  },
};

applyScreenPack(fr, FR_PACK);
applyScreenPack(es, ES_PACK);
applyScreenPack(de, DE_PACK);
applyScreenPack(it, IT_PACK);
applyScreenPack(vi, VI_PACK);
applyScreenPack(th, TH_PACK);

export const MOBILE_STRINGS: Record<ProductLocale, MobileStrings> = {
  en,
  ru,
  th,
  it,
  fr,
  es,
  de,
  vi,
  my,
};

export function mapDeviceTagToProductLocale(tag: string): ProductLocale | null {
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'ua' || trimmed === 'uk' || trimmed.startsWith('uk-')) return 'ru';
  if ((PRODUCT_LOCALES as readonly string[]).includes(trimmed)) return trimmed as ProductLocale;
  const base = trimmed.split('-')[0];
  if ((PRODUCT_LOCALES as readonly string[]).includes(base)) return base as ProductLocale;
  return null;
}

export function normalizeProductLocale(value: string | null | undefined): ProductLocale {
  const mapped = value ? mapDeviceTagToProductLocale(value) : null;
  if (mapped) return mapped;
  return 'en';
}

export function detectProductLocaleFromDeviceTags(tags: readonly string[]): ProductLocale {
  for (const tag of tags) {
    const mapped = mapDeviceTagToProductLocale(tag);
    if (mapped) return mapped;
  }
  return 'en';
}

export function mobileStrings(locale: ProductLocale): MobileStrings {
  return MOBILE_STRINGS[locale] ?? MOBILE_STRINGS.en;
}
