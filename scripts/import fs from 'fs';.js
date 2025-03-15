import fs from 'fs';
import path from 'path';

const RSS_POSTS_DIR = '_rss_posts';

function testFeeds() {
  console.log('Testing RSS posts generation...');
  
  const postsDir = path.join(process.cwd(), RSS_POSTS_DIR);
  
  if (!fs.existsSync(postsDir)) {
    console.error('Posts directory does not exist!');
    process.exit(1);
  }
  
  const files = fs.readdirSync(postsDir);
  console.log(`Found ${files.length} posts in ${RSS_POSTS_DIR}/`);
  
  if (files.length === 0) {
    console.error('No posts were generated!');
    process.exit(1);
  }
  
  console.log('Test passed successfully!');
}

testFeeds();