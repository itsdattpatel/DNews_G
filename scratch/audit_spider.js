const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const terms = [
  'spider',
  'reader',
  'scout',
  'weaver',
  'swarm',
  'red alert',
  'redalert',
  'archive spider',
  'ik',
  'inverse kinematics',
  'legs',
  'crawl animation',
  'crawl',
  'spawn',
  'maxspiders',
  'max_spiders',
  'spidertype',
  'spider_type',
  'suggested spider',
  'scribble',
];

const excludeDirs = ['node_modules', '.git', 'dist', 'coverage', 'scratch'];
const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.sqlite', '.db', '.log', '.woff', '.woff2', '.ttf', '.eot', '.pdf'];

function scanDir(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) continue;
      scanDir(fullPath, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (binaryExts.includes(ext)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        const fileMatches = [];
        lines.forEach((line, idx) => {
          const lower = line.toLowerCase();
          for (const term of terms) {
            // Check word boundary or substring depending on term
            let matched = false;
            if (term === 'ik') {
              // Word boundary for IK
              matched = /\bik\b|\b_ik\b|\bik_/i.test(line);
            } else if (term === 'reader') {
              // Check if it's spider reader or reader component/font
              // We'll capture and classify
              matched = lower.includes('reader');
            } else if (term === 'legs') {
              matched = lower.includes('legs') || lower.includes('leg');
            } else {
              matched = lower.includes(term);
            }
            if (matched) {
              fileMatches.push({
                line: idx + 1,
                term,
                text: line.trim(),
              });
              break;
            }
          }
        });
        if (fileMatches.length > 0) {
          results.push({ file: relPath.replace(/\\/g, '/'), matches: fileMatches });
        }
      } catch (err) {
        // ignore read errors
      }
    }
  }
  return results;
}

const allResults = scanDir(rootDir);
console.log(`Found ${allResults.length} files matching spider terms.`);

const output = allResults.map(r => {
  return {
    file: r.file,
    count: r.matches.length,
    terms: Array.from(new Set(r.matches.map(m => m.term))),
    samples: r.matches.slice(0, 5).map(m => `L${m.line} [${m.term}]: ${m.text.slice(0, 120)}`)
  };
});

fs.writeFileSync(path.join(__dirname, 'audit_results.json'), JSON.stringify(output, null, 2), 'utf8');
console.log('Saved detailed results to scratch/audit_results.json');

