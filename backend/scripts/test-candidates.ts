import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

const candidates = [
  // USA candidates
  { id: 'usa_cbs', country: 'USA', name: 'CBS News World', url: 'https://www.cbsnews.com/latest/rss/world' },
  { id: 'usa_abc', country: 'USA', name: 'ABC News US', url: 'https://abcnews.go.com/abcnews/topstories' },
  { id: 'usa_cnn', country: 'USA', name: 'CNN World', url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { id: 'usa_reuters_gnews', country: 'USA', name: 'Reuters (Google News)', url: 'https://news.google.com/rss/search?q=source:Reuters&hl=en-US&gl=US&ceid=US:en' },
  { id: 'usa_ap_gnews', country: 'USA', name: 'AP News (Google News)', url: 'https://news.google.com/rss/search?q=source:%22Associated+Press%22&hl=en-US&gl=US&ceid=US:en' },
  { id: 'usa_pbs_yt', country: 'USA', name: 'PBS NewsHour Feed', url: 'https://www.pbs.org/newshour/feeds/rss/world' },

  // China candidates
  { id: 'china_scmp_world', country: 'China', name: 'SCMP World', url: 'https://www.scmp.com/rss/91/feed' },
  { id: 'china_scmp_china', country: 'China', name: 'SCMP China', url: 'https://www.scmp.com/rss/2/feed' },
  { id: 'china_daily_world', country: 'China', name: 'China Daily World', url: 'https://www.chinadaily.com.cn/rss/world_rss.xml' },
  { id: 'china_daily_china', country: 'China', name: 'China Daily China', url: 'https://www.chinadaily.com.cn/rss/china_rss.xml' },
  { id: 'china_cgtn_gnews', country: 'China', name: 'CGTN (Google News)', url: 'https://news.google.com/rss/search?q=source:CGTN&hl=en-US&gl=US&ceid=US:en' },

  // Japan candidates
  { id: 'japan_mainichi', country: 'Japan', name: 'Mainichi Shimbun English', url: 'https://mainichi.jp/english/rss/etc/flash.rdf' },
  { id: 'japan_nippon', country: 'Japan', name: 'Nippon.com', url: 'https://www.nippon.com/en/feed/' },
  { id: 'japan_kyodo_gnews', country: 'Japan', name: 'Kyodo News (Google News)', url: 'https://news.google.com/rss/search?q=source:%22Kyodo+News%22&hl=en-US&gl=US&ceid=US:en' },
  { id: 'japan_today', country: 'Japan', name: 'Japan Today', url: 'https://japantoday.com/feed' },

  // Animals candidates
  { id: 'animals_mongabay', country: 'Animals', name: 'Mongabay Wildlife', url: 'https://news.mongabay.com/feed/' },
  { id: 'animals_sciencedaily', country: 'Animals', name: 'ScienceDaily Animals', url: 'https://www.sciencedaily.com/rss/plants_animals.xml' },
  { id: 'animals_physorg', country: 'Animals', name: 'Phys.org Animals', url: 'https://phys.org/rss-feed/biology-news/plants-animals/' },
  { id: 'animals_discoverwildlife', country: 'Animals', name: 'BBC Wildlife Discover', url: 'https://www.discoverwildlife.com/feed/' },
  { id: 'animals_treehugger', country: 'Animals', name: 'Treehugger Animals', url: 'https://www.treehugger.com/feeds/category/animals.rss' },
  { id: 'animals_goodnews', country: 'Animals', name: 'Good News Network Animals', url: 'https://www.goodnewsnetwork.org/category/news/animals/feed/' },
];

async function testCandidate(c: typeof candidates[0]) {
  try {
    const feed = await parser.parseURL(c.url);
    const count = feed.items?.length ?? 0;
    console.log(`[OK] ${c.id} (${c.name}): ${count} items`);
    return { ...c, ok: true, count };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[FAIL] ${c.id} (${c.name}): ${msg}`);
    return { ...c, ok: false, error: msg };
  }
}

async function run() {
  await Promise.all(candidates.map(testCandidate));
}

run();
