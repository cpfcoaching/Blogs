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
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
  }
};

// Updated feed URL with the correct domain and path
const feedUrls = [
  'https://cpf-coaching.com/blogs/rss.xml'
];

async function processFeed(url) {
  try {
    console.log(`Fetching feed: ${url}`);
    const feed = await extract(url, parserOptions);
    
    if (!feed || !feed.items || !Array.isArray(feed.items)) {
      console.error(`No items found in feed: ${url}`);
      return;
    }

    feed.items.forEach(item => {
      try {
        const pubDate = new Date(item.pubDate || item.published || item.date || new Date());
        const dirtyContent = item.content || item.description || '';
        const cleanContent = DOMPurify.sanitize(dirtyContent, {
          ALLOWED_TAGS: ['p', 'a', 'em', 'strong'],
          ALLOWED_ATTR: ['href']
        });

        const safeId = Buffer.from(item.id || item.link || Date.now().toString())
          .toString('base64')
          .replace(/[/+=]/g, '')
          .slice(0, 32);
        const safeFilename = `${safeId}.md`;
        const filepath = path.join(process.cwd(), '_rss_posts', safeFilename);

        const frontmatter = `---\ntitle: \"${(item.title || 'Untitled').replace(/\"/g, '\\\"')}\"\ndate: ${pubDate.toISOString()}\nexternal_url: \"${item.link || url}\"\n---\n\n${cleanContent}`;
        
        fs.writeFileSync(filepath, frontmatter);
        console.log(`Processed: ${item.title || 'Untitled'}`);
      } catch (itemError) {
        console.error(`Error processing item:`, itemError);
      }
    });
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error.message);
  }
}

async function processFeeds() {
  try {
    for (const url of feedUrls) {
      await processFeed(url);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

processFeeds();
