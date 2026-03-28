// ═══════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════
function showLibrary() {
  units = loadUnits();
  selectedUnitIds = [];
  renderLibrary();
  showScreen('screen-library');
  document.getElementById('btn-home-header').style.display = '';
}
function renderLibrary() {
  const el = document.getElementById('unit-list');
  const session = loadSession();
  if (!units.length) {
    el.innerHTML = `<div id="library-empty-msg" class="empty-lib"><div class="empty-lib-icon">册</div><p>No units yet — add one to get started.</p></div>`;
    document.getElementById('study-selected-btn').disabled = true;
    return;
  }
  // Render: parent units first, with restudy children nested below
  const parentUnits = units.filter(u => !u.parentId);
  const childUnits = units.filter(u => u.parentId);

  const renderCard = (u, isChild=false) => {
    const sel = selectedUnitIds.includes(u.id);
    const ongoing = session && session.unitIds.includes(u.id);
    const prog = ongoing
      ? `<span class="unit-progress ongoing">In progress</span>`
      : `<span class="unit-progress">${u.vocab.length} words</span>`;
    const badge = u.aiGenerated
      ? `<span style="font-size:10px;background:var(--gold-light);color:var(--gold);border:1px solid var(--gold);border-radius:10px;padding:1px 7px;font-weight:700;vertical-align:middle">✨ AI</span>`
      : u.isRestudy
      ? `<span style="font-size:10px;background:var(--red-light);color:var(--red);border:1px solid var(--red-light);border-radius:10px;padding:1px 7px;font-weight:700;vertical-align:middle">📋 Restudy</span>`
      : '';
    const indent = isChild ? 'margin-left:20px;border-left:3px solid var(--red-light);border-top-left-radius:4px;border-bottom-left-radius:4px;' : '';
    return `<div class="unit-card ${sel?'selected':''}" style="${indent}" onclick="toggleUnit('${u.id}')">
      <div class="unit-check">${sel?'✓':''}</div>
      <div class="unit-info">
        <div class="unit-name">${esc(u.name)} ${badge}</div>
        <div class="unit-meta">${u.vocab.length} words</div>
      </div>
      ${prog}
      <div class="unit-actions" onclick="event.stopPropagation()">
        <button class="unit-btn" onclick="editUnit('${u.id}')">Edit</button>
        <button class="unit-btn del" onclick="deleteUnit('${u.id}')">Delete</button>
      </div>
    </div>`;
  };

  el.innerHTML = parentUnits.map(u => {
    const children = childUnits.filter(c => c.parentId === u.id);
    const childrenHtml = children.length
      ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${children.map(c => renderCard(c, true)).join('')}</div>`
      : '';
    return renderCard(u) + childrenHtml;
  }).join('');
  document.getElementById('study-selected-btn').disabled = selectedUnitIds.length === 0;
}
function toggleUnit(id) {
  const i = selectedUnitIds.indexOf(id);
  if (i===-1) selectedUnitIds.push(id); else selectedUnitIds.splice(i,1);
  renderLibrary();
}
function autoDetectScript(vocabArr) {
  // Count characters that are exclusively simplified or traditional
  // Using a rough heuristic: check if simplified !== traditional for any word
  const hasTraditional = vocabArr.some(w => w.traditional && w.simplified && w.traditional !== w.simplified);
  const hasSimplifiedOnly = vocabArr.some(w => !w.traditional || w.traditional === w.simplified);
  if (hasTraditional && !hasSimplifiedOnly) return 'traditional';
  if (!hasTraditional) return 'simplified';
  return 'simplified'; // mixed — default simplified
}

function studySelectedUnits() {
  if (!selectedUnitIds.length) return;
  vocab = [];
  selectedUnitIds.forEach(id => { const u = units.find(u=>u.id===id); if(u) vocab.push(...u.vocab); });
  const seen = new Set();
  vocab = vocab.filter(w => { const k=w.simplified+'|'+w.english; if(seen.has(k)) return false; seen.add(k); return true; });
  studyMode = null;

  // Auto-detect script
  if (!profileData || !profileData.script) selectedScript = autoDetectScript(vocab);
 // script buttons now in settings panel

  document.getElementById('word-count-display').textContent = `${vocab.length} word${vocab.length!==1?'s':''}`;
  const name = selectedUnitIds.length > 1 ? `${selectedUnitIds.length} units` : (units.find(u=>u.id===selectedUnitIds[0])?.name||'');
  document.getElementById('mode-title').textContent = `Study: ${name}`;
  ['A','B','AB'].forEach(x => document.getElementById('card-'+x).classList.remove('selected'));
  document.getElementById('start-btn').disabled = true;
  // Reset study plan
  customWordIndices = null; studyPlan = 'full';
  ['full','half1','half2','custom'].forEach(id => {
    const btn = document.getElementById('plan-'+id);
    if (btn) btn.classList.toggle('active', id==='full');
  });
  const pContainer = document.getElementById('word-picker-container');
  if (pContainer) pContainer.style.display='none';
  updatePlanProgress();
  showScreen('screen-mode');
  document.getElementById('btn-home-header').style.display = '';
}
function deleteUnit(id) {
  if (!confirm('Delete this unit? This cannot be undone.')) return;
  units = units.filter(u=>u.id!==id);
  saveUnits(units);
  renderLibrary();
}

// ═══════════════════════════════════════
// EDIT UNIT
// ═══════════════════════════════════════
function editUnit(id) {
  editingUnitId = id;
  const unit = units.find(u=>u.id===id);
  if (!unit) return;
  editVocab = unit.vocab.map(w=>({...w}));
  document.getElementById('edit-title').textContent = `Edit: ${unit.name}`;
  renderVocabTable();
  showScreen('screen-edit');
  document.getElementById('btn-home-header').style.display = '';
}
function renderVocabTable() {
  document.getElementById('vocab-tbody').innerHTML = editVocab.map((w,i) => `
    <tr class="vocab-row">
      <td><input class="vocab-input zh" value="${esc(w.simplified||'')}" onchange="editVocab[${i}].simplified=this.value"></td>
      <td><input class="vocab-input zh" value="${esc(w.traditional||'')}" onchange="editVocab[${i}].traditional=this.value"></td>
      <td><input class="vocab-input" value="${esc(w.pinyin||'')}" onchange="editVocab[${i}].pinyin=this.value"></td>
      <td><input class="vocab-input" value="${esc(w.english||'')}" onchange="editVocab[${i}].english=this.value"></td>
      <td><button class="vocab-del" onclick="deleteWordRow(${i})">✕</button></td>
    </tr>`).join('');
}
function deleteWordRow(i) { editVocab.splice(i,1); renderVocabTable(); }
function addWordRow() {
  const simp = document.getElementById('add-simp').value.trim();
  const trad = document.getElementById('add-trad').value.trim() || simp;
  const pinyin = document.getElementById('add-pinyin').value.trim();
  const english = document.getElementById('add-english').value.trim();
  if (!simp || !english) { alert('Fill in at least Simplified and English.'); return; }
  editVocab.push({simplified:simp, traditional:trad, pinyin, english});
  renderVocabTable();
  ['add-simp','add-trad','add-pinyin','add-english'].forEach(id=>document.getElementById(id).value='');
}
function saveEditedUnit() {
  const unit = units.find(u=>u.id===editingUnitId);
  if (!unit) return;
  unit.vocab = editVocab.filter(w=>w.simplified||w.english);
  saveUnits(units);
  showLibrary();
}

// ═══════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════
function checkImportReady() {
  const nameOk = document.getElementById('unit-name-input').value.trim().length > 0;
  const vocabOk = document.getElementById('paste-area').value.trim().length > 3;
  document.getElementById('import-btn').disabled = !(nameOk && vocabOk);
}

function copyAiPrompt() {
  const text = `Format this Chinese vocabulary list. For each word output one line in this exact format:\n简体[繁體]\tpīnyīn\tEnglish meaning\n\nRules: use a TAB to separate the three columns. Include both simplified and traditional characters in the first column like 发布[發布]. Use proper tone marks in pinyin (ā á ǎ à). Keep English meanings short. Output nothing else — just the formatted lines.\n\nHere is my vocab list:\n[PASTE YOUR WORDS HERE]`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-prompt-btn');
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy prompt', 2000); }
  });
}

function handleFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => { document.getElementById('paste-area').value = ev.target.result; checkImportReady(); };
  r.readAsText(file,'UTF-8');
}
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover', e=>{e.preventDefault();dz.classList.add('drag-over');});
dz.addEventListener('dragleave', ()=>dz.classList.remove('drag-over'));
dz.addEventListener('drop', e=>{
  e.preventDefault(); dz.classList.remove('drag-over');
  const f=e.dataTransfer.files[0]; if(f){const r=new FileReader();r.onload=ev=>{document.getElementById('paste-area').value=ev.target.result;checkImportReady();};r.readAsText(f,'UTF-8');}
});

function parseLine(line) {
    const parts = line.split('\t');
    if (parts.length < 3) return null;
    return {
        chars: parts[0],
        pinyin: parts[1],
        meaning: parts[2]
    };
}
function doImport() {
  const name = document.getElementById('unit-name-input').value.trim();
  const lines = document.getElementById('paste-area').value.split('\n');
  const vocab = lines.map(parseLine).filter(Boolean);
  if (!vocab.length) { alert('No words recognized. Try using the AI prompt helper to format your list first.'); return; }
  units.push({ id:'unit_'+Date.now(), name, vocab, createdAt:Date.now() });
  saveUnits(units);
  document.getElementById('unit-name-input').value = '';
  document.getElementById('paste-area').value = '';
  document.getElementById('import-btn').disabled = true;
  showLibrary();
}

// ═══════════════════════════════════════
// CONTINUE SESSION
// ═══════════════════════════════════════
function continueSession() {
  const s = loadSession(); if (!s) return;
  vocab=s.vocab; queue=s.queue; doneSet=new Set(s.doneSet); correctOnce=new Set(s.correctOnce);
  studyMode=s.studyMode; selectedScript=s.selectedScript; inputMethod=s.inputMethod||'bpmf'; phase=s.phase; stats=s.stats;
  selectedUnitIds=s.unitIds;
  document.getElementById('btn-simplified').classList.toggle('active',selectedScript==='simplified');
  document.getElementById('btn-traditional').classList.toggle('active',selectedScript==='traditional');
  showScreen('screen-study');
  document.getElementById('btn-home-header').style.display='';
  document.getElementById('header-modes').style.display=studyMode==='AB'?'none':'flex';
  updateHeaderBadge(); updatePhaseBanner(); nextCard();
}

