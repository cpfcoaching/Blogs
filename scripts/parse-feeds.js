import { extract } from '@extractus/feed-extractor';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Configure constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RSS_POSTS_DIR = '_rss_posts';
const FEED_CACHE_FILE = '.feed-cache.json';

// Setup JSDOM and DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Enhanced parser options
const parserOptions = {
  getExtraEntryFields: (feedType) => {
    if (feedType === 'json') return ['external_url', 'author', 'category'];
    if (feedType === 'atom') return ['summary', 'author', 'category'];
    return ['author', 'category'];
  },
  timeout: 30000,
  headers: {
    'User-Agent': 'GitHub-Pages-RSS-Reader/1.0'
  }
};

// Cache management
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(FEED_CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(FEED_CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Enhanced fetch with retry and caching
async function fetchWithRetry(url, cache) {
  const lastFetch = cache[url]?.lastFetch;
  const now = Date.now();
  
  // Only fetch if cache is older than 1 hour
  if (lastFetch && (now - lastFetch < 3600000)) {
    console.log(`Using cached version for ${url}`);
    return { ok: true, cached: true, data: cache[url].data };
  }

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Fetching ${url} (attempt ${i + 1}/${MAX_RETRIES})`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.text();
      
      // Update cache
      cache[url] = { lastFetch: now, data };
      saveCache(cache);
      
      return { ok: true, cached: false, data };
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function processFeed(url, cache) {
  try {
    const response = await fetchWithRetry(url, cache);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}`);
      return;
    }

    const feed = await extract(url, parserOptions);
    if (!feed?.items?.length) {
      console.error(`No items found in feed: ${url}`);
      return;
    }

    // Ensure posts directory exists
    const postsDir = path.join(process.cwd(), RSS_POSTS_DIR);
    fs.mkdirSync(postsDir, { recursive: true });

    // Process feed items
    for (const item of feed.items) {
      try {
        const pubDate = new Date(item.pubDate || item.published || item.date || new Date());
        const cleanContent = DOMPurify.sanitize(item.content || item.description || '', {
          ALLOWED_TAGS: ['p', 'a', 'em', 'strong', 'h1', 'h2', 'h3', 'ul', 'li', 'code', 'pre'],
          ALLOWED_ATTR: ['href', 'class']
        });

        const safeId = Buffer.from(item.id || item.link || Date.now().toString())
          .toString('base64')
          .replace(/[/+=]/g, '')
          .slice(0, 32);
          
        const frontmatter = {
          title: item.title || 'Untitled',
          date: pubDate.toISOString(),
          external_url: item.link || url,
          author: item.author || feed.title,
          categories: item.categories || [],
          feed_source: feed.title || url,
          layout: 'post'
        };

        const content = `---\n${Object.entries(frontmatter)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n')}\n---\n\n${cleanContent}`;

        fs.writeFileSync(path.join(postsDir, `${safeId}.md`), content);
        console.log(`✓ Processed: ${frontmatter.title}`);
      } catch (itemError) {
        console.error(`Error processing item from ${url}:`, itemError);
      }
    }
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error);
  }
}

// Main execution
async function processFeeds() {
  const cache = loadCache();
  const feedUrls = [
    'https://cpf-coaching.com/blogs/rss.xml',
    // Add more feed URLs here
  ];

  try {
    await Promise.all(feedUrls.map(url => processFeed(url, cache)));
    console.log('All feeds processed successfully');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

processFeeds();
