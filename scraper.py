#!/usr/bin/env python3
"""
================================================================================
FilmyFly Intelligent Auto-Scraper & Direct Database Synchronizer
================================================================================
Features:
  1. Direct DB Auto-Upload: Automatically uploads scraped movies & TV series
     directly into your Firestore database in real-time via the website API.
  2. Image & Poster Scraping: Extracts high-resolution posters & backdrops
     from web pages (<meta property="og:image">, poster tags, and thumbnails).
  3. Episode Ranges Support: Intelligently detects and expands episode ranges
     (e.g., "Episodes 1 to 10", "Ep 1-10", "S01E01-E10", "Parts 1 to 5").
  4. Auto-Correct Seasons & Episodes: Standardizes TV series seasons, zip packs,
     and multi-quality links (480p, 720p, 1080p, 4k).
  5. Resume & State Tracking: Saves crawler progress in crawler_state.json
     so you can safely pause (Ctrl+C) and resume without losing progress.
  6. Local Safe Backup: Keeps local copies in scraped_data.json and
     categorized_links.txt as an offline backup.
================================================================================
"""

import json
import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import requests

# ==============================================================================
# CONFIGURATION
# ==============================================================================
START_URL = "https://www.mp4moviez.trading/"

# The URL of your website where the Ingestion API is hosted.
# If running locally on your computer with dev server, use: "http://localhost:3000"
# If uploading to your live deployed site, put your deployed URL, e.g.:
# "https://ais-dev-n2abl3ldtshzzubxhzix7d-738539506882.asia-southeast1.run.app"
WEBSITE_URL = os.environ.get("FILMYFLY_SITE_URL", "http://localhost:3000").rstrip("/")
INGEST_API_ENDPOINT = f"{WEBSITE_URL}/api/scraper/ingest"

# Upload options
AUTO_UPLOAD_TO_DB = True      # Automatically sync to database
BATCH_UPLOAD_SIZE = 5         # Upload in small batches (e.g. 5 items) for maximum speed & stability
CRAWL_DELAY = 0.5             # Delay in seconds between requests to prevent rate limiting
SCRAPE_POSTERS = True         # Extract poster image URLs from pages

# Output Files
STATE_FILE = "crawler_state.json"
TEXT_OUTPUT_FILE = "categorized_links.txt"
JSON_OUTPUT_FILE = "scraped_data.json"

DOMAIN = urlparse(START_URL).netloc
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

# ==============================================================================
# TITLES, SEASONS, EPISODE RANGES & QUALITIES PARSER
# ==============================================================================
def parse_movie_or_series_title(raw_title):
    """
    Parses title to extract:
      - clean_title
      - year
      - is_tv_series
      - season_number
      - episode_number
      - is_episode_range
      - start_episode, end_episode
      - is_complete_season
    """
    text = re.sub(r'[-_+]', ' ', raw_title)
    text = re.sub(r'\s+', ' ', text).strip()

    # 1. Year
    year_match = re.search(r'\b(19\d\d|20\d\d)\b', text)
    year = year_match.group(1) if year_match else None

    # 2. TV Series & Episode Ranges
    is_tv = bool(re.search(r'\b(Season|Episode|S\d{1,2}|E\d{1,2}|Series|Web Series|TV Series|Anime Series|Ep\s*\d+|Part\s*\d+)\b', text, re.I))
    season_number = None
    episode_number = None
    is_episode_range = False
    start_episode = None
    end_episode = None
    is_complete_season = False

    # Check for S01E01-E10 format
    s_range = re.search(r'\bS(\d{1,2})\s*[-_]?\s*E(?:p)?(\d{1,3})\s*(?:to|-|–|—)\s*(?:E(?:p)?)?(\d{1,3})\b', text, re.I)
    if s_range:
        is_tv = True
        season_number = int(s_range.group(1))
        start_episode = int(s_range.group(2))
        end_episode = int(s_range.group(3))
        is_episode_range = True
        episode_number = start_episode
    else:
        # Check for single S01E02
        s_single = re.search(r'\bS(\d{1,2})\s*E(?:p)?(\d{1,3})\b', text, re.I)
        if s_single:
            is_tv = True
            season_number = int(s_single.group(1))
            episode_number = int(s_single.group(2))
        else:
            # Check Season: "Season 2", "S02", "Part 1"
            s_match = re.search(r'\b(?:Season|S|Part)\s*[-_]?\s*(\d{1,2})\b', text, re.I)
            if s_match:
                is_tv = True
                season_number = int(s_match.group(1))

            # Check Episode Range: "Episodes 1 to 10", "Episode 1-10", "Ep 01 to 08", "Ep 1-8", "Parts 1 to 4"
            ep_range = re.search(r'\b(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?\s*(\d{1,3})\s*(?:to|-|–|—)\s*(?:(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?)?(\d{1,3})\b', text, re.I)
            if ep_range:
                is_tv = True
                start_episode = int(ep_range.group(1))
                end_episode = int(ep_range.group(2))
                is_episode_range = True
                episode_number = start_episode
            else:
                ep_single = re.search(r'\b(?:Episode|Ep|E)\s*[-_.]?\s*(\d{1,3})\b', text, re.I)
                if ep_single:
                    is_tv = True
                    episode_number = int(ep_single.group(1))

    # Complete season pack
    if re.search(r'\b(Complete\s*(?:Season|Series|All\s*Episodes)|All\s*Episodes|Full\s*Season|Zip\s*Pack|Zip)\b', text, re.I):
        is_tv = True
        is_complete_season = True

    if is_tv and not season_number:
        season_number = 1

    # Clean title
    clean = text
    clean = re.sub(r'^Download\s+', '', clean, flags=re.I)
    clean = re.sub(r'\(\s*(19\d\d|20\d\d)\s*\)', '', clean)
    clean = re.sub(r'\b(19\d\d|20\d\d)\b', '', clean)
    clean = re.sub(r'\bS\d{1,2}\s*[-_]?\s*E(?:p)?\d{1,3}\s*(?:to|-|–|—)\s*(?:E(?:p)?)?\d{1,3}\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?\s*\d{1,3}\s*(?:to|-|–|—)\s*(?:(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?)?\d{1,3}\b', '', clean, flags=re.I)
    clean = re.sub(r'\bS\d{1,2}\s*E(?:p)?\d{1,3}\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(?:Season|S|Part)\s*[-_]?\s*\d{1,2}\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(?:Episode|Ep|E)\s*[-_.]?\s*\d{1,3}\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(Complete\s*(?:Series|Anime|Season|All\s*Episodes)|All\s*Episodes|Full\s*Season|Zip\s*Pack|Zip)\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(Hindi Dubbed|Dual Audio|Multi Audio|Hindi HQ Dubbed|Hindi ORG Dubbed|HQ Dubbed|Dubbed|Hindi)\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(English|Bhojpuri|Punjabi|Tamil|Telugu|South Hindi|Bengali|Bangla|Marathi|Gujarati|Malayalam|Kannada|Korean|Japanese)\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(Hot Web Series|Web Series|TV Series|Anime Series|Short Film|Complete Series|Full Episode)\b', '', clean, flags=re.I)
    clean = re.sub(r'\b(Movie|Full Movie|Download|HDRip|WEBRip|BluRay|HDTC|PreDVDRip|CAMRip|x264|x265|HEVC|720p|480p|1080p|360p|240p|4k|HD)\b', '', clean, flags=re.I)
    clean = re.sub(r'[()[\]{}|:\-]', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()

    if not clean or len(clean) < 2:
        clean = re.sub(r'^Download\s+', '', text, flags=re.I).strip()

    return {
        "clean_title": clean,
        "year": year,
        "is_tv": is_tv,
        "season_number": season_number,
        "episode_number": episode_number,
        "is_episode_range": is_episode_range,
        "start_episode": start_episode,
        "end_episode": end_episode,
        "is_complete_season": is_complete_season
    }

# ==============================================================================
# IMAGE & METADATA EXTRACTOR
# ==============================================================================
def extract_page_image_and_info(soup, base_url):
    """
    Extracts high-quality poster image URL and description from HTML.
    """
    poster_url = None
    description = None

    # 1. Look for OpenGraph image tag (<meta property="og:image" content="...">)
    og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    if og_img and og_img.get("content"):
        poster_url = urljoin(base_url, og_img["content"].strip())

    # 2. Look for schema / itemprop image
    if not poster_url:
        itemprop_img = soup.find("img", attrs={"itemprop": "image"})
        if itemprop_img and itemprop_img.get("src"):
            poster_url = urljoin(base_url, itemprop_img["src"].strip())

    # 3. Look for common poster containers (.poster img, .post-thumbnail img, img with 'poster' or 'cover')
    if not poster_url:
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if not src:
                continue
            alt = img.get("alt", "").lower()
            parent_classes = " ".join(img.parent.get("class", [])).lower() if img.parent else ""
            img_classes = " ".join(img.get("class", [])).lower()

            if any(k in src.lower() for k in ["poster", "cover", "thumb"]) or \
               any(k in parent_classes for k in ["poster", "thumb", "cover", "entry-image"]) or \
               any(k in img_classes for k in ["poster", "thumbnail", "cover"]) or \
               "poster" in alt:
                poster_url = urljoin(base_url, src.strip())
                break

    # 4. Extract Description
    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
    if og_desc and og_desc.get("content"):
        description = og_desc["content"].strip()

    if not description:
        story_div = soup.find("div", class_=re.compile(r"story|synopsis|desc|about", re.I))
        if story_div:
            description = story_div.get_text(strip=True)

    return poster_url, description

# ==============================================================================
# DIRECT DATABASE UPLOAD VIA INGEST API
# ==============================================================================
def upload_items_to_db(items_to_upload):
    """
    Directly uploads a list of scraped items into the Firestore database
    via the website's Ingestion API route.
    """
    if not items_to_upload:
        return True, 0

    try:
        payload = {"items": items_to_upload}
        resp = requests.post(
            INGEST_API_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            stats = data.get("stats", {})
            imp = stats.get("imported", 0)
            mer = stats.get("merged", 0)
            skip = stats.get("skipped", 0)
            print(f"  [DB SYNC SUCCESS] -> {imp} imported, {mer} merged, {skip} up-to-date in Firestore.")
            return True, imp + mer
        else:
            print(f"  [DB SYNC WARNING] Server responded with status {resp.status_code}: {resp.text[:200]}")
            return False, 0
    except requests.exceptions.ConnectionError:
        print(f"  [DB SYNC NOTICE] Could not connect to {INGEST_API_ENDPOINT}.")
        print("  (Make sure your website is running at WEBSITE_URL or update the WEBSITE_URL variable).")
        return False, 0
    except Exception as e:
        print(f"  [DB SYNC ERROR] {e}")
        return False, 0

# ==============================================================================
# STATE & CACHE HELPERS
# ==============================================================================
def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "visited_urls": [],
        "queue": [START_URL],
        "scraped_count": 0,
        "uploaded_count": 0
    }

def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[Error saving state]: {e}")

def save_local_backup(item):
    """Appends to local JSON and TXT backups."""
    # 1. JSON
    existing_items = []
    if os.path.exists(JSON_OUTPUT_FILE):
        try:
            with open(JSON_OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
        except Exception:
            existing_items = []
    
    # Avoid duplicate titles in local JSON
    if not any(i.get("title") == item.get("title") for i in existing_items):
        existing_items.append(item)
        with open(JSON_OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(existing_items, f, indent=2, ensure_ascii=False)

    # 2. Categorized TXT
    with open(TEXT_OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(f"\n{'='*70}\n")
        f.write(f"Title: {item.get('title')}\n")
        if item.get("poster_url"):
            f.write(f"Poster: {item.get('poster_url')}\n")
        if item.get("is_episode_range"):
            f.write(f"Episode Range: Ep {item.get('start_episode')} to {item.get('end_episode')}\n")
        f.write(f"Page URL: {item.get('page_url')}\n")
        f.write("Download Links:\n")
        for link in item.get("download_links", []):
            f.write(f"  - {link}\n")

# ==============================================================================
# CORE CRAWLER ENGINE
# ==============================================================================
def main():
    print("=" * 70)
    print("  FilmyFly Web Scraper & Direct Firestore Sync Engine")
    print(f"  Target Website : {START_URL}")
    print(f"  Database API   : {INGEST_API_ENDPOINT}")
    print(f"  Auto-Upload    : {'ENABLED' if AUTO_UPLOAD_TO_DB else 'DISABLED'}")
    print(f"  Poster Scraping: {'ENABLED' if SCRAPE_POSTERS else 'DISABLED'}")
    print("=" * 70)

    # Check API health
    if AUTO_UPLOAD_TO_DB:
        try:
            test_resp = requests.get(INGEST_API_ENDPOINT, timeout=5)
            if test_resp.status_code == 200:
                print("  [API Check] Online and ready for database sync!")
            else:
                print(f"  [API Check] Notice: Status {test_resp.status_code}")
        except Exception:
            print("  [API Check] Note: Dev server not yet reached at this URL.")
            print(f"  Items will still be saved to '{JSON_OUTPUT_FILE}' & retried.")

    state = load_state()
    visited_urls = set(state.get("visited_urls", []))
    queue = list(state.get("queue", [START_URL]))

    session = requests.Session()
    session.headers.update(HEADERS)

    upload_buffer = []

    try:
        while queue:
            current_url = queue.pop(0)

            if current_url in visited_urls:
                continue

            parsed = urlparse(current_url)
            if parsed.netloc != DOMAIN:
                continue

            print(f"\n[Crawling] {current_url}")
            visited_urls.add(current_url)

            try:
                resp = session.get(current_url, timeout=15)
                if resp.status_code != 200:
                    print(f"  Failed with HTTP status {resp.status_code}")
                    continue
            except Exception as e:
                print(f"  Network error: {e}")
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # Extract Title
            title_tag = soup.find("title")
            raw_title = title_tag.get_text(strip=True) if title_tag else ""
            h1_tag = soup.find("h1")
            if h1_tag and h1_tag.get_text(strip=True):
                raw_title = h1_tag.get_text(strip=True)

            # Extract Poster Image & Description
            poster_url, description = extract_page_image_and_info(soup, current_url) if SCRAPE_POSTERS else (None, None)

            # Extract Download Links
            # Mp4Moviez and similar sites use dl.php, download.php, /file/, /get/, /d/
            download_links = []
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                full_href = urljoin(current_url, href)

                if re.search(r'(dl\.php|download\.php|\/file\/|\/download\/|\/get\/|id=\d+&q=)', full_href, re.I):
                    if full_href not in download_links:
                        download_links.append(full_href)

            # If page contains download links, package the movie/series item
            if download_links and raw_title:
                parsed_meta = parse_movie_or_series_title(raw_title)

                item = {
                    "title": raw_title,
                    "clean_title": parsed_meta["clean_title"],
                    "year": parsed_meta["year"],
                    "is_tv_series": parsed_meta["is_tv"],
                    "season_number": parsed_meta["season_number"],
                    "episode_number": parsed_meta["episode_number"],
                    "is_episode_range": parsed_meta["is_episode_range"],
                    "start_episode": parsed_meta["start_episode"],
                    "end_episode": parsed_meta["end_episode"],
                    "is_complete_season": parsed_meta["is_complete_season"],
                    "page_url": current_url,
                    "poster_url": poster_url,
                    "description": description,
                    "download_links": download_links
                }

                type_str = "TV Series" if item["is_tv_series"] else "Movie"
                range_str = f" [Ep {item['start_episode']}-{item['end_episode']}]" if item["is_episode_range"] else ""
                poster_str = " [With Poster]" if poster_url else ""
                print(f"  -> Found: '{item['clean_title']}' ({type_str}{range_str}) with {len(download_links)} links{poster_str}")

                # Save local backup
                save_local_backup(item)
                upload_buffer.append(item)
                state["scraped_count"] = state.get("scraped_count", 0) + 1

                # Flush upload buffer to Firestore if limit reached
                if AUTO_UPLOAD_TO_DB and len(upload_buffer) >= BATCH_UPLOAD_SIZE:
                    print(f"\n  [Batch Ingest] Uploading {len(upload_buffer)} titles to database...")
                    success, count = upload_items_to_db(upload_buffer)
                    if success:
                        state["uploaded_count"] = state.get("uploaded_count", 0) + count
                        upload_buffer = []

            # Discover Internal Links to continue crawl
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                # Skip media streams, zips, or anchors
                if href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
                    continue
                next_url = urljoin(current_url, href).split("#")[0]
                p = urlparse(next_url)

                if p.netloc == DOMAIN:
                    # Ignore static assets
                    if not re.search(r'\.(css|js|png|jpg|jpeg|gif|svg|ico|mp4|mkv|zip|rar)$', p.path, re.I):
                        if next_url not in visited_urls and next_url not in queue:
                            queue.append(next_url)

            # Periodic State Save
            state["visited_urls"] = list(visited_urls)
            state["queue"] = queue[:2000] # Cap queue length in state file
            save_state(state)

            time.sleep(CRAWL_DELAY)

    except KeyboardInterrupt:
        print("\n\n[PAUSED] Crawl paused by user (Ctrl+C). Saving state...")

    # Final flush of remaining items in buffer
    if AUTO_UPLOAD_TO_DB and upload_buffer:
        print(f"\n[Final Ingest] Uploading final {len(upload_buffer)} items to database...")
        upload_items_to_db(upload_buffer)

    state["visited_urls"] = list(visited_urls)
    state["queue"] = queue
    save_state(state)

    print("\n" + "=" * 70)
    print("  SCRAPING COMPLETED / SAVED")
    print(f"  Total Visited Pages : {len(visited_urls)}")
    print(f"  Total Scraped Items : {state.get('scraped_count', 0)}")
    print(f"  State saved in      : {STATE_FILE}")
    print(f"  Local JSON backup   : {JSON_OUTPUT_FILE}")
    print(f"  Local TXT backup    : {TEXT_OUTPUT_FILE}")
    print("=" * 70)

if __name__ == "__main__":
    main()
