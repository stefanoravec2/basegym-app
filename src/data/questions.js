// FREE_END question appended to every product branch before ROUTER
export const FREE_END_QUESTION = {
  id: 'FREE_END',
  type: 'textarea',
  required: false,
  stepLabel: 'Volná odpověď',
  question: 'Je něco, na co jsme se nezeptali, ale podle tebe bychom o tomto produktu měli vědět?',
  placeholder: 'Stačí pár slov…',
  voc_tag: 'PRODUCT_LANGUAGE',
  next: 'ROUTER'
}

// COMMON BASE S00-S04
export const COMMON = [
  {
    id: 'S00', type: 'intro',
    headline: 'Pomoz nám dělat hello coco lepší.',
    body: 'Zajímá nás tvůj skutečný názor. Neexistují správné ani špatné odpovědi. Zabere to přibližně 3 minuty.',
    cta: 'Začít',
    next: 'S01'
  },
  {
    id: 'S01', type: 'single', required: true,
    stepLabel: 'Znalost značky',
    question: 'Znal/a jsi hello coco už před dneškem?',
    options: [
      { id: 'yes', label: 'Ano' },
      { id: 'no', label: 'Ne' },
      { id: 'unsure', label: 'Nejsem si jistý/á' }
    ],
    branch: { yes: 'S02', no: 'S03', unsure: 'S03' }
  },
  {
    id: 'S02', type: 'single', required: true,
    stepLabel: 'Zkušenost se značkou',
    question: 'Koupil/a sis už někdy produkt hello coco?',
    options: [
      { id: 'repeat', label: 'Opakovaně' },
      { id: 'once', label: 'Jednou' },
      { id: 'aware', label: 'Znám, ale ještě jsem nenakoupil/a' },
      { id: 'unsure', label: 'Nevím' }
    ],
    brandStatusMap: { repeat: 'HC_REPEAT', once: 'HC_ONCE', aware: 'HC_AWARE_NONBUYER', unsure: 'HC_UNSURE' },
    next: 'S03'
  },
  {
    id: 'S03', type: 'single', required: true,
    stepLabel: 'Výběr produktu',
    question: 'Který z těchto produktů tě dnes zaujal nejvíc?',
    options: [
      { id: 'NEEDRA', label: 'Needra Shot — plnější rty' },
      { id: 'CCT', label: 'Bělicí pásky CCT (fialové)' },
      { id: 'PAP', label: 'Bělicí pásky PAP (zelené)' },
      { id: 'TOOTHPASTE', label: 'Zubní pasty' }
    ],
    branch: { NEEDRA: 'N00', CCT: 'C00', PAP: 'P00', TOOTHPASTE: 'T00' }
  }
]

// NEEDRA BRANCH
export const NEEDRA = [
  {
    id: 'N00', type: 'textarea', required: false,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Co si myslíš, že tento produkt dělá?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PRODUCT_LANGUAGE', next: 'N01'
  },
  {
    id: 'N01', type: 'textarea', required: false,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Co tě na něm zaujalo jako první?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE', next: 'N02'
  },
  {
    id: 'N02', type: 'textarea', required: false,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Co bys o něm potřeboval/a vědět, než by ses rozhodl/a ho koupit?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'OBJECTION', next: 'N03'
  },
  {
    id: 'N03', type: 'single', required: true,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Používáš nebo jsi už zkoušel/a produkty pro plnější vzhled rtů?',
    options: [
      { id: 'regularly', label: 'Pravidelně' },
      { id: 'sometimes', label: 'Občas' },
      { id: 'tried', label: 'Zkusil/a jsem' },
      { id: 'never', label: 'Nikdy' }
    ],
    branch: { regularly: 'N04', sometimes: 'N04', tried: 'N04', never: 'N05' }
  },
  {
    id: 'N04', type: 'textarea', required: false,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Co ti na produktech, které jsi zkoušel/a, vyhovovalo nebo nevyhovovalo?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PROBLEM', next: 'N05'
  },
  {
    id: 'N05', type: 'single', required: true,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Který odstín tě zaujal víc?',
    options: [
      { id: 'CRYSTAL', label: 'Crystal — průhledný, přirozený efekt' },
      { id: 'ROSE', label: 'Rose — růžový, výraznější efekt' },
      { id: 'SAME', label: 'Je mi to jedno' }
    ],
    next: 'N06'
  },
  {
    id: 'N06', type: 'textarea', required: false,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Proč právě tento?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE', next: 'N07'
  },
  {
    id: 'N07', type: 'multi', required: false, maxSelect: 3,
    product: 'NEEDRA', stepLabel: 'Needra',
    question: 'Ve kterých situacích by ti dával smysl?',
    helper: 'Vyber až 3.',
    options: [
      { id: 'daily', label: 'Běžný den' },
      { id: 'work', label: 'Práce' },
      { id: 'evening', label: 'Večer ven' },
      { id: 'date', label: 'Rande' },
      { id: 'party', label: 'Party' },
      { id: 'photo', label: 'Focení' },
      { id: 'special', label: 'Speciální událost' },
      { id: 'holiday', label: 'Dovolená' },
      { id: 'never', label: 'Nepoužíval/a bych' },
      { id: 'other', label: 'Jiné' }
    ],
    voc_tag: 'USE_OCCASION', next: 'FREE_END'
  }
]

// CCT BRANCH
export const CCT = [
  {
    id: 'C00', type: 'textarea', required: false,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Kdybys mohl/a na svém úsměvu změnit jednu věc, co by to bylo?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE', next: 'C01'
  },
  {
    id: 'C01', type: 'textarea', required: false,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Jak dnes řešíš barvu svých zubů, pokud ji vůbec řešíš?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PROBLEM', next: 'C02'
  },
  {
    id: 'C02', type: 'single', required: true,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Zkoušel/a jsi už domácí bělení zubů?',
    options: [
      { id: 'yes', label: 'Ano' },
      { id: 'no', label: 'Ne' }
    ],
    branch: { yes: 'C03', no: 'C04' }
  },
  {
    id: 'C03', type: 'textarea', required: false,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Co ti na něm vyhovovalo a co ne?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PROBLEM', next: 'C04'
  },
  {
    id: 'C04', type: 'textarea', required: false,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Co od těchto pásků očekáváš?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PRODUCT_LANGUAGE', next: 'C05'
  },
  {
    id: 'C05', type: 'textarea', required: false,
    product: 'CCT', stepLabel: 'CCT pásky',
    question: 'Co bys o nich potřeboval/a vědět před koupí?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'OBJECTION', next: 'FREE_END'
  }
]

// PAP BRANCH
export const PAP = [
  {
    id: 'P00', type: 'textarea', required: false,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Když vybíráš domácí bělení zubů, co je pro tebe nejdůležitější?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE', next: 'P01'
  },
  {
    id: 'P01', type: 'multi', required: true, maxSelect: 3,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Vyber maximálně 3 věci, které jsou pro tebe nejdůležitější.',
    randomize: true,
    options: [
      { id: 'speed', label: 'Rychlost výsledku' },
      { id: 'intensity', label: 'Výraznost' },
      { id: 'longevity', label: 'Dlouhodobost' },
      { id: 'gentle', label: 'Šetrnost' },
      { id: 'sensitivity', label: 'Nízká citlivost' },
      { id: 'ease', label: 'Jednoduchost' },
      { id: 'taste', label: 'Chuť' },
      { id: 'price', label: 'Cena' },
      { id: 'ingredients', label: 'Složení' },
      { id: 'brand', label: 'Značka' },
      { id: 'reviews', label: 'Recenze' },
      { id: 'other', label: 'Jiné' }
    ],
    next: 'P02'
  },
  {
    id: 'P02', type: 'textarea', required: false,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Co od těchto pásků očekáváš?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PRODUCT_LANGUAGE', next: 'P03'
  },
  {
    id: 'P03', type: 'textarea', required: false,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Co by se podle tebe dalo na bělicích páscích obecně zlepšit?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PROBLEM', next: 'P04'
  },
  {
    id: 'P04', type: 'single', required: true,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Která příchuť tě láká víc?',
    options: [
      { id: 'GRAPE', label: 'Grape (hrozno)' },
      { id: 'WATERMELON', label: 'Watermelon (melón)' },
      { id: 'NEITHER', label: 'Ani jedna' },
      { id: 'SAME', label: 'Je mi to jedno' }
    ],
    next: 'P05'
  },
  {
    id: 'P05', type: 'scale', required: true,
    product: 'PAP', stepLabel: 'PAP pásky',
    question: 'Jak důležitá je pro tebe u bělicích pásků příjemná chuť?',
    labelMin: 'Vůbec není', labelMax: 'Velmi důležitá',
    next: 'FREE_END'
  }
]

// TOOTHPASTE BRANCH — skrátená verzia
export const TOOTHPASTE = [
  {
    id: 'T00', type: 'textarea', required: false,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Když si vybíráš zubní pastu, co je pro tebe nejdůležitější?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'TOOTHPASTE_NEED', next: 'T01'
  },
  {
    id: 'T01', type: 'textarea', required: false,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Jakou zubní pastu používáš teď a proč právě tu?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PURCHASE_TRIGGER', next: 'T02'
  },
  {
    id: 'T02', type: 'textarea', required: false,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Kdybys mohl/a vytvořit ideální zubní pastu, co by měla dělat?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'TOOTHPASTE_NEED', next: 'T03'
  },
  {
    id: 'T03', type: 'multi', required: true, maxSelect: 3,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Vyber maximálně 3 věci, které jsou pro tebe u pasty nejdůležitější.',
    randomize: true,
    options: [
      { id: 'whitening', label: 'Bělení' },
      { id: 'maintain', label: 'Udržení bílého úsměvu' },
      { id: 'sensitivity', label: 'Citlivost' },
      { id: 'enamel', label: 'Sklovina' },
      { id: 'breath', label: 'Svěží dech' },
      { id: 'gums', label: 'Dásně' },
      { id: 'stains', label: 'Skvrny z kávy a čaje' },
      { id: 'complete', label: 'Komplexní péče' },
      { id: 'taste', label: 'Chuť' },
      { id: 'price', label: 'Cena' },
      { id: 'ingredients', label: 'Složení' },
      { id: 'other', label: 'Jiné' }
    ],
    next: 'T04'
  },
  {
    id: 'T04', type: 'single', required: true,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Který směr tě zaujal víc?',
    options: [
      { id: 'ENZI_WHITE', label: 'ENZI WHITE — enzymatické bělení' },
      { id: 'PAP', label: 'PAP — bělení bez peroxidu' },
      { id: 'BOTH', label: 'Oba stejně' },
      { id: 'NEITHER', label: 'Ani jeden' }
    ],
    next: 'T05'
  },
  {
    id: 'T05', type: 'textarea', required: false,
    product: 'TOOTHPASTE', stepLabel: 'Zubní pasty',
    question: 'Co bys o této pastě potřeboval/a vědět před koupí?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'OBJECTION', next: 'FREE_END'
  }
]

// VISUAL LAB — textové otázky
export const VISUAL_LAB = [
  {
    id: 'V01', type: 'textarea', required: false,
    lab: 'VISUAL_LAB',
    question: 'Kdybys měl/a popsat ideální reklamu na tento produkt, jak by vypadala?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'HOOK_LANGUAGE',
    next: 'V03'
  },
  { id: 'V02', inactive: true, next: 'V03' },
  {
    id: 'V03', type: 'textarea', required: false,
    lab: 'VISUAL_LAB',
    question: 'Co tě na produktu nejvíc zaujalo?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'HOOK_LANGUAGE',
    next: 'V05'
  },
  { id: 'V04', inactive: true, next: 'V05' },
  {
    id: 'V05', type: 'textarea', required: false,
    lab: 'VISUAL_LAB',
    question: 'Co si myslíš, že produkt dělá?',
    placeholder: 'Stačí pár slov…',
    next: 'V07'
  },
  { id: 'V06', inactive: true, next: 'V07' },
  {
    id: 'V07', type: 'textarea', required: false,
    lab: 'VISUAL_LAB',
    question: 'Co by tě přesvědčilo produkt vyzkoušet?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PURCHASE_TRIGGER',
    next: 'DEMOGRAPHY'
  }
]

// HOOK LAB
export const HOOK_LAB = [
  {
    id: 'H01', type: 'textarea', required: false,
    lab: 'HOOK_MESSAGE_LAB',
    question: 'Jaká slova nebo sdělení tě při pohledu na tento produkt napadají?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'HOOK_LANGUAGE', next: 'H02'
  },
  {
    id: 'H02', type: 'scale', required: true,
    lab: 'HOOK_MESSAGE_LAB',
    question: 'Kdybys to viděl/a mezi příspěvky, co bys nejspíš udělal/a?',
    labelMin: 'Hned dál', labelMax: 'Určitě bych se zastavil/a',
    next: 'H03'
  },
  {
    id: 'H03', type: 'textarea', required: false,
    lab: 'HOOK_MESSAGE_LAB',
    question: 'Co bys chtěl/a vidět nebo vědět v dalších sekundách?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE', next: 'H04'
  },
  {
    id: 'H04', type: 'scale', required: true,
    lab: 'HOOK_MESSAGE_LAB',
    question: 'Je toto sdělení pro tebe osobně relevantní?',
    labelMin: 'Vůbec', labelMax: 'Velmi',
    next: 'H05'
  },
  {
    id: 'H05', type: 'scale', required: true,
    lab: 'HOOK_MESSAGE_LAB',
    question: 'Chtěl/a bys po tomhle o produktu vědět víc?',
    labelMin: 'Ne', labelMax: 'Ano',
    next: 'DEMOGRAPHY'
  }
]

// CONVERSION/TRUST LAB
export const CONVERSION_TRUST_LAB = [
  {
    id: 'X01', type: 'textarea', required: false,
    lab: 'CONVERSION_TRUST_LAB',
    question: 'Představ si, že tě produkt zaujal. Jakou jednu věc bys potřeboval/a vidět nebo vědět, abys mu začal/a věřit?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'TRUST', next: 'X02'
  },
  {
    id: 'X02', type: 'textarea', required: false,
    lab: 'CONVERSION_TRUST_LAB',
    question: 'Co by ti v tuhle chvíli nejvíc bránilo v nákupu?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'NON_PURCHASE', next: 'X03'
  },
  {
    id: 'X03', type: 'textarea', required: false,
    lab: 'CONVERSION_TRUST_LAB',
    question: 'Co bys chtěl/a na stránce produktu vidět jako první?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PURCHASE_TRIGGER', next: 'X04'
  },
  {
    id: 'X04', type: 'single', required: false,
    lab: 'CONVERSION_TRUST_LAB',
    question: 'Komu bys u takového produktu nejvíc věřil/a?',
    randomize: true,
    options: [
      { id: 'expert', label: 'Odborník' },
      { id: 'customer', label: 'Běžný zákazník' },
      { id: 'creator', label: 'Beauty tvůrce' },
      { id: 'founder', label: 'Zakladatel značky' },
      { id: 'many', label: 'Recenze více lidí' },
      { id: 'none', label: 'Nepotřebuji člověka' },
      { id: 'other', label: 'Jiné' }
    ],
    voc_tag: 'TRUST', next: 'X05'
  },
  {
    id: 'X05', type: 'textarea', required: false,
    lab: 'CONVERSION_TRUST_LAB',
    question: 'Co by ti ten člověk musel ukázat nebo říct, aby to pro tebe bylo důvěryhodné?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'TRUST', next: 'DEMOGRAPHY'
  }
]

// FLAVOR CONCEPT LAB (PAP only)
export const FLAVOR_CONCEPT_LAB = [
  {
    id: 'FL01', type: 'textarea', required: false,
    lab: 'FLAVOR_CONCEPT_LAB',
    question: 'Co ti přijde na mysli, když si představíš bělicí pásek s ovocnou příchutí?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'FLAVOR', next: 'FL02'
  },
  {
    id: 'FL02', type: 'scale', required: true,
    lab: 'FLAVOR_CONCEPT_LAB',
    question: 'Jak moc by tě ovocná příchuť ovlivnila při výběru bělicích pásků?',
    labelMin: 'Vůbec', labelMax: 'Hodně',
    next: 'DEMOGRAPHY'
  }
]

// DEMOGRAPHY
export const DEMOGRAPHY = [
  {
    id: 'D01', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Kolik ti je?',
    options: [
      { id: 'u18', label: 'Méně než 18' },
      { id: '18_24', label: '18–24' },
      { id: '25_34', label: '25–34' },
      { id: '35_44', label: '35–44' },
      { id: '45_54', label: '45–54' },
      { id: '55p', label: '55+' },
      { id: 'skip', label: 'Nechci uvést' }
    ],
    next: 'D02'
  },
  {
    id: 'D02', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Jak se identifikuješ?',
    options: [
      { id: 'f', label: 'Žena' },
      { id: 'm', label: 'Muž' },
      { id: 'other', label: 'Jinak' },
      { id: 'skip', label: 'Nechci uvést' }
    ],
    next: 'D03'
  },
  {
    id: 'D03', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Odkud jsi?',
    options: [
      { id: 'CZ', label: 'Česko' },
      { id: 'SK', label: 'Slovensko' },
      { id: 'PL', label: 'Polsko' },
      { id: 'HU', label: 'Maďarsko' },
      { id: 'other', label: 'Jinde' },
      { id: 'skip', label: 'Nechci uvést' }
    ],
    next: 'END'
  }
]

// LAB MAPPING
export const LAB_QUESTIONS = {
  VISUAL_LAB: VISUAL_LAB,
  HOOK_MESSAGE_LAB: HOOK_LAB,
  CONVERSION_TRUST_LAB: CONVERSION_TRUST_LAB,
  FLAVOR_CONCEPT_LAB: FLAVOR_CONCEPT_LAB,
  VISUAL_PACKAGING_LAB: VISUAL_LAB,
  MESSAGE_BENEFIT_LAB: HOOK_LAB,
  PRICE_CONVERSION_LAB: CONVERSION_TRUST_LAB
}

export const PRODUCT_BRANCHES = {
  NEEDRA: NEEDRA,
  CCT: CCT,
  PAP: PAP,
  TOOTHPASTE: TOOTHPASTE
}

// Build flat map of all questions by ID
export function buildQuestionMap() {
  const map = {}
  const all = [...COMMON, ...NEEDRA, ...CCT, ...PAP, ...TOOTHPASTE,
    ...VISUAL_LAB, ...HOOK_LAB, ...CONVERSION_TRUST_LAB,
    ...FLAVOR_CONCEPT_LAB, ...DEMOGRAPHY,
    FREE_END_QUESTION,
    { id: 'END', type: 'end' }
  ]
  all.forEach(q => { map[q.id] = q })
  return map
}

// Total question count per path (for progress bar)
export function estimateTotal(product, lab) {
  const baseCount = 3 // S01-S03
  const branchCounts = { NEEDRA: 8, CCT: 6, PAP: 6, TOOTHPASTE: 6 }
  const labCounts = { VISUAL_LAB: 4, VISUAL_PACKAGING_LAB: 4, HOOK_MESSAGE_LAB: 5, MESSAGE_BENEFIT_LAB: 5, CONVERSION_TRUST_LAB: 5, PRICE_CONVERSION_LAB: 5, FLAVOR_CONCEPT_LAB: 2 }
  return baseCount + (branchCounts[product] || 7) + 1 + (labCounts[lab] || 5) + 3
}
