# Frontend-Backend Interaction Report

## Overview
The **StyleFinderAI** application consists of a **React** frontend and a **Flask** backend. The interaction follows a standard **REST API** pattern where the frontend consumes JSON endpoints exposed by the backend.

- **Base URL**: `http://localhost:8000` (Local Development)
- **Authentication**: Session-based using cookies (`Flask-Login`).
- **Communication Format**: JSON for most requests; `multipart/form-data` for image uploads.

---

## 1. Authentication & User Management
The application uses stateful session-based authentication. Upon successful login, the backend sets a secure `session` cookie which is sent automatically by the browser in subsequent requests.

### Endpoints

#### **Login**
- **Endpoint**: `POST /api/user/login`
- **Request (JSON)**:
  ```json
  {
    "email": "user@example.com",
    "password": "secretparams"
  }
  ```
- **Response**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "user": {
        "id": 1,
        "name": "User Name",
        "email": "user@example.com",
        "preferences": { "Brand": "Nike", "Genere": "male" }
      }
    }
    ```
  - `401 Unauthorized`: Credentials invalid.

#### **Signup**
- **Endpoint**: `POST /api/user/`
- **Request (JSON)**:
  ```json
  {
    "name": "New User",
    "email": "new@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  - `201 Created`: `{"success": true}`
  - `409 Conflict`: Email already exists.

#### **Google OAuth Login**
- **Endpoint**: `POST /api/user/google-login`
- **Request (JSON)**:
  ```json
  { "credential": "GOOGLE_ID_TOKEN_OR_ACCESS_TOKEN" }
  ```
- **Response**: Same as Standard Login (`200 OK` with user data).

#### **Session Check**
- **Endpoint**: `GET /api/user/session`
- **Purpose**: Called on app load to restore user state if the cookie is valid.
- **Response**:
  - `200 OK`: `{"success": true, "user": { ... }}`
  - `401/500`: No active session.

#### **Logout**
- **Endpoint**: `GET /api/user/logout`
- **Action**: Clears the session cookie on the server.
- **Response**: `{"success": true}`

---

## 2. Chat & Outfit Recommendations
This is the core functionality. The frontend sends user prompts (text/images), and the backend runs the AI pipeline to generate outfit recommendations.

### Core Endpoint: Send Message
- **Endpoint**: `POST /api/messages/send`
- **Purpose**: Send a user message, optional image, or feedback on a previous outfit.
- **Content-Type**:
  - `application/json` (if text only)
  - `multipart/form-data` (if uploading an image)

#### **Request Parameters**
| Field | Type | Description |
|-------|------|-------------|
| `message` | String | User's query or prompt. |
| `conv_id` | String/Int | (Optional) ID of existing conversation. If missing, a new one is created. |
| `image` | File | (Optional) Image file for visual search. |
| `selected_outfit_index` | Int | (Optional) Index of a selected outfit if refining a specific one. |
| `selected_message_id` | String | (Optional) Context ID when replying to a specific AI suggestion. |
| `gender` | String | (Optional) Guest gender ('male'/'female'). |

#### **Response Model (JSON)**
The backend returns a complex object describing the conversation state and recommendations, with behavior dependent on the `status` field.

```json
{
  "status": "COMPLETED", // See 'Status Codes' below
  "conv_id": "123",
  "conv_title": "Summer Casual Outfit", // Only on first message
  "content": {
    "message": "Here are some outfits based on your request.", // The main text response
    "explanation": "I chose light fabrics for the summer weather.",
    "outfits": [ ... ], // Array of generated outfits (see structure below)
    "budget_options": [], // Specific options generated for budget refinement
    "outfit_generation_options": [] // Specific options for outfit types
  },
  "message_id": 456 // ID of the AI response in DB (for authenticated users)
}
```

#### **Status Codes & Control Flow**
The `status` field drives the frontend logic:

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| `COMPLETED` | Success. Outfits generated. | Renders the text message and the outfit carousel/grid. |
| `AWAITING_INPUT` | The AI needs clarification. | Renders the text message (question) and waits for user input. No outfits shown. |
| `Guardrail` | Content/Safety block. | Renders the refusal message. No outfits shown. |
| `READY_TO_GENERATE`| AI is ready but confirming details. | Treated similarly to COMPLETED, may show preliminary info. |
| `RESOURCE_EXHAUSTED`| API Quota hit. | Shows error message ("Gemini resources exhausted"). |

### Retrieving History
- **Get All Conversations**: `GET /api/conversations`
  - Returns a list of `{ id, title, updated_at }`.
- **Get Messages**: `POST /api/chat` (Body: `{ "conv_id": "..." }`)
  - **Note**: Uses POST instead of GET to send `conv_id` securely in the body.
  - Returns the full history of messages (`role`: 'user' | 'model'), including any associated outfits.

### Outfit Explanation
- **Endpoint**: `POST /api/outfit/explain`
- **Purpose**: Generate an explanation for a specific outfit on demand.
- **Request**: `{ "user_prompt": "...", "outfit_data": [...] }`
- **Response**: `{"success": true, "explanation": "..."}`

---

## 3. Application Architecture & Flow
The application follows a structured pipeline to fulfill user requests, involving Frontend, Flask API, AI Handler, and Database.

### 1. Request Initiation (Frontend)
- User types a prompt or uploads an image in `ChatPage.tsx`.
- `chatService.ts` formats the data (JSON or FormData) and hits `POST /api/messages/send`.

### 2. Request Processing (Backend - `app.py`)
- **Authentication**: Checks if `current_user` is set via Flask-Login.
  - **Authenticated**: Fetches user ID.
  - **Guest**: Uses temporary in-memory session specific to the request/conversation.
- **Input Handling**: Compresses images (if any) and parses parameters (`selected_outfit_index`, etc.).
- **Context Loading**:
  - Checks if `conv_id` exists.
  - Loads chat history from either:
    - **PostgreSQL Database** (via `DBManager`) for logged-in users.
    - **In-Memory Store (`not_auth_convs`)** for guests.
  - Uses an **im-memory LRU Cache** (`cachetools`) to speed up repeated context retrieval.

### 3. AI Orchestration (`outfit_recommendation_handler`)
- Located in `ai/src/app.py`.
- This is the "Brain" of the application. It receives the user prompt and history.
- **Logic**:
  - Determines intent (New search? Refinement? unrelated chat?).
  - Calls internal AI modules (Gemini) to generate outfit combinations.
  - Returns a dictionary with the appropriate `status` (e.g., `AWAITING_INPUT` if vague, `COMPLETED` if successful).

### 4. Persistence & Response
- **Database Update**:
  - If authenticated, the user's message and the AI's response (including complex outfit JSON) are saved to the `messages` and `outfits` tables in Postgres.
- **Cache Update**: The conversation cache is invalidated or updated to reflect the new state.
- **JSON Construction**: The final response is built and sent back to the frontend.

### 5. UI Rendering (Frontend)
- **State Update**: React updates the chat history state.
- **Component Selection**:
  - If `outfits` array is present -> Renders `OutfitDisplay` (Carousel/Grid).
  - If text only -> Renders a simple chat bubble.
- **Interactivity**: User clicks on "View Details" or asks a follow-up, restarting the cycle.

---

## 4. User Preferences
Preferences are key-value pairs (e.g., `Brand: "Gucci,Prada"`) stored in the database.

### Endpoints
- **Get All Available Options**: `GET /api/preferences/all`
  - Returns definitions of what preferences exist (e.g., list of supported brands, colors).
- **Update User Preferences**: `PUT /api/preferences` or `POST /api/preferences`
  - **Request**: `{"Brand": "Nike,Adidas", "Color": "Black"}`
  - **Response**: `{"success": true}`
- **Get User Preferences**: Returned as part of the `GET /api/user/session` payload.

---

## 5. Frontend Data Transformation
The frontend (`chatService.ts`) handles significant data transformation to ensure UI consistency:
1.  **Item Mapping**: Backend categories (e.g., "outerwear", "t-shirt") are mapped to frontend visuals (`jacket`, `shirt`, `pants`, `shoes`, `accessories`).
2.  **ID Generation**: If the backend does not provide unique IDs for every message or outfit item, the frontend generates unique hashes (`item-{index}-{timestamp}`) to ensure React lists render correctly.
3.  **Legacy Support**: It handles both the old single-outfit response format (`outfit: []`) and the new multi-outfit format (`outfits: [ { outfit: [] } ]`).
