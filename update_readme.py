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

def update_readme(markdown_content, readme_path='README.md'):
    try:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        logging.info(f"Successfully updated {readme_path}")
    except Exception as e:
        logging.error(f"Error updating {readme_path}: {e}")

if __name__ == "__main__":
    rss_feeds_directory = 'rss_feeds'
    feeds = fetch_feeds_from_directory(rss_feeds_directory)
    markdown_content = generate_markdown(feeds)
    update_readme(markdown_content)
    logging.info("README.md has been updated with the latest RSS feeds.")
