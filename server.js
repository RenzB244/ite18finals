const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3301;
const DATA_FILE = path.join(__dirname, 'students.json');

// LLM provider configuration (OpenAI-compatible by default)
// Set these in your environment before running the server, e.g.:
//   On Windows PowerShell:
//     $env:OPENAI_API_KEY="your_api_key_here"
//   On Linux/macOS:
//     export OPENAI_API_KEY="your_api_key_here"
const LLM_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

app.use(express.json());
app.use(express.static('.'));

// helper to read/write JSON
function readData(){ 
  try { 
    if (!fs.existsSync(DATA_FILE)) return []; 
    const raw = fs.readFileSync(DATA_FILE, 'utf8'); 
    return raw ? JSON.parse(raw) : []; 
  } catch(e){ 
    console.error('Failed to read data file:', e.message);
    return []; 
  } 
}
function writeData(arr){ 
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8'); 
  } catch(e){
    console.error('Failed to write data file:', e.message);
    throw e;
  }
}

// API routes
// GET /students
app.get('/students', (req, res) => {
  console.log('GET /students request received');
  try {
    const data = readData();
    console.log('Data read successfully:', data.length, 'students');
    res.json(data);
  } catch (error) {
    console.error('Error in GET /students:', error);
    res.status(500).json({error: 'Internal server error'});
  }
});

// POST /students
app.post('/students', (req, res) => {
  const body = req.body || {};
  const data = readData();
  // simple unique id: S + timestamp + random
  const newid = 'S' + Date.now().toString().slice(-8) + Math.floor(Math.random()*1000).toString().padStart(3,'0');
  const student = {
    id: newid,
    name: String(body.name || '').trim(),
    age: Number.isInteger(body.age) ? body.age : (body.age? Number(body.age) : null),
    course: String(body.course || '').trim(),
    year: Number.isInteger(body.year) ? body.year : Number(body.year),
    gender: String(body.gender || '').trim()
  };
  if (!student.name || !student.course || !Number.isFinite(student.year)) {
    return res.status(400).json({error: 'name, course and year are required'});
  }
  if (student.age !== null && (!Number.isFinite(student.age) || student.age <= 0)) {
    return res.status(400).json({error: 'age must be a positive number'});
  }
  if (student.year < 1 || student.year > 5) {
    return res.status(400).json({error: 'year must be between 1 and 5'});
  }
  if (!student.gender) {
    return res.status(400).json({error: 'gender is required'});
  }
  data.unshift(student);
  try {
    writeData(data);
  } catch(e){
    return res.status(500).json({error:'failed to persist student'});
  }
  res.status(201).json(student);
});

// DELETE /students/:id
app.delete('/students/:id', (req, res) => {
  const id = req.params.id;
  let data = readData();
  const before = data.length;
  data = data.filter(s => s.id !== id);
  if (data.length === before) return res.status(404).json({error:'not found'});
  writeData(data);
  res.json({ok:true});
});

// LLM chat route: POST /llm/chat
// Body: { message: string }
// Returns: { answer: string }
app.post('/llm/chat', async (req, res) => {
  try {
    const userMessage = (req.body && req.body.message ? String(req.body.message) : '').trim();
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!LLM_API_KEY) {
      return res.status(500).json({
        error: 'LLM API key is not configured on the server. Please set OPENAI_API_KEY environment variable.'
      });
    }

    const students = readData();
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(500).json({
        error: 'Student dataset is empty. Please add students first before using the LLM analysis feature.'
      });
    }

    // Prepare a compact JSON dataset for the LLM (avoid sending unnecessary fields)
    const dataset = students.map(s => ({
      id: s.id,
      name: s.name,
      age: s.age,
      course: s.course,
      year: s.year,
      gender: s.gender
    }));

    const systemPrompt = [
      'You are an assistant for a Student Information Management System.',
      'You are given REAL student records in JSON format and a user question.',
      'You MUST base your answers ONLY on the provided data.',
      'If the user asks something that cannot be answered strictly from the data, politely say you cannot answer.',
      'When relevant, compute statistics such as counts, averages, and groupings explicitly.',
      'For list questions, show clear bullet lists or tables in plain text.',
      'If the question is ambiguous, explain your assumptions briefly.'
    ].join(' ');

    const userPrompt = [
      'Student dataset (JSON array of objects with fields id, name, age, course, year, gender):',
      JSON.stringify(dataset, null, 2),
      '',
      'User question:',
      userMessage
    ].join('\n');

    const fetchFn = (global.fetch || require('node-fetch'));

    const apiResponse = await fetchFn(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('LLM API error:', apiResponse.status, errorText);
      return res.status(502).json({
        error: 'LLM API request failed',
        details: errorText.substring(0, 300)
      });
    }

    const data = await apiResponse.json();
    const answer =
      data?.choices?.[0]?.message?.content ||
      'The LLM did not return a response. Please try again.';

    res.json({ answer });
  } catch (err) {
    console.error('Error in /llm/chat:', err);
    res.status(500).json({
      error: 'Unexpected server error while processing LLM request.'
    });
  }
});

app.use(express.static('.'));

app.listen(PORT, ()=> console.log('Server running on port', PORT));

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
