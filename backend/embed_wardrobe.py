"""One-off: FashionCLIP embeddings for wardrobe pieces uploaded before the outfit AI could use them.
Run after migrations/2026-10-13_wardrobe_outfits.sql:  venv/bin/python embed_wardrobe.py"""

from flask import Flask
from transformers import CLIPModel, CLIPProcessor

from ai.src.query_embedder import get_image_embedding_vector
from db_manager import DBManager
from storage_manager import download_image

model = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip")
proc = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip", use_fast=True)

with Flask(__name__).app_context():  # DBManager keeps its connection on flask.g
    conn = DBManager.get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id, image_id FROM wardrobe_items WHERE img_embedding IS NULL")
        rows = cur.fetchall()
        for item_id, image_id in rows:
            image = download_image(image_id, "wardrobe")
            if not image:
                print(f"piece {item_id}: photo not found, skipped")
                continue
            vec = get_image_embedding_vector(model, proc, "cpu", image)
            cur.execute("UPDATE wardrobe_items SET img_embedding = %s::vector WHERE id = %s", (str(vec.tolist()), item_id))
            conn.commit()
            print(f"piece {item_id}: embedded")
    print(f"done, {len(rows)} piece(s) without an embedding")
