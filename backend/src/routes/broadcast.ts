/**
 * backend/src/routes/broadcast.ts
 * Phase G: Broadcast, Audio & Media Synthesis (Features 21-28)
 */
import { Router, Request, Response } from 'express';
import { getDb } from '../db/db';

const router = Router();

// 1. Feature #21: Two-Host Radio Podcast Mode ("The Newsroom Dispatch")
router.post('/podcast-dialogue', (req: Request, res: Response): void => {
  try {
    const { articleId, title, summary } = req.body;
    const db = getDb();

    let resolvedTitle = title;
    let resolvedSummary = summary;

    if (articleId && (!resolvedTitle || !resolvedSummary)) {
      const art = db.prepare('SELECT title_english, summary, body_english FROM articles WHERE id = ?').get(articleId) as any;
      if (art) {
        resolvedTitle = resolvedTitle || art.title_english;
        resolvedSummary = resolvedSummary || art.summary || art.body_english?.slice(0, 300);
      }
    }

    const t = resolvedTitle || 'Global Newsroom Cable';
    const s = resolvedSummary || 'Wire dispatches indicate major international developments across diplomatic and economic sectors.';

    const dialogue = [
      {
        speaker: 'anchor',
        name: 'Julian Vance (Anchor)',
        text: `Welcome back to The Newsroom Dispatch. Julian Vance here with our chief investigative editor, Evelyn Reed. Evelyn, today's lead broadsheet cable focuses on "${t}". What is the core development our listeners need to understand?`,
        voiceHint: 'Baritone, deliberate 1930s newsreel pacing',
      },
      {
        speaker: 'reporter',
        name: 'Evelyn Reed (Investigative Editor)',
        text: `Julian, beneath the surface wire copy, here is what is actually transpiring: ${s.slice(0, 200)}. The key shift here isn't merely the public statement, but the underlying institutional pressure forcing this timeline forward.`,
        voiceHint: 'Crisp, rapid investigative cadence',
      },
      {
        speaker: 'anchor',
        name: 'Julian Vance (Anchor)',
        text: `And that explains the sudden urgency we saw overnight. But how are international markets and foreign ministries reacting to this dispatch?`,
        voiceHint: 'Inquisitive, measured',
      },
      {
        speaker: 'reporter',
        name: 'Evelyn Reed (Investigative Editor)',
        text: `Initial wire telemetry shows immediate repositioning across allied trading desks. Observers caution that secondary retaliatory measures could follow within seventy-two hours if diplomatic backchannels fail to produce a binding covenant.`,
        voiceHint: 'Analytical, authoritative',
      },
      {
        speaker: 'anchor',
        name: 'Julian Vance (Anchor)',
        text: `Compelling reporting as always, Evelyn. We will continue monitoring the cables as new dispatches arrive on the newsroom telegraph.`,
        voiceHint: 'Sign-off tone, warm broadsheet timbre',
      },
    ];

    res.json({
      articleId: articleId || null,
      episodeTitle: `The Newsroom Dispatch: ${t.slice(0, 60)}`,
      estimatedDurationSeconds: 120,
      dialogue,
      hostA: { name: 'Julian Vance', role: 'Anchor', persona: '1930s Broadsheet Anchor' },
      hostB: { name: 'Evelyn Reed', role: 'Investigative Editor', persona: 'Chief Foreign Correspondent' },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to synthesize podcast dialogue: ' + err.message });
  }
});

// 2. Feature #22: Whisper Local Offline Speech-to-Text for TV News
router.get('/tv-subtitles/:channelId', (req: Request, res: Response): void => {
  try {
    const channelId = parseInt(req.params.channelId, 10);
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM tv_transcripts 
      WHERE channel_id = ? 
      ORDER BY timestamp_utc DESC 
      LIMIT 10
    `).all(channelId) as any[];

    if (rows.length === 0) {
      // Return synthetic real-time Whisper stream buffer
      const syntheticBuffer = [
        {
          id: 991,
          channel_id: channelId,
          segment_title: 'Live News Broadcast',
          text_content: '...delegates in Geneva have just concluded their closed-door morning plenary. Key announcements are anticipated shortly...',
          speaker_label: 'Anchor',
          timestamp_utc: new Date().toISOString(),
        },
        {
          id: 992,
          channel_id: channelId,
          segment_title: 'Live News Broadcast',
          text_content: '...maritime transport volumes through the strait remain on high watch amid localized naval patrols...',
          speaker_label: 'Correspondent',
          timestamp_utc: new Date(Date.now() - 30000).toISOString(),
        },
      ];
      res.json({ channelId, engine: 'Whisper Offline WASM (Simulated)', transcripts: syntheticBuffer });
      return;
    }

    res.json({ channelId, engine: 'Whisper Offline WASM (Local)', transcripts: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch TV subtitles: ' + err.message });
  }
});

router.post('/tv-subtitles/archive', (req: Request, res: Response): void => {
  try {
    const { channelId, text, segmentTitle, speaker } = req.body;
    const db = getDb();

    const result = db.prepare(`
      INSERT INTO tv_transcripts (channel_id, segment_title, text_content, speaker_label, timestamp_utc)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(channelId || 1, segmentTitle || 'Saved Clip', text || '', speaker || 'Anchor');

    res.json({
      success: true,
      transcriptId: result.lastInsertRowid,
      message: 'Broadsheet subtitle excerpt archived to Morgue repository.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive TV subtitle: ' + err.message });
  }
});

// 3. Feature #23: Interactive Audio Bar with Chapter Scrubber
router.get('/audio-chapters/:articleId', (req: Request, res: Response): void => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const db = getDb();
    const article = db.prepare('SELECT title_english, summary, body_english FROM articles WHERE id = ?').get(articleId) as any;

    const title = article?.title_english || 'Dispatch Overview';

    const chapters = [
      {
        index: 1,
        title: 'Lead Dispatch & Wire Origin',
        timeOffsetSeconds: 0,
        formattedTime: '00:00',
        sectionCategory: 'World',
        summarySnippet: title,
      },
      {
        index: 2,
        title: 'Geopolitical & Economic Context',
        timeOffsetSeconds: 45,
        formattedTime: '00:45',
        sectionCategory: 'Analysis',
        summarySnippet: 'Institutional stakeholders, market impacts, and historical precedents.',
      },
      {
        index: 3,
        title: 'Diplomatic Cables & Verbatim Quotes',
        timeOffsetSeconds: 105,
        formattedTime: '01:45',
        sectionCategory: 'Quotes',
        summarySnippet: 'Direct statements from accredited ministry officials.',
      },
      {
        index: 4,
        title: 'Editorial Synthesis & Forward Outlook',
        timeOffsetSeconds: 160,
        formattedTime: '02:40',
        sectionCategory: 'Forecast',
        summarySnippet: 'Second-order implications over upcoming 30-day reporting windows.',
      },
    ];

    res.json({
      articleId,
      totalDurationSeconds: 210,
      formattedDuration: '03:30',
      chapters,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assemble audio chapters: ' + err.message });
  }
});

// 4. Feature #24: Soundtrack for Reading (Ambient Pressroom Soundscapes)
router.get('/soundscape-presets', (_req: Request, res: Response): void => {
  try {
    const presets = [
      {
        id: 'pressroom_night',
        name: 'The 1928 Pressroom (Night Edition)',
        description: 'Gentle midnight rain on windowpanes, distant rhythmic clatter of linotype presses, and warm paper rustling.',
        defaultLevels: { rain: 45, press: 30, hearth: 25 },
      },
      {
        id: 'morning_dispatch',
        name: 'Fleet Street Morning Rush',
        description: 'Vigorous printing machinery, typewriter carriages, and telegraph tickers humming.',
        defaultLevels: { rain: 10, press: 65, hearth: 20 },
      },
      {
        id: 'study_solitude',
        name: 'Editor’s Sanctorum',
        description: 'Soft crackle of coal hearth and heavy folio parchment flipping in quiet contemplation.',
        defaultLevels: { rain: 20, press: 0, hearth: 60 },
      },
    ];

    res.json({
      engine: 'Procedural Web Audio API (Zero External MP3 Assets)',
      synthesizers: ['PinkNoiseRain', 'OscillatorLinotypePress', 'FilteredBrownHearth'],
      presets,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch soundscape presets: ' + err.message });
  }
});

// 5. Feature #25: Archival Radio Broadcast Simulator
router.get('/shortwave-specs', (_req: Request, res: Response): void => {
  try {
    res.json({
      era: '1938 Transatlantic Shortwave',
      bandpassRangeHz: [300, 3200],
      tubeHumFrequencyHz: 60,
      tubeHumGain: 0.035,
      vinylCrackleDensity: 0.06,
      distortionThreshold: 0.12,
      audioNodeChain: [
        'SourceAudioNode',
        'BiquadFilter (Bandpass 300-3200Hz, Q=1.4)',
        'WaveShaperNode (Warm Triode Tube Saturation)',
        'NoiseSourceNode (Vinyl Surface Noise & Tube Hum)',
        'MasterGainNode',
        'AudioDestination',
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch shortwave specs: ' + err.message });
  }
});

// 6. Feature #26: Automated 60-Second Video Reel Generator
router.post('/reel-script/:articleId', (req: Request, res: Response): void => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const db = getDb();
    const article = db.prepare('SELECT title_english, summary, source_id FROM articles WHERE id = ?').get(articleId) as any;

    const headline = article?.title_english || 'Breaking Dispatch Across the Wire';
    const summary = article?.summary || 'World affairs development summarized in under sixty seconds.';

    const scenes = [
      {
        sceneIndex: 1,
        durationSeconds: 12,
        visualLayout: 'MASTHEAD_ZOOM',
        caption: 'BREAKING WIRE DISPATCH',
        highlightText: headline,
        kenBurnsEffect: 'PAN_IN_SEPIA',
      },
      {
        sceneIndex: 2,
        durationSeconds: 18,
        visualLayout: 'BROADSHEET_COLUMN_PAN',
        caption: 'WHAT TRANSPIRED',
        highlightText: summary.slice(0, 140),
        kenBurnsEffect: 'TILT_DOWN_INK',
      },
      {
        sceneIndex: 3,
        durationSeconds: 15,
        visualLayout: 'KEY_FIGURES_GRID',
        caption: 'STAKEHOLDERS & IMPACT',
        highlightText: 'International trading partners and diplomatic ministries initiate rapid realignment.',
        kenBurnsEffect: 'ZOOM_OUT_PATINA',
      },
      {
        sceneIndex: 4,
        durationSeconds: 15,
        visualLayout: 'FOLIO_SIGN_OFF',
        caption: 'READ THE FULL DISPATCH',
        highlightText: 'Read full unredacted coverage on The Daily Bugle World Desk.',
        kenBurnsEffect: 'STATIC_STAMP',
      },
    ];

    res.json({
      articleId,
      aspectRatio: '9:16 (1080x1920 Mobile Reel)',
      totalDurationSeconds: 60,
      scenes,
      audioTrackSuggestion: '1920s Jazz Brass & Printing Press Tempo',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate reel script: ' + err.message });
  }
});

// 7. Feature #28: CAP (Common Alerting Protocol) Emergency Broadcast Banner
router.get('/cap-alerts', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const alerts = db.prepare(`
      SELECT * FROM cap_alerts 
      WHERE expires_at > datetime('now', '-1 hour')
      ORDER BY CASE severity 
        WHEN 'Extreme' THEN 1 
        WHEN 'Severe' THEN 2 
        WHEN 'Moderate' THEN 3 
        ELSE 4 
      END ASC, effective_at DESC
    `).all() as any[];

    res.json({
      count: alerts.length,
      alerts,
      telegraphChirpEnabled: true,
      lastPolledUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch CAP alerts: ' + err.message });
  }
});

router.post('/cap-alerts/acknowledge', (req: Request, res: Response): void => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'alert id is required' });
      return;
    }
    const db = getDb();
    db.prepare('UPDATE cap_alerts SET acknowledged = 1 WHERE id = ?').run(id);
    res.json({ success: true, id, message: 'Emergency CAP alert acknowledged.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to acknowledge alert: ' + err.message });
  }
});

export default router;
