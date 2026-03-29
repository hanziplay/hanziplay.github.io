// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════
const DB_KEY = 'hanziplay_units';
const SES_KEY = 'hanziplay_session';
function loadUnits() { try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; } catch { return []; } }
function saveUnits(u) {
  // u is optional — defaults to global units array
  const data = (u !== undefined) ? u : units;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  // Also push to Firebase if signed in (debounced)
  if (firebaseUser && window._fbDb) {
    clearTimeout(window._saveUnitsTimer);
    window._saveUnitsTimer = setTimeout(() => pushUnitsToFirebase(), 1500);
  }
}

async function pushUnitsToFirebase() {
  if (!firebaseUser || !window._fbDb) return;
  try {
    await window._fbDb.ref('users/' + firebaseUser.uid + '/units').set({
      data: units,
      updatedAt: Date.now()
    });
  } catch(e) { console.error('pushUnitsToFirebase error:', e); }
}

async function loadUnitsFromFirebase() {
  if (!firebaseUser || !window._fbDb) return false;
  try {
    const snap = await window._fbDb.ref('users/' + firebaseUser.uid + '/units').once('value');
    const cloud = snap.val();
    const cloudUnits = (cloud && Array.isArray(cloud.data)) ? cloud.data : [];
    const localUnits = (() => { try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; } catch { return []; } })();

    if (cloudUnits.length === 0 && localUnits.length === 0) return false;

    if (cloudUnits.length === 0) {
      // Nothing in cloud — push local up, keep local
      units = localUnits;
      await pushUnitsToFirebase();
      console.log('No cloud units — pushed local to Firebase:', units.length, 'units');
      return true;
    }

    if (localUnits.length === 0) {
      // Nothing local — use cloud
      units = cloudUnits;
      localStorage.setItem(DB_KEY, JSON.stringify(units));
      console.log('No local units — loaded from Firebase:', units.length, 'units');
      return true;
    }

    // Both exist — merge: cloud is primary but add any local units not in cloud (by id)
    const cloudIds = new Set(cloudUnits.map(u => u.id));
    const localOnly = localUnits.filter(u => !cloudIds.has(u.id));
    if (localOnly.length > 0) {
      units = [...cloudUnits, ...localOnly];
      console.log('Merged: cloud', cloudUnits.length, '+ local-only', localOnly.length, 'units');
    } else {
      units = cloudUnits;
      console.log('Units loaded from Firebase:', units.length, 'units');
    }
    localStorage.setItem(DB_KEY, JSON.stringify(units));
    // Push merged result back to cloud
    await pushUnitsToFirebase();
    return true;
  } catch(e) { console.error('loadUnitsFromFirebase error:', e); return false; }
}
function loadSession() { try { return JSON.parse(localStorage.getItem(SES_KEY)); } catch { return null; } }
function saveSession(d) { localStorage.setItem(SES_KEY, JSON.stringify(d)); }
function clearSession() {
  window._robbieHintNoAsk = false; localStorage.removeItem(SES_KEY); }

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let units = loadUnits();
let selectedUnitIds = [];
let vocab = [];
let studyMode = null;
let wordOrder = 'shuffle';
let studyPlan = 'full'; // 'full','half1','half2','custom'
let customWordIndices = null; // array of indices for custom plan
const STUDY_PROGRESS_KEY = 'hanziplay_study_progress'; // 'shuffle' or 'list'
let batchSize = 5;
let studyAlgorithm = localStorage.getItem('hanzi_studyAlgorithm') || 'robbies'; // 'robbies' | 'batched'
let batchedBatchSize = parseInt(localStorage.getItem('hanzi_batchedBatchSize')) || 5;
let activeSet = []; // current batch of word indices being studied
let selectedScript = (function(){ try { const p = JSON.parse(localStorage.getItem('hanziplay_profile')); return (p && p.script) ? p.script : 'simplified'; } catch { return 'simplified'; } })();
let inputMethod = (function(){ try { const p = JSON.parse(localStorage.getItem('hanziplay_profile')); return (p && p.inputMethod) ? p.inputMethod : 'bpmf'; } catch { return 'bpmf'; } })(); // 'bpmf' | 'pinyin'
let queue = [], doneSet = new Set(), correctOnce = new Set();
let currentWord = null, checking = false;
let phase = 'A';
let stats = { correct:0, wrong:0, reveals:0 };
let wordErrorCounts = {}; // idx -> wrong count for session report
let editingUnitId = null, editVocab = [];

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════
function renderHome() {
  units = loadUnits();
  const session = loadSession();
  const c = document.getElementById('home-actions');
  let html = '';

  // Profile greeting
  if (profileData) {
    const emoji = getAvatarEmoji(profileData.zodiac, profileData.vibe);
    const bg = getAvatarBg(profileData.color);
    html += `<div style="display:flex;align-items:center;gap:14px;padding:16px 20px;background:var(--card-bg);border:1.5px solid var(--border);border-radius:12px;margin-bottom:4px">
      <div style="width:52px;height:52px;border-radius:14px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${emoji}</div>
      <div>
        <div style="font-size:17px;font-weight:800">Hi, ${esc(profileData.name)}! 👋</div>
        <div style="font-size:13px;color:var(--gold);font-weight:600">💰 ${formatBucks(robbieBucks)} Robbie Bucks</div>
      </div>
    </div>`;
  }

  if (session) {
    const names = session.unitIds.map(id => units.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
    html += `<button class="home-btn accent" onclick="continueSession()">
      <div class="home-btn-title">Continue where you left off →</div>
      <div class="home-btn-sub">${esc(names||'Saved session')}</div>
      <span class="resume-badge">${session.doneCount} / ${session.totalCount} done</span>
    </button>`;
  }
  html += `<button id="btn-get-started" class="home-btn ${!session?'accent':''}" onclick="showLibrary()">
    <div class="home-btn-title">${units.length ? 'Start a unit' : 'Get started'}</div>
    <div class="home-btn-sub">${units.length ? units.length+' unit'+(units.length!==1?'s':'')+' saved' : 'Import your first vocab set'}</div>
  </button>`;
  if (units.length) {
    html += `<button class="home-btn" onclick="showLibrary()">
      <div class="home-btn-title">Manage units</div>
      <div class="home-btn-sub">Edit, add, or delete vocab</div>
    </button>`;
  }
  html += `<button id="header-leaderboard" class="home-btn" onclick="showLeaderboard()">
    <div class="home-btn-title">💰 Leaderboard</div>
    <div class="home-btn-sub">Robbie Bucks rankings</div>
  </button>`;
  html += `<div style="display:flex;gap:8px;margin-top:4px">
    <button id="tutorial-replay-btn" onclick="replayTutorial()" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);font-family:'Syne',sans-serif;font-size:13px;color:var(--muted);cursor:pointer;font-weight:600;flex:1">
      <span style="font-size:30px;line-height:1">👨🏻‍🏫</span>      <span>Not sure where to start? Ask Teacher Robbie</span>
    </button>
    <button onclick="showSettings()" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);font-family:'Syne',sans-serif;font-size:13px;color:var(--muted);cursor:pointer;font-weight:600;white-space:nowrap">
      ⚙️ Settings
    </button>
  </div>`;
  c.innerHTML = html;
}
// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
let settingsDraftScript = null;
let settingsDraftInput = null;
let settingsDraftAccent = null;
let settingsDraftAlgorithm = null;
let settingsDraftBatchSize = null;

function showSettings() {
  // Load current values
  settingsDraftScript = selectedScript || (profileData && profileData.script) || 'simplified';
  settingsDraftInput = inputMethod || (profileData && profileData.inputMethod) || 'bpmf';
  settingsDraftAccent = (profileData && profileData.accent) || 'zh-TW';
  settingsDraftAlgorithm = studyAlgorithm;
  settingsDraftBatchSize = batchedBatchSize;
  // Highlight correct buttons
  ['simplified','traditional'].forEach(s => {
    const b = document.getElementById('s-btn-'+s);
    if (b) { b.classList.toggle('active', s === settingsDraftScript); }
  });
  ['bpmf','pinyin'].forEach(m => {
    const b = document.getElementById('s-btn-'+m);
    if (b) { b.classList.toggle('active', m === settingsDraftInput); }
  });
  [['zh-TW','s-accent-tw'],['zh-CN','s-accent-cn']].forEach(([lang, id]) => {
    const b = document.getElementById(id);
    if (b) { b.classList.toggle('active', lang === settingsDraftAccent); }
  });
  ['robbies','batched'].forEach(a => {
    const b = document.getElementById('s-algo-'+a);
    if (b) b.classList.toggle('active', a === settingsDraftAlgorithm);
  });
  const bsInput = document.getElementById('s-batch-size');
  if (bsInput) bsInput.value = settingsDraftBatchSize;
  const batchSection = document.getElementById('s-batch-section');
  if (batchSection) batchSection.style.display = settingsDraftAlgorithm === 'batched' ? '' : 'none';
  showScreen('screen-settings');
  document.getElementById('btn-home-header').style.display = '';
}

function settingsSelectScript(s) {
  settingsDraftScript = s;
  ['simplified','traditional'].forEach(v => {
    const b = document.getElementById('s-btn-'+v);
    if (b) b.classList.toggle('active', v === s);
  });
}

function settingsSelectInput(m) {
  settingsDraftInput = m;
  ['bpmf','pinyin'].forEach(v => {
    const b = document.getElementById('s-btn-'+v);
    if (b) b.classList.toggle('active', v === m);
  });
}

function settingsSelectAccent(lang) {
  settingsDraftAccent = lang;
  [['zh-TW','s-accent-tw'],['zh-CN','s-accent-cn']].forEach(([l, id]) => {
    const b = document.getElementById(id);
    if (b) b.classList.toggle('active', l === lang);
  });
}

function settingsSelectAlgorithm(a) {
  settingsDraftAlgorithm = a;
  ['robbies','batched'].forEach(v => {
    const b = document.getElementById('s-algo-'+v);
    if (b) b.classList.toggle('active', v === a);
  });
  const batchSection = document.getElementById('s-batch-section');
  if (batchSection) batchSection.style.display = a === 'batched' ? '' : 'none';
}

function saveSettings() {
  // 1. Update global operational state
  selectedScript = settingsDraftScript || selectedScript;
  inputMethod = settingsDraftInput || inputMethod;
  if (settingsDraftAlgorithm) {
    studyAlgorithm = settingsDraftAlgorithm;
    localStorage.setItem('hanzi_studyAlgorithm', studyAlgorithm);
  }
  const bsInput = document.getElementById('s-batch-size');
  if (bsInput) {
    const val = parseInt(bsInput.value);
    if (val >= 1) { batchedBatchSize = val; localStorage.setItem('hanzi_batchedBatchSize', val); }
  }

  // 2. Persist to local profile data
  if (profileData) {
    profileData.script = selectedScript;
    profileData.inputMethod = inputMethod;
    profileData.accent = settingsDraftAccent || profileData.accent;
    saveProfileData();
    
    // 3. Sync to Firebase immediately if connected
    if (firebaseUser && window._fbDb) {
      pushProfileToFirebase();
    }
  } else {
    // No profile yet — save to a minimal local record so settings persist
    const bare = JSON.parse(localStorage.getItem('hanziplay_profile') || '{}');
    bare.script = selectedScript;
    bare.inputMethod = inputMethod;
    if (settingsDraftAccent) bare.accent = settingsDraftAccent;
    localStorage.setItem('hanziplay_profile', JSON.stringify(bare));
  }

  // 4. Update active accent for speech synthesis
  if (settingsDraftAccent && profileData) {
    profileData.accent = settingsDraftAccent;
  }

  // 5. Ensure any active session inherits these changes
  const session = loadSession();
  if (session) {
    session.selectedScript = selectedScript;
    session.inputMethod = inputMethod;
    saveSession(session);
  }

  navigateHome();
  showToast('Settings saved ✓');
}
function goHome() {
  if (document.getElementById('screen-study').classList.contains('active')) {
    document.getElementById('pause-modal').classList.remove('hidden');
  } else {
    navigateHome();
  }
}
function navigateHome() {
  renderHome();
  showScreen('screen-home');
  // Start tutorial for first-time users (not if tutorial already active)
  if (!localStorage.getItem(TUTORIAL_KEY) && document.getElementById('tutorial-overlay').style.display !== 'block') {
    setTimeout(startTutorial, 600);
  }
  document.getElementById('btn-home-header').style.display = 'none';
  document.getElementById('header-modes').style.display = 'none';
  if (firebaseUser) {
    nowStudyingIndex = 0;
    loadNowStudying();
    startNotifPolling();
  }
}

// ═══════════════════════════════════════
// PAUSE MODAL
// ═══════════════════════════════════════
function resumeFromModal() { document.getElementById('pause-modal').classList.add('hidden'); }
function pauseAndGoHome() {
  document.getElementById('pause-modal').classList.add('hidden');
  clearNowStudying();
  saveSession({
    unitIds: selectedUnitIds, vocab, queue:[...queue],
    doneSet:[...doneSet], correctOnce:[...correctOnce],
    studyMode, selectedScript, inputMethod, phase, stats,
    doneCount: doneSet.size,
    totalCount: vocab.length * (studyMode==='AB'?2:1)
  });
  navigateHome();
}
function discardAndGoHome() {
  document.getElementById('pause-modal').classList.add('hidden');
  clearNowStudying();
  clearSession();
  navigateHome();
}




// ═══════════════════════════════════════
// UTILS
// ═══════════════════════════════════════
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const fab=document.getElementById('floating-edit-btn');
  if(fab) fab.classList.toggle('visible', id==='screen-study');
}
function esc(s){
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════
// AI GENERATE
// ═══════════════════════════════════════
let genScript = 'simplified';
let genCount = 10;
let generatedVocab = [];





function resetGenerate() {
  generatedVocab = [];
  document.getElementById('gen-status').style.display = 'none';
  document.getElementById('gen-preview-wrap').style.display = 'none';
  document.getElementById('gen-btn').style.display = '';
  document.getElementById('gen-save-btn').style.display = 'none';
  const p = document.getElementById('gen-prompt'); if(p) { p.value=''; }
  document.getElementById('gen-btn').disabled = true;
}

async function generateVocab() {
  const prompt = document.getElementById('gen-prompt').value.trim();
  if (!prompt) return;

  document.getElementById('gen-status').style.display = '';
  document.getElementById('gen-status').textContent = '🤖 Generating vocab...';
  document.getElementById('gen-btn').disabled = true;

  const scriptLabel = genScript === 'traditional' ? 'traditional Chinese characters (繁體字)' : 'simplified Chinese characters (简体字)';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Generate ${genCount} key Chinese vocabulary words for the topic: "${prompt}"

Requirements:
- Use ${scriptLabel}
- Include both simplified AND traditional for every word
- Include accurate pinyin with tone marks (e.g. nǐ hǎo)
- Include clear, concise English translation
- Focus on the most useful, common words for this topic
- Return ONLY a JSON array, no markdown, no explanation, no backticks

Format:
[{"simplified":"红色","traditional":"紅色","pinyin":"hóng sè","english":"red"},...]`
        }]
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.map(b=>b.text||'').join('') || '';
    const clean = text.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed) || !parsed.length) throw new Error('No words returned');

    generatedVocab = parsed.map(w => ({
      simplified: (w.simplified||'').trim(),
      traditional: (w.traditional||w.simplified||'').trim(),
      pinyin: (w.pinyin||'').trim(),
      english: (w.english||'').trim()
    })).filter(w => w.simplified && w.english);

    // Auto-fill unit name from prompt
    document.getElementById('gen-unit-name').value = prompt.charAt(0).toUpperCase() + prompt.slice(1);

    showGenPreview();

  } catch(err) {
    console.error('Generate error:', err);
    document.getElementById('gen-status').style.background = 'var(--red-light)';
    document.getElementById('gen-status').style.borderColor = 'var(--red)';
    document.getElementById('gen-status').style.color = 'var(--red)';
    document.getElementById('gen-status').textContent = '❌ Generation failed. This feature requires an internet connection and must be opened through Claude.ai or Netlify.';
    document.getElementById('gen-btn').disabled = false;
  }
}

function showGenPreview() {
  document.getElementById('gen-status').style.display = 'none';
  document.getElementById('gen-preview-count').textContent = generatedVocab.length;
  document.getElementById('gen-preview-tbody').innerHTML = generatedVocab.map(w => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 10px;font-family:'Noto Serif SC',serif;font-size:15px">
        ${esc(genScript==='traditional' ? w.traditional : w.simplified)}
        ${w.simplified !== w.traditional ? `<span style="font-size:11px;color:var(--muted);margin-left:6px">${esc(genScript==='traditional' ? w.simplified : w.traditional)}</span>` : ''}
      </td>
      <td style="padding:8px 10px;font-family:'DM Mono',monospace;font-size:12px;color:var(--gold)">${esc(w.pinyin||'—')}</td>
      <td style="padding:8px 10px;font-size:13px">${esc(w.english)}</td>
    </tr>`).join('');
  document.getElementById('gen-preview-wrap').style.display = '';
  document.getElementById('gen-btn').style.display = 'none';
  document.getElementById('gen-save-btn').style.display = '';
}

function saveGeneratedUnit() {
  const name = document.getElementById('gen-unit-name').value.trim() || 'AI Generated';
  if (!generatedVocab.length) return;
  units.push({ id:'unit_'+Date.now(), name, vocab:generatedVocab, createdAt:Date.now(), aiGenerated:true });
  saveUnits(units);
  generatedVocab = [];
  showLibrary();
}







function openEditWordModal() {
  const w = currentWord;
  if (!w) return;
  // Remove existing modal if any
  const existing = document.getElementById('edit-word-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'edit-word-modal';
  modal.className = 'edit-word-modal';
  modal.innerHTML = `
    <div class="edit-word-box">
      <h3>✏️ Edit this card</h3>
      <div class="edit-reset-notice">⚠️ Saving will reset this card's progress — it'll need 2 correct answers again.</div>
      <label style="font-size:11px;color:var(--muted);font-family:Syne,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Simplified</label>
      <input id="ewm-simp" placeholder="Simplified 简" value="${esc(w.simplified||w.chinese||'')}">
      <label style="font-size:11px;color:var(--muted);font-family:Syne,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Traditional</label>
      <input id="ewm-trad" placeholder="Traditional 繁" value="${esc(w.traditional||w.chinese||'')}">
      <label style="font-size:11px;color:var(--muted);font-family:Syne,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Pinyin</label>
      <input id="ewm-pinyin" placeholder="Pinyin" value="${esc(w.pinyin||'')}">
      <label style="font-size:11px;color:var(--muted);font-family:Syne,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">English</label>
      <input id="ewm-english" placeholder="English" value="${esc(w.english||'')}">
      <div class="edit-btns">
        <button class="btn-primary" style="flex:1;padding:12px" onclick="saveEditedWordInStudy()">Save & Reset Card →</button>
        <button class="btn-skip" style="padding:12px 16px" onclick="document.getElementById('edit-word-modal').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

function saveEditedWordInStudy() {
  const w = currentWord;
  if (!w) return;
  const simp = document.getElementById('ewm-simp').value.trim();
  const trad = document.getElementById('ewm-trad').value.trim();
  const pinyin = document.getElementById('ewm-pinyin').value.trim();
  const english = document.getElementById('ewm-english').value.trim();
  if (!simp && !english) { showToast('⚠️ Word needs at least simplified or English'); return; }

  const idx = w.idx;

  // ── Update vocab array in memory ──────────────────────────────
  if (vocab[idx]) {
    vocab[idx].simplified = simp || vocab[idx].simplified;
    vocab[idx].traditional = trad || vocab[idx].traditional;
    vocab[idx].pinyin = pinyin || vocab[idx].pinyin;
    vocab[idx].english = english || vocab[idx].english;
  }

  // ── Save to unit permanently ───────────────────────────────────
  // Check all selected units (multi-unit support)
  selectedUnitIds.forEach(unitId => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    // Find the word in this unit's vocab by original values
    const wi = unit.vocab[idx] ? idx :
      unit.vocab.findIndex(v =>
        (v.simplified === w.simplified || v.traditional === w.traditional) && v.english === w.english
      );
    if (wi >= 0 && unit.vocab[wi]) {
      unit.vocab[wi].simplified = simp || unit.vocab[wi].simplified;
      unit.vocab[wi].traditional = trad || unit.vocab[wi].traditional;
      unit.vocab[wi].pinyin = pinyin || unit.vocab[wi].pinyin;
      unit.vocab[wi].english = english || unit.vocab[wi].english;
    }
  });
  saveUnits();

  // ── Reset this card's progress in the session ─────────────────
  // Remove from doneSet and correctOnce so it needs 2 correct again
  doneSet.delete(idx);
  correctOnce.delete(idx);

  // Remove any pending copies of this card from queue, then
  // put it right at the front so user sees updated card immediately
  const newQueue = queue.filter((q, qi) => qi > 0 || true); // keep queue
  // Remove ALL occurrences of idx from queue (including current position 0)
  while (queue.includes(idx)) {
    queue.splice(queue.indexOf(idx), 1);
  }
  // Put the edited card at position 0 (next up immediately)
  queue.unshift(idx);

  // Update currentWord with new values
  currentWord = {...vocab[idx], idx};

  document.getElementById('edit-word-modal').remove();
  showToast('✅ Card updated — needs 2 more correct answers!', 3500);
  renderCard(); // re-render immediately with updated data
}


// ── STUDY PLAN ────────────────────────────────────────
function selectPlan(p) {
  studyPlan = p;
  ['full','half1','half2','custom'].forEach(id => {
    const btn = document.getElementById('plan-'+id);
    if (btn) btn.classList.toggle('active', id===p);
  });
  const picker = document.getElementById('word-picker-container');
  if (p === 'custom') {
    if (picker) picker.style.display = 'block';
    renderWordPicker();
  } else {
    if (picker) picker.style.display = 'none';
  }
  updatePlanProgress();
}

function renderWordPicker() {
  const wrap = document.getElementById('word-picker-wrap');
  if (!wrap || !vocab || !vocab.length) return;
  const progress = loadStudyProgress();
  wrap.innerHTML = vocab.map((w,i) => {
    const done = progress && progress.doneIndices && progress.doneIndices.includes(i);
    const sel = customWordIndices ? customWordIndices.includes(i) : !done;
    const ch = selectedScript==='traditional'?w.traditional:w.simplified;
    return `<div class="word-pick-chip${sel?' selected':''}" onclick="toggleWordPick(${i})" id="pick-${i}" title="${esc(w.english)}">
      ${done?'✓ ':''}<span class="zh">${esc(ch)}</span>
    </div>`;
  }).join('');
  if (!customWordIndices) {
    customWordIndices = vocab.map((_,i)=>i).filter(i => !progress?.doneIndices?.includes(i));
  }
  updatePickerCount();
}

function toggleWordPick(i) {
  if (!customWordIndices) customWordIndices = [];
  const idx = customWordIndices.indexOf(i);
  if (idx>=0) customWordIndices.splice(idx,1);
  else customWordIndices.push(i);
  const chip = document.getElementById('pick-'+i);
  if (chip) chip.classList.toggle('selected', customWordIndices.includes(i));
  updatePickerCount();
}

function updatePickerCount() {
  const el = document.getElementById('picker-count');
  if (el) el.textContent = customWordIndices ? customWordIndices.length : 0;
}

function getStudyProgressKey() {
  return STUDY_PROGRESS_KEY + '_' + selectedUnitIds.join('-');
}

function saveStudyProgress(doneIndices) {
  try {
    const data = { doneIndices, timestamp: Date.now(), plan: studyPlan };
    localStorage.setItem(getStudyProgressKey(), JSON.stringify(data));
  } catch(e) {}
}

function loadStudyProgress() {
  try {
    const raw = localStorage.getItem(getStudyProgressKey());
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function updatePlanProgress() {
  const prog = loadStudyProgress();
  const bar = document.getElementById('plan-progress-bar');
  const fill = document.getElementById('plan-progress-fill');
  const lbl = document.getElementById('plan-progress-label');
  if (!bar || !fill || !lbl || !vocab) return;
  if (prog && prog.doneIndices && prog.doneIndices.length > 0 && studyPlan !== 'full') {
    const pct = Math.round((prog.doneIndices.length / vocab.length) * 100);
    bar.style.display = 'block'; lbl.style.display = 'block';
    fill.style.width = pct + '%';
    const d = new Date(prog.timestamp);
    lbl.textContent = `Last session: ${prog.doneIndices.length}/${vocab.length} done (${d.toLocaleDateString()})`;
  } else {
    bar.style.display = 'none'; lbl.style.display = 'none';
  }
}

function getSelectedVocabIndices() {
  if (!vocab) return [];
  const progress = loadStudyProgress();
  const allIdx = vocab.map((_,i)=>i);
  if (studyPlan === 'full') return allIdx;
  if (studyPlan === 'half1') return allIdx.slice(0, Math.ceil(allIdx.length/2));
  if (studyPlan === 'half2') return allIdx.slice(Math.ceil(allIdx.length/2));
  if (studyPlan === 'custom') return customWordIndices && customWordIndices.length > 0 ? [...customWordIndices] : allIdx;
  return allIdx;
}

