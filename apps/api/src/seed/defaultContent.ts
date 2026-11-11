import type { IconName, PillarSlug, PillarTheme } from '@reveal/shared';

/**
 * Starter content.
 *
 * IMPORTANT: Everything here except the candidate's name and the campaign context is
 * PLACEHOLDER content. Milestones are flagged `isExample: true` and display a public
 * "Tusaale" (example) badge until an editor replaces them with approved commitments.
 * No achievements, credentials or promises are invented.
 */

export const DEFAULT_CANDIDATE = {
  name: 'Eng. Zakariye Mohamed Omar',
  title: 'Musharaxa Hoggaanka Ardayda — Kulliyadda Sayniska Kombiyuutarka & IT, Jaamacadda Hormuud',
  introduction: '',
  biography: '',
  education: [] as string[],
  experience: [] as string[],
  skills: [] as string[],
  motivation: '',
  vision: '',
  achievements: [] as string[],
  /** Face centre on assets/candidate/intro-portrait-folded-arms.png (427×638). */
  portraitFocal: { x: 0.497, y: 0.39 },
  pose: {
    assetId: null,
    // assets/candidate/pose-arms-open.png (436×653) — the approved arms-open photo.
    isPlaceholder: false,
    focal: { x: 0.5, y: 0.3 },
    anchors: {
      // Anatomical mapping: the candidate's RIGHT hand appears on the viewer's LEFT.
      education: { x: 0.09, y: 0.465 }, // candidate's right palm → WAXBARASHO
      unity: { x: 0.91, y: 0.465 }, // candidate's left palm → MIDNIMO
      leadership: { x: 0.5, y: 0.665 }, // in front of the candidate, between the hands → HOGGAAN
      about: { x: 0.5, y: 0.45 }, // upper chest / tie → "?" About
    },
  },
};

export const SEED_IMAGES = {
  portrait: { file: 'intro-portrait-folded-arms.png', alt: 'Musharaxa oo gacmaha isku laabay' },
  pose: { file: 'pose-arms-open.png', alt: 'Musharaxa oo labada gacmood kala furay' },
};

export const DEFAULT_SETTINGS = {
  branding: {
    siteName: 'THE REVEAL',
    tagline: 'Daah-fur Aragtida',
    campaignContext: 'Doorashada hoggaanka ardayda — Kulliyadda Sayniska Kombiyuutarka & IT, Jaamacadda Hormuud',
  },
  animationsEnabled: true,
  introEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: 'Boggu wuxuu ku jiraa dayactir. Fadlan dib ugu soo noqo wax yar kadib.',
  socialLinks: [] as Array<{ label: string; url: string }>,
  privacyNotice: [
    'Boggan wuxuu ururiyaa xog kooban oo aan qofka lagu aqoonsan karin.',
    '',
    '• Tirakoob guud: waxaan tirinnaa booqashooyinka boggaga iyo khariidadaha. Calaamad random ah ayaa lagu kaydiyaa sessionStorage-ka tab-kaaga oo keliya, waxaana server-ka ku kaydsan oo keliya hash maalin walba isbeddela oo la tirtiro 48 saacadood gudahood. Ma isticmaalno cookies raadraac, xayeysiis, ama adeegyo dibadeed oo tirakoob.',
    '• Fikradaha: jawaabta Haa/Maya iyo qoraalka ikhtiyaariga ah waxaa lagu kaydiyaa iyadoo aan magac, lambar arday, telefoon, email, IP ama goob la kaydin.',
    '• Fikradaha la soo diray ma aha codbixin doorasho, mana matalaan dhammaan ardayda.',
    '• Xogta fikradaha waxaa la tirtiraa ugu dambeyn 12 bilood kadib.',
    '',
    'Su\'aalo? La xiriir kooxda ololaha.',
  ].join('\n'),
};

interface PillarSeed {
  slug: PillarSlug;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  conclusion: string;
  theme: PillarTheme;
  icon: IconName;
  order: number;
  milestones: Array<{ title: string; icon: IconName; topic: string }>;
}

export const DEFAULT_PILLARS: PillarSeed[] = [
  {
    slug: 'waxbarasho',
    name: 'WAXBARASHO',
    subtitle: 'Tiirka 1aad',
    tagline: 'Waxbarasho tayo leh oo ardayga diiradda saarta.',
    description: 'Khariidaddan waxay muujinaysaa jihada guud ee tiirka waxbarashada. Marxalad kasta waxaa lagu dari doonaa faahfaahin la ansixiyey.',
    conclusion: 'Waad dhammaysay khariidadda waxbarashada. Fikraddaada ayaa naga caawinaysa inaan horumarino.',
    theme: 'education',
    icon: 'graduation-cap',
    order: 1,
    milestones: [
      { title: 'Taageerada Waxbarashada', icon: 'graduation-cap', topic: 'taageerada casharrada iyo caawinta ardayda' },
      { title: 'Ilaha Waxbarashada', icon: 'library', topic: 'helitaanka ilaha iyo agabka waxbarashada' },
      { title: 'Wada-barashada', icon: 'users', topic: 'kooxaha wax-wada-barashada' },
      { title: 'Xirfadaha Tignoolajiyada', icon: 'code', topic: 'xirfadaha tignoolajiyada ee la taaban karo' },
      { title: 'Fursadaha Barashada', icon: 'sparkles', topic: 'fursadaha barasho ee ardayda' },
      { title: 'Isgaarsiinta Waxbarashada', icon: 'messages-square', topic: 'isgaarsiinta u dhexeysa ardayda iyo kulliyadda' },
    ],
  },
  {
    slug: 'midnimo',
    name: 'MIDNIMO',
    subtitle: 'Tiirka 2aad',
    tagline: 'Bulsho arday oo isku xiran, midaysan oo is-dhageysata.',
    description: 'Khariidaddan waxay muujinaysaa jihada guud ee tiirka midnimada. Marxalad kasta waxaa lagu dari doonaa faahfaahin la ansixiyey.',
    conclusion: 'Waad dhammaysay khariidadda midnimada. Codkaagu waa qayb ka mid ah midnimadeena.',
    theme: 'unity',
    icon: 'handshake',
    order: 2,
    milestones: [
      { title: 'Wada-shaqeynta Ardayda', icon: 'handshake', topic: 'wada-shaqeynta ardayda' },
      { title: 'Ka-qaybgal Loo Dhan Yahay', icon: 'users', topic: 'ka-qaybgalka dhammaan ardayda' },
      { title: 'Isgaarsiin Furan', icon: 'messages-square', topic: 'isgaarsiin furan oo joogto ah' },
      { title: 'Hawlo Wadaag ah', icon: 'calendar', topic: 'hawlaha iyo munaasabadaha wadaagga ah' },
      { title: 'Dhageysiga Aragtiyaha', icon: 'ear', topic: 'dhageysiga aragtiyaha kala duwan' },
      { title: 'Dhisidda Bulshada', icon: 'heart-handshake', topic: 'dhisidda bulshada ardayda' },
    ],
  },
  {
    slug: 'hoggaan',
    name: 'HOGGAAN',
    subtitle: 'Tiirka 3aad',
    tagline: 'Hoggaan daah-furan, isla-xisaabtan leh oo ardayda matala.',
    description: 'Khariidaddan waxay muujinaysaa jihada guud ee tiirka hoggaanka. Marxalad kasta waxaa lagu dari doonaa faahfaahin la ansixiyey.',
    conclusion: 'Waad dhammaysay khariidadda hoggaanka. Hoggaanku wuxuu ku bilaabmaa dhageysi.',
    theme: 'leadership',
    icon: 'compass',
    order: 3,
    milestones: [
      { title: 'Isla-xisaabtan', icon: 'scale', topic: 'isla-xisaabtanka hoggaanka' },
      { title: 'Daah-furnaan', icon: 'eye', topic: 'daah-furnaanta go\'aannada' },
      { title: 'Matalaadda Ardayda', icon: 'landmark', topic: 'matalaadda ardayda' },
      { title: 'Kanaalada Fikradaha', icon: 'megaphone', topic: 'kanaalada lagu soo gudbiyo fikradaha' },
      { title: 'La-socodka Mashaariicda', icon: 'clipboard-check', topic: 'la-socodka mashaariicda' },
      { title: 'Warbixinta Natiijooyinka', icon: 'bar-chart', topic: 'warbixinta natiijooyinka' },
    ],
  },
];

/** Example milestone text — deliberately generic and labelled as an example. */
export function exampleMilestone(topic: string) {
  return {
    summary: `Tusaale: marxaladdan waxay ka hadlaysaa ${topic}.`,
    description: `Qoraalkan waa tusaale. Kooxda ololaha ayaa ku beddeli doonta sharraxaad la ansixiyey oo ku saabsan ${topic}.`,
    problem: 'Tusaale: halkan ku qor caqabadda ama baahida la aqoonsaday.',
    solution: 'Tusaale: halkan ku qor xalka la soo jeediyey.',
    implementation: 'Tusaale: halkan ku qor tallaabooyinka fulinta.',
    expectedBenefit: 'Tusaale: halkan ku qor faa\'iidada la filayo ee ardayda.',
    timeframe: '',
    isExample: true,
    status: 'active' as const,
  };
}
