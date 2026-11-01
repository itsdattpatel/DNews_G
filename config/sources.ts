/**
 * config/sources.ts
 * Master list of news sources. Adding a new country = one object here.
 * Live-tested and verified in Phase 2.
 */
export interface SourceConfig {
  slug: string;
  name: string;
  country: string;
  url: string;
  fetchType: 'rss' | 'gdelt' | 'scrape';
  enabled: boolean;
}

export const SOURCES: SourceConfig[] = [
  // ── India ────────────────────────────────────────────────────────────────
  {
    slug: 'india_thehindu',
    name: 'The Hindu',
    country: 'India',
    url: 'https://www.thehindu.com/feeder/default.rss',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'india_ndtv',
    name: 'NDTV',
    country: 'India',
    url: 'https://feeds.feedburner.com/ndtvnews-top-stories',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'india_toi',
    name: 'Times of India',
    country: 'India',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'india_indianexpress',
    name: 'Indian Express',
    country: 'India',
    url: 'https://indianexpress.com/feed/',
    fetchType: 'rss',
    enabled: true,
  },

  // ── USA ──────────────────────────────────────────────────────────────────
  {
    slug: 'usa_npr',
    name: 'NPR News',
    country: 'USA',
    url: 'https://feeds.npr.org/1001/rss.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'usa_reuters',
    name: 'Reuters',
    country: 'USA',
    url: 'https://news.google.com/rss/search?q=source:Reuters&hl=en-US&gl=US&ceid=US:en',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'usa_apnews',
    name: 'AP News',
    country: 'USA',
    url: 'https://news.google.com/rss/search?q=source:%22Associated+Press%22&hl=en-US&gl=US&ceid=US:en',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'usa_cbs',
    name: 'CBS News World',
    country: 'USA',
    url: 'https://www.cbsnews.com/latest/rss/world',
    fetchType: 'rss',
    enabled: true,
  },

  // ── China ─────────────────────────────────────────────────────────────────
  {
    slug: 'china_cgtn',
    name: 'CGTN',
    country: 'China',
    url: 'https://news.google.com/rss/search?q=source:CGTN&hl=en-US&gl=US&ceid=US:en',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'china_xinhua',
    name: 'Xinhua English',
    country: 'China',
    url: 'http://www.xinhuanet.com/english/rss/worldrss.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'china_scmp',
    name: 'South China Morning Post',
    country: 'China',
    url: 'https://www.scmp.com/rss/2/feed',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'china_globaltimes',
    name: 'Global Times',
    country: 'China',
    url: 'https://www.globaltimes.cn/rss/outbrain.xml',
    fetchType: 'rss',
    enabled: true,
  },

  // ── Japan ─────────────────────────────────────────────────────────────────
  {
    slug: 'japan_nhkworld',
    name: 'NHK World',
    country: 'Japan',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'japan_japantimes',
    name: 'Japan Times',
    country: 'Japan',
    url: 'https://www.japantimes.co.jp/feed/',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'japan_nippon',
    name: 'Nippon.com',
    country: 'Japan',
    url: 'https://www.nippon.com/en/feed/',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'japan_kyodo',
    name: 'Kyodo News',
    country: 'Japan',
    url: 'https://news.google.com/rss/search?q=source:%22Kyodo+News%22&hl=en-US&gl=US&ceid=US:en',
    fetchType: 'rss',
    enabled: true,
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  {
    slug: 'au_abc',
    name: 'ABC News AU',
    country: 'Australia',
    url: 'https://www.abc.net.au/news/feed/51120/rss.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'au_smh',
    name: 'Sydney Morning Herald',
    country: 'Australia',
    url: 'https://www.smh.com.au/rss/feed.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'au_guardian',
    name: 'The Guardian AU',
    country: 'Australia',
    url: 'https://www.theguardian.com/au/rss',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'au_sbs',
    name: 'SBS News',
    country: 'Australia',
    url: 'https://www.sbs.com.au/news/feed',
    fetchType: 'rss',
    enabled: true,
  },

  // ── Animals / Wildlife ────────────────────────────────────────────────────
  {
    slug: 'animals_mongabay',
    name: 'Mongabay Wildlife',
    country: 'Animals',
    url: 'https://news.mongabay.com/feed/',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'animals_sciencedaily',
    name: 'ScienceDaily Animals',
    country: 'Animals',
    url: 'https://www.sciencedaily.com/rss/plants_animals.xml',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'animals_physorg',
    name: 'Phys.org Animals & Wildlife',
    country: 'Animals',
    url: 'https://phys.org/rss-feed/biology-news/plants-animals/',
    fetchType: 'rss',
    enabled: true,
  },
  {
    slug: 'animals_goodnews',
    name: 'Good News Network Animals',
    country: 'Animals',
    url: 'https://www.goodnewsnetwork.org/category/news/animals/feed/',
    fetchType: 'rss',
    enabled: true,
  },
];
