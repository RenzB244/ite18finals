## SIMS - Student Information Management System (with LLM Data Analysis)

This project implements a simple Student Information Management System (SIMS) with a plain HTML/CSS/JS frontend and a Node.js (Express) backend that stores data in `students.json`.  
For finals, it now includes an **LLM-powered data analysis chat** that can answer questions about the real student dataset.

### How to run locally
1. Make sure you have Node.js installed (v16+ recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your LLM API key (OpenAI-compatible):
   - Get an API key from your chosen provider (e.g. OpenAI, DeepSeek, Groq with OpenAI-compatible endpoint).
   - On **Windows PowerShell** (your environment):
     ```powershell
     $env:OPENAI_API_KEY = "your_api_key_here"
     ```
   - Optionally override model / URL (defaults are `gpt-4o-mini` and `https://api.openai.com/v1/chat/completions`):
     ```powershell
     $env:LLM_MODEL = "gpt-4o-mini"
     $env:LLM_API_URL = "https://api.openai.com/v1/chat/completions"
     ```

4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3301` in your browser.

If `students.json` is missing, it will be created automatically on first save.

### Core SIMS Features
- Add student via form (name, age, course, year, gender)
- List students in a table with delete action
- Search/filter by name or course; limit results to 20/50/all
- Input validation on client and server (age > 0, year 1-5, gender required)
- JSON file storage simulating a database

### LLM Data Analysis Feature
- **Chat interface** at the bottom of the page:
  - Type questions like:
    - “How many 3rd-year students are stored?”
    - “List students in BSIT.”
    - “What is the average age?”
    - “Give a summary of total students per course.”
- **Backend LLM processing** (`POST /llm/chat`):
  - Loads the **real student data from `students.json`** (no hardcoded data).
  - Sends both the dataset and the user’s question to the configured LLM API.
  - The LLM is instructed to answer **only based on the provided JSON records**.
- **Error handling**:
  - If the API key is missing, the dataset is empty, or the LLM request fails, the user sees a clear error message in the chat.

### API Overview
Base URL (local): `http://localhost:3301`

#### GET `/students`
Returns an array of students.

#### POST `/students`
Create a student.

Body (JSON):
```json
{
  "name": "Jane Doe",
  "age": 19,
  "course": "BSIT",
  "year": 2,
  "gender": "Female"
}
```

Responses:
- `201 Created` with created student
- `400 Bad Request` when validation fails

#### DELETE `/students/:id`
Deletes a student by ID. Returns `{ "ok": true }` or `404` if not found.

#### POST `/llm/chat`
LLM data analysis endpoint.

Request body (JSON):
```json
{ "message": "How many 3rd-year students are stored?" }
```

Response body (JSON):
```json
{ "answer": "There are 5 third-year students in the dataset..." }
```

### Project Structure
```
index.html      # UI (forms, table, search, LLM chatbox)
style.css       # styling including LLM chat styles
script.js       # frontend logic + LLM chat wiring
server.js       # Express server, student routes, and /llm/chat route
students.json   # data store (real student records)
```

### Notes
- IDs are generated as `S<timestamp><rand>` to avoid collisions.
- This is a learning project; no authentication is implemented.
