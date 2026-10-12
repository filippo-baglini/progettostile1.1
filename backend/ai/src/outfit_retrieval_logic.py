# src/ai/outfit_retrieval_logic.py (Complete updated file)

import numpy as np
import pandas as pd
from typing import List
from supabase import Client

def search_product_candidates_with_vector_db(client: Client, parsed_item_list: List[dict], budget: float|None, gender: str) -> List[List[dict]]:
    """
    Finds best product matches using a SINGLE batch vector search in Supabase.
    Returns [] if any item has no candidates or the search fails.
    """

    queries_payload = []

    for item in parsed_item_list:
        constraints = item.get('hard_constraints', {}) or {}

        embedding_list = item['embedding'].tolist() if isinstance(item['embedding'], np.ndarray) else item['embedding']

        query_obj = {
            "category": item['category'],
            "embedding": embedding_list,
            "color": constraints.get("color"),
            "material": constraints.get("material"),
            "brand": constraints.get("brand")
        }
        queries_payload.append(query_obj)

    try:
        response = client.rpc(
            "search_outfits_batch",
            {
                "queries": queries_payload,
                "match_threshold": 0.1,
                "match_count": 20,
                "max_espense": budget,
                "gender": gender
            }
        ).execute()

        if not response.data:
            print("Warning: Batch search returned no data.")
            return [] # Return empty list, let caller handle missing data
            
        flat_results = pd.DataFrame(response.data)
        
        all_candidates = []

        for i in range(len(parsed_item_list)):
            sql_index = i + 1 # this because results indices starts from 1

            item_candidates_df = flat_results[flat_results['query_index'] == sql_index]

            if item_candidates_df.empty:
                item_desc = parsed_item_list[i].get('description', 'Unknown Item')
                category = parsed_item_list[i].get('category')
                print(f"Warning: No candidates found for {item_desc} ({category}).")
                return []

            candidates_list = item_candidates_df.drop(columns=['query_index']).to_dict('records')
            all_candidates.append(candidates_list)

        return all_candidates

    except Exception as e:
        print(f"Supabase Batch RPC search error: {e}")
        return []
