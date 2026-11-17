import { describe, it, expect } from 'vitest';
import { getYouTubeEmbedUrl } from '../../components/tv/TVView';

describe('YouTube Embed URL Normalizer (PRD C Category 6)', () => {
  it('converts standard watch?v= URL to youtube-nocookie embed URL with autoplay & enablejsapi', () => {
    const input = 'https://www.youtube.com/watch?v=ydYDqZQpim8';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('converts short youtu.be/ URL to embed URL', () => {
    const input = 'https://youtu.be/ydYDqZQpim8';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('converts /live/VIDEO_ID URL to embed URL', () => {
    const input = 'https://www.youtube.com/live/ydYDqZQpim8';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('appends autoplay & enablejsapi parameters if already an embed URL', () => {
    const input = 'https://www.youtube.com/embed/ydYDqZQpim8';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('converts raw 11-char video ID to embed URL', () => {
    const input = 'ydYDqZQpim8';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('extracts URL from <iframe> embed snippet', () => {
    const snippet = '<iframe width="560" height="315" src="https://www.youtube.com/watch?v=ydYDqZQpim8" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
    const output = getYouTubeEmbedUrl(snippet);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/ydYDqZQpim8?autoplay=1&mute=1&enablejsapi=1');
  });

  it('handles /embed/live_stream with channel ID', () => {
    const input = 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCt4t-jeY85JegMlZ-E5UWtA';
    const output = getYouTubeEmbedUrl(input);
    expect(output).toBe('https://www.youtube-nocookie.com/embed/live_stream?channel=UCt4t-jeY85JegMlZ-E5UWtA&autoplay=1&mute=1&enablejsapi=1');
  });

  it('handles null and empty input safely', () => {
    expect(getYouTubeEmbedUrl(null)).toBe('');
    expect(getYouTubeEmbedUrl('')).toBe('');
    expect(getYouTubeEmbedUrl(undefined)).toBe('');
  });
});

