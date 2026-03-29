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
  document.getElementById('edit-title').value = unit.name;
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
  const newName = document.getElementById('edit-title').value.trim();
  if (newName) unit.name = newName;
  unit.vocab = editVocab.filter(w=>w.simplified||w.english);
  saveUnits(units);
  showLibrary();
}

// ═══════════════════════════════════════
// IMPORT — WIZARD + VALIDATION
// ═══════════════════════════════════════

let _importReviewVocab = []; // holds parsed words during review step

// ── Step navigation ────────────────────────────────────────────────────────
function importGoStep(step, method) {
  // Hide all steps
  [1,2,3,4].forEach(n => {
    const el = document.getElementById('import-step-' + n);
    if (el) el.style.display = 'none';
  });

  // Update dot states
  [1,2,3,4].forEach(n => {
    const dot = document.getElementById('istep-dot-' + n);
    const line = document.getElementById('istep-line-' + n);
    if (dot) {
      dot.classList.remove('active','done');
      if (n < step) dot.classList.add('done');
      else if (n === step) dot.classList.add('active');
    }
    if (line) {
      line.classList.toggle('done', n < step);
    }
  });

  // Show target step
  const target = document.getElementById('import-step-' + step);
  if (target) target.style.display = '';

  // If going to step 3, show the right method panel
  if (step === 3 && method) {
    ['paste','file','ai'].forEach(m => {
      const el = document.getElementById('import-method-' + m);
      if (el) el.style.display = m === method ? '' : 'none';
    });
    window._importMethod = method;
  }
}

function checkImportStep1() {
  const ok = document.getElementById('unit-name-input').value.trim().length > 0;
  document.getElementById('import-step1-btn').disabled = !ok;
}

function checkImportReady() {
  const ok = (document.getElementById('paste-area')?.value || '').trim().length > 3;
  const btn = document.getElementById('import-btn');
  if (btn) btn.disabled = !ok;
}

function checkImportReadyAi() {
  const val = (document.getElementById('paste-area-ai') || {}).value || '';
  const btn = document.getElementById('import-btn-ai');
  if (btn) btn.disabled = val.trim().length < 3;
}

function checkImportReadyFile() {
  const ok = (document.getElementById('paste-area')?.value || '').trim().length > 3;
  const btn = document.getElementById('import-btn-file');
  if (btn) btn.disabled = !ok;
}

// ── File handling ──────────────────────────────────────────────────────────
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
  r.onload = ev => {
    const ta = document.getElementById('paste-area') || document.getElementById('paste-area-file');
    if (ta) { ta.value = ev.target.result; checkImportReady(); checkImportReadyFile(); }
    const btn = document.getElementById('import-btn-file');
    if (btn) btn.disabled = false;
  };
  r.readAsText(file,'UTF-8');
}

// Set up drop zone after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  dz.addEventListener('dragover', e=>{e.preventDefault();dz.classList.add('drag-over');});
  dz.addEventListener('dragleave', ()=>dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e=>{
    e.preventDefault(); dz.classList.remove('drag-over');
    const f=e.dataTransfer.files[0];
    if(f){const r=new FileReader();r.onload=ev=>{
      const ta = document.getElementById('paste-area') || document.getElementById('paste-area-file');
      if(ta){ta.value=ev.target.result; checkImportReady(); checkImportReadyFile();}
      const btn = document.getElementById('import-btn-file');
      if(btn) btn.disabled=false;
    };r.readAsText(f,'UTF-8');}
  });
});

// ── Parse a single line ────────────────────────────────────────────────────
function parseLine(line) {
  line = line.trim();
  if (!line) return null;

  const CJK = /[\u3400-\u9fff\uf900-\ufaff\u2e80-\u2eff\u3000-\u303f]/;
  const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

  // ── Extract bracketed traditional: [發布] ─────────────────────────────
  let traditional = '';
  const bracketMatch = line.match(/\[([^\]]+)\]/);
  if (bracketMatch && CJK.test(bracketMatch[1])) {
    traditional = bracketMatch[1].trim();
    line = line.replace(bracketMatch[0], ' ').trim();
  }

  // ── Insert spaces between CJK and latin runs ──────────────────────────
  line = line.replace(/([\u3400-\u9fff\uf900-\ufaff\u2e80-\u2eff])([A-Za-z])/g, '$1 $2');
  line = line.replace(/([A-Za-z])([\u3400-\u9fff\uf900-\ufaff\u2e80-\u2eff])/g, '$1 $2');

  const tokens = line.split(/[\s\t]+/).filter(Boolean);
  if (!tokens.length) return null;

  // ── Classify tokens ───────────────────────────────────────────────────
  // Key insight: only use tone marks to identify pinyin — much more reliable
  // than trying to match syllable patterns which collide with English words.
  // Tokens with tone marks → pinyin. CJK → chinese. Everything else → english.
  const finalCjk = [], finalPinyin = [], finalEnglish = [];

  tokens.forEach(t => {
    if (CJK.test(t)) finalCjk.push(t);
    else if (TONE.test(t)) finalPinyin.push(t);
    else finalEnglish.push(t);
  });

  const simplified = finalCjk.join('') || '';
  if (!simplified && !traditional) return null;

  return {
    simplified,
    traditional,
    pinyin: finalPinyin.join(' ').trim(),
    english: finalEnglish.join(' ').trim()
  };
}

// ── Validate a parsed word — returns array of problem strings ──────────────
function validateWord(w) {
  const problems = [];
  const hasChinese = w.simplified || w.traditional;
  if (!hasChinese) problems.push('missing Chinese character');
  if (!w.english) problems.push('missing English meaning');
  if (!w.pinyin) problems.push('missing pinyin');
  return problems;
}

// ── Step 3 → Step 4: parse, validate, render review ───────────────────────
function doImportReview(source) {
  let rawText = '';
  if (source === 'ai') {
    rawText = (document.getElementById('paste-area-ai') || {}).value || '';
  } else {
    rawText = (document.getElementById('paste-area') || {}).value || '';
  }

  // Split on newlines — each non-empty line is treated as one word entry
  const lines = rawText.split(/\r?\n/);
  const parsed = lines.map(parseLine).filter(Boolean);

  if (!parsed.length) {
    showToast('⚠️ No words found. Check your format and try again.', 3000);
    return;
  }

  // Attach validation problems to each word
  _importReviewVocab = parsed.map((w, i) => ({
    ...w,
    _problems: validateWord(w),
    _id: i
  }));

  renderReviewStep();
  importGoStep(4);
}

function renderReviewStep() {
  const vocab = _importReviewVocab;
  const problemWords = vocab.filter(w => w._problems.length > 0);
  const goodWords = vocab.filter(w => w._problems.length === 0);

  // Summary
  const summary = document.getElementById('review-summary');
  if (summary) {
    summary.textContent = `Found ${vocab.length} word${vocab.length!==1?'s':''} — ${goodWords.length} look${goodWords.length===1?'s':''} good${problemWords.length > 0 ? `, ${problemWords.length} need${problemWords.length===1?'s':''} your attention` : ' ✅'}.`;
  }

  // Problems banner
  const banner = document.getElementById('review-problems');
  if (banner) {
    if (problemWords.length > 0) {
      banner.style.display = '';
      banner.innerHTML = `⚠️ <strong>${problemWords.length} word${problemWords.length!==1?'s':''} highlighted below</strong> have issues. Fix them inline or delete them — then save when you're ready.`;
    } else {
      banner.style.display = 'none';
    }
  }

  // Rows
  const rowsEl = document.getElementById('review-rows');
  if (!rowsEl) return;
  rowsEl.innerHTML = vocab.map((w, i) => {
    const hasProblem = w._problems.length > 0;
    const simpCls = !w.simplified ? 'missing' : '';
    const pinCls = !w.pinyin ? 'missing' : '';
    const engCls = !w.english ? 'missing' : '';
    return `<div class="review-row${hasProblem?' has-problem':''}" id="review-row-${i}">
      <input class="${simpCls}" value="${esc(w.simplified)}" placeholder="简体" oninput="_reviewEdit(${i},'simplified',this.value)">
      <input value="${esc(w.traditional)}" placeholder="繁體" oninput="_reviewEdit(${i},'traditional',this.value)">
      <input class="${pinCls}" value="${esc(w.pinyin)}" placeholder="pīnyīn" oninput="_reviewEdit(${i},'pinyin',this.value)">
      <input class="${engCls}" value="${esc(w.english)}" placeholder="English" oninput="_reviewEdit(${i},'english',this.value)">
      <button class="review-del-btn" onclick="_reviewDelete(${i})" title="Remove this word">✕</button>
    </div>`;
  }).join('');

  // Save button state
  const saveBtn = document.getElementById('review-save-btn');
  if (saveBtn) saveBtn.disabled = vocab.length === 0;
}

function _reviewEdit(i, field, val) {
  if (!_importReviewVocab[i]) return;
  _importReviewVocab[i][field] = val;
  _importReviewVocab[i]._problems = validateWord(_importReviewVocab[i]);
  // Update row highlight live
  const row = document.getElementById('review-row-' + i);
  if (row) row.classList.toggle('has-problem', _importReviewVocab[i]._problems.length > 0);
  // Update input highlight
  ['simplified','traditional','pinyin','english'].forEach((f, fi) => {
    const inp = row ? row.querySelectorAll('input')[fi] : null;
    if (!inp) return;
    if (f === 'simplified') inp.classList.toggle('missing', !_importReviewVocab[i].simplified);
    if (f === 'pinyin') inp.classList.toggle('missing', !_importReviewVocab[i].pinyin);
    if (f === 'english') inp.classList.toggle('missing', !_importReviewVocab[i].english);
  });
  // Re-render summary quietly
  const problemWords = _importReviewVocab.filter(w => w._problems.length > 0);
  const banner = document.getElementById('review-problems');
  if (banner) {
    if (problemWords.length > 0) {
      banner.style.display = '';
      banner.innerHTML = `⚠️ <strong>${problemWords.length} word${problemWords.length!==1?'s':''} highlighted below</strong> have issues. Fix them inline or delete them — then save when you're ready.`;
    } else {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }
  }
}

function _reviewDelete(i) {
  _importReviewVocab.splice(i, 1);
  renderReviewStep();
}

// ── Final save ─────────────────────────────────────────────────────────────
function doImport() {
  const name = document.getElementById('unit-name-input').value.trim();
  if (!name) { showToast('⚠️ Unit name is missing', 2000); return; }

  const finalVocab = _importReviewVocab.filter(w => w.simplified && w.english);
  if (!finalVocab.length) { showToast('⚠️ No valid words to save', 2000); return; }

  // Strip internal review metadata before saving
  const clean = finalVocab.map(({ simplified, traditional, pinyin, english }) => ({
    simplified, traditional: traditional || simplified, pinyin, english
  }));

  units.push({ id:'unit_'+Date.now(), name, vocab: clean, createdAt: Date.now() });
  saveUnits(units);

  // Reset wizard
  document.getElementById('unit-name-input').value = '';
  _importReviewVocab = [];
  importGoStep(1);

  showLibrary();
  showToast(`✅ "${name}" saved — ${clean.length} words!`, 3000);
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

