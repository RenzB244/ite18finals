const API_BASE = '/students';
const LLM_API_ENDPOINT = '/llm/chat';

// Check if server is running
async function checkServerConnection() {
  try {
    const res = await fetch('/students', { method: 'GET' });
    return res.ok;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
}

async function fetchStudents() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch students (${res.status}): ${errorText}`);
  }
  
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await res.text();
    throw new Error(`Expected JSON response but got: ${responseText.substring(0, 100)}...`);
  }
  
  return await res.json();
}

async function addStudent(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Server error (${res.status}): ${errorText}`);
  }
  
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await res.text();
    throw new Error(`Expected JSON response but got: ${responseText.substring(0, 100)}...`);
  }
  
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
    // Check server connection first
    const serverRunning = await checkServerConnection();
    if (!serverRunning) {
      showMessage('Server is not running. Please start the server with: node server.js', true);
      return;
    }
    
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
      // Check server connection first
      const serverRunning = await checkServerConnection();
      if (!serverRunning) {
        showMessage('Server is not running. Please start the server with: node server.js', true);
        return;
      }
      
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

  // --- LLM chat wiring ---
  const llmInput = el('#llmInput');
  const llmSendBtn = el('#llmSendBtn');
  const llmMessages = el('#llmMessages');
  const llmStatus = el('#llmStatus');

  async function sendLlmQuestion() {
    if (!llmInput || !llmMessages || !llmStatus) return;

    const question = llmInput.value.trim();
    if (!question) {
      llmStatus.textContent = 'Please type a question first.';
      return;
    }

    // Clear status and render user message
    llmStatus.textContent = '';
    appendLlmMessage('user', question);
    llmInput.value = '';

    // Show loading status
    llmStatus.textContent = 'Thinking... (contacting LLM based on current student data)';
    llmSendBtn.disabled = true;

    try {
      const res = await fetch(LLM_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const errorMsg = errorBody.error || `LLM request failed with status ${res.status}`;
        appendLlmMessage('error', errorMsg);
        llmStatus.textContent = 'The LLM could not answer your question. Please try again.';
        return;
      }

      const data = await res.json();
      const answer = data.answer || 'No answer returned from LLM.';
      appendLlmMessage('assistant', answer);
      llmStatus.textContent = '';
    } catch (err) {
      console.error('LLM request error:', err);
      appendLlmMessage('error', 'Network or server error while contacting the LLM.');
      llmStatus.textContent = 'Network or server error. Please check if the backend is running.';
    } finally {
      llmSendBtn.disabled = false;
    }
  }

  function appendLlmMessage(role, text) {
    if (!llmMessages) return;
    const wrapper = document.createElement('div');
    wrapper.className = `llm-message llm-${role}`;

    const label = document.createElement('div');
    label.className = 'llm-message-label';
    label.textContent =
      role === 'user' ? 'You' :
      role === 'assistant' ? 'LLM' :
      'System';

    const body = document.createElement('div');
    body.className = 'llm-message-body';
    body.textContent = text;

    wrapper.appendChild(label);
    wrapper.appendChild(body);
    llmMessages.appendChild(wrapper);
    llmMessages.scrollTop = llmMessages.scrollHeight;
  }

  if (llmSendBtn) {
    llmSendBtn.addEventListener('click', sendLlmQuestion);
  }
  if (llmInput) {
    llmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendLlmQuestion();
      }
    });
  }
});
