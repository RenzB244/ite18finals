# SIMS - Student Information Management System (Midterm Project)

This project implements a simple Student Information Management System (SIMS) with a plain HTML/CSS/JS frontend and a Node.js (Express) backend that stores data in `students.json`.

## How to run locally
1. Make sure you have Node.js installed (v16+ recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your browser.

If `students.json` is missing, it will be created automatically on first save.

## Features
- Add student via form (name, age, course, year, gender)
- List students in a table with delete action
- Search/filter by name or course; limit results to 20/50/all
- Input validation on client and server (age > 0, year 1-5, gender required)
- JSON file storage simulating a database

## API
Base URL: `http://localhost:3000`

### GET `/students`
Returns an array of students.

### POST `/students`
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

### DELETE `/students/:id`
Deletes a student by ID. Returns `{ ok: true }` or `404` if not found.

## Project Structure
```
index.html      # UI
style.css       # basic styling
script.js       # frontend logic
server.js       # Express server and routes
students.json   # data store
```

## Notes
- IDs are generated as `S<timestamp><rand>` to avoid collisions.
- This is a learning project; no authentication is implemented.
