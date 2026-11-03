const fs = require('fs');

const content = fs.readFileSync('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f/.system_generated/steps/814/output.txt', 'utf8');
const jsonStart = content.indexOf('[\n  {');
const jsonEnd = content.lastIndexOf(']') + 1;
const data = JSON.parse(content.slice(jsonStart, jsonEnd));

let md = `# TV Broadcast Channels — Step 5A Diagnostic Audit Report\n\n`;
md += `*Generated: 2026-11-03 · Total Catalog Channels Audited: ${data.length}*\n\n`;

md += `## 1. Summary of Diagnostics\n\n`;
const passedCount = data.filter(d => d.overallPassed).length;
const failedCount = data.length - passedCount;
md += `- **Total Channels Audited**: ${data.length}\n`;
md += `- **Pass (Playable via HLS Proxy or YouTube)**: ${passedCount}\n`;
md += `- **Fail (Unplayable / Dead / Mock / Blocked)**: ${failedCount}\n`;
md += `- **Passing Channels**: ${data.filter(d => d.overallPassed).map(d => d.channel.name).join(', ') || 'None'}\n\n`;

md += `## 2. Detailed Diagnostic Matrix\n\n`;
md += `| # | Channel Name | Country | Method Tested | Result | HTTP | Failure Reason | Proxy / Probe Log Snippet |\n`;
md += `| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- |\n`;

data.forEach((item, idx) => {
  const ch = item.channel;
  const hls = item.hls;
  const yt = item.youtube;
  const passed = item.overallPassed;

  let method = 'HLS Proxy';
  let httpStatus = hls.httpStatus || '—';
  let reason = hls.failureReason;
  let log = (hls.logSnippet || '').replace(/\|/g, '/');

  if (passed) {
    if (yt && yt.passed && (!hls || !hls.passed)) {
      method = 'YouTube Live';
      httpStatus = yt.httpStatus || 200;
      reason = yt.failureReason;
      log = (yt.logSnippet || '').replace(/\|/g, '/');
    } else {
      method = 'HLS Proxy';
      httpStatus = hls.httpStatus || 200;
      reason = hls.failureReason;
      log = (hls.logSnippet || '').replace(/\|/g, '/');
    }
  } else {
    if (yt) {
      method = 'HLS Proxy + YouTube';
      reason = `**HLS**: ${hls.failureReason} <br>**YT**: ${yt.failureReason}`;
      log = `**HLS**: ${(hls.logSnippet || '')} <br>**YT**: ${(yt.logSnippet || '')}`.replace(/\|/g, '/');
    }
  }

  const resultBadge = passed ? '`PASS`' : '**`FAIL`**';
  md += `| ${idx + 1} | **${ch.name}** | ${ch.country || 'Global'} | ${method} | ${resultBadge} | ${httpStatus} | ${reason} | ${log} |\n`;
});

md += `\n## 3. Root Cause Analysis: Why Channels Were Marked "LIVE"\n\n`;
md += `1. **Shallow HEAD/GET Status Probing in Migration 002/009 / \`tv/health.ts\`**:\n`;
md += `   - The probe function in \`backend/src/tv/health.ts\` performed only a shallow HTTP request (\`method: 'HEAD'\`, fallback to \`GET\` with Range \`bytes=0-1000\`) and considered any response with \`status >= 200 && status < 400\` as \`isAlive: true\`.\n`;
md += `   - It never verified whether the returned document was actually a valid HLS playlist starting with \`#EXTM3U\`, or whether the child streams or media segments could be parsed or fetched.\n\n`;
md += `2. **Mock URLs Returning HTTP 200 OK HTML**:\n`;
md += `   - 4 channels (*Wild Earth Safari*, *African Waterhole Live*, *Global News 24*, *Offline Feed Test*) had placeholder URLs pointing to \`http://example.com/*.m3u8\`.\n`;
md += `   - \`example.com\` is the IANA RFC 2606 reserved domain. Its web server responds with \`HTTP 200 OK\` returning an HTML page ("Example Domain").\n`;
md += `   - Because the HTTP status was 200, the shallow probe set \`is_alive = 1\`. However, when hls.js attempted to load the manifest in the browser, it encountered HTML instead of \`#EXTM3U\`, triggering a fatal parse error: *"Stream Signal Offline or Restricted by CORS"*.\n\n`;
md += `3. **Synthetic / Non-Existent CDN Hostnames in Seed Migration 009**:\n`;
md += `   - Multiple channels were seeded with synthetic Akamai domain names (e.g., \`fnn-live.akamaized.net\`, \`phoenix-live.akamaized.net\`, \`seven-live.akamaized.net\`, \`nine-live.akamaized.net\`, \`smg-live.akamaized.net\`, \`skynewsau-live.akamaized.net\`, \`ntv24-live.akamaized.net\`).\n`;
md += `   - These hostnames do not exist in public DNS (\`getaddrinfo ENOTFOUND\`). In \`backend/src/tv/proxy.ts\`, SSRF validation runs \`dns.promises.lookup(hostname)\`, which throws \`ENOTFOUND\`. The proxy catches this and returns \`403 Forbidden (SSRF validation blocked request: DNS lookup error)\`.\n\n`;
md += `4. **CDN Token & Referer Protection on Upstream HLS Streams**:\n`;
md += `   - For valid domains (e.g. \`content.uplynk.com\`, \`abc-iview-mediapackagestreams-2.akamaized.net\`, \`news.cgtn.com\`, \`nhkworld.webcdn.stream.ne.jp\`), CDNs require session tokens, specific \`User-Agent\`, \`Referer\`, or geolocation.\n`;
md += `   - The proxy was issuing requests without proper headers or token parameters, receiving \`403 Forbidden\` or \`404 Not Found\` from upstream CDNs.\n\n`;
md += `5. **Broken YouTube Channel Live Stream Embeds**:\n`;
md += `   - Many YouTube entries were seeded with \`https://www.youtube.com/embed/live_stream?channel=<id>\` with arbitrary or inactive channel IDs.\n`;
md += `   - YouTube oEmbed returns \`404 Not Found\` for these embed links unless the channel ID is an active verified live stream that permits third-party embedding.\n`;

fs.writeFileSync('e:/DNews_G/docs/TV_DIAGNOSTICS_REPORT.md', md);
console.log('Successfully wrote docs/TV_DIAGNOSTICS_REPORT.md');

