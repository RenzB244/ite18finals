const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3301;
const DATA_FILE = path.join(__dirname, 'students.json');

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

app.use(express.json());

// API routes must come BEFORE static file serving
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

app.use(express.static('.'));

app.listen(PORT, ()=> console.log('Server running on port', PORT));

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
