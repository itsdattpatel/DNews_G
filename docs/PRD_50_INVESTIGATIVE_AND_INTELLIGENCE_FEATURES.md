# PRD: 50 Investigative & Intelligence Workstation Features (Phases E–K)
*Version 2.0 · Comprehensive Master Edition · 2026-11-22 · AI World News Desk ("The Daily Bugle")*

---

## 1. Executive Summary & Product Vision

The **AI World News Desk (DNews)** delivers an authentic 1920s broadsheet newspaper reading experience seamlessly merged with modern investigative intelligence. Following the successful deployment of **v1.0.6.1** (incorporating 36 features across reading ergonomics, multi-tier watchdog, bias radar, and memory review decks), this Master Product Requirements Document (PRD) defines the architectural blueprint for the next major leap: **50 Advanced Investigative Journalism, AI Synthesis, Broadcast Audio, Cartographic Intelligence, and Sovereign Archival Capabilities**.

### The Core Design Principle: Evolve the UI/UX, Do Not Discard It
The vintage 1920s broadsheet soul—warm paper palettes (`#FAF7F0` Paper / `#0E0C09` Night), near-black ink typography (`#1A1208`), authentic serif font hierarchies (Playfair Display, EB Garamond, Lora), and custom canvas Bat and Globe art—is the defining signature of DNews.

**We are UPDATING the UI/UX, NOT replacing it.**
To accommodate 50 new capabilities without visual noise or cognitive overload:
1. **No Button Sprawl**: We do NOT scatter 50 buttons across the toolbar.
2. **The "Pressroom Desk" System**: Features are consolidated into **6 Dedicated Sliding Desks / Drawers**.
3. **Hairpin-Segmented Action Glider**: In-article controls glide on a single horizontal row separated by subtle hairline rules.
4. **Universal Ergonomics**: Full accessibility across Desktop EXE (Landscape & Portrait) and Mobile APK (Portrait & Landscape).

---

## 2. Master UI/UX Architecture & Layout Evolution

### 2.1 The 6 Dedicated "Pressroom Desks"

Instead of disjointed popup modals, all 50 features are organized into six structured workstations accessible via the Desktop `RightIconRail`, the Masthead `BatMenu`, or the Mobile `MobileBottomNav` bottom-sheet triggers:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE PRESSROOM WORKSTATION                             │
├───────────────────────┬─────────────────────────────────┬───────────────────────┤
│ 1. INVESTIGATIVE &    │ 2. EDITORIAL INTELLIGENCE       │ 3. BROADCAST & AUDIO  │
│    VERIFICATION DESK  │    DESK                         │    BOOTH              │
│ • Whistleblower Drop  │ • Devil's Advocate Rebuttal     │ • Two-Host Radio Show │
│ • Conflict Timeline   │ • Historical Parallel Rhymes    │ • Whisper TV Subtitle │
│ • Contradiction Grid  │ • Global Perspective Prism      │ • Ambient Soundscapes │
│ • Ownership Graph     │ • Legislative Bill Explainer    │ • Archival 1930s Radio│
│ • Satellite OSINT     │ • Narrative Arc Predictor       │ • 60s Video Reel Gen  │
│ • Quote Authenticator │ • Pre-Publication Fact-Checker  │ • Pitch-Compensated   │
│ • FOIA Request Docket │ • Jargon Demystifier Popover    │ • CAP Emergency Siren │
│ • Watchlist Screener  │ • Sentiment Drift Analytics     │                       │
│ • Clickbait Redactor  │ • Executive Daily Brief Dossier │                       │
│ • Revision Diff Engine│ • Socratic Newsroom Tutor       │                       │
├───────────────────────┼─────────────────────────────────┼───────────────────────┤
│ 4. CARTOGRAPHY &      │ 5. BROADSIDE BINDERY &          │ 6. SOVEREIGN ARCHIVAL │
│    TICKER WAR ROOM    │    PHYSICAL ARTIFACTS           │    ENCLAVE            │
│ • Masthead Ticker Tape│ • Printable Broadsheet PDF      │ • Local Mesh Sync     │
│ • Maritime Chokepoints│ • Rubber Stamp & Redactor       │ • Wayback Auto-Mirror │
│ • Climate Satellite   │ • Mechanical Press Audio/Haptic │ • YubiKey FIDO2 Lock  │
│ • Supply Chain Flows  │ • Customizable Masthead Studio  │ • Single-File HTML    │
│ • Epidemic Tracker    │ • Paper Patina & Aging Engine   │   Dossier Exporter    │
│ • Election Simulator  │ • Ex-Libris Bookplate Generator │                       │
│ • VIP Flight Radar    │ • Daily Cryptic Crossword       │                       │
└───────────────────────┴─────────────────────────────────┴───────────────────────┘
```

### 2.2 Hairpin-Segmented Gliding Action Bar (`ArticlePanel.tsx`)

To maintain rapid single-touch access inside articles while completely preventing vertical line wrapping, the action bar is organized into 3 logical segments divided by vertical hairline rules (`#D9D0BE` in Paper, `#2E2A22` in Night):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Layout ▾] [Bionic] [Type Studio] [Notes] │ [Timeline] [Contradict] [Bias] [Quotes] │  │
│ <────────── Section A: Reading ─────────> │ <────── Section B: Investigative ─────> │  │
│                                           │ [Stamps] [Broadsheet PDF] [Share Clip]  │  │
│                                           │ <───── Section C: Print & Export ─────> │  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Desktop EXE**: Full text labels and keyboard shortcut tooltips.
* **Mobile Viewports**: Icon + condensed badge with horizontal swipe inertia (`touch-pan-x scroll-smooth overflow-x-auto no-scrollbar`), guaranteed `min-h-[44px]` touch targets, and subtle left/right scroll fade masks (`pointer-events-none`).

### 2.3 E-Ink & Sunlight High-Contrast Mode (`[data-theme="e-ink"]`)

A dedicated mode engineered specifically for e-paper devices (Onyx Boox, Kindle Paperwhite browser) and outdoor reading in direct sunlight:
* **Color Palette**: Pure 1-bit monochrome (`#FFFFFF` background, `#000000` text, `#000000` borders).
* **Zero CSS Transitions**: All CSS animations, blurs, transforms, and paper-grain overlays are disabled (`transition: none !important; animation: none !important;`).
* **Crisp Vector Rules**: Replaces subtle drop shadows with solid 1.5px or 2px black geometric border frames.
* **Dithered Imagery**: Photos automatically render using an Atkinson or Floyd-Steinberg grayscale dithering filter for crisp e-ink rendering.

---

## 3. Cross-Platform Responsive Placement & Ergonomics Matrix

| Screen Form Factor | Dimensions | Primary Navigation | Action Bar Ergonomics | Sliding Desk Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop EXE (Ultrawide & Standard)** | 1366×768 to 3840×2160 | Master TopBar + RightIconRail (44px collapsed, 200px expanded) | Fixed single-row button shelf with full labels & shortcuts | Split-screen slide-over panel on the right (w-96 or w-[480px]); article adjusts width dynamically |
| **Desktop EXE Narrow / Tablet Portrait** | 768×1024 to 1024×768 | Masthead + Floating quick-dock pill | Single-row gliding bar with scroll fade-masks | 60% overlay drawer with backdrop blur and escape-key dismissal |
| **Mobile Portrait** | 360×800 to 430×932 (e.g. 390×844) | `AdaptiveNotchPill` (top) + `MobileBottomNav` (bottom 48px) | Ultra-compact single-row glide (`h-9`, 32px buttons), zero vertical wrapping | Ergonomic Bottom Sheet sliding up from thumb zone (`max-h-[85vh]`, swipe-down to dismiss) |
| **Mobile Landscape (Low-Height)** | 667×375 to 844×390 (h ≤ 480px) | Collapsed TopBar (`h-10`, 40px) | Condensed single-row glide (`h-8`, 28px buttons); headline immediately visible | Full-screen slide-over with fixed top navigation bar |

---

## 4. Comprehensive Specifications for All 50 Features

### Phase E: Investigative Journalism, OSINT & Verification Suite (Features 1–10)

#### 1. "Deep Throat" Whistleblower Drop Desk
* **Purpose**: Provide journalists and privacy-conscious users with an air-gapped local inbox for sensitive leaks.
* **Mechanism**: Strips EXIF metadata, PDF author/creator tags, software signatures, and yellow tracking dots using local WebAssembly processing.
* **UI**: Accessible via Masthead BatMenu > *Investigative Desk* > *Whistleblower Drop*. Drag-and-drop parchment vault zone with ink-stamp confirmation: `[METADATA SCRUBBED: 100%]`.
* **Security**: Zero network telemetry; processed in memory and written exclusively to an encrypted local vault.

#### 2. Chronological Conflict Timeline Builder
* **Purpose**: Reconstruct breaking news narratives where multiple sources report fragmented details.
* **Mechanism**: Natural Language Processing (NLP) extracts temporal markers (`"at 04:15 GMT"`, `"two hours later"`) and sorts dispatches into an interactive vertical broadside timeline.
* **UI**: Article Action Bar > *Conflict Timeline* (`#btn-conflict-timeline`). Opens the Investigative Desk with milestone nodes and source attribution badges.

#### 3. Contradiction Matrix Engine
* **Purpose**: Expose discrepancies between competing news agencies covering the same incident.
* **Mechanism**: Sentence-level semantic stance detection pairs opposing claims and categorizes them as *Direct Contradiction*, *Differing Estimate*, or *Consensus Fact*.
* **UI**: Dual-column comparison grid with red ink highlight for factual disputes and forest-green stamp for verified consensus.

#### 4. Corporate Ownership & Conglomerate Overlay
* **Purpose**: Instantly reveal who owns the media outlet and the political affiliations of mentioned corporate entities.
* **Mechanism**: Curated SQLite database of global media conglomerates, parent holding companies, and major shareholders.
* **UI**: Dotted underline on corporate/publisher names. Hover/tap triggers an ink-stamped dossier card showing: `Owner: Conglomerate X`, `Political Contributions: $Y`, `Subsidiaries: Z`.

#### 5. Satellite & Geolocation OSINT Viewer
* **Purpose**: Verify damage, troop movements, or natural disaster scale using public Earth observation data.
* **Mechanism**: Integrates Copernicus/Sentinel-2 public satellite tile proxies with a split-screen before/after wiping slider.
* **UI**: Article media container toggle: *Satellite OSINT*. Swipeable brass divider comparing pre-event and post-event imagery.

#### 6. Quote Authenticator & Transcript Matcher
* **Purpose**: Protect readers against quotes taken out of context or misattributed by partisan media.
* **Mechanism**: Fuzzy string matching against verified public record archives (C-SPAN, White House, UN, Hansard transcripts).
* **UI**: Highlight quote > Context popover > *Verify Quote*. Shows surrounding sentences from the raw speech transcript with a context fidelity score (0–100%).

#### 7. FOIA Request Docket & Statutory Tracker
* **Purpose**: Empower citizens to file and follow Freedom of Information requests directly related to investigative stories.
* **Mechanism**: Form generator pre-filled with agency statutory addresses and an automated countdown timer tracking statutory response deadlines (e.g. 20 working days).
* **UI**: Library Subpage > *FOIA Press Cabinet*. Table tracking agency, filing date, legal deadline, and response dossier.

#### 8. Sanctions & Global Watchlist Cross-Reference
* **Purpose**: Automatically vet named oligarchs, companies, and vessels against international sanctions lists.
* **Mechanism**: Local SQLite FTS5 index of UN Security Council, US OFAC SDN, and EU Consolidated Financial Sanctions lists.
* **UI**: Entity Relationship Desk and article badges automatically display a red ink seal: `[SANCTIONED: EU/OFAC]` when an entity matches.

#### 9. Tabloid Clickbait De-Sensationalizer
* **Purpose**: Cleanse emotional manipulation from headlines before readers consume news.
* **Mechanism**: Ingestion-time rule/prompt engine stripping hyperbolic adjectives (*"Shocking"*, *"Jaw-Dropping"*, *"Bombshell"*) and restructuring headlines into calm AP-style subject-verb-object clarity.
* **UI**: Global toggle in TopBar and Settings: *De-Sensationalize Headlines*. Toggleable between original headline and de-sensationalized prose.

#### 10. Article Revision & Silent-Correction Diff Tracker
* **Purpose**: Hold news organizations accountable when they quietly alter facts, walk back claims, or rewrite headlines without editorial disclosure.
* **Mechanism**: Periodically snapshots article body text; computes SHA-256 and Myers git diff on modification.
* **UI**: Action Bar badge: `[Edited 2x]`. Clicking opens side-by-side broadside diff with strikethrough red ink for deleted text and green ink for additions.

---

### Phase F: AI Editorial Intelligence, Socratic Analysis & Jargon Decoders (Features 11–20)

#### 11. "Devil's Advocate" Counter-Argument Generator
* **Purpose**: Prevent filter bubbles by automatically presenting the most compelling opposing perspective.
* **Mechanism**: Dialectical analysis identifying core thesis premises and generating a counter-brief citing established alternative schools of thought.
* **UI**: Editorial Intelligence Desk > *Devil's Advocate*. Styled as a formal opposing editorial with the rubric: *"The Counter-Perspective"*.

#### 12. Historical Parallel Engine ("History Rhymes")
* **Purpose**: Provide deep contextual literacy by connecting current crises to historical precedents.
* **Mechanism**: Topic and entity similarity matching against a database of major historical events (1800–2020) with comparative outcome analysis.
* **UI**: Summary Footer card: *"History Rhymes: How the 1907 Panic Mirrors Today's Regional Bank Liquidity Run"*.

#### 13. Local Perspective Prism (Global News, Local Eyes)
* **Purpose**: Break ethnocentric bias by displaying how different countries view the exact same global development.
* **Mechanism**: Cross-indexes multilingual RSS sources (e.g. Le Monde, Mainichi Shimbun, Al Jazeera, Der Spiegel, The Hindu) and auto-translates lead paragraphs.
* **UI**: 5-column horizontal perspective card deck inside the article reader.

#### 14. Legislative Bill & Treaty Clause Explainer
* **Purpose**: Deconstruct complex omnibus bills and international treaties cited in news.
* **Mechanism**: Statutory clause parser extracting specific bill section references (e.g., *"Section 230"*, *"Article 5"*) and rendering an executive explanation.
* **UI**: Interactive marginalia card sliding into view when hovering over legislative references.

#### 15. Narrative Arc / Story Lifespan Predictor
* **Purpose**: Inform readers whether a developing story warrants sustained attention or is transient noise.
* **Mechanism**: Evaluates historical cluster velocity, multi-source syndication speed, and editorial depth to classify: *24-Hour Flash*, *Developing Arc*, or *Structural Shift*.
* **UI**: Masthead card metadata badge: `[Arc: Structural Shift · Multi-Month]`.

#### 16. Pre-Publication Fact-Checking Assistant for User Notes
* **Purpose**: Allow journalists and researchers to verify their own writing against DNews's local news database.
* **Mechanism**: Analyzes text entered in the Margin Notes drawer and flags factual assertions, linking them to local verified articles.
* **UI**: Notes Drawer button: *Fact-Check My Draft*. Displays green verification checks or yellow caution flags with cited sources.

#### 17. Jargon & Legalese Instant Demystifier
* **Purpose**: Prevent specialized terminology from creating barriers to understanding.
* **Mechanism**: Regex dictionary matcher paired with local contextual AI fallback explaining financial derivatives, legal motions, and medical jargon.
* **UI**: Subtle dashed underline on jargon words. Tap/click displays a vintage 1920s glossary card with an everyday analogy.

#### 18. Sentiment Drift & Public Mood Monitor
* **Purpose**: Track how media sentiment on critical societal issues evolves over time.
* **Mechanism**: Rolling sentiment aggregation across weekly news corpora on tracked subjects (e.g., Inflation, Artificial Intelligence, Climate Policy).
* **UI**: Library Subpage > *Public Mood Desk*. Beautiful typographic sparklines and area charts rendered in ink and paper tones.

#### 19. Automated Weekly Executive Intelligence Dossier
* **Purpose**: Deliver an elite, high-level briefing modeled after diplomatic intelligence digests.
* **Mechanism**: Sunday scheduled synthesizer compiling top global structural shifts, geopolitical risk matrices, and emerging events into a formatted dossier.
* **UI**: Sunday Edition Desk > *Executive Intelligence Dossier*. Exportable as a classified-styled PDF broadside.

#### 20. AI Socratic News Tutor
* **Purpose**: Deepen reader comprehension through interactive dialogue rather than passive reading.
* **Mechanism**: Socratic interrogation prompt acting as a seasoned senior foreign correspondent questioning the user's understanding of motives, constraints, and historical context.
* **UI**: Socratic dialogue bottom sheet with quick-choice responses and open-ended input.

---

### Phase G: Broadcast, Audio & Media Synthesis (Features 21–28)

#### 21. Two-Host Radio Podcast Mode ("The Newsroom Dispatch")
* **Purpose**: Deliver a natural, engaging audio briefing that sounds like two journalists discussing the morning paper.
* **Mechanism**: Multi-speaker TTS script synthesizer assigning alternating dialogue turns between Host A (Anchor) and Host B (Investigative Editor).
* **UI**: Global Audio Player toggle: *Two-Host Radio Mode*. Displays dual-host avatar badges and synchronized transcript highlights.

#### 22. Whisper Local Offline Speech-to-Text for TV News
* **Purpose**: Make live video and audio broadcasts instantly searchable, readable, and indexable.
* **Mechanism**: Local WebAssembly / C++ Whisper speech-to-text engine processing live TV stream audio chunks with zero cloud latency or cost.
* **UI**: TV News player overlay: *Live Broadsheet Subtitles* with an *Archive Transcript* button.

#### 23. Interactive Audio Bar with Chapter Scrubber
* **Purpose**: Enable precise navigation through long news broadcasts and briefings.
* **Mechanism**: Timecoded section indices embedded in audio player state.
* **UI**: Scrubber bar featuring tactile brass milestone pips labeled by section (*World*, *Markets*, *Science*).

#### 24. Soundtrack for Reading (Ambient Pressroom Soundscapes)
* **Purpose**: Enhance reading immersion through calming, period-authentic audio atmosphere.
* **Mechanism**: Web Audio API procedural synthesis generating rain, distant printing press rhythms, or paper rustles without loading external MP3 assets.
* **UI**: Masthead audio icon: *Pressroom Soundscapes* (sliders for Rain, Press, and Hearth).

#### 25. Archival Radio Broadcast Simulator
* **Purpose**: Provide a thrilling, authentic historical news experience for breaking alerts.
* **Mechanism**: Audio filter chain applying a 300Hz–3kHz bandpass curve, 60Hz tube hum, and vinyl crackle emulation to TTS speech.
* **UI**: Breaking banner button: *Listen via 1938 Shortwave*.

#### 26. Automated 60-Second Video Reel Generator
* **Purpose**: Quick social-ready visual summaries for mobile power users.
* **Mechanism**: Client-side HTML5 Canvas and MediaRecorder API assembling top headlines, lead photos, and Ken Burns motion into a 9:16 vertical video.
* **UI**: BatMenu > *Export 60s Reel*. Produces an MP4 video styled as an animated vintage newspaper broadsheet.

#### 27. Pitch-Compensated Variable Speed Playback
* **Purpose**: Enable rapid listening from 1.0x to 3.0x without high-pitched "chipmunk" audio distortion.
* **Mechanism**: Web Audio phase vocoder preserving natural vocal timbre across all playback speeds.
* **UI**: Audio Dock speed pill: `1.0x` · `1.25x` · `1.5x` · `2.0x`.

#### 28. CAP (Common Alerting Protocol) Emergency Broadcast Banner
* **Purpose**: Deliver life-saving emergency notices (earthquakes, tsunamis, severe weather) instantly.
* **Mechanism**: Background polling of international CAP XML feeds (USGS, NOAA, GDACS).
* **UI**: Masthead Telegraphic Alert Ribbon styled with crimson flashing ink border and Morse-code audio telegraphic chirp.

---

### Phase H: Cartography, Chokepoints & Data Markets (Features 29–35)

#### 29. Masthead Commodity & Currency Ticker Tape
* **Purpose**: Give readers immediate visibility into macroeconomic indicators impacting current affairs.
* **Mechanism**: Background caching of public market feeds (Gold, WTI Crude, Wheat, BTC, USD/EUR/GBP/JPY).
* **UI**: Smoothly scrolling brass ticker ribbon situated directly below the newspaper masthead with vintage mechanical tape ticks.

#### 30. Maritime Chokepoint & Sea-Lane Map
* **Purpose**: Visualize global trade vulnerability during international tensions.
* **Mechanism**: 3D Globe vector layer rendering major straits (Suez, Malacca, Hormuz, Bab-el-Mandeb, Panama) with real-time transit status and incident markers.
* **UI**: Globe Controls > *Chokepoints Layer*. Clicking a chokepoint filters news to trade and naval dispatches in that quadrant.

#### 31. Climate Anomaly & Extreme Weather Overlay
* **Purpose**: Provide immediate empirical context for climate and environmental reporting.
* **Mechanism**: NOAA/NASA public satellite raster overlays projected onto the 3D globe surface showing thermal anomalies and storm trajectories.
* **UI**: Globe Controls > *Climate & Atmospheric View*.

#### 32. Supply Chain Disruption Flowchart
* **Purpose**: Demystify how a localized factory fire, union strike, or canal blockage impacts everyday consumer goods.
* **Mechanism**: Directed acyclic graph (DAG) generator mapping raw materials to manufacturing tiers and retail distribution.
* **UI**: Article Media Desk > *Supply Chain Impact Flowchart*.

#### 33. Epidemiological & Global Health Tracker
* **Purpose**: Monitor emerging infectious diseases and public health emergency alerts.
* **Mechanism**: Aggregates WHO Disease Outbreak News (DONs) and regional CDC bulletins with geographic outbreak heatmaps.
* **UI**: Sections > *Health & Outbreaks Desk*.

#### 34. Interactive Electoral & Parliament Seat Simulator
* **Purpose**: Allow users to explore government formation and coalition math based on latest polling and election returns.
* **Mechanism**: D'Hondt and Sainte-Laguë seat apportionment simulator.
* **UI**: Politics Section > *Parliament Coalition Simulator*. Interactive semicircular parliament chamber diagram.

#### 35. VIP Air Traffic & Diplomatic Flight Tracker
* **Purpose**: Follow heads of state, diplomatic delegations, and emergency cargo planes during international summits.
* **Mechanism**: OpenSky Network public API cache highlighting government and military transport flights.
* **UI**: 3D Globe View > *Diplomatic Flights*. Real-time plane vectors across the hemisphere.

---

### Phase I: Broadside Bindery & Physical Artifacts (Features 36–42)

#### 36. Authentic Printable Broadsheet PDF Generator
* **Purpose**: Transform digital articles into gorgeous, physical 1920s front pages suitable for framing or offline reading.
* **Mechanism**: Server-side PDFKit multi-column broadsheet typesetter with woodblock drop-caps, ornamental hairline column rules, and folio headers.
* **UI**: Action Bar > *Print Broadsheet PDF*. Generates Letter or A4 print-ready PDFs.

#### 37. Rubber Stamp & Redactor Studio
* **Purpose**: Allow users to mark up and sanitize articles before exporting or sharing.
* **Mechanism**: Interactive SVG canvas overlays rendering textured rubber ink stamps (*"DECLASSIFIED"*, *"CONFIDENTIAL"*, *"SPECULATIVE"*) and black marker redactions.
* **UI**: Action Bar > *Rubber Stamps & Redaction*. Exports stamped images or PDFs.

#### 38. Mechanical Printing Press Sound & Haptic Feedback
* **Purpose**: Bring the tactile delight of a physical print shop into digital interactions.
* **Mechanism**: Synchronized Web Audio mechanical clicks and device haptic engine vibrations on bookmarking, saving, or flipping editions.
* **UI**: Settings > *Tactile Press Haptics & Audio*.

#### 39. Customizable Masthead Typography Studio
* **Purpose**: Let users personalize their copy of DNews to reflect their home city and values.
* **Mechanism**: Configurable masthead strings storing regional titles (*"The London Bugle"*, *"The Chicago Dispatch"*) and custom Latin mottos.
* **UI**: Settings > *Newspaper Identity Studio*.

#### 40. Paper Aging & Patina Engine
* **Purpose**: Enable fine-tuned control over paper texture and vintage atmosphere.
* **Mechanism**: Shader and CSS variable engine adjusting sepia warmth, rag fibers, ink bleed, and corner yellowing.
* **UI**: Settings > Appearance > *Paper Patina Slider* (Fresh Print to 1890s Parchment).

#### 41. Ex-Libris Bookplate Bookmarks
* **Purpose**: Create collectible, personalized bookplate badges for saved investigative dossiers.
* **Mechanism**: Generates vintage heraldic bookplate graphics engraved with user initials and the Daily Bugle bat insignia.
* **UI**: Library > *Create Ex-Libris Bookplate*.

#### 42. Daily Cryptic Crossword & Editorial Acrostic
* **Purpose**: Deliver the beloved traditional newspaper puzzle experience powered by the day's real vocabulary.
* **Mechanism**: Algorithmic grid generator matching cross-linked vocabulary and named entities from the day's news dispatches.
* **UI**: Sunday Edition & Library > *Daily Cryptic Crossword*. Interactive broadside puzzle grid.

---

### Phase J: Mobile Power-User & OS Integration (Features 43–46)

#### 43. Android Home Screen Broadside Widget
* **Purpose**: View breaking broadside headlines directly on the Android launcher.
* **Mechanism**: Android `AppWidgetProvider` paired with Capacitor background sync refreshing every 30 minutes.
* **UI**: 4×2 resizable vintage broadsheet widget displaying current lead headline, masthead bat, and unread wire counter.

#### 44. Quick-Share Vintage Clipping Card
* **Purpose**: Share news snippets to social media or messaging apps as elegant, dignified newspaper clippings.
* **Mechanism**: Client-side HTML5 Canvas rendering a 1080×1080 card with torn paper edges, source stamp, date, headline, quote, and scan QR code.
* **UI**: Action Bar > *Share Clipping*. Direct integration with native Android share sheet.

#### 45. E-Ink Display Mode & 1-Bit Grayscale Optimization
* **Purpose**: Flawless, flicker-free reading on Android e-paper tablets (Boox, Bigme) and direct sunlight.
* **Mechanism**: High-contrast pure black/white stylesheet with all transitions, blurs, and continuous animations removed.
* **UI**: Settings > Display > *E-Ink Mode Toggle*.

#### 46. Hardware Volume Button Page Turning
* **Purpose**: Read one-handed without reaching across large screens.
* **Mechanism**: Capacitor native key event interceptor mapping Volume Up to *Previous Article* and Volume Down to *Next Article*.
* **UI**: Settings > Navigation > *Volume Key Page Turning*.

---

### Phase K: Archival Sovereignty & Network Resilience (Features 47–50)

#### 47. Local Peer-to-Peer Mesh News Sync
* **Purpose**: Enable continuous news and alert dissemination during complete internet blackouts or emergencies.
* **Mechanism**: Local mDNS and WebRTC peer discovery sharing signed article bundles over local Wi-Fi or Bluetooth mesh networks.
* **UI**: Control Room > *Mesh Sync Active* indicator with nearby peer count.

#### 48. Wayback Machine & Internet Archive Auto-Mirroring
* **Purpose**: Guard against link rot, stealth takedowns, and 404 dead ends.
* **Mechanism**: Automatic background check against the Wayback Machine API (`archive.org/wayback/available`); auto-submits new URLs for archival preservation.
* **UI**: Article Toolbar > *Archival Mirror*. Shows archive date and snapshot provenance.

#### 49. Hardware Security Key (FIDO2 / YubiKey) Lock
* **Purpose**: Provide uncompromising security for sensitive investigative dossiers and whistleblower sources.
* **Mechanism**: WebAuthn hardware security challenge decrypting the local SQLite enclave master key only upon physical key touch or biometric sensor scan.
* **UI**: Security Settings > *Bind Hardware Key*.

#### 50. Self-Contained Single-File HTML Dossier Export
* **Purpose**: Create permanent, portable research archives that open in any browser 50 years from now.
* **Mechanism**: Compiles the entire dossier, images (Base64 data URIs), web fonts, and interactive reader JavaScript into a single, self-contained `.html` file.
* **UI**: Library > *Export Portable Archive*.

---

## 5. Component State Machines & Anti-Slop Quality Rules

In accordance with `GEMINI.md`, **every new screen, desk, and drawer must implement three explicit states**:

1. **Loading State**:
   * Must use vintage typographic skeleton pulses or the mechanical press spinner.
   * No generic spinning circle or modern loader slop.
2. **Empty State**:
   * Must display an authentic newspaper illustration or woodcut engraving with thoughtful copy (e.g., *"The Wire is Silent. No cables have arrived from this bureau yet."*).
   * Includes a clear, contextual primary action button (e.g., *"Fetch Cables Now"* or *"Tune Receiver"*).
3. **Error State**:
   * Must resemble a telegraphic transmission error notice (`[DISPATCH INTERRUPTED: WIRE DISCONNECTED]`).
   * Explicit retry button and diagnostics summary.

---

## 6. Verification & Quality Assurance Strategy

1. **Automated Unit & Integration Test Suite**:
   * All 109 existing test files and 625 test cases must continue passing with zero failures.
   * New backend endpoints and parsers must feature 100% test coverage under Vitest/Jest.
2. **Playwright Visual Verification**:
   * Automated visual tests capturing screenshots across all 4 key viewports:
     - Desktop EXE (1440×900)
     - Tablet (768×1024)
     - Mobile Portrait (390×844)
     - Mobile Landscape (844×390)
3. **Ergonomic Touch & Scroll Audit**:
   * Minimum touch target: 44×44px on mobile.
   * Action bars must never wrap vertically or displace headlines.
4. **Air-Gap & Privacy Verification**:
   * All document scrubbing and local note fact-checking must run 100% client-side with network calls disabled during verification.
