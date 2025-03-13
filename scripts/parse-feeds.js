const fs = require('fs');
const path = require('path');
const { extract } = require('@extractus/feed-extractor');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const parserOptions = {
  getExtraEntryFields: (feedType) => {
    if (feedType === 'json') return ['external_url'];
    if (feedType === 'atom') return ['summary'];
    return [];
  }
};

const feedUrls = [
  'https://cpfcoaching.com/feed.xml',
  'https://example.com/rss'
];

async function processFeeds() {
  for (const url of feedUrls) {
    const feed = await extract(url, parserOptions);
    feed.items.forEach(item => {
      const pubDate = new Date(item.pubDate || item.published || item.date);
      const dirtyContent = item.content;
      const cleanContent = DOMPurify.sanitize(dirtyContent, {
        ALLOWED_TAGS: ['p', 'a', 'em', 'strong'],
        ALLOWED_ATTR: ['href']
      });

      const safeFilename = path.basename(item.id) + '.md';
      const filepath = path.join('_rss_posts', safeFilename);

      const frontmatter = `---
title: "${item.title}"
date: ${pubDate.toISOString()}
external_url: "${item.link}"
---\n\n${cleanContent}`;
      fs.writeFileSync(filepath, frontmatter);
    });
  }
}

processFeeds();