# Refinement Logic Report

## Overview
The "Refinement Logic" allows users to modify specific parts of a generated outfit (e.g., "Change the shoes", "Remove the jacket") without regenerating the entire ensemble. This preserves the context and style of the existing items while executing precise updates.

The logic resides primarily in `backend/ai/src/app.py` within the `outfit_recommendation_handler`.

---

## 1. Intent Detection & Plan Generation
When a user sends a prompt, the **Gemini LLM** (via `query_handler.py`) analyzes the intent. If it detects a modification request, it outputs a JSON plan with:
- **`refinement_type`**: Set to `"REFINE_CURRENT"`.
- **`modifications`**: A list of actions to perform encoded as structured objects.

### Modification Actions
Each modification object contains:
- **`action`**: `REMOVE`, `REPLACE`, or `ADD`.
- **`item_id`**: The ID of the item to modify (for REMOVE/REPLACE).
- **`new_item`**: Description of the new item (for REPLACE/ADD).

---

## 2. Target Identification
Before processing, the backend must identify *which* outfit to refine.
1. **Explicit Selection**: If the frontend sends `selected_message_id` and `selected_outfit_index`, the backend retrieves that specific outfit from the history.
2. **Implicit Selection**: If not provided, it defaults to the **last generated outfit** in the conversation history.

This target outfit becomes the **Baseline State**.

---

## 3. The Locking Mechanism
The core of the refinement logic is the **Lock vs. Search** strategy.

### Step A: Initialize Active Set
The system creates a map of "Active Items" from the Baseline State.
```python
active_previous_items = { item_id: item_data }
```

### Step B: Process Deletions (REMOVE / REPLACE)
The system iterates through the `modifications` list.
- If an action is `REMOVE` or `REPLACE` targeting `item_id_X`, `item_id_X` is **removed** from `active_previous_items`.
- *Result*: The item is effectively deleted from the outfit "buffer".

### Step C: Lock Remaining Items
Any item remaining in `active_previous_items` is considered **Locked**.
- These items are **SKIP** vector search.
- They are added directly to the candidate pool for the final assembly.
- Their prices count towards the "Reserved Budget".

---

## 4. New Item Integration (ADD / REPLACE)
For `ADD` or `REPLACE` actions, the system initiates a **Vector Search**:
1. **Query Construction**: A text query is built from the `new_item` description (e.g., "Red leather boots detailed").
2. **Embedding**: The query is converted to a vector using the **CLIP Model**.
3. **Retrieval**: The system searches the Supabase Vector DB for matching items.
4. **Candidate Pool**: The retrieved items are added as "Open Candidates" for the specific slot.

---

## 5. Budget Handling
Refinement has specialized budget logic to ensure consistency:
1. **Inheritance**: By default, the refinement session inherits the budget of the original outfit (`target_outfit_budget`).
2. **Override**: If the user explicitly mentions a new budget (e.g., "Make it under 200€") *and* it differs from the original, the global budget is updated.

---

## 6. Final Assembly
The `get_outfit` (Knapsack algorithm) function is called with a mix of inputs:
- **Locked Items**: Single-choice lists (Cost is fixed).
- **New Candidates**: Multiple-choice lists (Cost varies).

**The Algorithm**:
1. Calculates the cost of all Locked items.
2. Subtracts this from the Total Budget -> `Remaining Budget`.
3. Selects the best combination of **New Candidates** that fits within the `Remaining Budget`.
4. Merges Locked + New items into the final `REFINE_CURRENT` result.

## Summary Flow
1. **User**: "Change the pants to jeans."
2. **LLM**: Plan -> `Action: REPLACE`, `Target: Pants_ID`, `New: Jeans`.
3. **Backend**:
   - `active_items` = [Shirt, Shoes, Jacket] (Pants removed).
   - **Locks** Shirt, Shoes, Jacket.
   - **Searches** for "Jeans".
4. **Assembly**: Combines [Shirt, Shoes, Jacket] + [Best Jean Option].
5. **Result**: A new outfit maintaining the original top/shoes/jacket but with new jeans.
