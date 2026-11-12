import type { IconName, PillarSlug, PillarTheme } from '@reveal/shared';

/**
 * Starting content, in Somali (primary) and English (`en`).
 *
 * The three pillars contain practical, student-centred plans written for the campaign. They avoid invented
 * statistics, dates, endorsements or institutional approvals; every implementation step is an action the
 * campaign itself can carry out. Editors can change everything in the admin (Roadmaps & Milestones).
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
  /** Face centre on assets/candidate/intro-portrait-suit-cutout.png (487×651). */
  portraitFocal: { x: 0.487, y: 0.345 },
  pose: {
    assetId: null,
    // assets/candidate/pose-arms-open-cutout.png (436×653) — approved arms-open photo, backdrop removed.
    isPlaceholder: false,
    focal: { x: 0.5, y: 0.3 },
    anchors: {
      // Anatomical mapping: the candidate's RIGHT hand appears on the viewer's LEFT.
      education: { x: 0.085, y: 0.455 }, // resting on the candidate's open right palm → WAXBARASHO
      unity: { x: 0.915, y: 0.455 }, // resting on the candidate's open left palm → MIDNIMO
      leadership: { x: 0.5, y: 0.665 }, // in front of the candidate, between the hands → HOGGAAN
      about: { x: 0.5, y: 0.45 }, // centre of the upper chest → "?" About
    },
  },
  en: {
    title: 'Candidate for Student Leadership — Faculty of Computer Science & IT, Hormuud University',
  },
};

export const SEED_IMAGES = {
  portrait: { file: 'intro-portrait-suit-cutout.png', alt: 'Sawirka musharaxa oo suudh xiran' },
  pose: { file: 'pose-arms-open-cutout.png', alt: 'Musharaxa oo labada gacmood kala furay' },
};

/** Files of the previous seed — used by the content migration to recognise images it may replace. */
export const PREVIOUS_SEED_IMAGE_FILES = ['intro-portrait-folded-arms.png', 'pose-arms-open.png', 'portrait-headshot.jpg'];

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
    "Su'aalo? La xiriir kooxda ololaha.",
  ].join('\n'),
  en: {
    tagline: 'Discover the Vision',
    campaignContext: 'Student leadership election — Faculty of Computer Science & IT, Hormuud University',
    maintenanceMessage: 'The site is under maintenance. Please check back shortly.',
    privacyNotice: [
      'This website collects only minimal information that cannot identify you.',
      '',
      '• Aggregate statistics: we count page and roadmap visits. A random token is kept only in your browser tab (sessionStorage); the server stores only a daily-rotating hash of it, deleted within 48 hours. We use no tracking cookies, advertising or third-party analytics.',
      '• Feedback: your Yes/No answer and optional comment are stored without your name, student number, phone, email, IP address or location.',
      '• Feedback is not an election vote and does not represent all students.',
      '• Feedback is deleted after at most 12 months.',
      '',
      'Questions? Contact the campaign team.',
    ].join('\n'),
  },
};

export interface MilestoneSeed {
  title: string;
  icon: IconName;
  summary: string;
  problem: string;
  solution: string;
  implementation: string;
  expectedBenefit: string;
  en: { title: string; summary: string; problem: string; solution: string; implementation: string; expectedBenefit: string };
}

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
  en: { name: string; subtitle: string; tagline: string; description: string; conclusion: string };
  milestones: MilestoneSeed[];
}

export const DEFAULT_PILLARS: PillarSeed[] = [
  {
    slug: 'waxbarasho',
    name: 'WAXBARASHO',
    subtitle: 'Tiirka 1aad',
    tagline: 'Waxbarasho tayo leh oo ardayga diiradda saarta.',
    description:
      'Waxaan rabnaa in arday kasta helo taageerada, agabka iyo fursadaha uu ku horumariyo aqoontiisa iyo xirfadihiisa — laga bilaabo maalinta koowaad ilaa qalin-jabinta.',
    conclusion: 'Waxbarasho tayo leh waa aasaaska mustaqbalka arday kasta.',
    theme: 'education',
    icon: 'graduation-cap',
    order: 1,
    en: {
      name: 'EDUCATION',
      subtitle: 'Pillar 1',
      tagline: 'Quality learning that puts students first.',
      description:
        'We want every student to have the support, resources and opportunities to grow their knowledge and skills — from the first day to graduation.',
      conclusion: "Quality learning is the foundation of every student's future.",
    },
    milestones: [
      {
        title: 'Kooxaha Wax-wada-barashada',
        icon: 'users',
        summary: 'Kooxo toddobaadle ah oo ay hagaan arday sannadaha sare ah, si loo xoojiyo maaddooyinka adag.',
        problem: 'Arday badan ayaa ku adkaata maaddooyinka sida barnaamijyada iyo xisaabta, mana haystaan meel joogto ah oo ay caawimaad ka helaan.',
        solution: 'Kooxo toddobaadle ah oo ay hagaan arday sannadaha sare ah, iyadoo la kaashanayo macallimiinta maaddooyinka.',
        implementation: '• Diiwaangelinta arday tabarucayaal ah oo wax baraya\n• Jadwal toddobaadle ah oo maaddo kasta leh\n• Qol ama goob online ah oo la isugu yimaado',
        expectedBenefit: 'Fahan qoto dheer, natiijooyin wanaagsan iyo kalsooni badan oo imtixaanaadka ah.',
        en: {
          title: 'Peer Study Groups',
          summary: 'Weekly study groups led by senior students to strengthen difficult courses.',
          problem: 'Many students struggle with courses such as programming and mathematics and have no regular place to get help.',
          solution: 'Weekly study groups led by senior students, coordinated with the course lecturers.',
          implementation: '• Recruit volunteer student tutors\n• A weekly timetable for each course\n• A classroom or online space to meet',
          expectedBenefit: 'Deeper understanding, better results and more confidence before exams.',
        },
      },
      {
        title: 'Maktabad Dhijitaal ah',
        icon: 'library',
        summary: 'Hal meel oo laga helo casharrada, buugaagta iyo imtixaanadii hore ee kulliyadda.',
        problem: 'Agabka waxbarashadu waa kala firirsan yahay — kooxo WhatsApp, xusuus-qor shakhsi ah iyo faylal lumay.',
        solution: 'Kayd dhijitaal ah oo si habsami ah loogu kala saaray maaddo iyo semester, laguna wadaago oggolaanshaha macallimiinta.',
        implementation: '• Ururinta agabka la oggol yahay\n• U kala qaybinta maaddo iyo semester\n• Arday mas’uul ka ah cusbooneysiinta joogtada ah',
        expectedBenefit: 'Arday kasta wuxuu si siman u helayaa agab tayo leh, wakhtina wuu badbaadinayaa.',
        en: {
          title: 'Digital Learning Library',
          summary: "One place to find the faculty's course notes, books and past exam papers.",
          problem: 'Learning materials are scattered across WhatsApp groups, personal notes and lost files.',
          solution: "An organised digital archive by course and semester, shared with the lecturers' permission.",
          implementation: '• Collect approved materials\n• Organise them by course and semester\n• Student volunteers keep it up to date',
          expectedBenefit: 'Every student gets equal access to good materials and saves time.',
        },
      },
      {
        title: 'Xirfadaha Tignoolajiyada',
        icon: 'code',
        summary: 'Aqoon-is-weydaarsiyo gacan-ku-haynta ah oo ku saabsan xirfadaha uu suuqa shaqadu u baahan yahay.',
        problem: 'Waxbarashada fasalku inta badan waa aragti; arday badan ma helaan fursad ay ku dhisaan mashaariic dhab ah.',
        solution: 'Aqoon-is-weydaarsiyo bil kasta ah oo ku saabsan horumarinta webka, xogta, amniga iyo Git.',
        implementation: '• Martiqaadka khubaro iyo arday khibrad leh\n• Mashruuc yar oo kal kasta lagu dhammeeyo\n• Shahaado ka-qaybgal',
        expectedBenefit: 'Arday u diyaarsan suuqa shaqada, kuna haysta portfolio xooggan.',
        en: {
          title: 'Practical Tech Skills',
          summary: 'Hands-on workshops on the skills the job market is asking for.',
          problem: 'Classroom learning is often theoretical; many students never get to build real projects.',
          solution: 'Monthly workshops on web development, data, security and Git.',
          implementation: '• Invite professionals and experienced students\n• A small project to finish in each session\n• Certificates of participation',
          expectedBenefit: 'Job-ready students with a stronger portfolio.',
        },
      },
      {
        title: 'Isgaarsiinta Ardayda iyo Macallimiinta',
        icon: 'messages-square',
        summary: "Kanaal cad oo ardaydu ku gudbin karaan su'aalaha iyo arrimaha waxbarashada.",
        problem: 'Arday badan ma oga cidda ay la xiriiraan marka ay qabaan dhibaato waxbarasho.',
        solution: 'Wakiil arday oo fasal kasta leh, iyo kulan joogto ah oo lala yeesho maamulka kulliyadda.',
        implementation: '• Doorashada wakiilada fasallada\n• Kulan bil kasta ah oo maamulka lala yeesho\n• Warbixin kooban oo ardayda loo diro',
        expectedBenefit: 'Dhibaatooyinka si dhakhso ah ayaa loo xalliyaa, ardayduna waxay dareemaan in la maqlo.',
        en: {
          title: 'Student–Lecturer Communication',
          summary: 'A clear channel for students to raise academic questions and concerns.',
          problem: "Many students don't know who to contact when they have an academic problem.",
          solution: 'A student representative in every class and regular meetings with the faculty administration.',
          implementation: '• Elect class representatives\n• A monthly meeting with the administration\n• A short summary shared with students',
          expectedBenefit: 'Problems are solved faster and students feel heard.',
        },
      },
    ],
  },
  {
    slug: 'midnimo',
    name: 'MIDNIMO',
    subtitle: 'Tiirka 2aad',
    tagline: 'Bulsho arday oo isku xiran, midaysan oo is-dhageysata.',
    description:
      'Midnimadu waxay ka bilaabataa is-aqoon iyo is-ixtiraam. Waxaan dhisaynaa bulsho arday oo qof walba uu dareemo inuu ka mid yahay.',
    conclusion: 'Codkaagu waa qayb ka mid ah midnimadeena.',
    theme: 'unity',
    icon: 'handshake',
    order: 2,
    en: {
      name: 'UNITY',
      subtitle: 'Pillar 2',
      tagline: 'A connected student community that listens to each other.',
      description: 'Unity starts with knowing and respecting each other. We are building a student community where everyone feels they belong.',
      conclusion: 'Your voice is part of our unity.',
    },
    milestones: [
      {
        title: 'Soo Dhaweynta Ardayda Cusub',
        icon: 'heart-handshake',
        summary: 'Barnaamij hagid ah oo arday kasta oo cusub la siinayo arday hore oo gacan siiya.',
        problem: 'Toddobaadyada ugu horreeya, arday cusub oo badan ayaa dareema kalinimo iyo jahwareer.',
        solution: 'Arday kasta oo cusub waxaa loo xilsaarayaa arday sannad sare ah oo hagaya semesterka koowaad.',
        implementation: '• Liiska hagayaasha tabarucaadka ah\n• Kulan soo dhaweyn ah bilowga semester kasta\n• Hage kooban oo ku saabsan jaamacadda',
        expectedBenefit: 'Arday cusub oo si dhakhso ah ula qabsada jaamacadda, saaxiibbona yeesha.',
        en: {
          title: 'Welcoming New Students',
          summary: 'A mentoring programme that pairs every new student with an experienced one.',
          problem: 'In their first weeks, many new students feel lost and alone.',
          solution: 'Each new student is paired with a senior student for their first semester.',
          implementation: '• A list of volunteer mentors\n• A welcome meeting at the start of each semester\n• A short campus guide',
          expectedBenefit: 'New students settle in faster and make friends.',
        },
      },
      {
        title: 'Ka-qaybgal Loo Dhan Yahay',
        icon: 'users',
        summary: 'Hubinta in arday kasta — gabar iyo wiil, sannad kasta — uu helo fursad siman.',
        problem: 'Hawlaha ardayda inta badan waxaa wada koox yar oo isku mid ah.',
        solution: 'Guddi kasta iyo hawl kasta waa u furan yihiin dhammaan ardayda, iyadoo si cad loogu dhawaaqayo.',
        implementation: '• Ku dhawaaqid furan oo fursad kasta ah\n• Matalaad dheellitiran oo guddiyada ah\n• Saacado kulan oo u habboon arday kasta',
        expectedBenefit: 'Kalsooni iyo ka-qaybgal badan oo ka imanaya arday kala duwan.',
        en: {
          title: 'Inclusive Participation',
          summary: 'Making sure every student — women and men, in every year — has an equal chance to take part.',
          problem: 'Student activities are often run by the same small group.',
          solution: 'Every committee and activity is open to all students, with clear announcements.',
          implementation: '• Open calls for every opportunity\n• Balanced representation on committees\n• Meeting times that suit all students',
          expectedBenefit: 'More trust and participation from all kinds of students.',
        },
      },
      {
        title: 'Hawlo Wadaag ah',
        icon: 'calendar',
        summary: 'Tartamo, munaasabado iyo mashaariic bulsho oo isu keena ardayda.',
        problem: 'Ardaydu inta badan waxay isku arkaan fasalka oo keliya; xiriir dhab ah oo ka baxsan ma jiro.',
        solution: 'Jadwal semester kasta ah oo ay ku jiraan tartan barnaamij, ciyaaro iyo hawl adeeg bulsho.',
        implementation: '• Guddi hawlaha ah oo arday ka kooban\n• Ugu yaraan saddex hawlood semester kasta\n• Ra’yi-ururin kooban kadib hawl kasta',
        expectedBenefit: 'Saaxiibtinimo, wada-shaqeyn iyo dareen ah inaan hal bulsho nahay.',
        en: {
          title: 'Shared Activities',
          summary: 'Competitions, events and community projects that bring students together.',
          problem: 'Students mostly meet only in class; there are few real connections outside it.',
          solution: 'A semester calendar with a coding contest, sports and a community-service activity.',
          implementation: '• A student activities committee\n• At least three activities each semester\n• A short feedback survey after each one',
          expectedBenefit: 'Friendship, teamwork and a real sense of community.',
        },
      },
      {
        title: 'Dhageysiga Cod Kasta',
        icon: 'ear',
        summary: 'Goobo furan oo ardaydu si xor ah ugu dhiibtaan fikradahooda.',
        problem: 'Arday badan ma helaan fursad aragtidooda la maqlo ama tixgelin la siiyo.',
        solution: 'Fadhi furan bil kasta iyo sanduuq fikradeed oo online ah oo si dhab ah loo akhriyo.',
        implementation: '• Fadhi furan bil kasta\n• Sanduuq fikradeed oo online ah\n• Jawaab la daabaco fikrad kasta oo la qaato',
        expectedBenefit: 'Go’aanno ka tarjumaya baahida dhabta ah ee ardayda.',
        en: {
          title: 'Listening to Every Voice',
          summary: 'Open forums where students can freely share their ideas.',
          problem: 'Many students never get the chance to be heard.',
          solution: 'A monthly open forum and an online suggestions box that is actually read.',
          implementation: '• A monthly open forum\n• An online suggestions box\n• A published response to every suggestion taken up',
          expectedBenefit: 'Decisions that reflect what students actually need.',
        },
      },
    ],
  },
  {
    slug: 'hoggaan',
    name: 'HOGGAAN',
    subtitle: 'Tiirka 3aad',
    tagline: 'Hoggaan daah-furan, isla-xisaabtan leh oo ardayda matala.',
    description:
      'Hoggaanku waa adeeg. Waxaan u shaqeyn doonnaa si furan, waxaana ka warbixin doonnaa wixii la qabtay iyo wixii aan weli la qaban.',
    conclusion: 'Hoggaanku wuxuu ku bilaabmaa dhageysi.',
    theme: 'leadership',
    icon: 'compass',
    order: 3,
    en: {
      name: 'LEADERSHIP',
      subtitle: 'Pillar 3',
      tagline: 'Transparent, accountable leadership that represents students.',
      description: 'Leadership is service. We will work in the open and report on what has been done — and what has not.',
      conclusion: 'Leadership begins with listening.',
    },
    milestones: [
      {
        title: 'Isla-xisaabtan',
        icon: 'scale',
        summary: 'Ballan kasta oo la sameeyo waxaa la socda jadwal iyo qof si cad mas’uul uga ah.',
        problem: 'Ballamo badan ayaa la sameeyaa xilliga doorashada, laakiin dib looma eego.',
        solution: 'Liis ballamo ah oo la daabaco, oo muujinaya xaaladda hawl kasta iyo cidda mas’uulka ka ah.',
        implementation: '• Daabacaadda liiska ballamaha\n• Cusbooneysiin bil kasta ah\n• Sharraxaad cad marka hawl dib u dhacdo',
        expectedBenefit: 'Kalsooni dhex marta ardayda iyo hoggaankooda.',
        en: {
          title: 'Accountability',
          summary: 'Every commitment comes with a timeline and a named person responsible.',
          problem: 'Many promises are made at election time and never followed up.',
          solution: 'A published list of commitments showing the status of each one and who is responsible.',
          implementation: '• Publish the list of commitments\n• Update it every month\n• Explain clearly when something is delayed',
          expectedBenefit: 'Trust between students and their leaders.',
        },
      },
      {
        title: 'Daah-furnaan',
        icon: 'eye',
        summary: 'Go’aannada iyo kharashka ururka ardayda si furan ayaa loo wadaagaa.',
        problem: 'Ardaydu inta badan ma oga sida go’aannada loo gaaro ama lacagta loo isticmaalo.',
        solution: 'Qoraal kooban kadib kulan kasta, iyo warbixin maaliyadeed oo semester kasta la soo bandhigo.',
        implementation: '• Qoraal kooban oo kulan kasta ah\n• Warbixin maaliyadeed semester kasta\n• Hal meel oo dhammaan laga helo',
        expectedBenefit: 'Arday xog ogaal ah oo ka qayb qaata go’aannada.',
        en: {
          title: 'Transparency',
          summary: 'Decisions and student-union spending are shared openly.',
          problem: 'Students rarely know how decisions are made or how money is spent.',
          solution: 'Short notes after every meeting and a financial report every semester.',
          implementation: '• Short notes from every meeting\n• A financial report each semester\n• One place to find all of it',
          expectedBenefit: 'Informed students who can take part in decisions.',
        },
      },
      {
        title: 'Kanaalada Fikradaha',
        icon: 'megaphone',
        summary: 'Habab fudud oo ardaydu ku soo gudbiyaan cabashooyin iyo fikrado.',
        problem: 'Cabashooyinka badankood way lumaan sababtoo ah ma jiro hab cad oo lagula socdo.',
        solution: 'Foom online ah iyo saacado xafiis oo toddobaadle ah, iyadoo jawaab la bixinayo muddo go’an gudaheed.',
        implementation: '• Foom fudud oo online ah\n• Saacado xafiis toddobaadle ah\n• Jawaab 7 maalmood gudahood',
        expectedBenefit: 'Arrin kasta waa la diiwaangeliyaa, waana lala socdaa ilaa la xalliyo.',
        en: {
          title: 'Feedback Channels',
          summary: 'Simple ways for students to raise concerns and ideas.',
          problem: 'Most concerns get lost because there is no clear way to follow them up.',
          solution: 'An online form and weekly office hours, with a reply within a set time.',
          implementation: '• A simple online form\n• Weekly office hours\n• A reply within 7 days',
          expectedBenefit: 'Every issue is recorded and followed through until it is resolved.',
        },
      },
      {
        title: 'Warbixinta Natiijooyinka',
        icon: 'bar-chart',
        summary: 'Dhammaadka semester kasta, warbixin cad oo ku saabsan waxa la qabtay.',
        problem: 'Shaqada la qabtay inta badan lama cabbiro, lagamana warbixiyo.',
        solution: 'Warbixin semester ah oo isbarbardhigaysa ballamaha iyo natiijooyinka dhabta ah.',
        implementation: '• Ururinta xogta hawl kasta\n• Kulan furan oo lagu soo bandhigo warbixinta\n• Casharrada laga bartay iyo qorshaha xiga',
        expectedBenefit: 'Horumar muuqda iyo hoggaan si joogto ah u sii fiicnaanaya.',
        en: {
          title: 'Reporting Results',
          summary: 'A clear report at the end of each semester on what was achieved.',
          problem: 'Work that gets done is rarely measured or reported.',
          solution: 'A semester report comparing commitments with actual results.',
          implementation: '• Collect data on each activity\n• Present the report at an open meeting\n• Lessons learned and the next plan',
          expectedBenefit: 'Visible progress and leadership that keeps improving.',
        },
      },
    ],
  },
];

/** Old seed texts — the migration only replaces pillar texts that still equal these (never edited content). */
const OLD_DESC = (topic: string) =>
  `Khariidaddan waxay muujinaysaa jihada guud ee tiirka ${topic}. Marxalad kasta waxaa lagu dari doonaa faahfaahin la ansixiyey.`;
export const PREVIOUS_PILLAR_TEXT: Record<PillarSlug, { description: string; conclusion: string }> = {
  waxbarasho: {
    description: OLD_DESC('waxbarashada'),
    conclusion: 'Waad dhammaysay khariidadda waxbarashada. Fikraddaada ayaa naga caawinaysa inaan horumarino.',
  },
  midnimo: {
    description: OLD_DESC('midnimada'),
    conclusion: 'Waad dhammaysay khariidadda midnimada. Codkaagu waa qayb ka mid ah midnimadeena.',
  },
  hoggaan: {
    description: OLD_DESC('hoggaanka'),
    conclusion: 'Waad dhammaysay khariidadda hoggaanka. Hoggaanku wuxuu ku bilaabmaa dhageysi.',
  },
};

/** Milestone documents for a pillar seed (Somali fields + English `en`). */
export function milestoneDocs(p: PillarSeed) {
  return p.milestones.map((m, i) => ({
    title: m.title,
    icon: m.icon,
    order: i + 1,
    summary: m.summary,
    description: '',
    problem: m.problem,
    solution: m.solution,
    implementation: m.implementation,
    expectedBenefit: m.expectedBenefit,
    timeframe: '',
    status: 'active' as const,
    isExample: false,
    en: { ...m.en, description: '', timeframe: '' },
  }));
}
