import { extract } from '@extractus/feed-extractor';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const parserOptions = {
  getExtraEntryFields: (feedType) => {
    if (feedType === 'json') return ['external_url'];
    if (feedType === 'atom') return ['summary'];
    return [];
  },
  timeout: 10000 // 10 second timeout
};

const feedUrls = [
  'https://cpfcoaching.com/feed.xml',
  'https://example.com/rss'
];

async function processFeed(url) {
  try {
    console.log(`Fetching feed: ${url}`);
    const feed = await extract(url, parserOptions);
    
    feed.items.forEach(item => {
      const pubDate = new Date(item.pubDate || item.published || item.date);
      const dirtyContent = item.content || item.description || '';
      const cleanContent = DOMPurify.sanitize(dirtyContent, {
        ALLOWED_TAGS: ['p', 'a', 'em', 'strong'],
        ALLOWED_ATTR: ['href']
      });

      const safeFilename = `${Buffer.from(item.id || item.link).toString('base64').slice(0, 32)}.md`;
      const filepath = path.join(process.cwd(), '_rss_posts', safeFilename);

      const frontmatter = `---
title: "${(item.title || '').replace(/"/g, '\\"')}"
date: ${pubDate.toISOString()}
external_url: "${item.link}"
---\n\n${cleanContent}`;
      
      fs.writeFileSync(filepath, frontmatter);
      console.log(`Processed: ${item.title}`);
    });
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error.message);
  }
}

async function processFeeds() {
  for (const url of feedUrls) {
    await processFeed(url);
  }
}

processFeeds().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});