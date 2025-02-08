import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_feeds_from_directory(directory):
    try:
        feeds = []
        for filename in os.listdir(directory):
            if filename.endswith('.json'):
                with open(os.path.join(directory, filename), 'r', encoding='utf-8') as f:
                    feeds.append(json.load(f))
        return feeds
    except Exception as e:
        logging.error(f"Error fetching feeds from directory {directory}: {e}")
        return []

def generate_markdown(feeds):
    try:
        markdown_content = "# RSS Feeds of various content from Christophe Foulon\n\n"
        for feed in feeds:
            feed_title = feed.get('feed', {}).get('title', 'No Title')
            markdown_content += f"## {feed_title}\n\n"
            for entry in feed.get('entries', []):
                entry_title = entry.get('title', 'No Title')
                entry_link = entry.get('link', '#')
                markdown_content += f"- [{entry_title}]({entry_link})\n"
            markdown_content += "\n"
        return markdown_content
    except Exception as e:
        logging.error(f"Error generating markdown: {e}")
        return ""

def fetch_blog_posts(directory):
    try:
        blog_posts = []
        for filename in os.listdir(directory):
            if filename.endswith('.md'):
                blog_posts.append(filename)
        return blog_posts
    except Exception as e:
        logging.error(f"Error fetching blog posts from directory {directory}: {e}")
        return []

def generate_blog_posts_markdown(blog_posts, directory):
    try:
        markdown_content = "## Blog Posts\n\n"
        for post in blog_posts:
            post_title = post.replace('.md', '').replace('_', ' ').title()
            post_link = os.path.join(directory, post)
            markdown_content += f"- [{post_title}]({post_link})\n"
        markdown_content += "\n"
        return markdown_content
    except Exception as e:
        logging.error(f"Error generating blog posts markdown: {e}")
        return ""

def update_readme(rss_markdown_content, blog_posts_markdown_content, readme_path='README.md'):
    try:
        if os.path.exists(readme_path):
            with open(readme_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
        else:
            existing_content = "# RSS Feeds of various content from Christophe Foulon\n\n"

        new_content = existing_content + rss_markdown_content + blog_posts_markdown_content

        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        logging.info(f"Successfully updated {readme_path}")
    except Exception as e:
        logging.error(f"Error updating {readme_path}: {e}")

if __name__ == "__main__":
    rss_feeds_directory = 'rss_feeds'
    blog_posts_directory = 'blog_repo'

    feeds = fetch_feeds_from_directory(rss_feeds_directory)
    rss_markdown_content = generate_markdown(feeds)

    blog_posts = fetch_blog_posts(blog_posts_directory)
    blog_posts_markdown_content = generate_blog_posts_markdown(blog_posts, blog_posts_directory)

    update_readme(rss_markdown_content, blog_posts_markdown_content)
    logging.info("README.md has been updated with the latest RSS feeds and blog posts.")
