/**
 * Verified OTC medicine records for the mock RAG service.
 *
 * Every field below was extracted from the built ChromaDB index over the
 * MediFind OTC source PDFs (Volume 1, pages cited per record) or from the
 * verified ground-truth set in GroupApex_RAG_Experiment_Results.xlsx.
 * Fields that the sources do not document are `null` and render as
 * "Not available in the source" - never invent values here.
 */

const VOL1 = 'MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf'

export const MEDICINE_RECORDS = [
  {
    id: 'biogesic-325',
    brand: 'Biogesic 325 mg Tablet',
    genericName: 'Paracetamol',
    activeIngredients: ['Paracetamol'],
    strength: '325 mg',
    dosageForm: 'Tablet',
    pharmacologicCategory: 'Analgesic / Antipyretic',
    registrationNumber: 'DRP-8763',
    manufacturer: 'PT Medifarma Laboratories',
    indications: null,
    aliases: ['biogesic 325', 'biogesic 325 mg', 'biogesic'],
    citations: [
      {
        source: VOL1,
        page: 19,
        passage:
          'Page 1 Biogesic 325 (Paracetamol) 325 mg Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DRP-8763 — Brand name Biogesic 325, Generic name Paracetamol, Dosage strength and form 325 mg Tablet, Registration number DRP-8763, Manufacturer PT Medifarma Laboratories',
      },
    ],
  },
  {
    id: 'biogesic-500',
    brand: 'Biogesic 500 mg Tablet',
    genericName: 'Paracetamol',
    activeIngredients: ['Paracetamol'],
    strength: '500 mg',
    dosageForm: 'Tablet',
    pharmacologicCategory: 'Analgesic/Antipyretic',
    registrationNumber: 'DR-153',
    manufacturer: 'UNILAB, Inc.',
    indications: null,
    aliases: ['biogesic 500', 'biogesic 500 mg', 'biogesic'],
    citations: [
      {
        source: VOL1,
        page: 18,
        passage:
          'Page 1 Biogesic (Paracetamol) 500 mg Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-153 — Brand name Biogesic, Generic name Paracetamol, Dosage strength and form 500 mg Tablet, Registration number DR-153, Manufacturer UNILAB, Inc.',
      },
    ],
  },
  {
    id: 'dolfenal-250',
    brand: 'Dolfenal 250 mg Film-Coated Tablet',
    genericName: 'Mefenamic Acid',
    activeIngredients: ['Mefenamic Acid'],
    strength: '250 mg',
    dosageForm: 'Film-Coated Tablet',
    pharmacologicCategory:
      'Anti-Inflammatory and Anti-Rheumatic Products, Non-Steroids (Fenamates)',
    registrationNumber: 'DRP-8716',
    manufacturer: 'Amherst Laboratories, Inc.',
    indications:
      'For the relief of mild to moderate pain including headache, dental pain, and dysmenorrhea (menstrual discomfort).',
    aliases: ['dolfenal'],
    citations: [
      {
        source: VOL1,
        page: 22,
        passage:
          'Page 1 Dolfenal (Mefenamic Acid) 250 mg Film-Coated Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DRP-8716 — Brand name Dolfenal, Generic name Mefenamic Acid, Dosage strength and form 250 mg Film-Coated Tablet, Registration number DRP-8716, Manufacturer Amherst Laboratories, Inc.',
      },
      {
        source: VOL1,
        page: 24,
        passage:
          'For the relief of mild to moderate pain including headache, dental pain... (Dolfenal patient leaflet, section "What is this medicine used for")',
      },
    ],
  },
  {
    id: 'flanax-220',
    brand: 'Flanax 220 mg Film-Coated Tablet',
    genericName: 'Naproxen Sodium',
    activeIngredients: ['Naproxen Sodium'],
    strength: '220 mg',
    dosageForm: 'Film-Coated Tablet',
    pharmacologicCategory: 'Non-Steroidal Anti-inflammatory Drug',
    registrationNumber: 'DR-XY46695',
    manufacturer: 'Interphil Laboratories, Inc.',
    indications: null,
    aliases: ['flanax 220', 'flanax 220 mg', 'flanax'],
    citations: [
      {
        source: VOL1,
        page: 33,
        passage:
          'Page 1 Flanax (Naproxen Sodium) 220 mg Film-Coated Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-XY46695 — Brand name Flanax, Generic name Naproxen Sodium, Dosage strength and form 220 mg Film-Coated Tablet, Registration number DR-XY46695, Manufacturer Interphil Laboratories, Inc.',
      },
    ],
  },
  {
    id: 'flanax-275',
    brand: 'Flanax 275 mg Film-Coated Tablet',
    genericName: 'Naproxen Sodium',
    activeIngredients: ['Naproxen Sodium'],
    strength: '275 mg',
    dosageForm: 'Film-Coated Tablet',
    pharmacologicCategory: 'Non-Steroidal Anti-inflammatory Drug',
    registrationNumber: 'DR-XY46696',
    manufacturer: 'PT. Taisho Pharmaceutical Indonesia Tbk.',
    indications: null,
    aliases: ['flanax 275', 'flanax 275 mg', 'flanax'],
    citations: [
      {
        source: VOL1,
        page: 38,
        passage:
          'Page 1 Flanax (Naproxen Sodium) 275 mg Film-Coated Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-XY46696 — Brand name Flanax, Generic name Naproxen Sodium, Dosage strength and form 275 mg Film-Coated Tablet, Registration number DR-XY46696, Manufacturer PT. Taisho Pharmaceutical Indonesia Tbk.',
      },
    ],
  },
  {
    id: 'alaxan',
    brand: 'Alaxan 200 mg/325 mg Tablet',
    genericName: 'Ibuprofen + Paracetamol',
    activeIngredients: ['Ibuprofen', 'Paracetamol'],
    strength: '200 mg/325 mg',
    dosageForm: 'Tablet',
    pharmacologicCategory:
      'Non-Steroidal Anti-Inflammatory Drug (NSAID)/Analgesic/Antipyretic',
    registrationNumber: 'DR-XY37938',
    manufacturer: 'PT. Medifarma Laboratories',
    indications: null,
    aliases: ['alaxan'],
    citations: [
      {
        source: VOL1,
        page: 4,
        passage:
          'Page 1 Alaxan (Ibuprofen + Paracetamol) 200 mg/325 mg Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-XY37938 — Brand name Alaxan, Generic name Ibuprofen + Paracetamol, Dosage strength and form 200 mg/325 mg Tablet, Registration number DR-XY37938, Manufacturer PT. Medifarma Laboratories',
      },
    ],
  },
  {
    id: 'saridon',
    brand: 'Saridon 500 mg/50 mg Tablet',
    genericName: 'Paracetamol + Caffeine',
    activeIngredients: ['Paracetamol', 'Caffeine'],
    strength: '500 mg/50 mg',
    dosageForm: 'Tablet',
    pharmacologicCategory: 'Analgesic/Antipyretic',
    registrationNumber: 'DR-XY46456',
    manufacturer: 'PT. Bayer Indonesia',
    indications:
      'For fast and effective relief of mild to severe headaches; for the relief of pain such as headache, toothache, menstrual discomfort, postoperative and rheumatic pain.',
    aliases: ['saridon'],
    citations: [
      {
        source: VOL1,
        page: 63,
        passage:
          'Page 1 Saridon (Paracetamol + Caffeine) 500 mg/50 mg Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-XY46456 — Brand name Saridon, Generic name Paracetamol + Caffeine, Dosage strength and form 500 mg/50 mg Tablet, Registration number DR-XY46456, Manufacturer PT. Bayer Indonesia',
      },
      {
        source: VOL1,
        page: 64,
        passage:
          'For fast and effective relief of mild to severe headaches. For the relief of pain such as headache, toothache, menstrual discomfort, postoperative and rheumatic pain. (Saridon patient leaflet, "What is the Medicine used for?")',
      },
    ],
  },
  {
    id: 'saridon-max',
    brand: 'Saridon Max 275 mg Film-Coated Tablet',
    genericName: 'Naproxen Sodium',
    activeIngredients: ['Naproxen Sodium'],
    strength: '275 mg',
    dosageForm: 'Film-Coated Tablet',
    pharmacologicCategory: 'Non-Selective COX Inhibitor',
    registrationNumber: 'DRP-1872-02',
    manufacturer: 'Interphil Laboratories, Inc.',
    indications: null,
    aliases: ['saridon max', 'saridon max 275', 'saridon max 275 mg'],
    citations: [
      {
        source: VOL1,
        page: 73,
        passage:
          'Page 1 Saridon Max (Naproxen Sodium) 275 mg Film-Coated Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DRP-1872-02 — Brand name Saridon Max, Generic name Naproxen Sodium, Dosage strength and form 275 mg Film-Coated Tablet, Registration number DRP-1872-02, Manufacturer Interphil Laboratories, Inc.',
      },
    ],
  },
  {
    id: 'tempra-325',
    brand: 'Tempra 325 mg Tablet',
    genericName: 'Paracetamol',
    activeIngredients: ['Paracetamol'],
    strength: '325 mg',
    dosageForm: 'Tablet',
    pharmacologicCategory: 'Analgesic/ Antipyretic',
    registrationNumber: 'DR-4396',
    manufacturer: 'Interphil Laboratories, Inc.',
    indications: null,
    aliases: ['tempra 325', 'tempra 325 mg', 'tempra'],
    citations: [
      {
        source: VOL1,
        page: 74,
        passage:
          'Page 1 Tempra (Paracetamol) 325 mg Tablet | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-4396 — Brand name Tempra, Generic name Paracetamol, Dosage strength and form 325 mg Tablet, Registration number DR-4396, Manufacturer Interphil Laboratories, Inc.',
      },
    ],
  },
  {
    id: 'tempra-blizz',
    brand: 'Tempra Blizz 500 mg Effervescent Tablet',
    genericName: 'Paracetamol',
    activeIngredients: ['Paracetamol'],
    strength: '500 mg',
    dosageForm: 'Effervescent Tablet (Orange Flavor)',
    pharmacologicCategory: 'Analgesic / Antipyretic',
    registrationNumber: 'DR-XY48911',
    manufacturer: 'DHG Pharmaceutical Joint-Stock Company',
    indications: null,
    aliases: ['tempra blizz', 'tempra blizz 500', 'tempra blizz 500 mg'],
    citations: [
      {
        source: VOL1,
        page: 76,
        passage:
          'Page 1 Tempra Blizz (Paracetamol) 500 mg Effervescent Tablet (Orange Flavor) | Over-the-Counter (OTC) Drug | FDA Reg. No. DR-XY48911 — Brand name Tempra Blizz, Generic name Paracetamol, Dosage strength and form 500 mg Effervescent Tablet (Orange Flavor), Registration number DR-XY48911, Manufacturer DHG Pharmaceutical Joint-Stock Company',
      },
    ],
  },
]
