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
    feedSystemWeek: string;
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
    loadingTasks: string;
    noSopRuns: string;
    createSop: string;
    eventsShort: string;
    placeFarms: string;
    placeRooms: string;
  };
  language: {
    label: string;
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
  };
  sopScreen: {
    needCycle: string;
    intro: string;
    activeRuns: string;
    noRuns: string;
    execute: string;
    definitions: string;
    noDefinitions: string;
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
    screenTitle: string;
    logTitleWater: string;
    logTitleFeed: string;
    logTitleProcedure: string;
    procedurePlaceholder: string;
    procedureRequired: string;
    procedureFeedLabel: string;
    procedureVoiceHint: string;
    procedureRecording: string;
    procedureTranscribing: string;
    procedureVoiceNeedSignIn: string;
    procedureVoiceA11y: string;
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
    listening: string;
    hint: string;
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
    dueTimeLabel: string;
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
    signInHint: 'Sync this device and connect sensors.',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutBody: 'The account stays. Cloud sync pauses until you sign in again.',
    cancel: 'Cancel',
  },
  nutrient: {
    tabs: {
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
      'No feed systems yet. Here you keep week-by-week mg/L goals for a grow. Save a mix with grams under Saved mixes on the Solutions tab.',
    feedSystemWeek: 'Week {label}',
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
      applied: 'These mg/L are subtracted from the target on Solutions.',
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
    localJournalHint: 'Journal and calendar are stored on this device until you sync.',
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
  },
  sopScreen: {
    needCycle: 'An active grow cycle is required.',
    intro: 'Execute procedures and track compliance.',
    activeRuns: 'Active runs',
    noRuns: 'No open SOP runs for today.',
    execute: 'Execute',
    definitions: 'Definitions',
    noDefinitions: 'No SOP definitions yet.',
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
    back: '← Back',
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
    logProcedure: 'Log procedure',
    dayOfCycle: 'Day {day}',
    formTitleNew: 'New cycle',
    formSubmit: 'Start cycle',
    screenTitle: 'Grow cycle',
    logTitleWater: 'Watering log',
    logTitleFeed: 'Feeding log',
    logTitleProcedure: 'Procedure',
    procedurePlaceholder: 'e.g. defoliation, pest treatment, training…',
    procedureRequired: 'Describe what you did.',
    procedureFeedLabel: 'Procedure',
    procedureVoiceHint: 'Tap the mic (here or on the tab bar) to dictate. You can edit the text before saving.',
    procedureRecording: 'Recording… tap the mic to stop',
    procedureTranscribing: 'Transcribing…',
    procedureVoiceNeedSignIn: 'Sign in to dictate with the mic.',
    procedureVoiceA11y: 'Dictate procedure',
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
    manualDesc: 'Tap a number and type yours. Each change is kept and added to the journal with the time.',
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
    listening: 'Listening',
    hint: 'Mic logs and asks. + adds text or a photo.',
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
    intro: 'Create a daily recurring procedure assigned to this cycle and scope.',
    titleLabel: 'Title',
    titlePlaceholder: 'e.g. Morning VPD check',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'What should the operator do?',
    dueTimeLabel: 'Due time (local)',
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
      fertilizers: 'Удобрения',
      systems: 'Системы питания',
      water: 'Вода',
      elements: 'Элементы',
      solutions: 'Растворы',
    },
    hintFertilizers: 'Отметьте продукты — по ним подберутся дозы.',
    volumeL: 'Объём бака (л)',
    cycleLinked: 'Привязано к активному циклу',
    results: 'Дозы',
    alternatives: 'Альтернативы',
    tab_water: 'Профили воды синхронизируются при входе.',
    tab_elements: 'Справочник элементов в каталоге.',
    tab_solutions: 'Сохранённые растворы фермы при входе.',
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
    feedingEventBody: 'Питательный раствор: {name} ({volume} л)',
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
    mixFavoritesClearBody: 'Убрать все растворы, сохранённые для сравнения на этом устройстве?',
    mixFavoritesHint: 'Хранятся между расчётами, пока не очистите избранное. Откройте, чтобы сохранить как цель или замес.',
    manualDose: 'Вручную',
    feedSystemsEmpty:
      'Систем питания пока нет. Здесь — недели и цель в мг/л для цикла. Замес с граммами сохраняйте в «Сохранённые замесы» на «Растворах».',
    feedSystemWeek: 'Неделя {label}',
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
      applied: 'Эти мг/л вычитаются из цели на вкладке «Растворы».',
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
    localJournalHint: 'Журнал и календарь хранятся на этом устройстве, пока не синхронизируете.',
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
  },
  sopScreen: {
    needCycle: 'Нужен активный цикл выращивания.',
    intro: 'Выполняйте регламенты и отмечайте, что сделано.',
    activeRuns: 'Задачи на сегодня',
    noRuns: 'На сегодня открытых задач нет.',
    execute: 'Выполнить',
    definitions: 'Регламенты',
    noDefinitions: 'Регламентов пока нет.',
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
    sop: 'Регламенты и напоминания доступны после входа в аккаунт фермы.',
    reports: 'Отчёты строятся из облачного журнала.',
    signIn: 'Google или почта',
  },
  loginTagline: 'Журнал, который помнит вашу комнату',
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
    back: '← Назад',
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
    alertsRisks: 'Тревоги и риски',
    noRisks: 'Недавних сигналов риска нет.',
    todaySop: 'Регламенты на сегодня',
    loadingTasks: 'Загрузка задач…',
    noSopRuns: 'На сегодня открытых задач нет.',
    createSop: 'Создать регламент',
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
    logProcedure: 'Записать процедуру',
    dayOfCycle: 'День {day}',
    formTitleNew: 'Новый цикл',
    formSubmit: 'Запустить цикл',
    screenTitle: 'Цикл выращивания',
    logTitleWater: 'Запись полива',
    logTitleFeed: 'Запись подкормки',
    logTitleProcedure: 'Процедура',
    procedurePlaceholder: 'Например: дефолиация, обработка, подвязка…',
    procedureRequired: 'Опишите, что сделали.',
    procedureFeedLabel: 'Процедура',
    procedureVoiceHint: 'Нажмите микрофон (здесь или на панели внизу), чтобы продиктовать. Перед сохранением текст можно отредактировать.',
    procedureRecording: 'Запись… нажмите микрофон, чтобы остановить',
    procedureTranscribing: 'Расшифровка…',
    procedureVoiceNeedSignIn: 'Войдите в аккаунт, чтобы диктовать голосом.',
    procedureVoiceA11y: 'Диктовка процедуры',
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
    manualDesc: 'Нажмите цифру и введите свою. Каждое изменение останется и попадёт в журнал со временем.',
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
    listening: 'Слушаю',
    hint: 'Микрофон пишет и отвечает. + — текст или фото.',
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
    intro: 'Ежедневная процедура для этого цикла и области.',
    titleLabel: 'Название',
    titlePlaceholder: 'например, Утренняя проверка VPD',
    descriptionLabel: 'Описание (необязательно)',
    descriptionPlaceholder: 'Что должен сделать оператор?',
    dueTimeLabel: 'Время (локальное)',
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
  language: { label: 'ภาษา' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'ต้องมีรอบการปลูกที่ใช้งานอยู่',
    intro: 'ดำเนินการตามขั้นตอนและติดตามการปฏิบัติตาม',
    activeRuns: 'รันการทำงานที่เปิดอยู่',
    noRuns: 'ไม่มี SOP ที่เปิดสำหรับวันนี้',
    execute: 'ดำเนินการ',
    definitions: 'คำจำกัดความ',
    noDefinitions: 'ยังไม่มี SOP',
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
  language: { label: 'ဘာသာစကား' },
  commonMobile: en.commonMobile,
  settingsScreen: en.settingsScreen,
  farmMembersScreen: en.farmMembersScreen,
  timelineScreen: en.timelineScreen,
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
  language: { label: 'Langue' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Un cycle de culture actif est requis.',
    intro: 'Exécutez les procédures et suivez la conformité.',
    activeRuns: 'Exécutions actives',
    noRuns: 'Aucune SOP ouverte pour aujourd’hui.',
    execute: 'Exécuter',
    definitions: 'Définitions',
    noDefinitions: 'Aucune définition SOP.',
  },
};

const ES_PACK: ScreenLocalePack = {
  language: { label: 'Idioma' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Se requiere un ciclo de cultivo activo.',
    intro: 'Ejecute procedimientos y controle el cumplimiento.',
    activeRuns: 'Ejecuciones activas',
    noRuns: 'No hay SOP abiertas para hoy.',
    execute: 'Ejecutar',
    definitions: 'Definiciones',
    noDefinitions: 'Aún no hay definiciones SOP.',
  },
};

const DE_PACK: ScreenLocalePack = {
  language: { label: 'Sprache' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Ein aktiver Grow-Zyklus ist erforderlich.',
    intro: 'Prozeduren ausführen und Compliance verfolgen.',
    activeRuns: 'Aktive Läufe',
    noRuns: 'Keine offenen SOP für heute.',
    execute: 'Ausführen',
    definitions: 'Definitionen',
    noDefinitions: 'Noch keine SOP-Definitionen.',
  },
  tabs: { nutrient: 'Nährstoffe' },
  more: { nutrient: 'Nährstoffrechner', cycle: 'Zyklus' },
  nutrient: {
    tabs: {
      fertilizers: 'Düngemittel',
      systems: 'Fütterungssysteme',
      water: 'Wasser',
      elements: 'Elemente',
      solutions: 'Lösungen',
    },
    hintFertilizers: 'Produkte auswählen — daraus werden Dosen berechnet.',
    volumeL: 'Tankvolumen (L)',
    cycleLinked: 'Mit aktivem Zyklus verknüpft',
    results: 'Dosen',
    alternatives: 'Alternativen',
    tab_water: 'Wasserprofile synchronisieren nach Anmeldung.',
    tab_elements: 'Elementreferenz im Katalog.',
    tab_solutions: 'Gespeicherte Farm-Lösungen nach Anmeldung.',
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
    savedSolutions: 'Gespeicherte Lösungen',
    savedSolutionsHint: 'Farm-Rezepte und Arbeitslösungen.',
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
    saveMixDone: 'Gespeichert. Die Mischung liegt bei den gespeicherten Lösungen.',
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
      'Noch kein Fütterungssystem. Hier: Wochenziele in mg/L. Mischungen mit Gramm unter Gespeicherte Mischungen auf Lösungen speichern.',
    feedSystemWeek: 'Woche {label}',
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
      applied: 'Diese mg/L werden auf „Lösungen“ vom Ziel abgezogen.',
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
    listening: 'Hört zu',
    hint: 'Mikro protokolliert und fragt. + für Text oder Foto.',
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
    intro: 'Tägliches Verfahren für diesen Zyklus und Scope erstellen.',
    titleLabel: 'Titel',
    titlePlaceholder: 'z. B. Morgendlicher VPD-Check',
    descriptionLabel: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Was soll der Operator tun?',
    dueTimeLabel: 'Fälligkeitszeit (lokal)',
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
  language: { label: 'Lingua' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'È richiesto un ciclo colturale attivo.',
    intro: 'Esegui procedure e monitora la conformità.',
    activeRuns: 'Esecuzioni attive',
    noRuns: 'Nessuna SOP aperta per oggi.',
    execute: 'Esegui',
    definitions: 'Definizioni',
    noDefinitions: 'Nessuna definizione SOP.',
  },
  tabs: { nutrient: 'Nutrienti' },
  more: { nutrient: 'Calcolatore nutrienti', cycle: 'Ciclo' },
  nutrient: {
    tabs: {
      fertilizers: 'Fertilizzanti',
      systems: 'Sistemi nutrizione',
      water: 'Acqua',
      elements: 'Elementi',
      solutions: 'Soluzioni',
    },
    hintFertilizers: 'Seleziona i prodotti — da lì si calcolano le dosi.',
    volumeL: 'Volume vasca (L)',
    cycleLinked: 'Collegato al ciclo attivo',
    results: 'Dosi',
    alternatives: 'Alternative',
    tab_water: 'I profili acqua si sincronizzano dopo l’accesso.',
    tab_elements: 'Riferimento elementi nel catalogo.',
    tab_solutions: 'Soluzioni azienda salvate dopo l’accesso.',
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
    savedSolutions: 'Soluzioni salvate',
    savedSolutionsHint: 'Ricette azienda e soluzioni di lavoro.',
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
      'Nessun sistema. Qui: obiettivi mg/L per settimana. Le miscele in grammi: Mie soluzioni salvate in Soluzioni.',
    feedSystemWeek: 'Settimana {label}',
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
      applied: 'Questi mg/L vengono sottratti dall’obiettivo in Soluzioni.',
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
    listening: 'In ascolto',
    hint: 'Il microfono registra e risponde. + per testo o foto.',
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
    intro: 'Crea una procedura giornaliera per questo ciclo e scope.',
    titleLabel: 'Titolo',
    titlePlaceholder: 'es. Controllo VPD mattutino',
    descriptionLabel: 'Descrizione (opzionale)',
    descriptionPlaceholder: 'Cosa deve fare l’operatore?',
    dueTimeLabel: 'Orario scadenza (locale)',
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
  language: { label: 'ภาษา' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'ต้องมีรอบการปลูกที่ใช้งานอยู่',
    intro: 'ดำเนินการตามขั้นตอนและติดตามการปฏิบัติตาม',
    activeRuns: 'รันการทำงานที่เปิดอยู่',
    noRuns: 'ไม่มี SOP ที่เปิดสำหรับวันนี้',
    execute: 'ดำเนินการ',
    definitions: 'คำจำกัดความ',
    noDefinitions: 'ยังไม่มี SOP',
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
      solutions: 'สารละลาย',
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
    feedingEventBody: 'สารละลาย: {name} ({volume} ล.)',
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
    savedSolutionsHint: 'สูตรฟาร์มและสารละลายใช้งาน',
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
      'ยังไม่มีระบบ ที่นี่คือเป้าหมาย mg/L รายสัปดาห์ ส่วนผสมที่มีกรัม บันทึกในรายการส่วนผสมที่บันทึก แท็บสารละลาย',
    feedSystemWeek: 'สัปดาห์ {label}',
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
      applied: 'ค่า mg/L เหล่านี้จะถูกหักจากเป้าหมายในแท็บสารละลาย',
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
    listening: 'กำลังฟัง',
    hint: 'ไมค์บันทึกและตอบ + สำหรับข้อความหรือรูป',
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
    intro: 'สร้างขั้นตอนประจำวันสำหรับรอบและ scope นี้',
    titleLabel: 'ชื่อ',
    titlePlaceholder: 'เช่น ตรวจ VPD ตอนเช้า',
    descriptionLabel: 'คำอธิบาย (ไม่บังคับ)',
    descriptionPlaceholder: 'ผู้ปฏิบัติต้องทำอะไร?',
    dueTimeLabel: 'เวลาครบกำหนด (ท้องถิ่น)',
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
  language: { label: 'Ngôn ngữ' },
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
  timelineScreen: en.timelineScreen,
  sopScreen: {
    needCycle: 'Cần một chu kỳ trồng đang hoạt động.',
    intro: 'Thực hiện quy trình và theo dõi tuân thủ.',
    activeRuns: 'Lượt chạy đang mở',
    noRuns: 'Không có SOP mở cho hôm nay.',
    execute: 'Thực hiện',
    definitions: 'Định nghĩa',
    noDefinitions: 'Chưa có định nghĩa SOP.',
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
