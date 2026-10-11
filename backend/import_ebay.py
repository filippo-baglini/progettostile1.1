"""Import a clothing catalogue from the eBay Browse API into product_data.

Usage (from backend/):  venv/bin/python import_ebay.py
Needs EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (production keyset, developer.ebay.com) in .env.
Safe to re-run: listings already in the DB (same URL) are skipped.
"""
import io
import os
import re

import psycopg2
import requests
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from db_manager import DBManager  # also loads .env

MARKETPLACE = "EBAY_IE"  # English titles, prices in EUR
PER_QUERY = 100          # max 200 (one API call per query)
SEARCH_FILTER = "conditions:{NEW},buyingOptions:{FIXED_PRICE},price:[10..300],priceCurrency:EUR"

# (app category, audience, eBay search keywords). Categories must match query_handler.py.
QUERIES = [
    ("top", "male", "men's t-shirt"), ("top", "male", "men's shirt"),
    ("top", "male", "men's sweater"), ("top", "male", "men's hoodie"),
    ("bottom", "male", "men's jeans"), ("bottom", "male", "men's chino trousers"),
    ("bottom", "male", "men's shorts"),
    ("outerwear", "male", "men's jacket"), ("outerwear", "male", "men's coat"),
    ("swimwear", "male", "men's swim shorts"),
    ("shoes", "male", "men's sneakers"), ("shoes", "male", "men's boots"),
    ("shoes", "male", "men's loafers"),
    ("accessories", "male", "men's sunglasses"), ("accessories", "male", "men's cap"),
    ("accessories", "male", "men's watch"),
    ("top", "female", "women's t-shirt"), ("top", "female", "women's blouse"),
    ("top", "female", "women's sweater"), ("top", "female", "women's crop top"),
    ("bottom", "female", "women's jeans"), ("bottom", "female", "women's trousers"),
    ("bottom", "female", "women's skirt"), ("bottom", "female", "women's shorts"),
    ("dresses", "female", "women's dress"), ("dresses", "female", "women's maxi dress"),
    ("outerwear", "female", "women's jacket"), ("outerwear", "female", "women's coat"),
    ("swimwear", "female", "women's bikini"), ("swimwear", "female", "women's swimsuit"),
    ("shoes", "female", "women's sneakers"), ("shoes", "female", "women's heels"),
    ("shoes", "female", "women's boots"), ("shoes", "female", "women's sandals"),
    ("accessories", "female", "women's sunglasses"), ("accessories", "female", "women's scarf"),
    ("accessories", "female", "women's necklace"), ("accessories", "female", "women's handbag"),
]

COLORS = ["black", "white", "grey", "gray", "navy", "blue", "red", "green", "beige", "brown",
          "pink", "purple", "yellow", "orange", "cream", "khaki", "burgundy", "gold", "silver"]
COLOR_RE = re.compile(r"\b(" + "|".join(COLORS) + r")\b", re.I)


def get_token():
    r = requests.post(
        "https://api.ebay.com/identity/v1/oauth2/token",
        auth=(os.environ["EBAY_CLIENT_ID"], os.environ["EBAY_CLIENT_SECRET"]),
        data={"grant_type": "client_credentials", "scope": "https://api.ebay.com/oauth/api_scope"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def search(token, keywords):
    r = requests.get(
        "https://api.ebay.com/buy/browse/v1/item_summary/search",
        headers={"Authorization": f"Bearer {token}", "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE},
        params={"q": keywords, "limit": PER_QUERY, "filter": SEARCH_FILTER},
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("itemSummaries", [])


def load_image(url):
    # eBay serves any size by changing s-l<N>; 500px is plenty for CLIP's 224px input.
    url = re.sub(r"s-l\d+\.", "s-l500.", url)
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content)).convert("RGB")


def main():
    model = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip").eval()
    proc = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip", use_fast=True)
    conn = psycopg2.connect(user=DBManager.DB_USER, password=DBManager.DB_PASSWORD, host=DBManager.DB_HOST,
                            port=DBManager.DB_PORT, dbname=DBManager.DB_NAME)
    cur = conn.cursor()
    cur.execute("SELECT url FROM product_data")
    seen = {row[0] for row in cur.fetchall()}
    token = get_token()

    for category, audience, keywords in QUERIES:
        rows, images = [], []
        for item in search(token, keywords):
            url, price = item.get("itemWebUrl"), item.get("price", {})
            image_url = item.get("image", {}).get("imageUrl")
            if not url or not image_url or url in seen or price.get("currency") != "EUR":
                continue
            try:
                images.append(load_image(image_url))
            except Exception as e:
                print(f"  skip image {image_url}: {e}")
                continue
            seen.add(url)
            title = item["title"]
            color = COLOR_RE.search(title)
            rows.append((title, url, float(price["value"]), image_url, title, title,
                         color.group(1).lower() if color else None, category, audience, "in_stock"))

        if rows:
            with torch.no_grad():
                feats = model.get_image_features(**proc(images=images, return_tensors="pt"))
            feats = torch.nn.functional.normalize(feats, dim=-1)
            for row, vec in zip(rows, feats):
                cur.execute(
                    "INSERT INTO product_data (title, url, price, image_link, description, schema_description,"
                    " schema_color, main_category, audience, availability, img_embedding)"
                    " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)",
                    (*row, str(vec.tolist())),
                )
            conn.commit()
        print(f"{keywords!r}: +{len(rows)}" + (f"  e.g. {rows[0][0]!r} €{rows[0][2]}" if rows else ""))

    cur.execute("SELECT count(*) FROM product_data")
    print("Total products:", cur.fetchone()[0])


if __name__ == "__main__":
    main()
