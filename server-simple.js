const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'students.json');

app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// GET /students
app.get('/students', (req, res) => {
  console.log('GET /students called');
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json([]);
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Returning', data.length, 'students');
    res.json(data);
  } catch (error) {
    console.error('Error reading students:', error);
    res.status(500).json({ error: 'Failed to read students' });
  }
});

// POST /students
app.post('/students', (req, res) => {
  console.log('POST /students called');
  try {
    const body = req.body || {};
    const newStudent = {
      id: 'S' + Date.now().toString().slice(-8),
      name: body.name || '',
      age: body.age || null,
      course: body.course || '',
      year: body.year || 1,
      gender: body.gender || ''
    };
    
    let students = [];
    if (fs.existsSync(DATA_FILE)) {
      students = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    
    students.unshift(newStudent);
    fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));
    
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// Serve static files
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test`);
});

// Keep server alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
