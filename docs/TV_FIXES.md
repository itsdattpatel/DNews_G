# TV Diagnostics & Playback Remediation Specification — PRD C
*Version 1.0 · 2026-11-03 · AI World News Desk*

---

## 1. Problem Analysis & Observed Symptoms

During audit of the TV Broadcast Wire (`Screen h` / `TVView.tsx`), multiple functional and visual issues were identified:
1. **Geometry Distortion**: The video viewport rendered as a narrow horizontal strip rather than maintaining a standard 16:9 widescreen aspect ratio. Stray visual artifacts (such as clipped red container borders) appeared along the upper boundary.
2. **Channel Directory Clipping**: The channel list on the right pane did not expand properly; outlet names were clipped mid-word, and the footer overlapped the bottom-most channel cards.
3. **Playback Failures**: Stream playback failed across the majority of catalog feeds. For instance, *WildEarth Safari* displayed `Stream Signal Offline or Restricted by CORS` despite the presence of the `[HLS PROXY]` badge.
4. **Duplicate Quick Switcher Labels**: Two separate buttons labeled `ABC` appeared in the horizontal quick switcher due to single-word splitting of "ABC News (USA)" and "ABC News (Australia)".
5. **False "LIVE" Status**: 28 channels were marked with the green `LIVE` badge in the database and UI, despite being unplayable via browser HLS or proxy.

---

## 2. Root Cause Analysis (Why Channels Were Marked LIVE)

The discrepancy between the `LIVE` badge and real playability stems from how the health probe was implemented in PRD A:
1. **Shallow HTTP HEAD/GET Probing**: The backend probe (`checkStreamHealth` in `tvService.ts`) performed a shallow HTTP status check (`res.status >= 200 && res.status < 400`) on the top-level URL.
2. **Master Manifest vs. Media Availability**: In HLS streaming, a top-level master playlist (`.m3u8`) often returns `200 OK` even when:
   - The stream has concluded or is temporarily offline.
   - Child variant streams (`chunklist.m3u8`) fail with `404` or `403`.
   - Media transport stream segments (`.ts` or `.m4s`) are geo-blocked, token-expired, or protected by CORS.
3. **Proxy Header Mismatches**: Upstream Content Delivery Networks (Akamai, Cloudflare, Fastly) frequently reject HLS segment requests if standard browser headers (`User-Agent`, `Referer`, `Origin`) are stripped by the proxy.
4. **Conclusion**: A channel cannot be classified as `LIVE` based merely on an HTTP 200 on the master URL. Playability requires validating child playlists and media segment decodability.

---

## 3. Step 5A: Diagnostic Protocol & Audit Plan

Before implementing code changes, a comprehensive playback diagnostic will be executed across all 28 catalog channels.

### 3.1 Automated Probe Matrix
A diagnostic test script will probe each channel via both HLS Proxy and direct YouTube embed:
1. **Step 1: Direct Master Manifest Fetch**:
   - Issue HTTP GET to the raw `stream_url`.
   - Record response status code, content type, latency, and redirect chain.
2. **Step 2: Proxy Rewriting & Segment Verification**:
   - Route through `/api/tv/proxy?url=<encoded>`.
   - Parse child stream variants (`#EXT-X-STREAM-INF`).
   - Download the first media chunk (`.ts` / `.m4s` / initialization segment `EXT-X-MAP`).
   - Verify byte size > 1KB and valid media container header (e.g. Sync byte `0x47` for MPEG-TS).
3. **Step 3: YouTube Live Availability Check**:
   - If `youtube_live_url` exists, query YouTube oEmbed API (`https://www.youtube.com/oembed?url=...`).
   - Check if video ID represents an active live stream.

### 3.2 Diagnostic Output Format
Results will be compiled into an audit table:

| Channel Name | Country | Method | Result | HTTP Status | Failure Reason | Proxy Log Snippet |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **ABC News Live** | USA | HLS Proxy | `PASS` | 200 OK | — | Chunk 0: 420 KB received |
| **WildEarth Safari** | Animals | HLS Proxy | `FAIL` | 403 Forbidden | CORS / Upstream Token | Referer origin mismatch |
| **NHK World-Japan** | Japan | HLS Proxy | `PASS` | 200 OK | — | Variant parsed successfully |
| **NDTV 24x7** | India | YouTube | `PASS` | 200 OK | — | oEmbed verified valid |

*Step 5A findings will be presented to the user for formal approval prior to initiating Step 5B.*

---

## 4. Step 5B: TV Playback & Layout Remediation

### 4.1 "Health Truth" Playability Criteria
A channel will strictly qualify for the **LIVE** subpage only if:
1. The master playlist returns `200 OK` with valid `#EXTM3U` header.
2. At least one child playlist can be parsed.
3. At least one valid media segment is retrieved via the proxy with status `200` and byte length > 1,024 bytes.
4. For YouTube feeds: the oEmbed endpoint verifies embeddability and the stream is actively broadcasting live.

Feeds failing these criteria will be automatically routed to **FAULTY FEEDS** (if transient) or **STOPPED LINKS** (if permanently dead).

### 4.2 HLS Proxy Hardening (`backend/src/tv/proxy.ts`)
The proxy will be updated to address CORS, redirects, and relative URLs:
- **Header Forwarding**: Whitelist and forward essential client headers (`User-Agent`, `Referer`, `Range`, `Accept-Language`) while omitting internal proxy signatures.
- **Recursive URL Rewriting**:
  - Support both relative (`segment01.ts`) and root-relative (`/live/segment01.ts`) paths by resolving against the origin base URL.
  - Rewrite `#EXT-X-KEY:URI="..."` encryption keys.
  - Rewrite `#EXT-X-MAP:URI="..."` media initialization headers.
- **Redirect Resolution**: Follow HTTP 301/302/307 redirects transparently up to 5 hops, updating the base URI for subsequent segment resolution.
- **CORS Headers**: Set permissive CORS headers on proxy responses (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Range, Content-Type`).
- **SSRF Defenses**: Retain strict validation blocking loopback (`127.0.0.1`, `localhost`), link-local (`169.254.0.0/16`), and private RFC 1918 subnets.

### 4.3 Broadsheet 16:9 Layout & Player Geometry
- **Aspect Ratio**: The monitor container enforces `aspect-ratio: 16 / 9; max-height: calc(100vh - 280px);`.
- **Resizable Split**: TV player and Channel Directory utilize `react-resizable-panels` with horizontal dragging.
- **Directory Height**: Channels list is enclosed in a flex column (`flex-1 min-h-0 overflow-y-auto`) ensuring the list scrolls smoothly without being obscured by the modal footer.
- **Card Wrapping**: Channel titles support two-line wrapping with CSS `line-clamp-2` and full title tooltips on hover.

### 4.4 Quick Switcher Disambiguation
- Button labels in the quick horizontal switcher format strictly as:
  $$\text{Label} = \text{Channel Name} + \text{ " ("} + \text{Country} + \text{")"}$$
  *Example*: `ABC News (USA)` and `ABC News (Australia)`.
- Restrict to a horizontally scrollable container with smooth arrows and two-finger swipe.

### 4.5 Audio Control & Mute Persistence
- Dedicated speaker button (`Volume2` / `VolumeX`) placed adjacent to the volume slider.
- Global keyboard shortcut: pressing `m` toggles audio mute state.
- **Autoplay Compliance**: Video begins muted with a noticeable, broadsheet-styled overlay prompt:
  `[ 🔇 Click here or press 'm' to unmute broadcast audio ]`.
- Remembers user's preferred volume (0.0 to 1.0) and mute state in localStorage.

### 4.6 Comprehensive Error Actions Panel
When an active stream fails, the player displays actionable broadsheet options:
1. **Try YouTube Live**: Switched automatically if a verified YouTube live link is available.
2. **Open in VLC**: Launches stream via custom `vlc://` protocol or copies VLC command line.
3. **Next Channel**: Advances immediately to the next verified live broadcast in the shelf.
4. **Retry Signal**: Clears buffer and initiates an immediate re-probe of the proxy.
5. **Report Dead Link**: Marks feed as reported, demoting it to FAULTY FEEDS in the database.

---

## 5. Category 6: YouTube Live Embeds for Top Channels

### 5.1 Starter Outlets Coverage
We target the Top 5 broadcast outlets for key geographic regions:
- **India**: NDTV 24x7, India Today, Republic World, DD News, WION.
- **USA**: ABC News Live, NBC News NOW, CBS News 24/7, LiveNOW from FOX, Bloomberg TV.
- **China**: CGTN English, CCTV-4, Phoenix TV, CGTN Documentary, Xinhua News.
- **Japan**: NHK World-Japan, TBS News Dig, ANN News (TV Asahi), FNN News, Nippon TV News 24.
- **Australia**: ABC News Australia, Sky News Australia, SBS World News, 7NEWS Australia, 9News.
- **Nature / Wildlife**: Explore.org African Wildlife, Monterey Bay Aquarium Cams, Cornell Lab Bird Cams, WildEarth Safari.

### 5.2 Verification Standard
1. Channels must possess verified YouTube handles (`@channelname`) or official Channel IDs (`UC...`) linked from their canonical `.gov`, `.org`, or official news websites.
2. Use current YouTube IFrame API live stream embed format:
   `https://www.youtube-nocookie.com/embed/live_stream?channel=CHANNEL_ID`
   or direct video embed URLs retrieved via official oEmbed verification.
3. Save structured metadata in `/config/channels-top5.json`:
```json
{
  "channel_id": "UCxxxxxx",
  "name": "ABC News Live",
  "country": "USA",
  "youtube_live_url": "https://www.youtube-nocookie.com/embed/live_stream?channel=UCxxxxxx",
  "source_url": "https://abcnews.go.com/live",
  "verified_on": "2026-11-03",
  "status": "verified-playing"
}
```
4. If a broadcaster disables embedding or is not live, record status as `embedding-disabled` or `not-live` with fallback to official web stream and VLC link.

