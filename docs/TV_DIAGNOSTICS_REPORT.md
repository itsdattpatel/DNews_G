# TV Broadcast Channels — Step 5A Diagnostic Audit Report

*Generated: 2026-11-03 · Total Catalog Channels Audited: 29*

## 1. Summary of Diagnostics

- **Total Channels Audited**: 29
- **Pass (Playable via HLS Proxy or YouTube)**: 2
- **Fail (Unplayable / Dead / Mock / Blocked)**: 27
- **Passing Channels**: NDTV 24x7, Sky News Australia

## 2. Detailed Diagnostic Matrix

| # | Channel Name | Country | Method Tested | Result | HTTP | Failure Reason | Proxy / Probe Log Snippet |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| 1 | **Wild Earth Safari** | ZA | HLS Proxy | **`FAIL`** | 200 | Mock URL (example.com placeholder - invalid M3U8) | Upstream returns RFC 2606 example HTML domain instead of M3U8 |
| 2 | **ABC News Australia** | Australia | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: Upstream returned HTTP 403: Forbidden <br>**YT**: oEmbed returned 404 Not Found |
| 3 | **ABC News Live** | USA | HLS Proxy + YouTube | **`FAIL`** | 404 | **HLS**: 404 Not Found (Stream endpoint offline or URL expired) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 404: Upstream returned HTTP 404: Not Found <br>**YT**: oEmbed returned 404 Not Found |
| 4 | **CGTN** | China | HLS Proxy + YouTube | **`FAIL`** | 200 | **HLS**: Media chunk / Child playlist failed with HTTP 403 <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Variant/chunk returned 403: {"error":"SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOU <br>**YT**: oEmbed returned 404 Not Found |
| 5 | **NDTV 24x7** | India | HLS Proxy | `PASS` | 200 | None (Playback Verified) | Master -> Variant -> Chunk verified (453 KB) |
| 6 | **NHK World-Japan** | Japan | HLS Proxy + YouTube | **`FAIL`** | 404 | **HLS**: 404 Not Found (Stream endpoint offline or URL expired) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 404: Upstream returned HTTP 404: Not Found <br>**YT**: oEmbed returned 404 Not Found |
| 7 | **ANN News (TV Asahi)** | Japan | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND ann-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 8 | **CCTV-4 / CCTV News** | China | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND liveplay-cctv.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 9 | **India Today** | India | HLS Proxy + YouTube | **`FAIL`** | 404 | **HLS**: 404 Not Found (Stream endpoint offline or URL expired) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 404: Upstream returned HTTP 404: Not Found <br>**YT**: oEmbed returned 404 Not Found |
| 10 | **NBC News NOW** | USA | HLS Proxy + YouTube | **`FAIL`** | 408 | **HLS**: Proxy network timeout/error (Timed out after 9000ms) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy connection failed: Timed out after 9000ms <br>**YT**: oEmbed returned 404 Not Found |
| 11 | **SBS World News** | Australia | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND sbs-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 12 | **Aaj Tak** | India | HLS Proxy + YouTube | **`FAIL`** | 404 | **HLS**: 404 Not Found (Stream endpoint offline or URL expired) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 404: Upstream returned HTTP 404: Not Found <br>**YT**: oEmbed returned 404 Not Found |
| 13 | **CBS News 24/7** | USA | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: Upstream returned HTTP 403: Forbidden <br>**YT**: oEmbed returned 404 Not Found |
| 14 | **Nippon TV News24** | Japan | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND ntv24-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 15 | **Sky News Australia** | Australia | HLS Proxy | `PASS` | 200 | None (Playback Verified) | Master -> Variant -> Chunk verified (1341 KB) |
| 16 | **Xinhua Live** | China | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND live.xinhua.org <br>**YT**: oEmbed returned 404 Not Found |
| 17 | **9 News** | Australia | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND nine-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 18 | **PBS NewsHour** | USA | HLS Proxy + YouTube | **`FAIL`** | 400 | **HLS**: HTTP 400 Error <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 400: Upstream returned HTTP 400: Bad Request <br>**YT**: oEmbed returned 404 Not Found |
| 19 | **Phoenix InfoNews** | China | HLS Proxy + YouTube | **`FAIL`** | 408 | **HLS**: Proxy network timeout/error (Timed out after 9000ms) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy connection failed: Timed out after 9000ms <br>**YT**: oEmbed returned 404 Not Found |
| 20 | **TBS News DIG** | Japan | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND tbs-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 21 | **WION** | India | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND wionlive.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 22 | **7NEWS** | Australia | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND seven-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 23 | **ABP News** | India | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND abp-i.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 24 | **Bloomberg Television** | USA | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: Upstream returned HTTP 403: Forbidden <br>**YT**: oEmbed returned 404 Not Found |
| 25 | **Dragon TV** | China | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND smg-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 26 | **FNN Live** | Japan | HLS Proxy + YouTube | **`FAIL`** | 403 | **HLS**: 403 Forbidden (Token/Referer/Geo-restricted by CDN) <br>**YT**: 404 Video/Channel Not Found or Live stream ended | **HLS**: Proxy responded 403: SSRF validation blocked request: DNS lookup error: getaddrinfo ENOTFOUND fnn-live.akamaized.net <br>**YT**: oEmbed returned 404 Not Found |
| 27 | **African Waterhole Live** | KE | HLS Proxy | **`FAIL`** | 200 | Mock URL (example.com placeholder - invalid M3U8) | Upstream returns RFC 2606 example HTML domain instead of M3U8 |
| 28 | **Global News 24** | USA | HLS Proxy | **`FAIL`** | 200 | Mock URL (example.com placeholder - invalid M3U8) | Upstream returns RFC 2606 example HTML domain instead of M3U8 |
| 29 | **Offline Feed Test** | UK | HLS Proxy | **`FAIL`** | 200 | Mock URL (example.com placeholder - invalid M3U8) | Upstream returns RFC 2606 example HTML domain instead of M3U8 |

## 3. Root Cause Analysis: Why Channels Were Marked "LIVE"

1. **Shallow HEAD/GET Status Probing in Migration 002/009 / `tv/health.ts`**:
   - The probe function in `backend/src/tv/health.ts` performed only a shallow HTTP request (`method: 'HEAD'`, fallback to `GET` with Range `bytes=0-1000`) and considered any response with `status >= 200 && status < 400` as `isAlive: true`.
   - It never verified whether the returned document was actually a valid HLS playlist starting with `#EXTM3U`, or whether the child streams or media segments could be parsed or fetched.

2. **Mock URLs Returning HTTP 200 OK HTML**:
   - 4 channels (*Wild Earth Safari*, *African Waterhole Live*, *Global News 24*, *Offline Feed Test*) had placeholder URLs pointing to `http://example.com/*.m3u8`.
   - `example.com` is the IANA RFC 2606 reserved domain. Its web server responds with `HTTP 200 OK` returning an HTML page ("Example Domain").
   - Because the HTTP status was 200, the shallow probe set `is_alive = 1`. However, when hls.js attempted to load the manifest in the browser, it encountered HTML instead of `#EXTM3U`, triggering a fatal parse error: *"Stream Signal Offline or Restricted by CORS"*.

3. **Synthetic / Non-Existent CDN Hostnames in Seed Migration 009**:
   - Multiple channels were seeded with synthetic Akamai domain names (e.g., `fnn-live.akamaized.net`, `phoenix-live.akamaized.net`, `seven-live.akamaized.net`, `nine-live.akamaized.net`, `smg-live.akamaized.net`, `skynewsau-live.akamaized.net`, `ntv24-live.akamaized.net`).
   - These hostnames do not exist in public DNS (`getaddrinfo ENOTFOUND`). In `backend/src/tv/proxy.ts`, SSRF validation runs `dns.promises.lookup(hostname)`, which throws `ENOTFOUND`. The proxy catches this and returns `403 Forbidden (SSRF validation blocked request: DNS lookup error)`.

4. **CDN Token & Referer Protection on Upstream HLS Streams**:
   - For valid domains (e.g. `content.uplynk.com`, `abc-iview-mediapackagestreams-2.akamaized.net`, `news.cgtn.com`, `nhkworld.webcdn.stream.ne.jp`), CDNs require session tokens, specific `User-Agent`, `Referer`, or geolocation.
   - The proxy was issuing requests without proper headers or token parameters, receiving `403 Forbidden` or `404 Not Found` from upstream CDNs.

5. **Broken YouTube Channel Live Stream Embeds**:
   - Many YouTube entries were seeded with `https://www.youtube.com/embed/live_stream?channel=<id>` with arbitrary or inactive channel IDs.
   - YouTube oEmbed returns `404 Not Found` for these embed links unless the channel ID is an active verified live stream that permits third-party embedding.
