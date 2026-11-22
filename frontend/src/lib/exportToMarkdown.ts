/**
 * frontend/src/lib/exportToMarkdown.ts
 * Obsidian & Notion Markdown Exporter with YAML frontmatter & pull-quotes (PRD Master Expansion #40).
 */
import type { Article } from '../types';

export function generateArticleMarkdown(
  article: Article,
  options?: {
    includeNotes?: Array<string | { text: string }>;
    summaryTier?: 'executive' | 'deep';
  }
): string {
  const publishedDate = article.published_at
    ? new Date(article.published_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const categories = article.categories?.join(', ') || 'World News';
  const tags = (article.categories || ['world-news'])
    .map((c) => `#${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
    .join(' ');

  const yamlHeader = `---
title: "${(article.title_english || 'Untitled Dispatch').replace(/"/g, '\\"')}"
date: ${publishedDate}
source: "${article.source.name}"
country: "${article.source.country}"
categories: [${categories}]
url: "${article.url}"
urgency_score: ${article.breaking_score}
syndicate: "The World Desk Archive"
exported_at: "${new Date().toISOString()}"
---`;

  let markdown = `${yamlHeader}

# ${article.title_english}

*Published by **${article.source.name}** (${article.source.country}) · ${publishedDate}*  
*Categories: ${tags}*

---

`;

  if (article.summary) {
    markdown += `> [!NOTE] Executive Dispatch Brief
> ${article.summary.split('. ').join('.\n> ')}

---

`;
  }

  // Body content
  const body = article.body_english || article.summary || '';
  const paragraphs = body.split(/\n\s*\n|\r\n\r\n/).filter(Boolean);

  if (paragraphs.length > 0) {
    markdown += paragraphs.map((p) => p.trim()).join('\n\n');
  } else {
    markdown += `*No full text available. Read original reporting at [${article.source.name}](${article.url}).*`;
  }

  markdown += '\n\n---\n';

  // Marginalia / Notes if present
  if (options?.includeNotes && options.includeNotes.length > 0) {
    markdown += `### ✒ Editorial Marginalia & Notes\n\n`;
    options.includeNotes.forEach((note, idx) => {
      const text = typeof note === 'string' ? note : note.text;
      markdown += `- **Note ${idx + 1}**: ${text}\n`;
    });
    markdown += '\n---\n';
  }

  markdown += `*Archived via [The World Desk & Wire](file://${article.url})*\n`;

  return markdown;
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
