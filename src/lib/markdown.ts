/** Simple Markdown-to-HTML renderer for blog content.
 *  Supports: headings (##), paragraphs, **bold**, numbered lists (1.), unordered lists (-), links [text](url), line breaks */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inNumberedList = false;
  let inUnorderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line — close open lists
    if (line.trim() === '') {
      if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
      if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
      continue;
    }

    // Headings (## and ###)
    const h3Match = line.match(/^### (.+)/);
    if (h3Match) {
      if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
      if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
      html += `<h3 class="text-xl font-bold text-gray-900 mt-8 mb-3">${processInline(h3Match[1])}</h3>\n`;
      continue;
    }
    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
      if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
      html += `<h2 class="text-2xl font-bold text-gray-900 mt-10 mb-4">${processInline(h2Match[1])}</h2>\n`;
      continue;
    }

    // Numbered list: "1. " or "2. " etc.
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (!inNumberedList) {
        if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
        html += '<ol class="list-decimal pl-6 space-y-2 my-4 text-gray-700 leading-relaxed">\n';
        inNumberedList = true;
      }
      html += `<li class="pl-1">${processInline(numMatch[2])}</li>\n`;
      continue;
    }

    // Unordered list: "- " 
    const ulMatch = line.match(/^- (.+)/);
    if (ulMatch) {
      if (!inUnorderedList) {
        if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
        html += '<ul class="list-disc pl-6 space-y-2 my-4 text-gray-700 leading-relaxed">\n';
        inUnorderedList = true;
      }
      html += `<li class="pl-1">${processInline(ulMatch[1])}</li>\n`;
      continue;
    }

    // Bold heading-style lines like "**1. Form Correction**" (standalone bold text)
    const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (boldHeadingMatch) {
      if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
      if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
      html += `<p class="font-semibold text-gray-800 mt-5 mb-2">${processInline(boldHeadingMatch[1])}</p>\n`;
      continue;
    }

    // Regular paragraph
    if (inNumberedList) { html += '</ol>\n'; inNumberedList = false; }
    if (inUnorderedList) { html += '</ul>\n'; inUnorderedList = false; }
    html += `<p class="text-gray-700 leading-relaxed mb-4">${processInline(line)}</p>\n`;
  }

  if (inNumberedList) html += '</ol>\n';
  if (inUnorderedList) html += '</ul>\n';

  return html;
}

function processInline(text: string): string {
  // Bold: **text**
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    // External link or internal
    const isExternal = url.startsWith('http');
    const attrs = isExternal
      ? `href="${url}" target="_blank" rel="noopener noreferrer"`
      : `href="${url}"`;
    return `<a ${attrs} class="text-[#1A56DB] hover:underline font-medium">${label}</a>`;
  });
  // Em dashes
  result = result.replace(/ — /g, ' \u2014 ');
  return result;
}
