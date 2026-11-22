/**
 * frontend/src/lib/glossary.ts
 * In-Line Geopolitical & Financial Glossary Dictionary (PRD Master Expansion #12).
 * Provides concise contextual definitions, founding year, and headquarters for
 * key international acronyms and diplomatic terms found in global wires.
 */

export interface GlossaryEntry {
  term: string;
  fullName: string;
  category: 'Geopolitics' | 'Economics' | 'Defense' | 'Science' | 'Treaty';
  established?: string;
  headquarters?: string;
  definition: string;
}

export const GLOSSARY_TERMS: Record<string, GlossaryEntry> = {
  NATO: {
    term: 'NATO',
    fullName: 'North Atlantic Treaty Organization',
    category: 'Defense',
    established: '1949',
    headquarters: 'Brussels, Belgium',
    definition: 'Intergovernmental military alliance of 32 member states committed to collective mutual defense under Article 5.',
  },
  OPEC: {
    term: 'OPEC',
    fullName: 'Organization of the Petroleum Exporting Countries',
    category: 'Economics',
    established: '1960',
    headquarters: 'Vienna, Austria',
    definition: 'Intergovernmental cartel of 12 oil-producing nations coordinating petroleum extraction quotas and pricing policy.',
  },
  IAEA: {
    term: 'IAEA',
    fullName: 'International Atomic Energy Agency',
    category: 'Science',
    established: '1957',
    headquarters: 'Vienna, Austria',
    definition: 'Autonomous UN scientific oversight agency promoting peaceful nuclear technology and monitoring nuclear non-proliferation treaties.',
  },
  BRICS: {
    term: 'BRICS',
    fullName: 'Brazil, Russia, India, China, South Africa (+ Expansion)',
    category: 'Geopolitics',
    established: '2009',
    definition: 'Intergovernmental bloc representing major emerging economies collaborating on alternative financial architectures and trade settlement.',
  },
  G7: {
    term: 'G7',
    fullName: 'Group of Seven',
    category: 'Economics',
    established: '1975',
    definition: 'Informal forum of seven advanced industrialized democracies (US, UK, Germany, France, Japan, Italy, Canada) coordinating macro-economic policy.',
  },
  IMF: {
    term: 'IMF',
    fullName: 'International Monetary Fund',
    category: 'Economics',
    established: '1944',
    headquarters: 'Washington, D.C.',
    definition: 'International financial institution of 190 countries ensuring global exchange-rate stability and providing balance-of-payments bailout loans.',
  },
  WHO: {
    term: 'WHO',
    fullName: 'World Health Organization',
    category: 'Science',
    established: '1948',
    headquarters: 'Geneva, Switzerland',
    definition: 'Specialized United Nations agency directing international public health, pandemic monitoring, and clinical guidelines.',
  },
  ASEAN: {
    term: 'ASEAN',
    fullName: 'Association of Southeast Asian Nations',
    category: 'Geopolitics',
    established: '1967',
    headquarters: 'Jakarta, Indonesia',
    definition: 'Political and economic union of 10 Southeast Asian states fostering regional peace, free trade, and economic integration.',
  },
  GDP: {
    term: 'GDP',
    fullName: 'Gross Domestic Product',
    category: 'Economics',
    definition: 'Total monetary market value of all finished goods and services produced within a country\'s borders during a specific period.',
  },
  CPI: {
    term: 'CPI',
    fullName: 'Consumer Price Index',
    category: 'Economics',
    definition: 'Measure of the average change over time in prices paid by consumers for a representative basket of consumer goods and services.',
  },
  Interpol: {
    term: 'Interpol',
    fullName: 'International Criminal Police Organization',
    category: 'Defense',
    established: '1923',
    headquarters: 'Lyon, France',
    definition: 'Intergovernmental law-enforcement body facilitating worldwide police cooperation and crime control across 196 member countries.',
  },
  UNGA: {
    term: 'UNGA',
    fullName: 'United Nations General Assembly',
    category: 'Geopolitics',
    established: '1945',
    headquarters: 'New York, USA',
    definition: 'Main policymaking and representative organ of the UN where all 193 member states hold equal voting representation.',
  },
  ICJ: {
    term: 'ICJ',
    fullName: 'International Court of Justice',
    category: 'Treaty',
    established: '1945',
    headquarters: 'The Hague, Netherlands',
    definition: 'The principal judicial organ of the United Nations settling legal disputes between sovereign states.',
  },
};

/**
 * Checks if a word is in the glossary.
 */
export function getGlossaryEntry(word: string): GlossaryEntry | undefined {
  const clean = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '');
  return GLOSSARY_TERMS[clean] || GLOSSARY_TERMS[clean.toUpperCase()];
}
