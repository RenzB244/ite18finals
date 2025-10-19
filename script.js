const API_BASE = '/students';

async function fetchStudents() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch students');
  return await res.json();
}

async function addStudent(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function deleteStudent(id) {
  const res = await fetch(API_BASE + '/' + id, {method:'DELETE'});
  return res.ok;
}

function el(selector){ return document.querySelector(selector); }
function tbody(){ return el('#studentsTable tbody'); }

function renderStudents(list) {
  const t = tbody();
  t.innerHTML = '';
  list.forEach(st => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${st.id}</td>
      <td>${st.name}</td>
      <td>${st.age ?? ''}</td>
      <td>${st.course}</td>
      <td>${st.year}</td>
      <td>${st.gender ?? ''}</td>
      <td>
        <button class="action-btn" data-id="${st.id}" data-action="delete">Delete</button>
      </td>`;
    t.appendChild(tr);
  });
}

function showMessage(msg, err=false){ 
  const m=el('#message'); 
  m.textContent=msg; 
  m.style.color = err? '#7f1d1d' : '#064e3b'; 
  setTimeout(()=>m.textContent='',4000); 
}

let allStudents = [];
let filteredStudents = [];

async function loadAndRender() {
  try{
    allStudents = await fetchStudents();
    filteredStudents = [...allStudents];
    renderStudents(filteredStudents);
  } catch(err){
    showMessage('Error loading students: ' + err.message, true);
  }
}

function performSearch() {
  const searchType = el('#searchType').value;
  
  if (!searchType) {
    filteredStudents = [...allStudents];
    showMessage('Showing all students');
  } else {
    // Get unique values for the selected field
    const uniqueValues = [...new Set(allStudents.map(student => student[searchType]).filter(val => val))];
    
    if (uniqueValues.length === 0) {
      filteredStudents = [];
      showMessage(`No students found with ${searchType} data`);
    } else {
      // For now, let's show students grouped by the selected field
      // You can modify this logic based on what you want to achieve
      filteredStudents = allStudents.filter(student => student[searchType]);
      showMessage(`Showing ${filteredStudents.length} student(s) with ${searchType} data`);
    }
  }
  
  renderStudents(filteredStudents);
}

function clearSearch() {
  el('#searchType').value = '';
  filteredStudents = [...allStudents];
  renderStudents(filteredStudents);
  showMessage('Search cleared - showing all students');
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadAndRender();

  el('#studentForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      name: el('#name').value.trim(),
      age: parseInt(el('#age').value,10) || null,
      course: el('#course').value.trim(),
      year: parseInt(el('#year').value,10),
      gender: el('#gender').value
    };
    if (!payload.name || !payload.course || !Number.isInteger(payload.year)) { showMessage('Please fill required fields', true); return; }
    if (payload.age !== null && (isNaN(payload.age) || payload.age <= 0)) { showMessage('Age must be a positive number', true); return; }
    if (payload.year < 1 || payload.year > 5) { showMessage('Year must be between 1 and 5', true); return; }
    if (!payload.gender) { showMessage('Please select a gender', true); return; }
    try {
      const added = await addStudent(payload);
      showMessage('Student added: ' + (added.id || 'OK'));
      el('#studentForm').reset();
      loadAndRender();
    } catch(err){ showMessage('Failed to add student: ' + err.message, true); }
  });

  el('#searchBtn').addEventListener('click', performSearch);
  el('#clearSearchBtn').addEventListener('click', clearSearch);
  el('#searchType').addEventListener('change', performSearch);
  el('#resetBtn').addEventListener('click', ()=>el('#studentForm').reset());

  el('#studentsTable').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'delete' && confirm('Delete student ' + id + '?')){
      const ok = await deleteStudent(id);
      if (ok) { showMessage('Deleted ' + id); loadAndRender(); }
      else showMessage('Failed to delete ' + id, true);
    }
  });
});
