/**
 * frontend/src/utils/geo.ts
 * Geographical coordinates, country normalization, and dispatch aggregation (P9-02, P9-03, P9-04).
 */
import type { Article } from '../types';

export interface CountryGeoInfo {
  name: string;
  code: string;
  centroid: [number, number]; // [longitude, latitude] for react-simple-maps
  flag: string;
}

export const COUNTRY_COORDINATES: Record<string, CountryGeoInfo> = {
  India: {
    name: 'India',
    code: '356',
    centroid: [78.9629, 20.5937],
    flag: '🇮🇳',
  },
  USA: {
    name: 'United States of America',
    code: '840',
    centroid: [-98.5795, 39.8283],
    flag: '🇺🇸',
  },
  China: {
    name: 'China',
    code: '156',
    centroid: [104.1954, 35.8617],
    flag: '🇨🇳',
  },
  Japan: {
    name: 'Japan',
    code: '392',
    centroid: [138.2529, 36.2048],
    flag: '🇯🇵',
  },
  Australia: {
    name: 'Australia',
    code: '036',
    centroid: [133.7751, -25.2744],
    flag: '🇦🇺',
  },
  'United Kingdom': {
    name: 'United Kingdom',
    code: '826',
    centroid: [-3.4359, 55.3781],
    flag: '🇬🇧',
  },
  Germany: {
    name: 'Germany',
    code: '276',
    centroid: [10.4515, 51.1657],
    flag: '🇩🇪',
  },
  France: {
    name: 'France',
    code: '250',
    centroid: [2.2137, 46.2276],
    flag: '🇫🇷',
  },
  Brazil: {
    name: 'Brazil',
    code: '076',
    centroid: [-51.9253, -14.235],
    flag: '🇧🇷',
  },
  Kenya: {
    name: 'Kenya',
    code: '404',
    centroid: [37.9062, -0.0236],
    flag: '🇰🇪',
  },
  'South Africa': {
    name: 'South Africa',
    code: '710',
    centroid: [22.9375, -30.5595],
    flag: '🇿🇦',
  },
};

// Aliases mapping common variations or TopoJSON names to our standard country keys
export const COUNTRY_ALIASES: Record<string, string> = {
  in: 'India',
  ind: 'India',
  india: 'India',
  us: 'USA',
  usa: 'USA',
  'united states': 'USA',
  'united states of america': 'USA',
  cn: 'China',
  china: 'China',
  jp: 'Japan',
  japan: 'Japan',
  au: 'Australia',
  australia: 'Australia',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  britain: 'United Kingdom',
  great_britain: 'United Kingdom',
  de: 'Germany',
  germany: 'Germany',
  fr: 'France',
  france: 'France',
  br: 'Brazil',
  brazil: 'Brazil',
  ke: 'Kenya',
  kenya: 'Kenya',
  za: 'South Africa',
  'south africa': 'South Africa',
};

export function resolveCountryKey(input?: string | null): string | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  return COUNTRY_ALIASES[normalized] || null;
}

export const CATEGORY_COLORS: Record<string, string> = {
  World: '#2C4A7C',
  Politics: '#5C1A1A',
  Business: '#1A3D1A',
  Tech: '#1A2A4A',
  Science: '#3A1A5C',
  Health: '#1A3A3A',
  Environment: '#1A3A1A',
  Animals: '#C0392B',
  Crime: '#3A1A1A',
  Sports: '#3A2A0A',
  Entertainment: '#4A1A3A',
  General: '#5C5448',
};

const WILDLIFE_KEYWORDS = [
  'wildlife',
  'poaching',
  'trafficking',
  'rhino',
  'tiger',
  'elephant',
  'ivory',
  'pangolin',
  'bear bile',
  'smuggling',
  'species',
  'endangered',
  'conservation',
  'fauna',
];

export interface AggregatedCountryStats {
  countryKey: string;
  displayName: string;
  code: string;
  flag: string;
  centroid: [number, number];
  articleCount: number;
  breakingCount: number;
  highestBreakingScore: number;
  topCategory: string;
  categoryCounts: Record<string, number>;
  hasWildlifeCrime: boolean;
  wildlifeArticlesCount: number;
  topHeadline?: string;
}

export function aggregateCountryNews(articles: Article[]): {
  countryStats: Record<string, AggregatedCountryStats>;
  wildlifeCountries: Set<string>;
  totalDispatchesMapped: number;
} {
  const stats: Record<string, AggregatedCountryStats> = {};
  const wildlifeCountries = new Set<string>();
  let totalMapped = 0;

  for (const article of articles) {
    const rawCountry = article.source?.country || (article as unknown as { location_tag?: string }).location_tag;
    const countryKey = resolveCountryKey(rawCountry);
    if (!countryKey) continue;

    const geo = COUNTRY_COORDINATES[countryKey];
    if (!geo) continue;

    totalMapped++;

    if (!stats[countryKey]) {
      stats[countryKey] = {
        countryKey,
        displayName: geo.name,
        code: geo.code,
        flag: geo.flag,
        centroid: geo.centroid,
        articleCount: 0,
        breakingCount: 0,
        highestBreakingScore: 0,
        topCategory: 'World',
        categoryCounts: {},
        hasWildlifeCrime: false,
        wildlifeArticlesCount: 0,
      };
    }

    const item = stats[countryKey]!;
    item.articleCount += 1;
    if (!item.topHeadline && article.title_english) {
      item.topHeadline = article.title_english;
    }

    if (article.breaking_score > item.highestBreakingScore) {
      item.highestBreakingScore = article.breaking_score;
    }
    if (article.breaking_score >= 75) {
      item.breakingCount += 1;
    }

    // Categories
    const cats = article.categories?.length > 0 ? article.categories : ['World'];
    for (const cat of cats) {
      item.categoryCounts[cat] = (item.categoryCounts[cat] || 0) + 1;
    }

    // Wildlife Crime check (P9-04)
    const isAnimalCategory = cats.some((c) => c.toLowerCase() === 'animals');
    const hasWildlifeKw = (article.keywords || []).some((kw) =>
      WILDLIFE_KEYWORDS.some((target) => kw.toLowerCase().includes(target)),
    );
    const titleOrSummaryHasWildlife =
      WILDLIFE_KEYWORDS.some((target) =>
        (article.title_english || '').toLowerCase().includes(target) ||
        (article.summary || '').toLowerCase().includes(target),
      );

    if (isAnimalCategory || hasWildlifeKw || titleOrSummaryHasWildlife) {
      item.hasWildlifeCrime = true;
      item.wildlifeArticlesCount += 1;
      wildlifeCountries.add(countryKey);
      wildlifeCountries.add(geo.name);
      wildlifeCountries.add(geo.code);
    }
  }

  // Determine top category for each country
  for (const item of Object.values(stats)) {
    let topCat = 'World';
    let maxCount = -1;
    for (const [cat, cnt] of Object.entries(item.categoryCounts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        topCat = cat;
      }
    }
    item.topCategory = topCat;
  }

  return {
    countryStats: stats,
    wildlifeCountries,
    totalDispatchesMapped: totalMapped,
  };
}

