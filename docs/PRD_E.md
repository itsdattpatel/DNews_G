# PRD E: DNews Desktop Application — Windows Executable
*Version 1.0.0 · "The Morning Wire" · 2026-11-16 · Localhost-only Desktop App*

---

## 0. Version Name & Identity

| Field | Value |
|---|---|
| **App Name** | DNews — The Daily Bugle |
| **App ID** | `com.dnews.app` |
| **Version** | `1.0.0` codename **"The Morning Wire"** |
| **Next version cadence** | Semantic versioning: `MAJOR.MINOR.PATCH` |
| **GitHub Release tag format** | `v1.0.0`, `v1.1.0`, `v2.0.0` |

---

## 1. Global Rules (G1–G10)

| ID | Rule |
|---|---|
| **G1** | Docs first. All design decisions are written here before code. |
| **G2** | Never guess. Ambiguous = write in `OPEN_QUESTIONS.md`, ask, wait. |
| **G3** | One category at a time. Screenshots + tests after each. STOP for approval. |
| **G4** | Before and before every DB migration: `git commit` + backup SQLite. |
| **G5** | Packages: exact pinned versions, `> 14 days` old, `npm audit`, MIT/Apache/ISC/OFL only. Log in `CREDITS.md`. |
| **G6** | State skills read per GEMINI.md before each category. |
| **G7** | Localhost only. No cloud hosting. NSIS installer only (no publish). |
| **G8** | Test data: TEST db only. Zero regressions on what works today. |
| **G9** | **ZERO personal data or real API keys in any committed file.** `.env` stays gitignored. |
| **G10** | **GitHub-safe repo**: user data (`data/`, `backups/`, `logs/`) must live outside the repo (in `%APPDATA%`), not inside the project folder, so the repo can be pushed to GitHub cleanly. |

---

## 2. What This PRD Delivers

### Summary of All Work Items

| Cat | Topic | Type |
|---|---|---|
| **1** | Secrets Scrub & GitHub-Safe Repo | Safety, Mandatory |
| **2** | Data Directory Isolation (`%APPDATA%`) | Architecture |
| **3** | Expanded Global News Sources (100+ outlets, 70+ countries) | Features |
| **4** | AI Text Normalization & Readability Pipeline | Features |
| **5** | Offline Resilience (15-second connectivity watchdog) | Reliability |
| **6** | Electron Shell & Windows App Identity | Desktop |
| **7** | System Tray & Native Notifications | Desktop UX |
| **8** | Single-Instance Lock & Graceful Shutdown | Reliability |
| **9** | Auto-Update via GitHub Releases | Updates |
| **10** | Windows NSIS Installer | Distribution |
| **11** | In-App Secrets Manager (remove plain `.env` dependency) | Security |

---

## 3. Category Specifications

---

### Category 1: Secrets Scrub & GitHub-Safe Repository

**Objective**: Make every file in the repo safe to push to a public GitHub repository with zero personal information or live API keys.

#### 1.1 Audit Checklist

| Item | File | Current State | Required State |
|---|---|---|---|
| Real API Keys | `.env` | Gitignored | Stay gitignored |
| `.env.example` | `.env.example` | Has placeholder strings | Confirm no real keys |
| `news.sqlite` (root-level) | `e:\DNews_G\news.sqlite` | Exists in root | Add to gitignore, delete from root |
| `data/` folder | `backend/data/` | Gitignored | Confirm in `.gitignore` |
| `backups/` folder | `e:\DNews_G\backups/` | Lives in repo root | Add to `.gitignore` |
| `playwright-screenshots/` | Root | Lives in repo | Add to `.gitignore` |
| `autostart/` | Root | Lives in repo | Add to `.gitignore` |

#### 1.2 Updated `.gitignore` Additions

```
# User data (must never be committed)
*.sqlite
*.sqlite-shm
*.sqlite-wal
backups/
logs/
playwright-screenshots/
autostart/

# Electron build outputs
electron/dist/
release/
```

#### 1.3 `.env.example` Rules

- The `.env.example` file is the **single source of truth** for all configurable keys.
- **No real values may ever appear in `.env.example`.**
- In-app Secrets Manager (Category 11) writes real values to `%APPDATA%\DNews\user.env` — a file outside the repo.

---

### Category 2: Data Directory Isolation (`%APPDATA%`)

**Objective**: All user-generated data lives outside the repository in the Windows user profile, so the git repo stays clean and app updates never destroy user data.

#### 2.1 Data Directory Layout

```
%APPDATA%\DNews\                        <- All runtime user data
  data\
    news.sqlite                         <- Production database
  backups\                              <- Auto-backups before migrations
  logs\
    app.log                             <- Backend request / error log
    fetch.log                           <- RSS / scrape fetch log
  user.env                              <- User's API keys (from Secrets Manager)
```

#### 2.2 Path Resolution Logic

New module `backend/src/utils/appPaths.ts`:

```typescript
export function getDataDir(): string;
export function getBackupsDir(): string;
export function getLogsDir(): string;
export function getUserEnvPath(): string;
```

- **Dev mode** (`NODE_ENV=development`): continue using `backend/data/` — no behavior change.
- **Production (Electron)**: resolve from `DNEWS_APP_DATA_DIR` env var that Electron main sets before spawning the backend.

#### 2.3 First-Launch Bootstrap

On first launch (database file not found at the production path):
1. Create all directories in `%APPDATA%\DNews\`.
2. Run SQLite migrations `001–015` automatically.
3. Seed starter sources from `config/sources.ts`.
4. Seed Library starter records (history, wisdom, mind).
5. Show a "Setting up your news desk…" splash screen (max 5 seconds).

---

### Category 3: Expanded Global News Sources

**Objective**: Expand news coverage from 5 countries (~19 sources) to **70+ countries** with **100+ verified English-language RSS feeds**.

#### 3.1 Source Strategy

1. **English-language RSS feed** preferred.
2. **Google News RSS proxy** (`news.google.com/rss/search?q=source:OUTLET&hl=en`) used where the outlet's own English feed is unavailable.
3. **Scrape + Readability fallback** for major outlets with no RSS.
4. If a source publishes in a non-English language, the AI Translation layer translates it. The `language` field tells the translator when to act.

#### 3.2 Updated `SourceConfig` Schema

```typescript
export interface SourceConfig {
  slug: string;
  name: string;
  country: string;
  region: 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Middle East' | 'Oceania' | 'Global';
  url: string;
  fetchType: 'rss' | 'gdelt' | 'scrape';
  language: string;        // ISO 639-1: 'en', 'fr', 'ar', 'es', etc.
  enabled: boolean;
  priority: 'tier1' | 'tier2' | 'tier3';
}
```

#### 3.3 New Source List by Region (100+ outlets across 70+ countries)

**GLOBAL WIRE SERVICES**
| Slug | Name | URL | Type |
|---|---|---|---|
| `global_reuters` | Reuters World | `https://feeds.reuters.com/reuters/worldNews` | rss |
| `global_bbc_world` | BBC News World | `https://feeds.bbci.co.uk/news/world/rss.xml` | rss |
| `global_aljazeera` | Al Jazeera English | `https://www.aljazeera.com/xml/rss/all.xml` | rss |
| `global_dw` | Deutsche Welle English | `https://rss.dw.com/rdf/rss-en-all` | rss |
| `global_france24` | France 24 English | `https://www.france24.com/en/rss` | rss |
| `global_voa` | Voice of America | `https://www.voanews.com/api/zqovmq$ioii` | rss |
| `global_rfi` | RFI English | `https://en.rfi.fr/rss` | rss |
| `global_euronews` | Euronews English | `https://feeds.feedburner.com/euronews/en/home/` | rss |
| `global_ap` | AP News | `https://news.google.com/rss/search?q=source:%22Associated+Press%22&hl=en` | rss |
| `global_afp` | AFP English | `https://news.google.com/rss/search?q=source:AFP&hl=en` | rss |

**AMERICAS**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `usa_npr` | NPR News | USA | `https://feeds.npr.org/1001/rss.xml` | rss |
| `usa_cbs` | CBS News World | USA | `https://www.cbsnews.com/latest/rss/world` | rss |
| `usa_fox` | Fox News World | USA | `https://moxie.foxnews.com/google-publisher/world.xml` | rss |
| `usa_hill` | The Hill | USA | `https://thehill.com/feed/` | rss |
| `usa_nyt` | New York Times (GNews) | USA | `https://news.google.com/rss/search?q=source:NYTimes&hl=en` | rss |
| `usa_washpost` | Washington Post (GNews) | USA | `https://news.google.com/rss/search?q=source:WashingtonPost&hl=en` | rss |
| `ca_cbc` | CBC News | Canada | `https://www.cbc.ca/cmlink/rss-world` | rss |
| `ca_globemail` | Globe and Mail | Canada | `https://www.theglobeandmail.com/arc/outboundfeeds/rss/` | rss |
| `mx_universal` | El Universal Mexico (GNews) | Mexico | `https://news.google.com/rss/search?q=mexico+news&hl=en&gl=MX` | rss |
| `br_folha` | Folha de S.Paulo (GNews) | Brazil | `https://news.google.com/rss/search?q=source:FolhaDeSPaulo&hl=en` | rss |
| `ar_buenosaires` | Buenos Aires Herald | Argentina | `https://www.buenosairesherald.com/feed` | rss |
| `cl_mercopress` | MercoPress South America | Chile/Region | `https://en.mercopress.com/rss` | rss |
| `co_eltiempo` | El Tiempo Colombia (GNews) | Colombia | `https://news.google.com/rss/search?q=colombia+news&hl=en&gl=CO` | rss |
| `pe_andina` | Andina Peru English | Peru | `https://andina.pe/RSS/feed.aspx?CanalID=1` | rss |
| `ve_caracas` | Caracas Chronicles | Venezuela | `https://www.caracaschronicles.com/feed/` | rss |
| `cu_14ymedio` | 14ymedio Cuba (GNews EN) | Cuba | `https://news.google.com/rss/search?q=cuba+news&hl=en` | rss |
| `jm_jamaicaobserver` | Jamaica Observer | Jamaica | `https://www.jamaicaobserver.com/rssfeed` | rss |
| `uy_montevideo` | MercoPress Uruguay | Uruguay | `https://en.mercopress.com/rss` | rss |

**EUROPE**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `uk_guardian` | The Guardian UK | UK | `https://www.theguardian.com/world/rss` | rss |
| `uk_independent` | The Independent | UK | `https://www.independent.co.uk/rss` | rss |
| `uk_sky` | Sky News World | UK | `https://feeds.skynews.com/feeds/rss/world.xml` | rss |
| `uk_times` | The Times (GNews) | UK | `https://news.google.com/rss/search?q=source:TheTimes&hl=en` | rss |
| `de_spiegel` | Der Spiegel International | Germany | `https://www.spiegel.de/international/index.rss` | rss |
| `de_dw_ger` | DW Germany Focus | Germany | `https://rss.dw.com/rdf/rss-en-ger` | rss |
| `fr_lemonde` | Le Monde EN | France | `https://news.google.com/rss/search?q=source:LeMonde&hl=en` | rss |
| `es_elpais` | El Pais English | Spain | `https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada` | rss |
| `it_ansa` | ANSA English | Italy | `https://www.ansa.it/english/news/world/index.shtml` | scrape |
| `nl_dutchnews` | DutchNews.nl | Netherlands | `https://www.dutchnews.nl/feed/` | rss |
| `se_thelocal` | The Local Sweden | Sweden | `https://www.thelocal.se/feeds/rss.php` | rss |
| `no_thelocal` | The Local Norway | Norway | `https://www.thelocal.no/feeds/rss.php` | rss |
| `ch_swissinfo` | Swissinfo | Switzerland | `https://www.swissinfo.ch/eng/rss/en` | rss |
| `pl_notesfrompoland` | Notes from Poland | Poland | `https://notesfrompoland.com/feed/` | rss |
| `gr_ekathimerini` | Ekathimerini Greece | Greece | `https://www.ekathimerini.com/rss` | rss |
| `pt_theportugalnews` | The Portugal News | Portugal | `https://www.theportugalnews.com/rss` | rss |
| `be_brusselstimes` | The Brussels Times | Belgium | `https://www.brusselstimes.com/feed` | rss |
| `ie_irishtimes` | Irish Times World | Ireland | `https://www.irishtimes.com/cmlink/news-world-1.1061174` | rss |
| `cz_praguemonitor` | Prague Morning | Czech Republic | `https://praguemonitor.com/feed/` | rss |
| `hu_dailynewshungary` | Daily News Hungary | Hungary | `https://dailynewshungary.com/feed/` | rss |
| `ro_romaniainsider` | Romania Insider | Romania | `https://www.romania-insider.com/feed` | rss |
| `ua_kyivindependent` | Kyiv Independent | Ukraine | `https://kyivindependent.com/rss/` | rss |
| `rs_balkaninsight` | Balkan Insight | Balkans | `https://balkaninsight.com/feed/` | rss |
| `fi_yle` | YLE News Finland | Finland | `https://feeds.yle.fi/uutiset/v1/majorHeadlines/YLE_UUTISET.rss` | rss |
| `dk_thelocal` | The Local Denmark | Denmark | `https://www.thelocal.dk/feeds/rss.php` | rss |
| `at_thelocal` | The Local Austria | Austria | `https://www.thelocal.at/feeds/rss.php` | rss |
| `sk_spectator` | Slovak Spectator | Slovakia | `https://spectator.sme.sk/rss/` | rss |
| `si_sloveniatimes` | Slovenia Times | Slovenia | `https://sloveniatimes.com/feed/` | rss |
| `hr_tportal` | Total Croatia News | Croatia | `https://www.total-croatia-news.com/feed` | rss |
| `bg_novinite` | Novinite Bulgaria | Bulgaria | `https://www.novinite.com/rss/rss.php` | rss |
| `lt_lrt` | LRT English Lithuania | Lithuania | `https://www.lrt.lt/en/rss` | rss |
| `lv_lsm` | LSM Latvia | Latvia | `https://eng.lsm.lv/rss/` | rss |
| `ee_err` | ERR News Estonia | Estonia | `https://www.err.ee/rss` | rss |
| `by_belarusdigest` | Belarus Digest | Belarus | `https://belarusdigest.com/feed/` | rss |
| `rs_B92` | N1 Serbia | Serbia | `https://n1info.rs/feed/` | rss |

**MIDDLE EAST & NORTH AFRICA**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `il_haaretz` | Haaretz English | Israel | `https://news.google.com/rss/search?q=source:Haaretz&hl=en` | rss |
| `sa_arabnews` | Arab News | Saudi Arabia | `https://www.arabnews.com/rss.xml` | rss |
| `ae_gulfnews` | Gulf News | UAE | `https://gulfnews.com/rss` | rss |
| `tr_dailysabah` | Daily Sabah | Turkey | `https://www.dailysabah.com/rss` | rss |
| `eg_ahramonline` | Ahram Online | Egypt | `https://english.ahram.org.eg/RSSSections/0.aspx` | rss |
| `eg_egyptindependent` | Egypt Independent | Egypt | `https://egyptindependent.com/feed/` | rss |
| `qa_middleeasteye` | Middle East Eye | Qatar/Region | `https://www.middleeasteye.net/rss` | rss |
| `ma_moroccoworldnews` | Morocco World News | Morocco | `https://www.moroccoworldnews.com/feed/` | rss |
| `dz_algeria` | Algeria Press Service (GNews) | Algeria | `https://news.google.com/rss/search?q=algeria+news&hl=en` | rss |
| `iq_iraqinews` | Iraq News | Iraq | `https://iraqinews.com/feed/` | rss |
| `jo_jordantimes` | Jordan Times | Jordan | `https://jordantimes.com/rss_all.xml` | rss |
| `kw_arabtimes` | Arab Times Kuwait | Kuwait | `https://www.arabtimesonline.com/feed/` | rss |
| `ye_arabnews_ye` | Arab News Yemen (GNews) | Yemen | `https://news.google.com/rss/search?q=yemen+news&hl=en` | rss |
| `tn_businessnews` | Business News Tunisia (GNews) | Tunisia | `https://news.google.com/rss/search?q=tunisia+news&hl=en` | rss |
| `ly_libyaobserver` | Libya Observer | Libya | `https://www.libyaobserver.ly/feed` | rss |
| `om_muscat` | Muscat Daily Oman | Oman | `https://www.muscatdaily.com/feed/` | rss |

**ASIA — SOUTH & SOUTHEAST**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `pk_dawn` | Dawn | Pakistan | `https://www.dawn.com/feeds/home` | rss |
| `bd_dhakatribune` | Dhaka Tribune | Bangladesh | `https://www.dhakatribune.com/feed` | rss |
| `lk_dailymirror` | Daily Mirror LK | Sri Lanka | `https://www.dailymirror.lk/rss/` | rss |
| `np_himalayan` | The Himalayan Times | Nepal | `https://thehimalayantimes.com/feed/` | rss |
| `th_bangkokpost` | Bangkok Post | Thailand | `https://www.bangkokpost.com/rss/data/topstories.xml` | rss |
| `vn_vietnamnews` | Vietnam News | Vietnam | `https://vietnamnews.vn/rss/world.rss` | rss |
| `ph_inquirer` | Philippine Daily Inquirer | Philippines | `https://newsinfo.inquirer.net/feed` | rss |
| `id_jakartapost` | Jakarta Post | Indonesia | `https://www.thejakartapost.com/feed` | rss |
| `my_malaymail` | Malay Mail | Malaysia | `https://www.malaymail.com/feed` | rss |
| `sg_straitstime` | The Straits Times (GNews) | Singapore | `https://news.google.com/rss/search?q=source:StraitsTimes&hl=en` | rss |
| `mm_mizzima` | Mizzima | Myanmar | `https://mizzima.com/rss.xml` | rss |
| `kh_phnompenh` | Phnom Penh Post | Cambodia | `https://www.phnompenhpost.com/rss.xml` | rss |
| `la_vientianetimes` | Vientiane Times (GNews) | Laos | `https://news.google.com/rss/search?q=laos+news&hl=en` | rss |
| `bn_borneo` | Borneo Bulletin | Brunei | `https://borneobulletin.com.bn/feed/` | rss |
| `mv_maldives` | Maldives Independent | Maldives | `https://maldivesindependent.com/feed` | rss |
| `bt_kuensel` | Kuensel Bhutan | Bhutan | `https://kuenselonline.com/feed/` | rss |
| `af_tolonews` | Tolo News | Afghanistan | `https://tolonews.com/rss.xml` | rss |

**ASIA — EAST & CENTRAL**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `kr_koreatimes` | The Korea Times | South Korea | `https://www.koreatimes.co.kr/www/rss/rss.xml` | rss |
| `kr_joongang` | JoongAng Daily | South Korea | `https://koreajoongangdaily.joins.com/rss/totalNews.xml` | rss |
| `tw_taipeitimes` | Taipei Times | Taiwan | `https://www.taipeitimes.com/xml/index.rss` | rss |
| `mn_montsame` | Montsame Mongolia | Mongolia | `https://montsame.mn/en/rss` | rss |
| `kz_astana` | Astana Times | Kazakhstan | `https://astanatimes.com/feed/` | rss |
| `uz_kun` | Kun.uz English | Uzbekistan | `https://kun.uz/en/rss/news` | rss |
| `kg_kabar` | Kabar News Kyrgyzstan | Kyrgyzstan | `https://kabar.kg/eng/rss/` | rss |
| `ge_georgia` | Georgia Today | Georgia | `https://georgiatoday.ge/feed/` | rss |
| `am_armenianews` | Armenpress | Armenia | `https://armenpress.am/eng/rss/news/` | rss |
| `az_azernews` | AzerNews | Azerbaijan | `https://www.azernews.az/rss/news.xml` | rss |

**AFRICA — SUB-SAHARAN**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `ng_punchng` | Punch Nigeria | Nigeria | `https://punchng.com/feed/` | rss |
| `ng_guardian` | Guardian Nigeria | Nigeria | `https://guardian.ng/feed/` | rss |
| `za_dailymaverick` | Daily Maverick | South Africa | `https://www.dailymaverick.co.za/dmrss/` | rss |
| `ke_standardmedia` | Standard Media Kenya | Kenya | `https://www.standardmedia.co.ke/rss` | rss |
| `ke_thenation` | The Nation Kenya | Kenya | `https://nation.africa/kenya/rss.xml` | rss |
| `gh_myjoyonline` | MyJoyOnline Ghana | Ghana | `https://www.myjoyonline.com/feed/` | rss |
| `et_addisstandard` | Addis Standard | Ethiopia | `https://addisstandard.com/feed/` | rss |
| `tz_thecitizen` | The Citizen Tanzania | Tanzania | `https://www.thecitizen.co.tz/rss` | rss |
| `sn_apanews` | APA News Africa | West Africa | `https://apanews.net/rss/` | rss |
| `ug_monitor` | Daily Monitor Uganda | Uganda | `https://www.monitor.co.ug/Uganda/News/rss` | rss |
| `zm_lusaka` | Lusaka Times Zambia | Zambia | `https://www.lusakatimes.com/feed/` | rss |
| `zw_herald` | The Herald Zimbabwe | Zimbabwe | `https://www.herald.co.zw/feed/` | rss |
| `bw_mmegi` | Mmegi Botswana | Botswana | `https://www.mmegi.bw/rss` | rss |
| `mz_clubofmozambique` | Club of Mozambique | Mozambique | `https://clubofmozambique.com/feed/` | rss |
| `ci_abidjan` | Abidjan.net (GNews) | Ivory Coast | `https://news.google.com/rss/search?q=ivory+coast+news&hl=en` | rss |
| `cm_cameroon` | Cameroon Tribune (GNews) | Cameroon | `https://news.google.com/rss/search?q=cameroon+news&hl=en` | rss |
| `dz_tsa` | TSA Algeria (GNews) | Algeria | `https://news.google.com/rss/search?q=algeria+news&hl=en` | rss |
| `so_garowe` | Garowe Online | Somalia | `https://www.garoweonline.com/en/feed/` | rss |
| `sd_sudantribune` | Sudan Tribune | Sudan | `https://sudantribune.com/spip.php?page=backend` | rss |
| `lr_frontpageafrica` | FrontPage Africa | Liberia | `https://frontpageafricaonline.com/feed/` | rss |

**OCEANIA**
| Slug | Name | Country | URL | Type |
|---|---|---|---|---|
| `nz_stuff` | Stuff NZ | New Zealand | `https://www.stuff.co.nz/rss` | rss |
| `nz_herald` | NZ Herald | New Zealand | `https://www.nzherald.co.nz/arc/outboundfeeds/rss/` | rss |
| `fj_fijisun` | Fiji Sun | Fiji | `https://fijisun.com.fj/feed/` | rss |
| `pg_postcourier` | Post Courier PNG | Papua New Guinea | `https://www.postcourier.com.pg/feed/` | rss |
| `ws_samoaobserver` | Samoa Observer | Samoa | `https://www.samoaobserver.ws/feed` | rss |
| `to_matangitonga` | Matangi Tonga | Tonga | `https://matangitonga.to/feed` | rss |

#### 3.4 Source Management Rules

1. **Adding a source** = one object in `config/sources.ts`. No other code changes required.
2. **Disabling a broken source** = set `enabled: false`. Appears in Control Room "Dead Feeds" list.
3. **Source health**: after 5 consecutive fetch errors, auto-disable the source and alert in Control Room.
4. **Rate limiting**: minimum 2-second inter-request delay per domain.
5. **Non-English sources**: set `language` field to the ISO 639-1 code. The AI pipeline will translate automatically.

---

### Category 4: AI Text Normalization & Readability Pipeline

**Objective**: Every article is stored and displayed in clean, readable English regardless of origin quality or language.

#### 4.1 The Problem

Articles currently arrive with:
- Truncated RSS summaries (`"...Read more at..."`)
- Raw HTML entities (`&amp;`, `&#8220;`)
- Broken UTF-8 characters
- Orphaned sentence fragments from bad scrapers
- Non-English text (French, Arabic, Spanish, etc.)

#### 4.2 Normalization Pipeline

**Stage 1 — HTML Strip & Entity Decode** (in-process, zero AI cost):
- Strip all HTML tags.
- Decode HTML entities (`&amp;` → `&`, `&#8220;` → `"`, etc.).
- Fix common UTF-8 mojibake sequences.

**Stage 2 — Language Detection** (in-process, zero AI cost):
- If source `language !== 'en'`: mark article for AI translation.
- Else: fast-path, skip translation.

**Stage 3 — AI Translation + Normalization** (single combined AI call, extends existing pipeline):
The existing AI router call is extended to:
1. Translate to English if needed.
2. Fix garbled sentence structure into clean, grammatically correct prose.
3. Expand truncated summaries when full article text is available.
4. Remove boilerplate ("Read more at...", "Subscribe to our newsletter...", cookie notices).
5. Output: `titleEnglish`, `summaryEnglish`, `bodyEnglishNormalized`.

**Stage 4 — Readability Gate** (in-process):
- If result < 20 readable words: mark `body_quality: 'poor'`, show "Limited excerpt available" in UI.

#### 4.3 New DB Fields (Migration 016)

```sql
ALTER TABLE articles ADD COLUMN title_en TEXT;
ALTER TABLE articles ADD COLUMN body_en_normalized TEXT;
ALTER TABLE articles ADD COLUMN source_language TEXT DEFAULT 'en';
ALTER TABLE articles ADD COLUMN body_quality TEXT DEFAULT 'good';
ALTER TABLE articles ADD COLUMN translation_provider TEXT;
```

---

### Category 5: Offline Resilience — Connectivity Watchdog

**Objective**: DNews keeps running gracefully with zero crashes when internet goes away. It checks for reconnection every 15 seconds and resumes all fetching automatically when connectivity returns.

#### 5.1 Behavior Contract

| State | Behavior |
|---|---|
| **Online** | Normal fetch schedule runs. |
| **Offline (detected)** | All outbound fetch jobs suspended. Status Strip shows `⊘ No Internet — checking every 15s`. |
| **Checking (every 15s)** | Backend pings DNS (`1.1.1.1`) with 3s timeout. No article fetching during check. |
| **Reconnected** | Chip shows `↺ Back online — syncing…` for 3s. All fetch jobs resume. Failed sources re-queued. |

#### 5.2 `connectivity-watchdog.ts`

```typescript
// backend/src/utils/connectivity-watchdog.ts
export class ConnectivityWatchdog {
  private isOnline: boolean = true;
  private checkInterval = 15_000;  // ms
  private checkTimeout = 3_000;    // ms per check

  start(): void;
  stop(): void;
  isCurrentlyOnline(): boolean;
  onStatusChange(cb: (online: boolean) => void): void;
}
```

- Uses `dns.lookup('1.1.1.1')` with 3s timeout — lightweight, no HTTP overhead.
- Emits `connectivity_change` SSE event to the frontend on status change.
- `scheduler.ts` checks `watchdog.isCurrentlyOnline()` before every fetch cycle.

#### 5.3 Frontend Status Strip `ConnectivityChip`

- Shows nothing when online.
- Shows `⊘ No Internet` (amber) when offline.
- Shows `↺ Back online — syncing…` (green, fades after 3s) on reconnect.
- Subscribes to `connectivity_change` SSE event.

---

### Category 6: Electron Shell & Windows App Identity

**Objective**: Package the full-stack app as a native Electron Windows desktop application with no visible terminal windows.

#### 6.1 New File Structure

```
DNews_G/
  electron/
    main.ts           <- Electron Main Process entry point
    preload.ts        <- Context bridge (IPC API for renderer)
    tray.ts           <- System Tray management
  assets/
    icon.ico          <- Multi-resolution Windows icon (16-256px)
    icon.png          <- 512x512 source PNG
    icon-tray.png     <- 32x32 tray icon variant
  electron-builder.json
```

#### 6.2 `electron/main.ts` Responsibilities

1. **Single-instance lock** (focus existing window if second instance launched)
2. **Set `DNEWS_APP_DATA_DIR`** to `app.getPath('appData') + '\DNews'` before spawning backend
3. **Spawn Express backend**: launch `backend/dist/index.js` as a child process
4. **Health-check wait**: poll `GET /api/health` every 500ms until 200 before showing window
5. **Create `BrowserWindow`**: load `frontend/dist/index.html`, bg color `#FAF7F0` (no white flash)
6. **Window bounds persistence**: read/write from `window-state.json` in AppData
7. **Minimal menu bar**: File > Quit, Help > About, Help > Check for Updates
8. **Graceful shutdown**: on `before-quit`, send SIGTERM to backend, await WAL flush (max 5s)

#### 6.3 `electron/preload.ts` — Context Bridge

```typescript
// Exposed as window.electronBridge
interface ElectronBridge {
  getAppVersion(): string;
  getAppDataDir(): string;
  openExternal(url: string): void;
  showNotification(title: string, body: string): void;
  checkForUpdates(): void;
  quitApp(): void;
  platform: 'win32' | 'darwin' | 'linux';
}
```

#### 6.4 App Icon

The Victorian Bat & Globe SVG emblem from the Design System exported as:
- `icon.ico`: Combined Windows ICO (256, 128, 64, 48, 32, 24, 16px)
- Design: bat spread wings with globe on dark `#1A1208` background, paper-gold highlight `#C4973A`

#### 6.5 `electron-builder.json`

```json
{
  "appId": "com.dnews.app",
  "productName": "DNews",
  "copyright": "Copyright 2026 DNews",
  "directories": { "output": "release" },
  "files": [
    "electron/dist/**",
    "frontend/dist/**",
    "backend/dist/**",
    "assets/**",
    "node_modules/**"
  ],
  "extraResources": [
    { "from": "config/", "to": "config/" },
    { "from": ".env.example", "to": ".env.example" }
  ],
  "win": {
    "target": ["nsis"],
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "DNews"
  },
  "publish": {
    "provider": "github",
    "owner": "GITHUB_USERNAME_PLACEHOLDER",
    "repo": "DNews_G"
  }
}
```

> **Note**: `GITHUB_USERNAME_PLACEHOLDER` will be replaced with the actual GitHub username before packaging. This is never hardcoded with a real username.

---

### Category 7: System Tray & Native Windows Notifications

**Objective**: DNews lives in the Windows system tray so it can keep refreshing news in the background without an open window.

#### 7.1 System Tray Right-Click Menu

```
DNews — The Daily Bugle         (title, greyed, non-clickable)
─────────────────────────────
Open DNews                      <- bring window to front
Check News Now                  <- trigger immediate fetch cycle
─────────────────────────────
2 Breaking Stories              <- live count, click = open Breaking view
1,420 stories indexed           <- live count
─────────────────────────────
Mute Alerts                     <- toggle
Preferences...                  <- open Settings in app
─────────────────────────────
Quit DNews
```

#### 7.2 Tray Behavior

- Closing the window ("X") **minimizes to tray**, not quits (first-time tooltip informs user).
- Setting: Settings > App Behavior > "Quit when window is closed" overrides tray behavior.
- Tray icon shows amber dot overlay when there are unread breaking stories (score ≥ 80).

#### 7.3 Windows Native Toast Notifications

| Trigger | Notification Title | Action |
|---|---|---|
| Breaking story (score ≥ 80) | `Breaking: [Story Headline]` | Click opens reader |
| AI provider failover | `Switched to [Provider]` | Click opens Control Room |
| Internet reconnected (offline > 5 min) | `Back online — checking for new stories` | Click opens app |
| Update available | `DNews v1.1.0 is available` | Click opens update banner |

Notifications respect Windows Focus Assist / Do Not Disturb. In-app toggle: Settings > Notifications.

---

### Category 8: Single-Instance Lock & Graceful Shutdown

(Specified in Category 6.2. This category ensures dedicated test coverage.)

#### 8.1 Tests Required

- Launching second instance while first is running: second exits, first focuses. ✓
- SIGTERM to main process: backend flushes SQLite WAL and exits clean within 5 seconds. ✓
- Force-kill (SIGKILL): SQLite WAL auto-recovery on next start. ✓

---

### Category 9: Auto-Update via GitHub Releases

**Objective**: Users update DNews by clicking one button in the app — no manual reinstall.

#### 9.1 Architecture: `electron-updater`

Update flow:
```
GitHub Release published (v1.1.0)
     |
     v
App checks GitHub on startup (silent, background)
     |
     v
Update available? -> Show slim banner (non-blocking)
     |
  [Update Now]      [Remind Me Later]
     |                   |
     v                   v
Download in         Dismiss. Banner
background,         reappears on
show progress       NEXT app launch
     |
     v
"Restart to apply" prompt
```

#### 9.2 Update Check Triggers

| Trigger | Behavior |
|---|---|
| **App launch** | Always check silently in background. |
| **Help > Check for Updates** | Manual check; shows "Up to date" or update banner. |
| **"Remind Me Later"** | Snooze until next app launch. Never snooze indefinitely. |

#### 9.3 Update Banner UI

Slim banner below the top bar (not a blocking modal):
```
[ ⬆  DNews v1.1.0 is available — What's New ]  [Update Now]  [Later]
```
- "What's New" = open GitHub Release notes in default browser.
- "Update Now" = download in background with progress bar.
- After download: `[Restart to Apply]`.
- "Later" = dismiss until next launch (then reappears automatically).

#### 9.4 GitHub Release Workflow (How to Ship an Update)

1. Update root `package.json` → `"version": "1.1.0"`.
2. Run `npm run package:win` → produces `release/DNews-Setup-1.1.0.exe` and `latest.yml`.
3. Push a GitHub Release tagged `v1.1.0` with:
   - `DNews-Setup-1.1.0.exe` attached.
   - `latest.yml` attached (required by `electron-updater`).
   - Release notes written in the body.
4. Existing installations will detect the new release on next app launch.

---

### Category 10: Windows NSIS Installer

**Objective**: Produce a standard Windows installer experience with no admin rights required.

#### 10.1 Installer Behavior

- **Install location**: `%LOCALAPPDATA%\Programs\DNews\` (no UAC admin prompt)
- **Start Menu entry**: `DNews` shortcut
- **Desktop shortcut**: with custom bat icon
- **Taskbar pin**: user can right-click to pin after launch
- **Uninstall**: appears in Windows Settings > Apps > Installed Apps as `"DNews"`. Uninstaller removes app files. User data at `%APPDATA%\DNews\` is preserved by default (checkbox: "Also delete my news history and settings").

#### 10.2 Build Commands

```bash
# In root package.json:
"package:win": "npm run build && electron-builder --win --x64",
"package:win:portable": "electron-builder --win portable --x64"
```

#### 10.3 Output

- `release/DNews-Setup-1.0.0.exe` — Installer
- `release/DNews-1.0.0-portable.exe` — Portable (optional)

---

### Category 11: In-App Secrets Manager

**Objective**: Users set AI provider API keys through the DNews settings UI. No editing of text files required. `.env` remains for development only.

#### 11.1 Key Storage

- **Development**: keys read from `.env` as today (unchanged).
- **Production (Electron)**: keys stored in `%APPDATA%\DNews\user.env`. Electron main reads this file at startup and sets `process.env` variables before spawning the backend. Backend reads `process.env` as today — zero backend logic change.

#### 11.2 UI: Settings > AI & Quota > API Keys

```
API Provider Keys
─────────────────────────────────────────────────────
Gemini API Key    [••••••••••••••••] [Show] [Test] [Save]
Groq API Key      [••••••••••••••••] [Show] [Test] [Save]
Mistral API Key   [••••••••••••••••] [Show] [Test] [Save]
Cerebras API Key  [••••••••••••••••] [Show] [Test] [Save]
─────────────────────────────────────────────────────
  [Get Gemini Key ↗]  [Get Groq Key ↗]  ...
```

- "Test" button: sends a minimal request, shows "✓ Valid" or "✗ Invalid / Quota exceeded".
- Keys are displayed masked. "Show" toggles visibility.
- Written to `%APPDATA%\DNews\user.env` on Save.
- Never logged, never sent anywhere except the specific AI provider endpoint.

---

## 4. New Packages Required

| Package | Version (approx) | License | Reason | Category |
|---|---|---|---|---|
| `electron` | `^32.0.0` | MIT | Desktop shell | 6 |
| `electron-builder` | `^25.0.0` | MIT | NSIS packaging | 10 |
| `electron-updater` | `^6.0.0` | MIT | Auto-update from GitHub Releases | 9 |
| `@electron/rebuild` | `^3.0.0` | MIT | Rebuild native C++ modules for Electron ABI | 6 |

**Zero new packages for Categories 1–5.** Connectivity watching uses Node.js `dns` built-in. Text normalization uses existing pipeline + prompt extension.

---

## 5. Execution Order & Approval Gates

```
Cat 1:  Secrets Scrub & .gitignore    -> STOP -> Approval
Cat 2:  Data Dir Isolation            -> STOP -> Approval
Cat 3:  Expanded News Sources         -> STOP -> Approval (verify 10+ sample feeds)
Cat 4:  AI Normalization Pipeline     -> STOP -> Approval (see before/after examples)
Cat 5:  Offline Connectivity Watchdog -> STOP -> Approval (test: unplug/replug network)
Cat 6:  Electron Shell & Icon         -> STOP -> Approval (screenshots, window opens)
Cat 7:  System Tray & Notifications   -> STOP -> Approval (screenshots)
Cat 8:  Single-Instance & Shutdown    -> STOP -> Approval (test log output)
Cat 9:  Auto-Update System            -> STOP -> Approval (mock update test)
Cat 10: NSIS Installer Build          -> STOP -> Approval (run installer, verify Start Menu)
Cat 11: In-App Secrets Manager        -> STOP -> Approval (screenshots, save & reload test)
```

---

## 6. What Will NOT Be Done

- No macOS `.dmg` or Linux `.AppImage` packaging.
- No scraping behind paywalls (NYT, WSJ direct articles).
- No new AI providers beyond the existing 4-provider chain.
- No changes to the existing broadsheet UI design system or PRD D theme system.
- No PRD D work (Categories 7–11 of PRD D are paused until PRD E is approved).

---

## 7. Open Questions (Require User Answers Before Execution)

| # | Question |
|---|---|
| **Q1** | What is your GitHub username? (needed for `electron-builder.json` auto-update URL — will NOT be committed with your real username until you give the go-ahead) |
| **Q2** | Start Menu name: **"DNews"** or **"The Daily Bugle"**? |
| **Q3** | Icon background: dark `#1A1208` (Bat on dark) or cream `#FAF7F0` (Bat on paper)? |
| **Q4** | Should the app auto-start on Windows login? (adds a Windows Startup registry entry during install) |
| **Q5** | Should "Close window" minimize to tray by default, or quit the app? (can be changed in Settings later but we need a default) |
