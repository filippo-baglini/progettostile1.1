import logging
from collections import defaultdict
from typing import List

import numpy as np
from psycopg2.extras import Json

from db_manager import DBManager


def search_product_candidates_with_vector_db(parsed_item_list: List[dict], budget: float|None, gender: str) -> List[List[dict]]:
    """
    Finds best product matches using a SINGLE batch vector search (search_outfits_batch).
    Returns [] if any item has no candidates or the search fails.
    """
    queries = []
    for item in parsed_item_list:
        constraints = item.get('hard_constraints', {}) or {}
        embedding = item['embedding'].tolist() if isinstance(item['embedding'], np.ndarray) else item['embedding']
        queries.append({
            "category": item['category'],
            "embedding": embedding,
            "color": constraints.get("color"),
            "material": constraints.get("material"),
            "brand": constraints.get("brand")
        })

    try:
        rows = DBManager.run_search(
            "SELECT * FROM search_outfits_batch(%(queries)s, %(threshold)s, %(count)s, %(budget)s, %(gender)s)",
            {"queries": Json(queries), "threshold": 0.1, "count": 20, "budget": budget, "gender": gender})
    except Exception:
        logging.exception("Catalogue search failed")
        return []

    by_query = defaultdict(list)  # query_index is 1-based
    for row in rows:
        row['price'] = float(row['price'])  # a Decimal would reach the browser as a string
        by_query[row.pop('query_index')].append(row)

    for i, item in enumerate(parsed_item_list, 1):
        if not by_query[i]:
            logging.warning(f"No candidates found for {item.get('description', 'Unknown Item')} ({item.get('category')}).")
            return []
    return [by_query[i] for i in range(1, len(parsed_item_list) + 1)]
