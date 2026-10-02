// ─────────────────────────────────────────────────────────────
// HELLO COCO CUSTOMER LAB — Jadro v1.1
//
// Každý respondent dostane 13–17 otázok podľa vetvy:
//
//  BUYER  (nakupuje opak. alebo raz)  → ~17 otázok
//  AWARE  (pozná, nenakúpil)          → ~15 otázok
//  NEW    (nepozná)                   → ~13 otázok
//
// Strom:
//  S01 segmentácia
//   ├─ BUYER → S02 → S03 → S04 → S05 → CUST01
//   ├─ AWARE → A01 → A02 → A03 → CUST01
//   └─ NEW   → CUST01
//
//  CUST01–03 (zákazník + problém + konkurencia)
//  PP01–02   (product pull)
//  PC01–03   (comprehension pred vysvetlením)
//  PV01–04   (desire + objection po vysvetlení)
//  TR01      (trust / proof)
//  PR01–04   (Van Westendorp)
//  RD01–02   (R&D)
//  D01–D03   (demografia)
// ─────────────────────────────────────────────────────────────

// ── INTRO ────────────────────────────────────────────────────
export const COMMON = [
  {
    id: 'S00', type: 'intro',
    headline: 'Pomoz nám dělat hello coco lepší.',
    body: 'Zajímá nás tvůj skutečný názor. Neexistují správné ani špatné odpovědi. Zabere to přibližně 3–4 minuty.',
    cta: 'Začít',
    next: 'S01'
  },
  {
    // Segmentácia — vetví celý dotazník
    id: 'S01', type: 'single', required: true,
    stepLabel: 'Kdo jsi',
    question: 'Znal/a jsi hello coco už před dneškem?',
    options: [
      { id: 'repeat', label: 'Ano, nakupuji opakovaně' },
      { id: 'once',   label: 'Ano, koupil/a jsem jednou' },
      { id: 'aware',  label: 'Ano, znám, ale nikdy jsem nekoupil/a' },
      { id: 'new',    label: 'Ne, dnes to vidím poprvé' }
    ],
    branch: { repeat: 'S02', once: 'S02', aware: 'A01', new: 'CUST01' }
  }
]

// ── VETVA BUYER ──────────────────────────────────────────────
export const BUYER = [
  {
    // Čo kúpil — segmentácia produktov
    id: 'S02', type: 'multi', required: false, maxSelect: 6,
    stepLabel: 'Tvoje skúsenosti',
    question: 'Co sis od hello coco už kupoval/a?',
    options: [
      { id: 'cct',      label: 'Bělicí pásky CCT' },
      { id: 'pap',      label: 'Bělicí pásky PAP' },
      { id: 'pasta',    label: 'Zubní pasty' },
      { id: 'prasok',   label: 'Bělicí prášky' },
      { id: 'led',      label: 'LED bělení' },
      { id: 'needra',   label: 'Needra Shot' },
      { id: 'other',    label: 'Jiné' }
    ],
    voc_tag: 'PRODUCT_USAGE',
    next: 'S03'
  },
  {
    // Purchase trigger — najdôležitejšia otázka pre akvizíciu
    id: 'S03', type: 'textarea', required: false,
    stepLabel: 'Tvoje skúsenosti',
    question: 'Proč sis poprvé vybral/a právě hello coco?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PURCHASE_TRIGGER',
    next: 'S04'
  },
  {
    // Brand love — retenčný trigger
    id: 'S04', type: 'textarea', required: false,
    stepLabel: 'Tvoje skúsenosti',
    question: 'Co je hlavní důvod, proč ses k hello coco vrátil/a?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'RETENTION_TRIGGER',
    next: 'S05'
  },
  {
    // Improvement — najcennejší feedback
    id: 'S05', type: 'textarea', required: false,
    stepLabel: 'Tvoje skúsenosti',
    question: 'Co bys na hello coco nejvíc zlepšil/a?',
    placeholder: 'Cokoli — produkty, web, ceny, komunikaci, balení…',
    voc_tag: 'IMPROVEMENT',
    next: 'CUST01'
  }
]

// ── VETVA AWARE ──────────────────────────────────────────────
export const AWARE = [
  {
    // Brand perception — čo si myslí o značke
    id: 'A01', type: 'textarea', required: false,
    stepLabel: 'hello coco',
    question: 'Co si o hello coco myslíš?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'BRAND_PERCEPTION',
    next: 'A02'
  },
  {
    // Purchase barrier — najcennejšia acquisition otázka
    id: 'A02', type: 'textarea', required: false,
    stepLabel: 'hello coco',
    question: 'Proč sis zatím nic nekoupil/a?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PURCHASE_BARRIER',
    next: 'A03'
  },
  {
    // Conversion unlock
    id: 'A03', type: 'textarea', required: false,
    stepLabel: 'hello coco',
    question: 'Co by tě přesvědčilo hello coco vyzkoušet?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'CONVERSION_UNLOCK',
    next: 'CUST01'
  }
]

// ── ZÁKAZNÍK + PROBLÉM + KONKURENCIA (všetci) ────────────────
export const CUSTOMER = [
  {
    // Job-to-be-done — spontánna potreba
    id: 'CUST01', type: 'textarea', required: false,
    stepLabel: 'O tobě',
    question: 'Kdybys mohl/a změnit jednu věc na svém úsměvu, zubech nebo rtech — co by to bylo?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'JOB_TO_BE_DONE',
    next: 'CUST02'
  },
  {
    // Spontánna konkurencia — bez zoznamu značiek
    id: 'CUST02', type: 'textarea', required: false,
    stepLabel: 'O tobě',
    question: 'Jak to dnes řešíš? Jaké produkty nebo značky používáš?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'COMPETITOR',
    next: 'CUST03'
  },
  {
    // Competitive gap — prečo konkurencia nestačí
    id: 'CUST03', type: 'textarea', required: false,
    stepLabel: 'O tobě',
    question: 'Co ti na tom vadí nebo chybí?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'COMPETITOR_GAP',
    next: 'PP01'
  }
]

// ── PRODUCT PULL ─────────────────────────────────────────────
export const PRODUCT_PULL = [
  {
    // Spontánny pull — bez vysvetlenia produktov
    id: 'PP01', type: 'single', required: true,
    stepLabel: 'Produkty',
    question: 'Který produkt tě zaujal jako první?',
    options: [
      { id: 'NEEDRA',     label: 'Needra Shot — sérum na rty' },
      { id: 'CCT',        label: 'Bělicí pásky CCT (fialové)' },
      { id: 'PAP',        label: 'Bělicí pásky PAP (zelené)' },
      { id: 'TOOTHPASTE', label: 'Zubní pasty' }
    ],
    branch: {
      NEEDRA: 'PC01', CCT: 'PC01', PAP: 'PC01', TOOTHPASTE: 'PC01'
    }
  },
  {
    // Prečo tento — spontánny hook
    id: 'PP02', type: 'textarea', required: false,
    stepLabel: 'Produkty',
    question: 'Proč právě tento?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'HOOK',
    next: 'PC01'
  }
]

// ── COMPREHENSION (pred vysvetlením) ─────────────────────────
export const COMPREHENSION = [
  {
    // Pochopenie produktu — bez briefingu
    id: 'PC01', type: 'textarea', required: false,
    stepLabel: 'Produkt',
    question: 'Co si myslíš, že tento produkt dělá?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'COMPREHENSION',
    next: 'PC02'
  },
  {
    // Targeting — pre koho si myslí že je
    id: 'PC02', type: 'textarea', required: false,
    stepLabel: 'Produkt',
    question: 'Pro koho si myslíš, že je?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'POSITIONING',
    next: 'PC03'
  },
  {
    // Confusion — čomu nerozumie — priamo pre PDP
    id: 'PC03', type: 'textarea', required: false,
    stepLabel: 'Produkt',
    question: 'Je na produktu něco, čemu nerozumíš nebo co je nejasné?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'CONFUSION',
    next: 'PV01'
    // --- TU MODERÁTOR VYSVETLÍ PRODUKT ---
  }
]

// ── DESIRE + OBJECTION (po vysvetlení) ───────────────────────
export const PRODUCT_EVAL = [
  {
    // Purchase intent pred cenou
    id: 'PV01', type: 'scale', required: true,
    stepLabel: 'Produkt',
    question: 'Teď, když víš, jak funguje — jak moc bys ho chtěl/a vyzkoušet?',
    labelMin: 'Vůbec', labelMax: 'Určitě',
    voc_tag: 'PURCHASE_INTENT',
    next: 'PV02'
  },
  {
    // Desire — vlastnými slovami
    id: 'PV02', type: 'textarea', required: false,
    stepLabel: 'Produkt',
    question: 'Co se ti na produktu líbí nejvíc?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'DESIRE',
    next: 'PV03'
  },
  {
    // Primary objection
    id: 'PV03', type: 'textarea', required: false,
    stepLabel: 'Produkt',
    question: 'Co je hlavní důvod, proč bys ho NEKOUPIL/A?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PRIMARY_OBJECTION',
    next: 'TR01'
  }
]

// ── TRUST / PROOF ─────────────────────────────────────────────
export const TRUST = [
  {
    // Najprv open — vlastné slová
    id: 'TR01', type: 'textarea', required: false,
    stepLabel: 'Důvěra',
    question: 'Co bys potřeboval/a vidět, abys produktu opravdu věřil/a?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'PROOF_OPEN',
    next: 'TR02'
  },
  {
    // Potom štruktúrovaný výber max 2
    id: 'TR02', type: 'multi', required: false, maxSelect: 2,
    stepLabel: 'Důvěra',
    question: 'Které dvě věci by tě přesvědčily nejvíc?',
    randomize: true,
    options: [
      { id: 'before_after', label: 'Reálné fotky před/po' },
      { id: 'video',        label: 'Video zákazníka' },
      { id: 'reviews',      label: 'Recenze' },
      { id: 'expert',       label: 'Odborník / zubař' },
      { id: 'influencer',   label: 'Influencer' },
      { id: 'study',        label: 'Klinický test / studie' },
      { id: 'technology',   label: 'Vysvětlení technologie' },
      { id: 'friend',       label: 'Doporučení kamaráda' },
      { id: 'try',          label: 'Možnost vyzkoušet si ho' }
    ],
    voc_tag: 'TRUST_SIGNAL',
    next: 'PR01'
  }
]

// ── VAN WESTENDORP PRICE LAB ──────────────────────────────────
export const PRICE = [
  {
    id: 'PR01', type: 'number', required: false,
    stepLabel: 'Cena',
    question: 'Při jaké ceně by ti produkt připadal podezřele levný — až bys pochyboval/a o jeho kvalitě?',
    suffix: '€',
    voc_tag: 'PRICE_TOO_CHEAP',
    next: 'PR02'
  },
  {
    id: 'PR02', type: 'number', required: false,
    stepLabel: 'Cena',
    question: 'Při jaké ceně by ti připadal jako skvělá koupě za ty peníze?',
    suffix: '€',
    voc_tag: 'PRICE_GOOD_VALUE',
    next: 'PR03'
  },
  {
    id: 'PR03', type: 'number', required: false,
    stepLabel: 'Cena',
    question: 'Při jaké ceně by byl drahý, ale ještě bys ho zvažoval/a?',
    suffix: '€',
    voc_tag: 'PRICE_EXPENSIVE_BUT_OK',
    next: 'PR04'
  },
  {
    id: 'PR04', type: 'number', required: false,
    stepLabel: 'Cena',
    question: 'Při jaké ceně by byl příliš drahý a nekoupil/a bys ho?',
    suffix: '€',
    voc_tag: 'PRICE_TOO_EXPENSIVE',
    next: 'RD01'
  }
]

// ── R&D ──────────────────────────────────────────────────────
export const RD = [
  {
    id: 'RD01', type: 'textarea', required: false,
    stepLabel: 'Budoucnost',
    question: 'Jaký problém v oblasti úsměvu, zubů nebo rtů dnes podle tebe žádný produkt neřeší dobře?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'RD_PROBLEM',
    next: 'RD02'
  },
  {
    id: 'RD02', type: 'textarea', required: false,
    stepLabel: 'Budoucnost',
    question: 'Jaký produkt nebo řešení ti dnes na trhu chybí?',
    placeholder: 'Stačí pár slov…',
    voc_tag: 'RD_WISH',
    next: 'END01'
  }
]

// ── ZÁVEREČNÁ OTÁZKA ──────────────────────────────────────────
export const END_QUESTION = {
  id: 'END01', type: 'textarea', required: false,
  stepLabel: 'Na závěr',
  question: 'Kdybys mohl/a říct majiteli hello coco jednu věc — co by to bylo?',
  placeholder: 'Stačí pár slov…',
  voc_tag: 'OPEN_FEEDBACK',
  next: 'D01'
}

// ── DEMOGRAFIA ────────────────────────────────────────────────
export const DEMOGRAPHY = [
  {
    id: 'D01', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Kolik ti je?',
    options: [
      { id: 'u18',   label: 'Méně než 18' },
      { id: '18_24', label: '18–24' },
      { id: '25_34', label: '25–34' },
      { id: '35_44', label: '35–44' },
      { id: '45_54', label: '45–54' },
      { id: '55p',   label: '55+' },
      { id: 'skip',  label: 'Nechci uvést' }
    ],
    next: 'D02'
  },
  {
    id: 'D02', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Jak se identifikuješ?',
    options: [
      { id: 'f',     label: 'Žena' },
      { id: 'm',     label: 'Muž' },
      { id: 'other', label: 'Jinak' },
      { id: 'skip',  label: 'Nechci uvést' }
    ],
    next: 'D03'
  },
  {
    id: 'D03', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Odkud jsi?',
    options: [
      { id: 'CZ',   label: 'Česko' },
      { id: 'SK',   label: 'Slovensko' },
      { id: 'PL',   label: 'Polsko' },
      { id: 'HU',   label: 'Maďarsko' },
      { id: 'other',label: 'Jinde' },
      { id: 'skip', label: 'Nechci uvést' }
    ],
    next: 'D04'
  },
  {
    id: 'D04', type: 'single', required: false,
    stepLabel: 'Pár otázek o tobě',
    question: 'Jak často nakupuješ beauty / kosmetické produkty?',
    options: [
      { id: 'often',    label: 'Víckrát měsíčně' },
      { id: 'monthly',  label: 'Přibližně 1× měsíčně' },
      { id: 'sometimes',label: 'Každých pár měsíců' },
      { id: 'rarely',   label: 'Zřídka' }
    ],
    next: 'END'
  }
]

// ── LEGACY (pre kompatibilitu so Survey.jsx) ──────────────────
export const FREE_END_QUESTION = {
  id: 'FREE_END', inactive: true, next: 'END'
}
export const LAB_QUESTIONS = {}
export const PRODUCT_BRANCHES = {}

// ── FLAT MAP ──────────────────────────────────────────────────
export function buildQuestionMap() {
  const map = {}
  const all = [
    ...COMMON,
    ...BUYER, ...AWARE,
    ...CUSTOMER,
    ...PRODUCT_PULL,
    ...COMPREHENSION,
    ...PRODUCT_EVAL,
    ...TRUST,
    ...PRICE,
    ...RD,
    END_QUESTION,
    ...DEMOGRAPHY,
    FREE_END_QUESTION,
    { id: 'ROUTER', inactive: true, next: 'CUST01' },
    { id: 'END', type: 'end' }
  ]
  all.forEach(q => { map[q.id] = q })
  return map
}

export function estimateTotal(segment) {
  if (segment === 'repeat' || segment === 'once') return 17
  if (segment === 'aware') return 15
  return 13
}
