import { extract } from '@extractus/feed-extractor';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RSS_POSTS_DIR = '_rss_posts';
const README_PATH = 'README.md';
const FEED_CACHE_FILE = '.feed-cache.json';

// Setup JSDOM and DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Track all processed items for README generation
let allProcessedItems = [];

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
    if (!response.ok) return;

    const feed = await extract(url, parserOptions);
    if (!feed?.items?.length) return;

    const postsDir = path.join(process.cwd(), RSS_POSTS_DIR);
    fs.mkdirSync(postsDir, { recursive: true });

    for (const item of feed.items) {
      try {
        const pubDate = new Date(item.pubDate || item.published || item.date || new Date());
        const cleanContent = DOMPurify.sanitize(item.content || item.description || '', {
          ALLOWED_TAGS: ['p', 'a', 'em', 'strong', 'h1', 'h2', 'h3', 'ul', 'li', 'code', 'pre'],
          ALLOWED_ATTR: ['href', 'class']
        });

        const processedItem = {
          title: item.title || 'Untitled',
          date: pubDate,
          url: item.link || url,
          author: item.author || feed.title,
          source: feed.title || url,
          categories: item.categories || []
        };

        // Store for README generation
        allProcessedItems.push(processedItem);

        // Generate Jekyll post
        const safeId = Buffer.from(item.id || item.link || Date.now().toString())
          .toString('base64')
          .replace(/[/+=]/g, '')
          .slice(0, 32);

        const frontmatter = {
          title: processedItem.title,
          date: processedItem.date.toISOString(),
          external_url: processedItem.url,
          author: processedItem.author,
          categories: processedItem.categories,
          feed_source: processedItem.source,
          layout: 'post'
        };

        const content = `---\n${Object.entries(frontmatter)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n')}\n---\n\n${cleanContent}`;

        fs.writeFileSync(path.join(postsDir, `${safeId}.md`), content);
      } catch (itemError) {
        console.error(`Error processing item from ${url}:`, itemError);
      }
    }
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error);
  }
}

function generateReadme() {
  // Sort items by date descending
  allProcessedItems.sort((a, b) => b.date - a.date);

  const readmeContent = `# Recent Blog Posts\n\n${allProcessedItems
    .map(item => {
      const date = item.date.toISOString().split('T')[0];
      return `* [${item.title}](${item.url}) - ${date} - ${item.author}`;
    })
    .join('\n')}\n`;

  fs.writeFileSync(README_PATH, readmeContent);
}

// Main execution
async function processFeeds() {
  const cache = loadCache();
  const feedUrls = [
    'https://cpf-coaching.com/blogs/rss.xml',
    // Add more feed URLs here
  ];

  try {
    allProcessedItems = []; // Reset for fresh run
    await Promise.all(feedUrls.map(url => processFeed(url, cache)));
    generateReadme();
    console.log('All feeds processed and README updated');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

processFeeds();
