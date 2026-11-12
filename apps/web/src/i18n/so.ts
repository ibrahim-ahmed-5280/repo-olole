/**
 * Somali interface strings (default language).
 * Campaign content (bio, roadmaps) comes from the CMS; only UI chrome lives here.
 * A native-speaker review is recommended before launch.
 */
export const so = {
  lang: 'so',
  skipToContent: 'U gudub nuxurka',
  loading: 'Waa la soo rarayaa…',
  errorTitle: 'Wax khalad ah ayaa dhacay',
  errorBody: 'Xogta lama soo rari karin. Hubi internetkaaga oo isku day mar kale.',
  retry: 'Isku day mar kale',
  offline: 'Internet ma jiro. Waxaad arkaysaa nooca ugu dambeeyay ee la keydiyay.',
  notPublished: 'Nuxurkan weli lama daabicin.',
  notFoundTitle: 'Boggan lama helin',
  notFoundBody: 'Bogga aad raadisay ma jiro ama waa la raray.',
  backHome: 'Ku noqo bogga hore',
  maintenanceTitle: 'Dayactir ayaa socda',
  language: 'Luqadda',

  brand: {
    title: 'Musharraxa Guddoomiyaha Kulliyadda Computer Science & IT',
    university: 'Jaamacadda Hormuud',
    logoAlt: 'Astaanta Jaamacadda Hormuud',
  },

  intro: {
    eyebrow: 'Doorashada Hoggaanka Ardayda',
    heading: 'YAA KA DAMBEEYA ARAGTIDA?',
    body: "Baro qofka, mabaadi'da iyo qorshayaasha ka dambeeya ololaha.",
    cta: 'DAAH-FUR ARAGTIDA',
    revealing: 'Waa la daah-furayaa…',
    skip: 'Ka gudub hordhaca',
    portraitAlt: 'Sawirka musharaxa',
  },

  vision: {
    eyebrow: 'Aragtida',
    navLabel: 'Tiirarka ololaha',
    navHeading: 'Sahami tiirarka',
    explore: 'Fur khariidadda',
    placeholderBadge: 'Sawir ku meel gaar ah',
    placeholderNote: 'Sawirka gacmaha furan ee la ansixiyey waa la sugayaa.',
    replayIntro: 'Dib u daawo hordhaca',
    aboutHotspot: 'YAAN AHAY?',
    aboutHotspotLabel: 'Fur warbixinta musharaxa',
    hotspotLabel: (name: string) => `Fur khariidadda ${name}`,
    milestones: (n: number) => `${n} marxaladood`,
  },

  about: {
    title: 'Ku saabsan musharaxa',
    close: 'Xir',
    introduction: 'Hordhac',
    biography: 'Taariikh nololeed',
    education: 'Waxbarashada',
    experience: 'Khibradda',
    skills: 'Xirfadaha',
    motivation: 'Sababta aan u tartamayo',
    vision: 'Aragtida hoggaamineed',
    achievements: 'Guulaha',
    comingSoon: 'Faahfaahin dheeraad ah ayaa dhawaan la soo bandhigi doonaa.',
  },

  roadmap: {
    back: 'Ku noqo aragtida',
    progress: 'Horumarka akhriska',
    progressText: (current: number, total: number) => `Marxaladda ${current} ee ${total}`,
    prev: 'Marxaladdii hore',
    next: 'Marxaladda xigta',
    toTop: 'Kor u noqo',
    share: 'La wadaag',
    shared: 'Xiriirka waa la koobiyeeyay',
    milestoneNav: 'Marxaladaha',
    goTo: (n: number, title: string) => `U gudub marxaladda ${n}: ${title}`,
    details: 'Faahfaahin',
    hideDetails: 'Qari faahfaahinta',
    example: 'Tusaale',
    exampleHint: 'Nuxur tusaale ah oo weli aan la ansixin',
    problem: 'Caqabadda',
    solution: 'Xalka',
    implementation: 'Sida loo fulinayo',
    benefit: "Faa'iidada la filayo",
    timeframe: 'Muddada',
    empty: 'Marxalado weli laguma darin khariidaddan.',
    conclusionEyebrow: 'Dhammaadka khariidadda',
    others: 'Sahami khariidadaha kale',
    completed: 'Waad dhammaysay',
  },

  feedback: {
    heading: 'Aragtidaada',
    popupTitle: 'Aragtidaada',
    prompt: 'Waad dhammaysay khariidaddan. Maxay kula tahay? Aragtidaadu waxay naga caawinaysaa inaan qorshaha hagaajino.',
    open: 'Qor aragtidaada',
    placeholder: 'Aragtidaada halkaan ku qor...',
    later: 'Hadda maya',
    question: 'Ma u aragtaa khariidaddan mid waxtar leh?',
    yes: 'Haa',
    no: 'Maya',
    suggestionLabel: 'Maxaad hagaajin lahayd ama ku dari lahayd? (ikhtiyaari)',
    suggestionHint: 'Ha qorin magacaaga, lambarkaaga ama xog kale oo shakhsi ah.',
    chars: (n: number, max: number) => `${n} / ${max}`,
    submit: 'Dir fikradda',
    submitting: 'Waa la dirayaa…',
    skip: 'Ka gudub',
    skipped: 'Waad ka gudubtay fikradda. Waad ku soo laaban kartaa wakhti kasta.',
    giveAnyway: 'Bixi fikrad',
    success: 'Mahadsanid! Fikraddaada waa la helay.',
    error: 'Fikradda lama dirin. Fadlan isku day mar kale.',
    rateLimited: 'Fikrado badan ayaa la diray. Fadlan isku day mar dambe.',
    chooseOne: 'Fadlan dooro Haa ama Maya.',
    tooLong: 'Qoraalku aad buu u dheer yahay.',
    disclaimer: 'Tani waa fikrad ku saabsan khariidadda — ma aha cod doorasho. Lama kaydiyo magac, lambar arday ama IP.',
  },

  footer: {
    privacy: 'Asturnaanta',
    navLabel: 'Xiriirada hoose',
    note: 'Bog ololeed oo arday. Fikradaha booqdayaashu ma aha ra’yi-ururin doorasho.',
  },

  privacy: {
    title: 'Ogeysiiska Asturnaanta',
  },
};

export type Dictionary = typeof so;
