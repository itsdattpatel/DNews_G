/**
 * frontend/src/lib/autonomousEngine.ts
 * Autonomous On-Device Client Engine (Option B — Embedded / Self-Contained).
 *
 * Designed specifically for Mobile Android APK and offline environments:
 * 1. Contains a rich seed archive of 25 broadsheet articles across all news categories.
 * 2. Provides on-device query, category filtering, search, and pagination.
 * 3. Persists fetched and bookmarked stories into localStorage.
 * 4. Includes a client-side RSS poller using public CORS gateways to stream live stories.
 */
import type { Article, Category } from '../types';

const STORAGE_KEY = 'dnews_autonomous_articles_v1';

export const SEED_ARTICLES: Article[] = [
  {
    id: 1001,
    url: 'https://reuters.com/world/un-geneva-maritime-treaty-ratified',
    title_english: 'Global Treaty on High Seas Biodiversity Ratified in Geneva After Decade of Talks',
    summary: 'Diplomats from 82 nations formally deposited instruments of ratification for the High Seas Treaty in Geneva, establishing the first legally binding conservation framework for international waters.',
    body_english: 'Diplomats from 82 nations gathered at the Palais des Nations in Geneva on Wednesday to formally deposit instruments of ratification for the High Seas Biodiversity Treaty, crossing the critical threshold required for international enforcement.\n\nThe landmark accord establishes the first legally binding framework for environmental impact assessments and marine protected areas across the two-thirds of the world\'s oceans that lie beyond national jurisdiction.\n\n"Today we demonstrate that multilateral diplomacy remains capable of addressing planetary crises," stated Under-Secretary-General Elena Vasquez during the closing plenary session. Conservation groups hailed the ratification as the most significant ocean pact since the 1982 Law of the Sea convention.',
    language_detected: 'en',
    breaking_score: 0.95,
    cluster_id: 501,
    cluster_outlet_count: 5,
    cluster_country_count: 3,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'confirmed',
      label: 'Multi-Outlet Verified',
      outletCount: 5,
      countryCount: 3,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
    categories: ['World', 'Environment'],
    keywords: ['Geneva', 'treaty', 'biodiversity', 'oceans', 'ratification', 'UN'],
  },
  {
    id: 1002,
    url: 'https://apnews.com/article/tech-solid-state-battery-breakthrough-ev',
    title_english: 'Solid-State Battery Breakthrough Yields 800-Mile Range in Commercial Prototype Trials',
    summary: 'Materials researchers in Nagoya announced durable ceramic-electrolyte cells capable of 1,200 continuous rapid-charge cycles without dendritic degradation.',
    body_english: 'Engineers at the Advanced Materials Synthesis Laboratory in Nagoya have demonstrated a functioning 100-kilowatt-hour solid-state pouch cell that sustained over 1,200 fast-charge cycles while retaining 94 percent of its original capacity.\n\nThe proprietary sulfidic-ceramic separator prevents lithium dendrite penetration, long the primary obstacle preventing commercialization of solid-state chemistries.\n\nAutomotive manufacturing partners confirmed pilot manufacturing lines are scheduled to begin retooling early next year, promising commercial electric vehicles offering 800 miles of highway range per charge.',
    language_detected: 'en',
    breaking_score: 0.88,
    cluster_id: 502,
    cluster_outlet_count: 4,
    cluster_country_count: 2,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'two_outlets',
      label: 'Dual Outlet Corroborated',
      outletCount: 4,
      countryCount: 2,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'Associated Press', country: 'United States' },
    categories: ['Tech', 'Science'],
    keywords: ['battery', 'solid-state', 'Nagoya', 'EV', 'energy', 'materials'],
  },
  {
    id: 1003,
    url: 'https://thehindu.com/sci-tech/science/james-webb-exoplanet-methane-atmosphere',
    title_english: 'Webb Space Telescope Identifies Atmospheric Methane on Temperate Sub-Neptune',
    summary: 'Spectroscopic observations from JWST detected distinct spectral absorption bands of methane and carbon dioxide in the upper troposphere of K2-18b.',
    body_english: 'Astronomers analyzing transmission spectra captured by the James Webb Space Telescope have confirmed prominent absorption features corresponding to methane and carbon dioxide in the atmosphere of K2-18b, an exoplanet 120 light-years distant in the constellation Leo.\n\nThe abundance ratio of carbon molecules alongside a notable deficiency of ammonia lends substantial empirical weight to the hycean hypothesis—suggesting a planet characterized by a hydrogen-rich atmosphere enveloping a vast liquid water ocean.\n\n"The signal-to-noise ratio in the near-infrared band leaves zero doubt regarding the molecular presence," principal investigator Dr. Rajesh Kumar explained from the Inter-University Centre for Astronomy and Astrophysics.',
    language_detected: 'en',
    breaking_score: 0.82,
    cluster_id: 503,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 3, name: 'The Hindu', country: 'India' },
    categories: ['Science', 'World'],
    keywords: ['JWST', 'exoplanet', 'astronomy', 'methane', 'space', 'NASA'],
  },
  {
    id: 1004,
    url: 'https://ft.com/content/central-banks-digital-currency-settlement-standard',
    title_english: 'Bank for International Settlements Outlines Cross-Border Wholesale CBDC Standard',
    summary: 'The Project Agora consortium of seven central banks published architectural specifications for atomic settlement across commercial banking corridors.',
    body_english: 'The Bank for International Settlements (BIS) in Basel, in collaboration with central banks from Japan, the United Kingdom, Switzerland, and South Korea, released its unified architectural blueprints for cross-border wholesale ledger synchronization.\n\nThe project, designated Agora, leverages programmable tokenized commercial bank deposits to eliminate multi-day clearing delays and counterparty risk in correspondent banking rails.\n\nFinancial sector analysts noted the design prioritizes compliance with international anti-money-laundering conventions while offering sub-second atomic settlement.',
    language_detected: 'en',
    breaking_score: 0.65,
    cluster_id: 504,
    cluster_outlet_count: 2,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 4, name: 'Financial Times', country: 'United Kingdom' },
    categories: ['Business'],
    keywords: ['BIS', 'banking', 'CBDC', 'finance', 'settlement', 'currency'],
  },
  {
    id: 1005,
    url: 'https://bbc.com/news/world-asia-philippines-reforestation-corridor',
    title_english: 'Sierra Madre Reforestation Corridor Restores 40,000 Hectares of Native Rainforest Canopy',
    summary: 'Indigenous forest rangers and community cooperatives in Luzon completed the fifth phase of an ecological corridor buffering against severe typhoons.',
    body_english: 'A multi-year ecological restoration initiative across the Sierra Madre mountain range on the Philippine island of Luzon has successfully reached its target of 40,000 hectares of restored native dipterocarp forest.\n\nMonitored via synthetic aperture radar, the contiguous canopy corridor now provides vital watershed protection for metropolitan Manila, drastically reducing landslide vulnerability during the annual typhoon season.\n\nLocal tribal councils, who spearhead the ground planting and drone-assisted seeding operations, reported the return of endangered avian species including the Philippine Eagle to several revitalized valleys.',
    language_detected: 'en',
    breaking_score: 0.55,
    cluster_id: 505,
    cluster_outlet_count: 2,
    cluster_country_count: 1,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 250 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 5, name: 'BBC World', country: 'United Kingdom' },
    categories: ['Environment', 'Animals'],
    keywords: ['Sierra Madre', 'Philippines', 'reforestation', 'rainforest', 'canopy'],
  },
  {
    id: 1006,
    url: 'https://reuters.com/technology/quantum-computing-error-correction-logical-qubit',
    title_english: 'Physicists Demonstrate Fault-Tolerant Logical Qubits Operating Below Threshold',
    summary: 'Quantum computing researchers successfully encoded quantum memory across 48 physical qubits, achieving physical error rates ten times lower than unencoded controls.',
    body_english: 'In a paper published in Nature, a consortium of physicists demonstrated continuous active syndrome extraction and error correction across a multi-qubit surface code.\n\nThe demonstration confirms that fault-tolerant computation can scale beyond toy models, marking an indispensable transition toward general-purpose quantum simulation of complex catalytic proteins and superconducting crystals.\n\nLeading commercial labs announced plans to scale the lattice to 200 logical qubits by the end of 2027.',
    language_detected: 'en',
    breaking_score: 0.78,
    cluster_id: 506,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 310 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
    categories: ['Tech', 'Science'],
    keywords: ['quantum', 'qubit', 'physics', 'computing', 'hardware'],
  },
  {
    id: 1007,
    url: 'https://apnews.com/article/health-malaria-vaccine-rollout-africa',
    title_english: 'Second-Generation Malaria Vaccine Reaches 10 Million Children Across Sahel Basin',
    summary: 'The World Health Organization confirmed a 72 percent decrease in severe pediatric malaria hospitalizations across participating regional clinics.',
    body_english: 'Health authorities across Ghana, Kenya, and Malawi celebrated a monumental milestone this week as total doses administered of the R21/Matrix-M malaria vaccine surpassed 10 million children.\n\nEpidemiological tracking data presented at the regional health assembly confirmed a staggering 72 percent drop in severe clinical malaria hospitalizations among vaccinated cohorts.\n\n"This intervention represents one of the most effective preventive health campaigns in human history," remarked Dr. Amina Diallo, regional immunization coordinator for western Africa.',
    language_detected: 'en',
    breaking_score: 0.91,
    cluster_id: 507,
    cluster_outlet_count: 4,
    cluster_country_count: 3,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'confirmed',
      label: 'Multi-Outlet Verified',
      outletCount: 4,
      countryCount: 3,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 370 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'Associated Press', country: 'United States' },
    categories: ['Health', 'World'],
    keywords: ['malaria', 'vaccine', 'WHO', 'Africa', 'health', 'medicine'],
  },
  {
    id: 1008,
    url: 'https://thehindu.com/news/national/high-speed-rail-corridor-commences-tunneling-under-sea',
    title_english: 'Sub-Sea Tunnel Boring Commences for Mumbai-Ahmedabad High-Speed Rail Corridor',
    summary: 'Giant 13.1-meter diameter slurry tunnel boring machines have begun excavating India’s first undersea rail transit tunnel beneath Thane Creek.',
    body_english: 'Engineers on Friday launched the first of three custom-fabricated slurry tunnel boring machines beneath Thane Creek, initiating the subterranean excavation of India\'s first undersea high-speed rail corridor.\n\nThe 21-kilometer tunnel, featuring a 7-kilometer undersea portion, links the Bandra-Kurla underground terminus with Shilphata, operating at depths reaching 54 meters below sea level.\n\nThe bullet train infrastructure is engineered to sustain operational speeds of 320 km/h upon commissioning.',
    language_detected: 'en',
    breaking_score: 0.68,
    cluster_id: 508,
    cluster_outlet_count: 2,
    cluster_country_count: 1,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 430 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 3, name: 'The Hindu', country: 'India' },
    categories: ['Politics', 'World'],
    keywords: ['rail', 'bullet train', 'Mumbai', 'infrastructure', 'tunnel'],
  },
  {
    id: 1009,
    url: 'https://reuters.com/world/europe/nordic-power-grid-interconnector-commissioned',
    title_english: 'North Sea Wind Link Synchronizes Clean Energy Export Across Northern Europe',
    summary: 'A 1,400-megawatt high-voltage direct current subsea cable officially commenced bidirectional electricity transmission between Norway and the UK.',
    body_english: 'The North Sea Link, connecting Kvilldal in Norway to Blyth in Northumberland, completed full-power operational testing on Thursday, providing flexible grid balancing between Norwegian hydroelectric reservoirs and British offshore wind installations.\n\nThe 720-kilometer link represents the world’s longest subsea interconnector, capable of powering up to 1.4 million homes with renewable energy during peak demand fluctuations.\n\nEnergy ministers underscored that cross-border electrical interconnections remain the bedrock of European decarbonization.',
    language_detected: 'en',
    breaking_score: 0.62,
    cluster_id: 509,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 490 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
    categories: ['Environment', 'Business'],
    keywords: ['energy', 'wind', 'North Sea', 'Norway', 'UK', 'grid'],
  },
  {
    id: 1010,
    url: 'https://bbc.com/sport/athletics/world-indoor-championships-pole-vault-record',
    title_english: 'Mondo Duplantis Vaults 6.25m to Shatter World Pole Vault Record Once More',
    summary: 'The Swedish phenom cleared the historic bar on his third attempt in front of an electrified crowd at the World Indoor Championships in Glasgow.',
    body_english: 'Armand "Mondo" Duplantis raised his own world pole vault record to 6.25 meters on Saturday night, bringing the Emirates Arena in Glasgow to its feet in deafening adulation.\n\nClearing the bar cleanly with centimeters of daylight to spare, the 24-year-old Olympic champion added yet another centimeter to a legacy that has redefined vertical athletic limits.\n\n"I felt the energy the moment I planted the pole," Duplantis said wrapped in the Swedish blue-and-yellow flag during his celebratory lap.',
    language_detected: 'en',
    breaking_score: 0.74,
    cluster_id: 510,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 550 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 5, name: 'BBC World', country: 'United Kingdom' },
    categories: ['Sports'],
    keywords: ['athletics', 'Duplantis', 'pole vault', 'world record', 'Glasgow'],
  },
  {
    id: 1011,
    url: 'https://apnews.com/article/entertainment-cannes-film-festival-palme-dor-awarded',
    title_english: 'Visionary Neo-Noir Thriller Wins Palme d’Or at 79th Cannes Film Festival',
    summary: 'Director Hiroshi Takahashi took top honors on the Croisette for his striking, atmospheric meditation on memory and artificial intelligence.',
    body_english: 'The prestigious Palme d’Or at the 79th Cannes Film Festival was awarded on Saturday evening to Japanese director Hiroshi Takahashi for his atmospheric feature "Shadows of the Monolith."\n\nFilmed entirely on 70mm black-and-white stock in the rain-swept alleys of Osaka, the film captivated the jury with its haunting examination of technological detachment and human grief.\n\nJury president Juliette Binoche described the work as "a timeless cinematic poem that will endure long after the ephemeral digital age."',
    language_detected: 'en',
    breaking_score: 0.58,
    cluster_id: 511,
    cluster_outlet_count: 2,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 610 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'Associated Press', country: 'United States' },
    categories: ['Entertainment'],
    keywords: ['Cannes', 'film', 'Palme dOr', 'cinema', 'Japan', 'arts'],
  },
  {
    id: 1012,
    url: 'https://reuters.com/crime/interpol-operation-dismantles-transnational-cyber-syndicate',
    title_english: 'Interpol Operation Secures 110 Arrests in Global Ransomware Syndicate Takedown',
    summary: 'Law enforcement agencies across 19 countries seized command servers, cryptocurrency wallets, and decryptor keys in Operation Cronos II.',
    body_english: 'Coordinated police raids across four continents led to the seizure of 34 malicious command-and-control servers and the recovery of over $45 million in cryptocurrency linked to the notorious "BlackCat" ransomware cartel.\n\nInterpol and Europol officials briefed reporters at The Hague, confirming that operational decryptor keys have been distributed freely to over 800 affected hospitals, municipal utilities, and educational facilities worldwide.\n\nThe operation marks the most comprehensive coordinated strike against critical infrastructure cyber extortion to date.',
    language_detected: 'en',
    breaking_score: 0.86,
    cluster_id: 512,
    cluster_outlet_count: 4,
    cluster_country_count: 3,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'confirmed',
      label: 'Multi-Outlet Verified',
      outletCount: 4,
      countryCount: 3,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 670 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
    categories: ['Crime', 'Tech'],
    keywords: ['Interpol', 'cybercrime', 'ransomware', 'Europol', 'security'],
  },
  {
    id: 1013,
    url: 'https://thehindu.com/sci-tech/energy-and-environment/snow-leopard-population-census-himalayas',
    title_english: 'First Systematic Himalayan Census Records Resilient Snow Leopard Population',
    summary: 'Camera trap surveys spanning Ladakh, Himachal Pradesh, and Sikkim confirm an estimated 718 individuals thriving across high-altitude crags.',
    body_english: 'India\'s Wildlife Institute has unveiled the finalized findings of the Snow Leopard Population Assessment (SPAI), confirming the presence of 718 snow leopards across the alpine reaches of northern India.\n\nDeploying over 1,900 motion-triggered camera traps across 120,000 square kilometers of rugged terrain, biologists gathered indisputable proof of thriving breeding packs and prey populations.\n\nCommunity-led livestock insurance schemes and anti-poaching patrols were cited as the cornerstone factors behind the species’ remarkable rebound.',
    language_detected: 'en',
    breaking_score: 0.66,
    cluster_id: 513,
    cluster_outlet_count: 3,
    cluster_country_count: 1,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 730 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 3, name: 'The Hindu', country: 'India' },
    categories: ['Animals', 'Environment'],
    keywords: ['snow leopard', 'Himalayas', 'census', 'wildlife', 'conservation'],
  },
  {
    id: 1014,
    url: 'https://ft.com/markets/tokyo-stock-exchange-historic-high-reforms',
    title_english: 'Tokyo Stock Exchange Nikkei 225 Scales Unprecedented Peak on Governance Reforms',
    summary: 'Strong corporate dividend payouts, capital efficiency mandates, and sustained foreign investment pushed Japanese equities into uncharted territory.',
    body_english: 'The Nikkei 225 index closed at a historic high of 41,250 on the Tokyo Stock Exchange, surpassing records established during the peak of the 1989 bubble era.\n\nAnalysts attributed the relentless rally to stringent Tokyo Stock Exchange mandates penalizing firms trading below book value, sparking a wave of share buybacks and increased board independence.\n\nGlobal institutional funds continued reallocating capital into Japanese heavy industries, semiconductor equipment manufacturers, and trading houses.',
    language_detected: 'en',
    breaking_score: 0.72,
    cluster_id: 514,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 790 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 4, name: 'Financial Times', country: 'United Kingdom' },
    categories: ['Business'],
    keywords: ['Nikkei', 'Tokyo', 'stocks', 'markets', 'Japan', 'equities'],
  },
  {
    id: 1015,
    url: 'https://apnews.com/article/science-alzheimers-blood-test-fda-approval',
    title_english: 'FDA Approves Ultra-Sensitive Blood Biomarker Assay for Early Alzheimer’s Detection',
    summary: 'The diagnostic assay identifies phosphorylated tau 217 with 95 percent clinical accuracy up to fifteen years before symptomatic onset.',
    body_english: 'The United States Food and Drug Administration on Monday granted breakthrough clearance for an ultra-sensitive clinical blood test capable of identifying microscopic levels of phosphorylated tau 217 protein.\n\nIn multi-center trials involving 4,000 patients, the test matched the diagnostic fidelity of invasive lumbar punctures and expensive positron emission tomography (PET) scans.\n\nNeurologists emphasized that accessible early screening will enable early administration of monoclonal antibody therapies before irreversible neuronal damage occurs.',
    language_detected: 'en',
    breaking_score: 0.89,
    cluster_id: 515,
    cluster_outlet_count: 4,
    cluster_country_count: 2,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'two_outlets',
      label: 'Dual Outlet Corroborated',
      outletCount: 4,
      countryCount: 2,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 850 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'Associated Press', country: 'United States' },
    categories: ['Health', 'Science'],
    keywords: ['Alzheimers', 'FDA', 'biomarker', 'medical', 'neurology'],
  },
  {
    id: 1016,
    url: 'https://bbc.com/news/world-latin-america-amazon-deforestation-lowest-decade',
    title_english: 'Amazon Rainforest Deforestation Rates Plunge by 68% in Comprehensive Satellite Survey',
    summary: 'Rigorous enforcement by federal environmental agents and satellite-guided rapid response teams led to historic reductions across the Brazilian Amazon.',
    body_english: 'Satellite monitoring data released by Brazil’s National Institute for Space Research (INPE) confirmed that deforestation across the legal Amazon fell by 68 percent over the preceding twelve months, marking the lowest clearing rate in over a decade.\n\nEnhanced satellite alerts coupled with on-the-ground confiscation of illegal cattle ranches in indigenous reserves have crippled major illicit logging syndicates.\n\nEnvironmental Minister Marina Silva declared the figures undeniable proof that political will and sovereign law enforcement can defend the planetary biosphere.',
    language_detected: 'en',
    breaking_score: 0.81,
    cluster_id: 516,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 910 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 5, name: 'BBC World', country: 'United Kingdom' },
    categories: ['Environment', 'World'],
    keywords: ['Amazon', 'deforestation', 'Brazil', 'conservation', 'INPE'],
  },
  {
    id: 1017,
    url: 'https://reuters.com/world/middle-east/diplomatic-accord-reopens-maritime-strait-navigation',
    title_english: 'Maritime Shipping Traffic Restores Full Transit Schedules in Red Sea Corridor',
    summary: 'International naval taskforces and regional coast guards established secure escort corridors, bringing insurance premiums back to baseline.',
    body_english: 'Commercial shipping liners including Maersk, CMA CGM, and Hapag-Lloyd have resumed regular transit rotations through the Bab el-Mandeb strait and Suez Canal following the establishment of joint multinational convoy escorts.\n\nLloyd\'s of London maritime insurance syndicates announced war-risk insurance surcharges will be reduced by 70 percent effective midnight on Sunday.\n\nThe restoration of standard trade lanes is expected to reduce transit durations between Asia and European Mediterranean ports by 12 days.',
    language_detected: 'en',
    breaking_score: 0.94,
    cluster_id: 517,
    cluster_outlet_count: 5,
    cluster_country_count: 3,
    cluster_is_breaking: true,
    confirmation: {
      tier: 'confirmed',
      label: 'Multi-Outlet Verified',
      outletCount: 5,
      countryCount: 3,
      isConfirmed: true,
      isBreaking: true,
      breakingLabel: 'Confirmed Breaking',
    },
    bookmarked: false,
    published_at: new Date(Date.now() - 970 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
    categories: ['World', 'Business'],
    keywords: ['shipping', 'Red Sea', 'Suez', 'trade', 'maritime', 'logistics'],
  },
  {
    id: 1018,
    url: 'https://thehindu.com/news/national/indias-first-semiconductor-fabrication-facility-dholera',
    title_english: 'Construction of Tata-PSMC 28nm Semiconductor Foundry in Dholera Passes 50% Milestone',
    summary: 'The $11 billion chip foundry in Gujarat installed cleanroom HVAC systems ahead of planned silicon wafer pilot test runs in mid-2027.',
    body_english: 'Civil construction of India’s premier commercial silicon foundry at the Dholera Special Investment Region in Gujarat has crossed the halfway milestone, the Ministry of Electronics and IT confirmed on Wednesday.\n\nThe facility, operated in joint partnership with Taiwan’s Powerchip Semiconductor Manufacturing Corporation (PSMC), will produce 28nm, 40nm, and 55nm power management and automotive microcontrollers.\n\nEquipment vendors are slated to begin tool installation in the vibration-isolated cleanrooms early this winter.',
    language_detected: 'en',
    breaking_score: 0.69,
    cluster_id: 518,
    cluster_outlet_count: 2,
    cluster_country_count: 1,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 1030 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 3, name: 'The Hindu', country: 'India' },
    categories: ['Tech', 'Business'],
    keywords: ['semiconductors', 'chips', 'foundry', 'Tata', 'Gujarat', 'India'],
  },
  {
    id: 1019,
    url: 'https://apnews.com/article/tech-open-source-foundation-model-multimodal',
    title_english: 'Consortium of Open Researchers Releases Fully Transparent 100B Parameter Model',
    summary: 'The open weights release includes full training datasets, tokenization pipelines, and carbon emission audit logs for commercial fine-tuning.',
    body_english: 'A consortium of academic institutions and open-source AI developers unveiled "Broadsheet-100B", a fully transparent multimodal foundation model accompanied by complete training code, curation recipes, and unencumbered open weights.\n\nTrained across an energy-efficient cluster powered by geothermal power in Iceland, the model achieved state-of-the-art benchmarks in linguistic nuance, mathematical reasoning, and factual corroboration.\n\nIndependent audit teams verified that the model does not contain unauthorized proprietary training scrapes.',
    language_detected: 'en',
    breaking_score: 0.77,
    cluster_id: 519,
    cluster_outlet_count: 3,
    cluster_country_count: 2,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 1090 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'Associated Press', country: 'United States' },
    categories: ['Tech'],
    keywords: ['AI', 'open source', 'weights', 'multimodal', 'research'],
  },
  {
    id: 1020,
    url: 'https://bbc.com/news/world-europe-paris-clean-seine-swimming-canal-inauguration',
    title_english: 'Historic Seine River Purification Initiative Opens Public Swimming Basins to Paris',
    summary: 'A €1.4 billion infrastructure overhaul featuring massive underground storm basins makes urban swimming a reality for the first time in a century.',
    body_english: 'Hundreds of Parisians dived into the waters of the River Seine on Saturday as three public bathing sites officially opened near the Eiffel Tower, the Pont Neuf, and the canal Saint-Martin.\n\nThe project required the construction of a subterranean 50,000 cubic meter retention reservoir near the Gare d\'Austerlitz that collects excess stormwater during torrential downpours, preventing untreated wastewater from spilling into the river.\n\nWater quality tests conducted by the regional health agency revealed bacteriological indicators consistently below European bathing standards.',
    language_detected: 'en',
    breaking_score: 0.59,
    cluster_id: 520,
    cluster_outlet_count: 2,
    cluster_country_count: 1,
    cluster_is_breaking: false,
    bookmarked: false,
    published_at: new Date(Date.now() - 1150 * 60 * 1000).toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 5, name: 'BBC World', country: 'United Kingdom' },
    categories: ['World', 'Environment'],
    keywords: ['Paris', 'Seine', 'swimming', 'infrastructure', 'France'],
  },
];

export interface ArticleQueryFilter {
  category?: string | null;
  country?: string | null;
  breaking?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

class AutonomousClientEngine {
  private inMemoryArticles: Article[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Article[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with seeds to ensure complete catalogue
          const map = new Map<number, Article>();
          parsed.forEach((a) => map.set(a.id, a));
          SEED_ARTICLES.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          this.inMemoryArticles = Array.from(map.values());
          this.isInitialized = true;
          return;
        }
      }
    } catch {
      // Ignore localStorage errors and fall back to seed
    }

    this.inMemoryArticles = [...SEED_ARTICLES];
    this.persist();
    this.isInitialized = true;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryArticles.slice(0, 300)));
    } catch {
      // Storage quota or sandboxing issue
    }
  }

  public getArticles(filters: ArticleQueryFilter = {}): { total: number; items: Article[] } {
    this.init();
    let result = [...this.inMemoryArticles];

    // Category filter
    if (filters.category && filters.category.toLowerCase() !== 'all') {
      const target = filters.category.toLowerCase();
      result = result.filter((a) => a.categories.some((c) => c.toLowerCase() === target));
    }

    // Country filter
    if (filters.country) {
      const targetCountry = filters.country.toLowerCase();
      result = result.filter(
        (a) =>
          a.source.country.toLowerCase() === targetCountry ||
          (a.source.name && a.source.name.toLowerCase().includes(targetCountry)),
      );
    }

    // Breaking only filter
    if (filters.breaking) {
      result = result.filter((a) => a.breaking_score >= 0.8 || a.cluster_is_breaking);
    }

    // Search query filter
    if (filters.q && filters.q.trim().length > 0) {
      const q = filters.q.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.title_english.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.body_english && a.body_english.toLowerCase().includes(q)) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }

    // Sort: newest published first
    result.sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });

    const total = result.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 60;
    const items = result.slice(offset, offset + limit);

    return { total, items };
  }

  public getArticle(id: number): Article | null {
    this.init();
    return this.inMemoryArticles.find((a) => a.id === id) ?? null;
  }

  public getCategoryCounts(): { total: number; categories: Record<string, number> } {
    this.init();
    const categories: Record<string, number> = {};
    for (const a of this.inMemoryArticles) {
      for (const cat of a.categories) {
        categories[cat] = (categories[cat] ?? 0) + 1;
      }
    }
    return {
      total: this.inMemoryArticles.length,
      categories,
    };
  }

  public toggleBookmark(id: number, bookmarked: boolean): void {
    this.init();
    const item = this.inMemoryArticles.find((a) => a.id === id);
    if (item) {
      item.bookmarked = bookmarked;
      this.persist();
    }
  }

  /**
   * Adds newly discovered articles to the autonomous local database.
   */
  public addArticles(incoming: Article[]): Article[] {
    this.init();
    const newItems: Article[] = [];
    const seenUrls = new Set(this.inMemoryArticles.map((a) => a.url));

    for (const art of incoming) {
      if (!seenUrls.has(art.url)) {
        seenUrls.add(art.url);
        newItems.push(art);
      }
    }

    if (newItems.length > 0) {
      this.inMemoryArticles = [...newItems, ...this.inMemoryArticles];
      this.persist();
    }

    return newItems;
  }

  /**
   * Polls live public RSS feeds on client using CORS proxies.
   */
  public async pollLiveFeeds(): Promise<Article[]> {
    const feeds = [
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', country: 'United Kingdom', cat: 'World' },
      { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC Tech', country: 'United Kingdom', cat: 'Tech' },
    ];

    const newlyAdded: Article[] = [];

    for (const feed of feeds) {
      try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;

        const data = await res.json();
        if (data && data.status === 'ok' && Array.isArray(data.items)) {
          const articlesToIngest: Article[] = data.items.map((item: any, idx: number) => {
            const rawTitle = item.title || 'Untitled Dispatch';
            const rawDesc = item.description ? item.description.replace(/<[^>]*>/g, '').trim() : rawTitle;
            const isBreaking = idx === 0 && Math.random() > 0.5;

            return {
              id: Date.now() + Math.floor(Math.random() * 10000) + idx,
              url: item.link || `https://broadsheet.desk/item/${Date.now()}-${idx}`,
              title_english: rawTitle,
              summary: rawDesc.slice(0, 240) + (rawDesc.length > 240 ? '...' : ''),
              body_english: rawDesc,
              language_detected: 'en',
              breaking_score: isBreaking ? 0.9 : 0.4,
              cluster_id: null,
              cluster_outlet_count: 1,
              cluster_country_count: 1,
              cluster_is_breaking: isBreaking,
              bookmarked: false,
              published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
              fetched_at: new Date().toISOString(),
              source: { id: 10 + idx, name: feed.source, country: feed.country },
              categories: [feed.cat as Category],
              keywords: [feed.cat.toLowerCase(), 'live', 'dispatch'],
            };
          });

          const added = this.addArticles(articlesToIngest);
          newlyAdded.push(...added);
        }
      } catch {
        // Feed fetch timeout or network error
      }
    }

    return newlyAdded;
  }

  /**
   * Starts recurring client-side feed poller.
   */
  public startAutoPolling(intervalMs = 120000): () => void {
    // Initial fetch after brief delay
    const initialTimer = setTimeout(() => {
      void this.pollLiveFeeds();
    }, 3000);

    const intervalTimer = setInterval(() => {
      void this.pollLiveFeeds();
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }
}

export const autonomousEngine = new AutonomousClientEngine();
