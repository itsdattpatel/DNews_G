/**
 * backend/src/tv/youtube.ts
 * YouTube Link Parsing, oEmbed Preview, Handle Resolution Protocol & Custom Channel Creation (PRD A Category 6).
 */
import { getDb } from '../db/db';
import { slugify } from './catalog';

export interface YouTubePreviewResult {
  success: boolean;
  type: 'video' | 'channel' | 'handle';
  original_url: string;
  title: string;
  author_name: string;
  author_url?: string;
  thumbnail_url?: string;
  embed_url?: string;
  youtube_video_id?: string;
  youtube_channel_id?: string;
  requires_channel_id?: boolean;
  handle?: string;
  guide?: string;
  error?: string;
}

/**
 * Extracts Video ID, Channel ID, or @handle from user input.
 */
export function parseYouTubeInput(input: string): {
  type: 'video' | 'channel' | 'handle' | 'unknown';
  idOrHandle: string;
  normalizedUrl: string;
} {
  const trimmed = input.trim();

  // 1. Direct handle string: @cnn, @bbcnews
  if (/^@[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return {
      type: 'handle',
      idOrHandle: trimmed,
      normalizedUrl: `https://www.youtube.com/${trimmed}`,
    };
  }

  // 2. URL parsing
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const vid = url.pathname.replace(/^\//, '').split('/')[0];
      if (vid) {
        return {
          type: 'video',
          idOrHandle: vid,
          normalizedUrl: `https://www.youtube.com/watch?v=${vid}`,
        };
      }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      // /watch?v=VIDEO_ID
      const vParam = url.searchParams.get('v');
      if (vParam) {
        return {
          type: 'video',
          idOrHandle: vParam,
          normalizedUrl: `https://www.youtube.com/watch?v=${vParam}`,
        };
      }

      // /live/VIDEO_ID
      if (url.pathname.startsWith('/live/')) {
        const vid = url.pathname.split('/live/')[1]?.split('/')[0];
        if (vid) {
          return {
            type: 'video',
            idOrHandle: vid,
            normalizedUrl: `https://www.youtube.com/watch?v=${vid}`,
          };
        }
      }

      // /embed/VIDEO_ID
      if (url.pathname.startsWith('/embed/')) {
        const vid = url.pathname.split('/embed/')[1]?.split('/')[0];
        if (vid && vid !== 'live_stream') {
          return {
            type: 'video',
            idOrHandle: vid,
            normalizedUrl: `https://www.youtube.com/watch?v=${vid}`,
          };
        }
      }

      // /channel/UC...
      if (url.pathname.startsWith('/channel/')) {
        const cid = url.pathname.split('/channel/')[1]?.split('/')[0];
        if (cid) {
          return {
            type: 'channel',
            idOrHandle: cid,
            normalizedUrl: `https://www.youtube.com/channel/${cid}`,
          };
        }
      }

      // /@handle
      if (url.pathname.startsWith('/@')) {
        const handle = url.pathname.split('/')[1];
        if (handle) {
          return {
            type: 'handle',
            idOrHandle: handle,
            normalizedUrl: `https://www.youtube.com/${handle}`,
          };
        }
      }
    }
  } catch {
    // Not a valid URL
  }

  // Check if raw channel ID starting with UC
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return {
      type: 'channel',
      idOrHandle: trimmed,
      normalizedUrl: `https://www.youtube.com/channel/${trimmed}`,
    };
  }

  return { type: 'unknown', idOrHandle: trimmed, normalizedUrl: trimmed };
}

/**
 * Fetches oEmbed preview metadata and resolves embed URLs or handle instructions.
 */
export async function previewYouTubeSource(input: string): Promise<YouTubePreviewResult> {
  const parsed = parseYouTubeInput(input);

  if (parsed.type === 'unknown') {
    return {
      success: false,
      type: 'unknown',
      original_url: input,
      title: '',
      author_name: '',
      error: 'Please enter a valid YouTube video URL, channel link, or @handle.',
    };
  }

  // Fetch oEmbed metadata from YouTube official endpoint
  let oembedData: any = null;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      parsed.normalizedUrl
    )}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      oembedData = await res.json();
    }
  } catch (err: any) {
    console.warn('[YouTube:oEmbed] Failed to fetch oEmbed:', err.message);
  }

  const title = oembedData?.title || (parsed.type === 'video' ? `YouTube Stream (${parsed.idOrHandle})` : parsed.idOrHandle);
  const authorName = oembedData?.author_name || title;
  const authorUrl = oembedData?.author_url || parsed.normalizedUrl;
  const thumbnailUrl = oembedData?.thumbnail_url || undefined;

  // 1. Direct Video
  if (parsed.type === 'video') {
    return {
      success: true,
      type: 'video',
      original_url: input,
      title,
      author_name: authorName,
      author_url: authorUrl,
      thumbnail_url: thumbnailUrl,
      youtube_video_id: parsed.idOrHandle,
      embed_url: `https://www.youtube-nocookie.com/embed/${parsed.idOrHandle}?autoplay=1&enablejsapi=1`,
    };
  }

  // 2. Direct Channel ID
  if (parsed.type === 'channel') {
    return {
      success: true,
      type: 'channel',
      original_url: input,
      title,
      author_name: authorName,
      author_url: authorUrl,
      thumbnail_url: thumbnailUrl,
      youtube_channel_id: parsed.idOrHandle,
      embed_url: `https://www.youtube-nocookie.com/embed/live_stream?channel=${parsed.idOrHandle}&autoplay=1&enablejsapi=1`,
    };
  }

  // 3. @Handle protocol (PRD A §6.2)
  const apiKey = process.env['YOUTUBE_API_KEY'];
  if (apiKey) {
    try {
      const cleanHandle = parsed.idOrHandle.replace(/^@/, '');
      const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(
        cleanHandle
      )}&key=${apiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const item = apiData.items?.[0];
        if (item?.id) {
          const resolvedChannelId = item.id;
          const resolvedTitle = item.snippet?.title || title;
          const resolvedThumb = item.snippet?.thumbnails?.medium?.url || thumbnailUrl;

          return {
            success: true,
            type: 'handle',
            original_url: input,
            title: resolvedTitle,
            author_name: resolvedTitle,
            author_url: `https://www.youtube.com/${parsed.idOrHandle}`,
            thumbnail_url: resolvedThumb,
            youtube_channel_id: resolvedChannelId,
            handle: parsed.idOrHandle,
            embed_url: `https://www.youtube-nocookie.com/embed/live_stream?channel=${resolvedChannelId}&autoplay=1&enablejsapi=1`,
          };
        }
      }
    } catch (err: any) {
      console.warn('[YouTube:API] Failed to resolve handle via YouTube Data API:', err.message);
    }
  }

  // Default No-API-Key Protocol: Prompt for Channel ID with instructions
  return {
    success: true,
    type: 'handle',
    original_url: input,
    title,
    author_name: authorName,
    author_url: authorUrl,
    thumbnail_url: thumbnailUrl,
    handle: parsed.idOrHandle,
    requires_channel_id: true,
    guide:
      "To embed a live stream for this handle: 1. Visit the YouTube channel in your browser. 2. Right-click anywhere and select 'View Page Source'. 3. Search (Ctrl+F) for 'channelId' or 'browse_id'. 4. Copy the 24-character ID starting with 'UC' and paste it below.",
  };
}

export interface CreateCustomChannelInput {
  name: string;
  country?: string;
  country_code?: string;
  category?: string;
  stream_url?: string;
  youtube_live_url?: string;
  youtube_channel_id?: string;
  youtube_video_id?: string;
  website?: string;
  logo_url?: string;
  evidence?: string;
}

/**
 * Creates a verified custom channel in SQLite tv_channels table.
 */
export function createCustomChannel(input: CreateCustomChannelInput): any {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Channel name is required');
  }

  if (!input.stream_url && !input.youtube_live_url && !input.youtube_channel_id && !input.youtube_video_id) {
    throw new Error('Either a stream URL or YouTube embed/channel URL must be provided');
  }

  const db = getDb();
  const slug = `custom_${slugify(input.name)}_${Date.now().toString(36)}`;
  const country = input.country || 'Global';
  const countryCode = input.country_code || (country === 'India' ? 'IN' : country === 'USA' ? 'US' : 'GLOBAL');
  const category = input.category || 'News';

  let ytLiveUrl = input.youtube_live_url;
  if (!ytLiveUrl) {
    if (input.youtube_channel_id) {
      ytLiveUrl = `https://www.youtube-nocookie.com/embed/live_stream?channel=${input.youtube_channel_id}&autoplay=1&enablejsapi=1`;
    } else if (input.youtube_video_id) {
      ytLiveUrl = `https://www.youtube-nocookie.com/embed/${input.youtube_video_id}?autoplay=1&enablejsapi=1`;
    }
  }

  const streamUrl = input.stream_url || ytLiveUrl || '';

  const stmt = db.prepare(`
    INSERT INTO tv_channels (
      name, slug, country, country_code, category,
      stream_url, youtube_live_url, youtube_channel_id, website,
      logo_url, is_top5, rank, status, evidence, is_alive, last_checked_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 0, NULL, 'verified', ?, 1, datetime('now')
    )
  `);

  const info = stmt.run(
    input.name.trim(),
    slug,
    country,
    countryCode,
    category,
    streamUrl,
    ytLiveUrl || null,
    input.youtube_channel_id || null,
    input.website || null,
    input.logo_url || null,
    input.evidence || 'User custom added stream verified via YouTube embed or HLS.'
  );

  return db.prepare('SELECT * FROM tv_channels WHERE id = ?').get(info.lastInsertRowid);
}

