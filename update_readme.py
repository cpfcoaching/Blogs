import os, json, logging, feedparser, markdown
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Fetch JSON feeds from a directory
def fetch_feeds_from_directory(directory: str) -> List[Dict[str, Any]]:
    try:
        return [json.load(open(os.path.join(directory, f), 'r', encoding='utf-8')) for f in os.listdir(directory) if f.endswith('.json')]
    except Exception as e:
        logging.error(f"Error fetching feeds from directory {directory}: {e}")
        return []

# Fetch RSS feed from a URL
def fetch_rss_feed(url: str) -> Dict[str, Any]:
    try:
        return feedparser.parse(url)
    except Exception as e:
        logging.error(f"Error fetching RSS feed from {url}: {e}")
        return {}

# Generate markdown content from feeds
def generate_markdown(feeds: List[Dict[str, Any]]) -> str:
    try:
        markdown_content, seen_entries = "# RSS Feeds of various content from Christophe Foulon\n\n", set()
        for feed in feeds:
            feed_title = feed.get('feed', {}).get('title', 'No Title')
            markdown_content += f"## {feed_title}\n\n"
            for entry in feed.get('entries', []):
                entry_title, entry_link = entry.get('title', 'No Title'), entry.get('link', '#')
                if entry_link not in seen_entries:
                    markdown_content += f"- [{entry_title}]({entry_link})\n"
                    seen_entries.add(entry_link)
            markdown_content += "\n"
        return markdown_content
    except Exception as e:
        logging.error(f"Error generating markdown: {e}")
        return ""

# Fetch markdown blog posts from a directory
def fetch_blog_posts(directory: str) -> List[str]:
    try:
        return [f for f in os.listdir(directory) if f.endswith('.md')]
    except Exception as e:
        logging.error(f"Error fetching blog posts from directory {directory}: {e}")
        return []

# Generate markdown content for blog posts
def generate_blog_posts_markdown(blog_posts: List[str], directory: str, section_title: str) -> str:
    try:
        markdown_content = f"## {section_title}\n\n"
        for post in blog_posts:
            post_title, post_link = post.replace('.md', '').replace('_', ' ').title(), os.path.join(directory, post)
            markdown_content += f"- [{post_title}]({post_link})\n"
        return markdown_content + "\n"
    except Exception as e:
        logging.error(f"Error generating blog posts markdown: {e}")
        return ""

# Extract H1 title from a markdown file
def extract_h1_from_markdown(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        html_content = markdown.markdown(content)
        start_index, end_index = html_content.find('<h1>'), html_content.find('</h1>')
        return html_content[start_index + 4:end_index] if start_index != -1 and end_index != -1 else "No Title"
    except Exception as e:
        logging.error(f"Error extracting H1 from {file_path}: {e}")
        return "No Title"

# Generate markdown content for older blogs
def generate_older_blogs_markdown(blog_posts: List[str], directory: str, section_title: str) -> str:
    try:
        markdown_content = f"## {section_title}\n\n"
        for post in blog_posts:
            post_title, post_link = extract_h1_from_markdown(os.path.join(directory, post)), os.path.join(directory, post)
            markdown_content += f"- [{post_title}]({post_link})\n"
        return markdown_content + "\n"
    except Exception as e:
        logging.error(f"Error generating older blogs markdown: {e}")
        return ""

# Convert markdown content to HTML
def markdown_to_html(markdown_content: str) -> str:
    try:
        return markdown.markdown(markdown_content)
    except Exception as e:
        logging.error(f"Error converting markdown to HTML: {e}")
        return ""

# Update README.md and index.html with new content
def update_readme_and_index(rss_markdown_content: str, blog_posts_markdown_content: str, older_blogs_markdown_content: str, readme_path: str = 'README.md', index_path: str = 'index.html') -> None:
    try:
        existing_content = open(readme_path, 'r', encoding='utf-8').read() if os.path.exists(readme_path) else "# RSS Feeds of various content from Christophe Foulon\n\n"
        new_content = existing_content + rss_markdown_content + blog_posts_markdown_content + older_blogs_markdown_content
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        logging.info(f"Successfully updated {readme_path}")
        html_content = markdown_to_html(new_content)
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        logging.info(f"Successfully updated {index_path}")
    except Exception as e:
        logging.error(f"Error updating {readme_path} or {index_path}: {e}")

if __name__ == "__main__":
    rss_feeds_directory, blog_posts_directory, older_blogs_directory = 'rss_feeds', 'blog_repo', 'older_blog_repo'
    feeds = fetch_feeds_from_directory(rss_feeds_directory)
    rss_markdown_content = generate_markdown(feeds)
    blog_posts = fetch_blog_posts(blog_posts_directory)
    blog_posts_markdown_content = generate_blog_posts_markdown(blog_posts, blog_posts_directory, "Blog Posts")
    older_blogs = fetch_blog_posts(older_blogs_directory)
    older_blogs_markdown_content = generate_older_blogs_markdown(older_blogs, older_blogs_directory, "Older Blogs")
    update_readme_and_index(rss_markdown_content, blog_posts_markdown_content, older_blogs_markdown_content)
    logging.info("README.md and index.html have been updated with the latest RSS feeds and blog posts.")
