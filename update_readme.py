import os
import json

def fetch_feeds_from_directory(directory):
    feeds = []
    for filename in os.listdir(directory):
        if filename.endswith('.json'):
            with open(os.path.join(directory, filename), 'r', encoding='utf-8') as f:
                feeds.append(json.load(f))
    return feeds

def generate_markdown(feeds):
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

def update_readme(markdown_content, readme_path='README.md'):
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)

if __name__ == "__main__":
    rss_feeds_directory = 'rss_feeds'
    feeds = fetch_feeds_from_directory(rss_feeds_directory)
    markdown_content = generate_markdown(feeds)
    update_readme(markdown_content)
    print("README.md has been updated with the latest RSS feeds.")
