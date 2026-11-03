/**
 * scripts/diagnose-tv-channels.cjs
 * Comprehensive diagnostic probe for all 28 TV catalog channels (PRD C Category 5A).
 * Tests both HLS proxy playback path (master manifest -> child stream -> media segment)
 * and YouTube oEmbed embeddability.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BACKEND_BASE = 'http://127.0.0.1:3001';

async function fetchUrl(targetUrl, options = {}) {
  const parsed = new URL(targetUrl);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const timeout = options.timeout || 8000;
    const req = client.request(
      targetUrl,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIWorldNewsDesk/1.0',
          ...(options.headers || {}),
        },
        timeout,
      },
      (res) => {
        const chunks = [];
        let totalBytes = 0;

        res.on('data', (chunk) => {
          chunks.push(chunk);
          totalBytes += chunk.length;
          // Don't download massive files during probe
          if (totalBytes > 2 * 1024 * 1024) {
            req.destroy();
          }
        });

        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers,
            body: bodyBuffer.toString('utf8'),
            rawBuffer: bodyBuffer,
            error: null,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 408,
        statusText: 'Request Timeout',
        headers: {},
        body: '',
        rawBuffer: Buffer.alloc(0),
        error: `Timed out after ${timeout}ms`,
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: '',
        rawBuffer: Buffer.alloc(0),
        error: err.message,
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function probeHlsChannel(channel) {
  const result = {
    channelId: channel.id,
    name: channel.name,
    country: channel.country || 'Global',
    streamUrl: channel.stream_url,
    method: 'HLS Proxy',
    passed: false,
    httpStatus: 0,
    failureReason: '',
    logSnippet: '',
  };

  if (!channel.stream_url) {
    result.failureReason = 'No stream_url configured';
    result.logSnippet = 'stream_url is null or empty';
    return result;
  }

  // Check if dummy/mock URL
  if (channel.stream_url.includes('example.com')) {
    result.httpStatus = 200;
    result.failureReason = 'Mock URL (example.com placeholder - invalid M3U8)';
    result.logSnippet = 'Upstream returns RFC 2606 example HTML domain instead of M3U8';
    return result;
  }

  // Step 1: Probe via backend proxy
  const proxyUrl = `${BACKEND_BASE}/api/tv/proxy?url=${encodeURIComponent(channel.stream_url)}`;
  const proxyRes = await fetchUrl(proxyUrl, { timeout: 9000 });
  result.httpStatus = proxyRes.status;

  if (proxyRes.error) {
    result.failureReason = `Proxy network timeout/error (${proxyRes.error})`;
    result.logSnippet = `Proxy connection failed: ${proxyRes.error}`;
    return result;
  }

  if (proxyRes.status !== 200) {
    let detail = '';
    try {
      const parsedJson = JSON.parse(proxyRes.body);
      detail = parsedJson.error || proxyRes.body.slice(0, 100);
    } catch {
      detail = proxyRes.body.slice(0, 100);
    }

    if (proxyRes.status === 403) {
      result.failureReason = '403 Forbidden (Token/Referer/Geo-restricted by CDN)';
    } else if (proxyRes.status === 404) {
      result.failureReason = '404 Not Found (Stream endpoint offline or URL expired)';
    } else if (proxyRes.status === 502) {
      result.failureReason = '502 Bad Gateway (Upstream CDN unreachable or rejected proxy)';
    } else {
      result.failureReason = `HTTP ${proxyRes.status} Error`;
    }
    result.logSnippet = `Proxy responded ${proxyRes.status}: ${detail.replace(/\r?\n/g, ' ').slice(0, 120)}`;
    return result;
  }

  const manifest = proxyRes.body;
  if (!manifest.includes('#EXTM3U')) {
    result.failureReason = 'Invalid Manifest (Does not start with #EXTM3U; returned non-HLS content)';
    result.logSnippet = `Body preview: ${manifest.replace(/\r?\n/g, ' ').slice(0, 100)}`;
    return result;
  }

  // Step 2: Parse child playlists or chunks
  const lines = manifest.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let targetChildOrSegment = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
      targetChildOrSegment = lines[i + 1];
      break;
    } else if (!line.startsWith('#') && (line.includes('.m3u8') || line.includes('.ts') || line.includes('.m4s') || line.includes('/api/tv/proxy'))) {
      targetChildOrSegment = line;
      break;
    }
  }

  if (!targetChildOrSegment) {
    result.failureReason = 'Manifest empty or no playable variant / segment found';
    result.logSnippet = `Manifest contains no media entries. Total lines: ${lines.length}`;
    return result;
  }

  // Step 3: Fetch the variant/segment via proxy
  let segmentUrl = targetChildOrSegment;
  if (!segmentUrl.startsWith('http://') && !segmentUrl.startsWith('https://') && !segmentUrl.startsWith('/api/tv/proxy')) {
    try {
      segmentUrl = new URL(segmentUrl, channel.stream_url).toString();
      segmentUrl = `${BACKEND_BASE}/api/tv/proxy?url=${encodeURIComponent(segmentUrl)}`;
    } catch {
      // relative to proxy
      segmentUrl = `${BACKEND_BASE}${segmentUrl.startsWith('/') ? '' : '/'}${segmentUrl}`;
    }
  } else if (segmentUrl.startsWith('/api/tv/proxy')) {
    segmentUrl = `${BACKEND_BASE}${segmentUrl}`;
  }

  const segRes = await fetchUrl(segmentUrl, { timeout: 9000 });
  if (segRes.status !== 200) {
    result.failureReason = `Media chunk / Child playlist failed with HTTP ${segRes.status}`;
    result.logSnippet = `Variant/chunk returned ${segRes.status}: ${segRes.body.slice(0, 80).replace(/\r?\n/g, ' ')}`;
    return result;
  }

  // If this was a sub-playlist, verify child manifest
  if (segRes.body.includes('#EXTM3U')) {
    // Sub-playlist parsed! Try getting one TS/M4S segment from it
    const subLines = segRes.body.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    if (subLines.length > 0) {
      let subChunk = subLines[0];
      if (subChunk.startsWith('/api/tv/proxy')) {
        subChunk = `${BACKEND_BASE}${subChunk}`;
      } else if (!subChunk.startsWith('http')) {
        try {
          const abs = new URL(subChunk, channel.stream_url).toString();
          subChunk = `${BACKEND_BASE}/api/tv/proxy?url=${encodeURIComponent(abs)}`;
        } catch {}
      }
      const chunkRes = await fetchUrl(subChunk, { timeout: 8000 });
      if (chunkRes.status === 200 && chunkRes.rawBuffer.length > 1024) {
        result.passed = true;
        result.failureReason = 'None (Playback Verified)';
        result.logSnippet = `Master -> Variant -> Chunk verified (${Math.round(chunkRes.rawBuffer.length / 1024)} KB)`;
        return result;
      }
    }
    result.passed = true;
    result.failureReason = 'None (Sub-playlist Verified)';
    result.logSnippet = `Child playlist parsed successfully (${segRes.body.length} bytes)`;
    return result;
  }

  // Direct media segment
  if (segRes.rawBuffer.length > 1024) {
    result.passed = true;
    result.failureReason = 'None (Playback Verified)';
    result.logSnippet = `First media chunk retrieved successfully (${Math.round(segRes.rawBuffer.length / 1024)} KB)`;
  } else {
    result.failureReason = 'Segment too small or zero byte payload';
    result.logSnippet = `Received only ${segRes.rawBuffer.length} bytes`;
  }

  return result;
}

async function probeYouTubeChannel(channel) {
  const result = {
    channelId: channel.id,
    name: channel.name,
    country: channel.country || 'Global',
    youtubeUrl: channel.youtube_live_url,
    method: 'YouTube Live',
    passed: false,
    httpStatus: 0,
    failureReason: '',
    logSnippet: '',
  };

  if (!channel.youtube_live_url) {
    result.failureReason = 'No YouTube live URL';
    result.logSnippet = 'youtube_live_url is null';
    return result;
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(channel.youtube_live_url)}&format=json`;
  const oembedRes = await fetchUrl(oembedUrl, { timeout: 8000 });
  result.httpStatus = oembedRes.status;

  if (oembedRes.status === 200) {
    try {
      const data = JSON.parse(oembedRes.body);
      result.passed = true;
      result.failureReason = 'None (oEmbed Verified)';
      result.logSnippet = `Title: "${data.title?.slice(0, 40)}" | Author: ${data.author_name}`;
    } catch {
      result.failureReason = 'oEmbed returned 200 but invalid JSON';
      result.logSnippet = oembedRes.body.slice(0, 80);
    }
  } else if (oembedRes.status === 401 || oembedRes.status === 403) {
    result.failureReason = 'Embedding disabled by broadcaster or restricted';
    result.logSnippet = `oEmbed rejected with ${oembedRes.status}`;
  } else if (oembedRes.status === 404) {
    result.failureReason = '404 Video/Channel Not Found or Live stream ended';
    result.logSnippet = `oEmbed returned 404 Not Found`;
  } else {
    result.failureReason = `oEmbed error HTTP ${oembedRes.status}`;
    result.logSnippet = oembedRes.error || oembedRes.body.slice(0, 80);
  }

  return result;
}

async function runDiagnostics() {
  console.log('Fetching channels from backend...');
  const res = await fetchUrl(`${BACKEND_BASE}/api/tv/channels?include_dead=1`);
  if (res.status !== 200) {
    console.error('Failed to fetch channels from backend:', res.status, res.body);
    process.exit(1);
  }

  const json = JSON.parse(res.body);
  const channels = json.items || [];
  console.log(`Auditing ${channels.length} catalog channels...\n`);

  const results = [];

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    process.stdout.write(`[${i + 1}/${channels.length}] Probing "${ch.name}" (${ch.country})... `);

    // 1. Test HLS proxy path
    const hlsResult = await probeHlsChannel(ch);

    // 2. Test YouTube embed path if URL present
    let ytResult = null;
    if (ch.youtube_live_url) {
      ytResult = await probeYouTubeChannel(ch);
    }

    const overallPassed = hlsResult.passed || (ytResult && ytResult.passed);
    console.log(overallPassed ? 'PASS' : 'FAIL');

    results.push({
      channel: ch,
      hls: hlsResult,
      youtube: ytResult,
      overallPassed,
    });
  }

  console.log('\n===============================================================');
  console.log('DIAGNOSTIC AUDIT RESULTS FOR ALL 28 TV CHANNELS');
  console.log('===============================================================\n');

  console.log(JSON.stringify(results, null, 2));
}

runDiagnostics().catch(console.error);

