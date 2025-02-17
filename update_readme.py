import os
import json
import logging
import markdown

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
        seen_entries = set()
        for feed in feeds:
            feed_title = feed.get('feed', {}).get('title', 'No Title')
            markdown_content += f"## {feed_title}\n\n"
            for entry in feed.get('entries', []):
                entry_title = entry.get('title', 'No Title')
                entry_link = entry.get('link', '#')
                if entry_link not in seen_entries:
                    markdown_content += f"- [{entry_title}]({entry_link})\n"
                    seen_entries.add(entry_link)
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

def generate_blog_posts_markdown(blog_posts, directory, section_title):
    try:
        markdown_content = f"## {section_title}\n\n"
        for post in blog_posts:
            post_title = post.replace('.md', '').replace('_', ' ').title()
            post_link = os.path.join(directory, post)
            markdown_content += f"- [{post_title}]({post_link})\n"
        markdown_content += "\n"
        return markdown_content
    except Exception as e:
        logging.error(f"Error generating blog posts markdown: {e}")
        return ""

def markdown_to_html(markdown_content):
    return markdown.markdown(markdown_content)

def update_readme_and_index(rss_markdown_content, blog_posts_markdown_content, older_blogs_markdown_content, readme_path='README.md', index_path='index.html'):
    try:
        if os.path.exists(readme_path):
            with open(readme_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
        else:
            existing_content = "# RSS Feeds of various content from Christophe Foulon\n\n"

        new_content = existing_content + rss_markdown_content + blog_posts_markdown_content + older_blogs_markdown_content

        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        logging.info(f"Successfully updated {readme_path}")

        # Update index.html with the same content
        html_content = markdown_to_html(new_content)
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        logging.info(f"Successfully updated {index_path}")

    except Exception as e:
        logging.error(f"Error updating {readme_path} or {index_path}: {e}")

if __name__ == "__main__":
    rss_feeds_directory = 'rss_feeds'
    blog_posts_directory = 'blog_repo'
    older_blogs_directory = 'older_blog_repo'  # Assuming older blogs are in a different directory

    feeds = fetch_feeds_from_directory(rss_feeds_directory)
    rss_markdown_content = generate_markdown(feeds)

    blog_posts = fetch_blog_posts(blog_posts_directory)
    blog_posts_markdown_content = generate_blog_posts_markdown(blog_posts, blog_posts_directory, "Blog Posts")

    older_blogs = fetch_blog_posts(older_blogs_directory)  # Fetch older blogs from a different directory
    older_blogs_markdown_content = generate_blog_posts_markdown(older_blogs, older_blogs_directory, "Older Blogs")

    update_readme_and_index(rss_markdown_content, blog_posts_markdown_content, older_blogs_markdown_content)
    logging.info("README.md and index.html have been updated with the latest RSS feeds and blog posts.")
