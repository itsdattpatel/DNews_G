# RSS Sources Audit Report — AI World News Desk
*Version 1.0 · Generated 2026-11-01 · Step 0 Report Only (No backend changes)*

This audit was conducted by live HTTP requests to all 24 registered publisher RSS feeds in `config/sources.ts`.

---

## 1. Executive Summary

- **Total feeds tested**: 24
- **Responding with HTTP 200**: 24 / 24 (100% reachability)
- **Active & Fresh (< 7 days)**: 20 / 24 (83.3%)
- **Stale / Frozen feeds detected**: 4 / 24 (16.7%)
  - `china_xinhua`: Last date 2018 (archived XML endpoint)
  - `japan_nhkworld`: Last date August 2026 (feed URL `cat0.xml` rarely updated)
  - `japan_kyodo`: Last date June 2026 (stale Google News query syntax)
  - `au_sbs`: Last date August 2026 (old SBS feed URL structure)
- **Zero backend code changes made in Step 0**; this report serves as the plan for Step 7 (API & Sources settings + live provider updates).

---

## 2. Comprehensive Feed Audit Results

| Slug | Name | Region | HTTP Status | Response Time | Items Found | Last Item Date | Status / Diagnosis | Replacement Suggestion (Step 7) |
|---|---|---|---|---|---|---|---|---|
| `india_thehindu` | The Hindu | India | 200 OK | 1106 ms | 60 | Active (per-item) | ✅ Working | Keep current (`https://www.thehindu.com/feeder/default.rss`) |
| `india_ndtv` | NDTV | India | 200 OK | 3084 ms | 20 | Active (per-item) | ✅ Working | Keep current (`https://feeds.feedburner.com/ndtvnews-top-stories`) |
| `india_toi` | Times of India | India | 200 OK | 2104 ms | 20 | 2026-11-01 11:37 | ✅ Working & Fresh | Keep current (`https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms`) |
| `india_indianexpress` | Indian Express | India | 200 OK | 5725 ms | 195 | 2026-11-01 06:17 | ✅ Working & Fresh | Keep current (`https://indianexpress.com/feed/`) |
| `usa_npr` | NPR News | USA | 200 OK | 5889 ms | 10 | 2026-10-31 18:48 | ✅ Working & Fresh | Keep current (`https://feeds.npr.org/1001/rss.xml`) |
| `usa_reuters` | Reuters | USA | 200 OK | 7442 ms | 100 | 2026-10-31 18:20 | ✅ Working & Fresh | Keep current (`https://news.google.com/rss/search?q=source:Reuters...`) |
| `usa_apnews` | AP News | USA | 200 OK | 1857 ms | 35 | 2026-10-28 19:44 | ✅ Working & Fresh | Keep current |
| `usa_cbs` | CBS News World | USA | 200 OK | 3073 ms | 30 | 2026-11-01 01:31 | ✅ Working & Fresh | Keep current (`https://www.cbsnews.com/latest/rss/world`) |
| `china_cgtn` | CGTN | China | 200 OK | 2658 ms | 100 | 2026-10-28 12:14 | ✅ Working & Fresh | Keep current |
| `china_xinhua` | Xinhua English | China | 200 OK | 5806 ms | 20 | **2018-01-24** | ⚠️ **STALE (2018)** | Replace with Google News bridge `https://news.google.com/rss/search?q=source:%22Xinhua%22&hl=en-US&gl=US&ceid=US:en` or Xinhua English newsfeed |
| `china_scmp` | South China Morning Post | China | 200 OK | 5477 ms | 50 | 2026-11-01 04:45 | ✅ Working & Fresh | Keep current (`https://www.scmp.com/rss/2/feed`) |
| `china_globaltimes` | Global Times | China | 200 OK | 2925 ms | 50 | 2026-11-01 14:09 | ✅ Working & Fresh | Keep current (`https://www.globaltimes.cn/rss/outbrain.xml`) |
| `japan_nhkworld` | NHK World | Japan | 200 OK | 2020 ms | 7 | **2026-08-08** | ⚠️ **STALE (Aug 2026)** | Update to NHK World top stories `https://news.google.com/rss/search?q=source:%22NHK+WORLD%22&hl=en-US&gl=US&ceid=US:en` |
| `japan_japantimes` | Japan Times | Japan | 200 OK | 4137 ms | 30 | 2026-11-01 15:32 | ✅ Working & Fresh | Keep current (`https://www.japantimes.co.jp/feed/`) |
| `japan_nippon` | Nippon.com | Japan | 200 OK | 3320 ms | 20 | 2026-10-31 06:00 | ✅ Working & Fresh | Keep current (`https://www.nippon.com/en/feed/`) |
| `japan_kyodo` | Kyodo News | Japan | 200 OK | 3781 ms | 10 | **2026-06-04** | ⚠️ **STALE (Jun 2026)** | Update query to `https://news.google.com/rss/search?q=Kyodo+News+English&hl=en-US&gl=US&ceid=US:en` |
| `au_abc` | ABC News AU | Australia | 200 OK | 4888 ms | 25 | 2026-11-01 06:14 | ✅ Working & Fresh | Keep current (`https://www.abc.net.au/news/feed/51120/rss.xml`) |
| `au_smh` | Sydney Morning Herald | Australia | 200 OK | 3629 ms | 20 | 2026-11-01 17:32 | ✅ Working & Fresh | Keep current (`https://www.smh.com.au/rss/feed.xml`) |
| `au_guardian` | The Guardian AU | Australia | 200 OK | 7039 ms | 61 | 2026-11-01 06:33 | ✅ Working & Fresh | Keep current (`https://www.theguardian.com/au/rss`) |
| `au_sbs` | SBS News | Australia | 200 OK | 6707 ms | 25 | **2026-08-26** | ⚠️ **STALE (Aug 2026)** | Update to `https://www.sbs.com.au/news/topic/latest/feed` |
| `animals_mongabay` | Mongabay Wildlife | Animals | 200 OK | 2889 ms | 32 | 2026-10-31 18:16 | ✅ Working & Fresh | Keep current (`https://news.mongabay.com/feed/`) |
| `animals_sciencedaily` | ScienceDaily Animals | Animals | 200 OK | 4088 ms | 60 | 2026-11-01 00:53 | ✅ Working & Fresh | Keep current (`https://www.sciencedaily.com/rss/plants_animals.xml`) |
| `animals_physorg` | Phys.org Animals | Animals | 200 OK | 2659 ms | 30 | 2026-10-31 18:30 | ✅ Working & Fresh | Keep current (`https://phys.org/rss-feed/biology-news/plants-animals/`) |
| `animals_goodnews` | Good News Network | Animals | 200 OK | 4207 ms | 50 | 2026-10-28 15:30 | ✅ Working & Fresh | Keep current (`https://www.goodnewsnetwork.org/category/news/animals/feed/`) |

---

## 3. Recommended New Feed Candidates (for Step 7 Expansion)

To expand geographic breadth and wildlife crime coverage as mandated by the PRD:

### 3.1 Global & Major Broadsheets
1. **BBC World News**
   - URL: `http://feeds.bbci.co.uk/news/world/rss.xml`
   - Region: United Kingdom / Global
   - Format: Standard RSS 2.0
2. **Al Jazeera English**
   - URL: `https://www.aljazeera.com/xml/rss/all.xml`
   - Region: Middle East / Global
   - Format: RSS 2.0
3. **Deutsche Welle (DW) English**
   - URL: `https://rss.dw.com/rdf/rss-en-all`
   - Region: Germany / Europe
   - Format: RDF / RSS
4. **France 24 English**
   - URL: `https://www.france24.com/en/rss`
   - Region: France / Europe
   - Format: RSS 2.0
5. **The Straits Times (Singapore)**
   - URL: `https://www.straitstimes.com/news/world/rss.xml`
   - Region: Southeast Asia / Singapore
   - Format: RSS 2.0

### 3.2 Nature Documentary & Wildlife Crime Sources
1. **TRAFFIC.org (Wildlife Trade Monitoring Network)**
   - URL: `https://www.traffic.org/feed/`
   - Focus: Poaching, wildlife trade, animal crimes, conservation law
   - Format: RSS 2.0
2. **World Wildlife Fund (WWF) International**
   - URL: `https://wwf.panda.org/index.cfm?uNewsID=latest`
   - Focus: Global conservation, species protection, environmental reports
   - Format: RSS 2.0
3. **Wildlife Conservation Society (WCS Newsroom)**
   - URL: `https://newsroom.wcs.org/DesktopModules/ArticleCS/RSS.aspx?ContentType=36`
   - Focus: Field conservation, wildlife trafficking investigations, habitat news
   - Format: RSS 2.0
