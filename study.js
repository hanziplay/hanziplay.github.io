// ── Correct / Wrong feedback tones ───────────────────────────────────────
// Inject yellow "half" dot style for streak dots
(function() {
  const s = document.createElement('style');
  s.textContent = `.streak-dot.half { background: var(--gold, #f0a500) !important; opacity: 1 !important; }`;
  document.head.appendChild(s);
})();
function areFeedbackSoundsOn() {
  try {
    const v = localStorage.getItem('hanziFeedbackSounds');
    return v === null ? true : v === 'true'; // default ON
  } catch(e) { return true; }
}
function setFeedbackSounds(on) {
  try { localStorage.setItem('hanziFeedbackSounds', on ? 'true' : 'false'); } catch(e) {}
}
function playCorrectTone() {
  if (!areFeedbackSoundsOn()) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.connect(ctx.destination);
    [[659.25, 0.00], [783.99, 0.09]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(gain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0.8, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.18);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.2);
    });
    setTimeout(() => ctx.close(), 600);
  } catch(e) {}
}
function playWrongTone() {
  if (!areFeedbackSoundsOn()) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 600);
  } catch(e) {}
}

// ── Hint tone: confused "huh?" — wobbly dip then questioning uptick ──────
function playHintTone() {
  if (!areFeedbackSoundsOn()) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.13, ctx.currentTime);
    master.connect(ctx.destination);

    // "Huh" — descend then wobble
    const huh = ctx.createOscillator();
    const huhGain = ctx.createGain();
    huh.connect(huhGain); huhGain.connect(master);
    huh.type = 'sine';
    huh.frequency.setValueAtTime(440, ctx.currentTime);
    huh.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.12);
    huh.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.20);
    huh.frequency.linearRampToValueAtTime(290, ctx.currentTime + 0.28);
    huhGain.gain.setValueAtTime(0.0, ctx.currentTime);
    huhGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.03);
    huhGain.gain.setValueAtTime(0.7, ctx.currentTime + 0.22);
    huhGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    huh.start(ctx.currentTime);
    huh.stop(ctx.currentTime + 0.38);

    // "?" — small upward questioning blip after a pause
    const q = ctx.createOscillator();
    const qGain = ctx.createGain();
    q.connect(qGain); qGain.connect(master);
    q.type = 'triangle';
    q.frequency.setValueAtTime(380, ctx.currentTime + 0.42);
    q.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.58);
    qGain.gain.setValueAtTime(0.0, ctx.currentTime + 0.42);
    qGain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.44);
    qGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.62);
    q.start(ctx.currentTime + 0.42);
    q.stop(ctx.currentTime + 0.65);

    setTimeout(() => ctx.close(), 1000);
  } catch(e) {}
}

// ── Already-know-it tone: bright "wow!" ascending sweep ──────────────────
function playAlreadyKnowTone() {
  if (!areFeedbackSoundsOn()) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.16, ctx.currentTime);
    master.connect(ctx.destination);
    // Quick upward swoosh on a sine, then a bright sparkle chord
    const swoosh = ctx.createOscillator();
    const swooshGain = ctx.createGain();
    swoosh.connect(swooshGain); swooshGain.connect(master);
    swoosh.type = 'sine';
    swoosh.frequency.setValueAtTime(300, ctx.currentTime);
    swoosh.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.18);
    swooshGain.gain.setValueAtTime(0.6, ctx.currentTime);
    swooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    swoosh.start(ctx.currentTime);
    swoosh.stop(ctx.currentTime + 0.25);
    // Sparkle: E6 + G6 together
    [[1318.5, 0.18], [1568.0, 0.18], [2093.0, 0.26]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0.5, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.18);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.2);
    });
    setTimeout(() => ctx.close(), 800);
  } catch(e) {}
}
function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    // Notes: quick ascending fanfare + held chord
    const notes = [
      { freq: 523.25, start: 0.00, dur: 0.12 },   // C5
      { freq: 659.25, start: 0.10, dur: 0.12 },   // E5
      { freq: 783.99, start: 0.20, dur: 0.12 },   // G5
      { freq: 1046.5, start: 0.30, dur: 0.40 },   // C6
      { freq: 783.99, start: 0.30, dur: 0.40 },   // G5 (chord)
      { freq: 659.25, start: 0.30, dur: 0.40 },   // E5 (chord)
      // little sparkle tail
      { freq: 1318.5, start: 0.55, dur: 0.10 },   // E6
      { freq: 1568.0, start: 0.65, dur: 0.20 },   // G6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    // Close context after sound finishes
    setTimeout(() => ctx.close(), 1200);
  } catch(e) {
    console.warn('playCelebrationSound failed:', e);
  }
}

// ═══════════════════════════════════════
// MODE SELECT
// ═══════════════════════════════════════
function selectScript(s) {
  selectedScript=s;
  document.getElementById('s-btn-simplified').classList.toggle('active',s==='simplified');
  document.getElementById('s-btn-traditional').classList.toggle('active',s==='traditional');
}
function selectInput(m) {
  inputMethod=m;
  document.getElementById('s-btn-bpmf').classList.toggle('active',m==='bpmf');
  document.getElementById('s-btn-pinyin').classList.toggle('active',m==='pinyin');
  // Update mode card descriptions
  if (m==='pinyin') {
    document.getElementById('card-A-desc').innerHTML = 'See <strong>character + pinyin</strong><br>Type character + English';
    document.getElementById('card-B-desc').innerHTML = 'See <strong>English</strong><br>Type pinyin + character';
    showToast('📱 This mode is best when on a phone!');
  } else {
    document.getElementById('card-A-desc').innerHTML = 'See <strong>character + pinyin</strong><br>Type character + English';
    document.getElementById('card-B-desc').innerHTML = 'See <strong>English</strong><br>Type the character';
  }
}
function selectMode(m) {
  studyMode=m;
  ['A','B','AB'].forEach(x=>document.getElementById('card-'+x).classList.toggle('selected',x===m));
  document.getElementById('start-btn').disabled=false;
}
function selectOrder(o){
  wordOrder=o;
  document.getElementById('btn-order-shuffle').classList.toggle('active', o==='shuffle');
  document.getElementById('btn-order-list').classList.toggle('active', o==='list');
}
function addNextBatch() {
  if (!window._remainingIdx || window._remainingIdx.length===0) return false;
  const next = window._remainingIdx.splice(0, batchSize);
  activeSet = [...activeSet, ...next];
  queue = [...queue, ...next];
  return true;
}

function startStudy() {
  if (!studyMode) return;
  showVolumeTip(() => {
    clearSession();
    stats={correct:0,wrong:0,reveals:0}; wordErrorCounts={}; window._alreadyKnownCount=0;
    phase = studyMode==='B' ? 'B' : 'A';
    initPhase(phase);
    showScreen('screen-study');
    document.getElementById('btn-home-header').style.display='';
    document.getElementById('header-modes').style.display=studyMode==='AB'?'none':'flex';
    updateHeaderBadge();
    const unitName = selectedUnitIds.map(id => units.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
    setNowStudying(unitName);
  });
}

function showVolumeTip(onContinue) {
  const existing = document.getElementById('volume-tip-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'volume-tip-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.55);
    animation:fadeIn 0.2s ease;
  `;
  modal.innerHTML = `
    <div style="
      background:var(--paper, #fffdf8);
      border-radius:24px;
      padding:36px 28px 28px;
      max-width:320px;
      width:90%;
      text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);
      font-family:'Syne',sans-serif;
    ">
      <div style="font-size:52px;margin-bottom:12px">🔊</div>
      <div style="font-size:18px;font-weight:800;color:var(--ink,#1a1210);margin-bottom:10px">
        Teacher Robbie Tip
      </div>
      <div style="font-size:14px;color:var(--ink,#1a1210);line-height:1.65;margin-bottom:8px">
        Make sure your volume is on! Listen to the word after each correct answer.
      </div>
      <div style="
        font-size:15px;font-weight:700;
        color:var(--red,#c0392b);
        background:rgba(192,57,43,0.08);
        border-radius:12px;
        padding:12px 14px;
        margin:14px 0 22px;
        line-height:1.5;
      ">
        🗣️ Say it out loud to yourself.<br>
        <span style="font-weight:400;font-size:13px">Seriously!!!!!!!! THIS is the thing that makes it stick.</span>
      </div>
      <button id="volume-tip-ok" style="
        width:100%;
        padding:14px;
        border-radius:14px;
        border:none;
        background:var(--red,#c0392b);
        color:#fff;
        font-size:15px;
        font-weight:700;
        font-family:'Syne',sans-serif;
        cursor:pointer;
      ">加油！💪</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#volume-tip-ok').addEventListener('click', () => {
    modal.remove();
    onContinue();
  });
}

// ═══════════════════════════════════════
// STUDY ENGINE
// ═══════════════════════════════════════

// For Full Circuit (AB): each card has r1 and r2 sub-objects
// Single mode: cardCounts[idx] = { count: 0, retryAfter: 0 }
// AB mode:     cardCounts[idx] = { r1: { count: 0, retryAfter: 0 }, r2: { count: 0, retryAfter: 0 } }
// retryAfter = timestamp (ms) after which the card may be shown again; 0 = show immediately
let round2Set = new Set();
let cardCounts = {};
let phaseSnapshots = {};


function initPhase(p) {
  if (studyAlgorithm === 'batched') { initBatchedPhase(p); return; }
  phase=p; window._pinyinNoticeSeen=false;
  doneSet=new Set(); correctOnce=new Set(); checking=false;
  round2Set=new Set(); cardCounts={};
  let allIdx = getSelectedVocabIndices();
  if (wordOrder==='shuffle') shuffleArray(allIdx);
  activeSet = allIdx.slice(0, batchSize);
  window._remainingIdx = allIdx.slice(batchSize);
  // init counts for first batch
  activeSet.forEach(i => { cardCounts[i] = _initCardCount(); });
  queue = [...activeSet];
  updatePhaseBanner(); nextCard();
}

function updatePhaseBanner() {
  document.getElementById('phase-banner').style.display='none';
}

function shuffleArray(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} }

function nextCard() {
  if (studyAlgorithm === 'batched') { nextBatchedCard(); return; }
  clearInputs(); updateProgress();

  // Build the full pending list (not done)
  const pending = activeSet.filter(i => !doneSet.has(i));

  // All mastered?
  if (pending.length === 0) {
    const added = addNextBatch();
    if (added) {
      activeSet.filter(i=>!cardCounts[i]).forEach(i=>{ cardCounts[i]=_initCardCount(); });
      nextCard(); return;
    }
    clearSession(); showComplete(); return;
  }

  const now = Date.now();

  // Among pending, find cards ready to show (retryAfter <= now), sorted soonest first
  const ready = pending
    .filter(i => _getRetryAfter(i) <= now)
    .sort((a,b) => _getRetryAfter(a) - _getRetryAfter(b));

  // If nothing is ready yet, just show the soonest card anyway (never block the user)
  const sorted = pending.sort((a,b) => _getRetryAfter(a) - _getRetryAfter(b));
  queue = ready.length > 0 ? ready : sorted;
  const idx = queue[0];
  currentWord = {...vocab[idx], idx};
  renderCard();
}

// ═══════════════════════════════════════
// BATCHED INTRODUCTION ENGINE
// ═══════════════════════════════════════
// batchQueue: ordered array of vocab indices for current batch (strict order, wrong → end)
// cardCounts[i].count: 0, 1, or 2 (2 = done)
// No retryAfter timers — strictly queue-ordered

let batchQueue = [];      // current ordered queue within this batch
let batchAllIdx = [];     // all remaining indices not yet in a batch

function initBatchedPhase(p) {
  phase=p; window._pinyinNoticeSeen=false;
  doneSet=new Set(); correctOnce=new Set(); checking=false;
  round2Set=new Set(); cardCounts={};
  batchAllIdx = getSelectedVocabIndices();
  if (wordOrder==='shuffle') shuffleArray(batchAllIdx);
  _loadNextBatchedBatch();
  updatePhaseBanner();
  nextBatchedCard();
}

function _loadNextBatchedBatch() {
  const size = batchedBatchSize || 5;
  const next = batchAllIdx.splice(0, size);
  activeSet = next;
  next.forEach(i => { if (!cardCounts[i]) cardCounts[i] = { count: 0 }; });
  batchQueue = [...next];
}

function nextBatchedCard() {
  clearInputs(); updateProgress();

  // Remove mastered cards from queue
  batchQueue = batchQueue.filter(i => !doneSet.has(i));

  // Batch complete?
  if (batchQueue.length === 0) {
    if (batchAllIdx.length > 0) {
      // Load next batch
      _loadNextBatchedBatch();
      nextBatchedCard(); return;
    }
    // All done
    clearSession(); showComplete(); return;
  }

  const idx = batchQueue[0];
  currentWord = {...vocab[idx], idx};
  renderCard();
}

function _batchedMarkCorrect(w) {
  const isAB = studyMode === 'AB';
  if (!cardCounts[w.idx]) cardCounts[w.idx] = { count: 0 };

  if (isAB) {
    // AB mode: r1 count → promote to r2 → r2 count → done
    if (!cardCounts[w.idx].r1) cardCounts[w.idx] = { r1:{count:0}, r2:{count:0} };
    if (round2Set.has(w.idx)) {
      cardCounts[w.idx].r2.count++;
      if (cardCounts[w.idx].r2.count >= 2) doneSet.add(w.idx);
    } else {
      cardCounts[w.idx].r1.count++;
      if (cardCounts[w.idx].r1.count >= 2) {
        round2Set.add(w.idx);
        cardCounts[w.idx].r2 = {count:0};
        // re-add to end of batch for round 2
        batchQueue = batchQueue.filter(i => i !== w.idx);
        batchQueue.push(w.idx);
      }
    }
  } else {
    cardCounts[w.idx].count++;
    if (cardCounts[w.idx].count >= 2) {
      doneSet.add(w.idx);
    } else {
      correctOnce.add(w.idx);
    }
  }
}

function _batchedMarkWrong(w) {
  const isAB = studyMode === 'AB';
  if (!cardCounts[w.idx]) cardCounts[w.idx] = { count: 0 };

  if (isAB) {
    if (!cardCounts[w.idx].r1) cardCounts[w.idx] = { r1:{count:0}, r2:{count:0} };
    if (round2Set.has(w.idx)) { cardCounts[w.idx].r2.count = 0; }
    else { cardCounts[w.idx].r1.count = 0; }
  } else {
    cardCounts[w.idx].count = 0;
    correctOnce.delete(w.idx);
  }
  // Move to end of batch queue
  batchQueue = batchQueue.filter(i => i !== w.idx);
  batchQueue.push(w.idx);
}

// Helper: get retryAfter for a card index in current mode
function _getRetryAfter(i) {
  const cc = cardCounts[i];
  if (!cc) return 0;
  const isAB = studyMode === 'AB';
  if (isAB) {
    return round2Set.has(i) ? cc.r2.retryAfter : cc.r1.retryAfter;
  }
  return cc.retryAfter;
}

function _initCardCount() {
  const isAB = studyMode === 'AB';
  if (isAB) return { r1: {count:0, retryAfter:0}, r2: {count:0, retryAfter:0} };
  return { count: 0, retryAfter: 0 };
}

function renderCard() {
  const w=currentWord;
  checking=false;
  const ch=selectedScript==='traditional'?w.traditional:w.simplified;
  w.chinese=ch;
  w._hintStage=undefined; w._hintMarkedWrong=false; w.wasRevealed=false; w._wrongThisRound=false;
  hidePinyinBanner();

  const isPinyin = inputMethod==='pinyin';
  const isAB = studyMode==='AB';

  // Determine effective phase for this card
  // AB mode: card is in round2Set = show English→Chinese (phase B logic)
  //          card not in round2Set = show Chinese→English (phase A logic)
  // A mode: always show Chinese→English
  // B mode: always show English→Chinese
  let effectivePhase;
  if (isAB) {
    effectivePhase = round2Set.has(w.idx) ? 'B' : 'A';
  } else {
    effectivePhase = phase;
  }

  if (effectivePhase==='A') {
    // Round 1 / Type A: see Chinese+pinyin → type character + English in one box
    const roundLabel = isAB ? 'Round 1  ·  ' : 'Type A  ·  ';
    document.getElementById('card-label-top').textContent = roundLabel + 'See character + pinyin → Type character + English';
    const displayCh = ch || w.simplified || w.traditional || '';
    const charsArr = [...displayCh];
    const syllablesArr = (w.pinyin || '').split(' ');
    const colWidth = 58;
    const charsHtml = charsArr.map(c =>
      `<span style="display:inline-block;width:${colWidth}px;text-align:center">${esc(c)}</span>`
    ).join('');
    const pyHtml = charsArr.map((_, i) =>
      `<span style="display:inline-block;width:${colWidth}px;text-align:center;font-size:13px;color:var(--muted);font-family:'DM Mono',monospace">${esc(syllablesArr[i] || '')}</span>`
    ).join('');
    document.getElementById('card-prompt').innerHTML =
      `<div class="prompt-chinese" style="letter-spacing:0">${charsHtml}</div>
      <div style="position:relative;margin-top:4px;display:inline-block;min-width:130px">
        <div id="pinyin-reveal-row" style="visibility:hidden">${pyHtml}</div>
        <div id="pinyin-sticker" onclick="document.getElementById('pinyin-sticker').style.display='none';document.getElementById('pinyin-reveal-row').style.visibility='visible'" style="position:absolute;top:0;left:0;width:100%;height:100%;background:#7c5cba;color:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.8px;padding:5px 10px;box-sizing:border-box;user-select:none;white-space:nowrap;text-transform:uppercase">REVEAL PINYIN</div>
      </div>`;
    document.getElementById('inputs-section').innerHTML =
      `<div class="input-label">Character + English <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input chinese-input" id="inp-main" type="text" placeholder="e.g. 狗 dog" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off">
      <div class="feedback-row" id="fb-main"></div>`;
  } else {
    // Round 2 / Type B: see English → type Chinese
    const roundLabel = isAB ? 'Round 2  ·  ' : 'Type B  ·  ';
    document.getElementById('card-label-top').textContent = isPinyin
      ? roundLabel + 'See English → Type pinyin + character'
      : roundLabel + 'See English → Type the character';
    document.getElementById('card-prompt').innerHTML = `<div class="prompt-english">${esc(w.english)}</div>`;
    document.getElementById('inputs-section').innerHTML = isPinyin
      ? `<div class="input-label">Pinyin + Character <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input chinese-input" id="inp-main" type="text" placeholder="e.g. gǒu 狗" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off">
      <div class="feedback-row" id="fb-main"></div>`
      : `<div class="input-label">Character <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input chinese-input" id="inp-main" type="text" placeholder="漢字…" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off">
      <div class="feedback-row" id="fb-main"></div>`;
  }

  renderStreakDots(w.idx);
  const inp=document.getElementById('inp-main');
  if(inp){
    inp.addEventListener('input',onInputChange);
    inp.addEventListener('compositionstart', () => { inp._composing = true; });
    inp.addEventListener('compositionend', () => { setTimeout(()=>{ inp._composing = false; }, 50); });
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){ e.preventDefault(); if(!inp._composing) checkAnswer(true);}});
    inp.addEventListener('paste',e=>e.preventDefault());
    inp.addEventListener('copy',e=>e.preventDefault());
    inp.addEventListener('cut',e=>e.preventDefault());
    setTimeout(()=>inp.focus(),50);
  }
}

// ── Pinyin mode matching helpers ──────────────────
function splitPinyinInput(input) {
  input = input.trim();
  // First try splitting on whitespace
  const tokens = input.split(/\s+/);
  if (tokens.length > 1) {
    const cjk = [], latin = [];
    for (const t of tokens) {
      if (/[\u3400-\u9fff\uf900-\ufaff]/.test(t)) cjk.push(t);
      else latin.push(t);
    }
    return { charsTyped: cjk.join(''), pinyinTyped: latin.join(' ').trim() };
  }
  // No space — try CJK-first: 狗gou
  const cjkFirst = input.match(/^([\u3400-\u9fff\uf900-\ufaff]+)(.+)$/);
  if (cjkFirst) return { charsTyped: cjkFirst[1], pinyinTyped: cjkFirst[2].trim() };
  // Try latin-first: gou狗
  const latinFirst = input.match(/^([^\u3400-\u9fff\uf900-\ufaff]+)([\u3400-\u9fff\uf900-\ufaff]+)$/);
  if (latinFirst) return { charsTyped: latinFirst[2], pinyinTyped: latinFirst[1].trim() };
  // Only one type present
  if (/[\u3400-\u9fff\uf900-\ufaff]/.test(input)) return { charsTyped: input, pinyinTyped: '' };
  return { charsTyped: '', pinyinTyped: input };
}

function pinyinStrictMatch(typed, correct) {
  const n = s => s.trim().toLowerCase().replace(/\s+/g,'');
  return n(typed) === n(correct);
}

function onInputChange() {
  // Hide the masked hint banner when user starts typing (but leave reveal-stage answer alone — it has its own clearOnType)
  const w = currentWord;
  if (w && w._hintStage === 'hinted') {
    const banner=document.getElementById('pinyin-hint-banner');
    if(banner && banner.classList.contains('visible')) banner.classList.remove('visible');
  }
  if(checking) return;
  const inp=document.getElementById('inp-main');
  if(!inp||!inp.value.trim()) return;
}

// Returns true if the input value is correct for current card/mode
function checkAnswerLogic(val) {
  val = val || '';
  const w=currentWord;
  const isPinyin = inputMethod==='pinyin';
  const isAB = studyMode==='AB';
  const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;

  if (effectivePhase==='A') {
    // Single box: character + English (e.g. "狗 dog"), space or no space
    const val2 = val.trim();
    // Split on first space, or try no-space if no space found
    const spaceIdx = val2.search(/\s+/);
    let charsTyped, engTyped;
    if (spaceIdx > -1) {
      charsTyped = val2.slice(0, spaceIdx).trim();
      engTyped = val2.slice(spaceIdx).trim();
    } else {
      // No space — try matching leading CJK chars vs trailing latin
      const cjkMatch = val2.match(/^([\u3400-\u9fff\uf900-\ufaff]+)(.*)/);
      if (cjkMatch) {
        charsTyped = cjkMatch[1];
        engTyped = cjkMatch[2].trim();
      } else {
        charsTyped = '';
        engTyped = val2;
      }
    }
    const safeChar = (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
    return norm(charsTyped) === norm(safeChar) && engMatch(engTyped, w.english);
  } else {
    // Phase B
    if (isPinyin) {
      // Need pinyin + character (either order)
      const {charsTyped, pinyinTyped} = splitPinyinInput(val);
      const safeCharB = (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
      return norm(charsTyped)===norm(safeCharB) && pinyinStrictMatch(pinyinTyped, w.pinyin);
    } else {
      // BPMF: character only
      const safeCharB = (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
      return norm(val)===norm(safeCharB);
    }
  }
}

function checkAnswer(manual=true) {
  if(checking) return;
  const w=currentWord;
  if(!w) return;
  const inp=document.getElementById('inp-main');
  if(!inp) return;
  const val = (inp.value || '');
  const ok=checkAnswerLogic(val);
  const isAB = studyMode==='AB';

  if(ok){
    checking=true;
    inp.classList.add('correct');
    const fb=document.getElementById('fb-main');
    const chForSpeak = selectedScript==='traditional' ? w.traditional : w.simplified;
    if(fb) fb.innerHTML=`<span class="feedback-correct">✓</span> <button onclick="speakChinese('${(chForSpeak||'').replace(/'/g,"\\'")}') " style="background:none;border:none;font-size:18px;cursor:pointer;padding:0 4px;vertical-align:middle;opacity:0.7;" title="Hear it again">🔊</button>`;
    stats.correct++;
    queue.shift();

    if (studyAlgorithm === 'batched') {
      _batchedMarkCorrect(w);
    } else {
    const now = Date.now();
    if (isAB) {
      if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
      if (round2Set.has(w.idx)) {
        // Round 2
        cardCounts[w.idx].r2.count++;
        if (cardCounts[w.idx].r2.count >= 2) {
          doneSet.add(w.idx); // mastered!
        } else {
          cardCounts[w.idx].r2.retryAfter = now + 120000; // 2min lock-in
        }
      } else {
        // Round 1
        cardCounts[w.idx].r1.count++;
        if (cardCounts[w.idx].r1.count >= 2) {
          round2Set.add(w.idx); // promote to round 2
          cardCounts[w.idx].r2.retryAfter = 0; // show round 2 soon
        } else {
          cardCounts[w.idx].r1.retryAfter = now + 120000; // 2min lock-in
        }
      }
    } else {
      // Single mode A or B
      if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
      cardCounts[w.idx].count++;
      if (cardCounts[w.idx].count >= 2) {
        doneSet.add(w.idx); // mastered!
      } else {
        cardCounts[w.idx].retryAfter = now + 120000; // 2min lock-in
        correctOnce.add(w.idx); // for dot rendering
      }
    }
    }

    renderStreakDots(w.idx);
    const chText = w.chinese || (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
    if (areFeedbackSoundsOn()) { playCorrectTone(); setTimeout(() => { const _safety=setTimeout(nextCard,3500); speakChinese(chText).then(() => { clearTimeout(_safety); setTimeout(nextCard, 150); }); }, 700); } else { const _safety=setTimeout(nextCard,3500); speakChinese(chText).then(() => { clearTimeout(_safety); setTimeout(nextCard, 150); }); }

  } else if(manual){
    inp.classList.add('wrong');
    playWrongTone();
    const fb=document.getElementById('fb-main');
    const isPinyin = inputMethod==='pinyin';
    const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;
    const safeCharHint = (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
    let correctHint;
    if (effectivePhase==='A') {
      correctHint = `${safeCharHint} ${w.english}`;
    } else {
      correctHint = isPinyin ? `${w.pinyin} ${safeCharHint}` : safeCharHint;
    }
    const isCh = true;
    if(fb) fb.innerHTML=`<span class="feedback-wrong">✗</span> <span class="feedback-answer ${isCh?'chinese-answer':''}">${esc(correctHint)}</span>`;
    stats.wrong++;
    wordErrorCounts[w.idx] = (wordErrorCounts[w.idx] || 0) + 1;

    if (studyAlgorithm === 'batched') {
      _batchedMarkWrong(w);
    } else {
    // Reset count and set 30s cooldown
    const now = Date.now();
    if (isAB) {
      if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
      if (round2Set.has(w.idx)) {
        cardCounts[w.idx].r2.count = 0;
        cardCounts[w.idx].r2.retryAfter = now + 30000;
      } else {
        cardCounts[w.idx].r1.count = 0;
        cardCounts[w.idx].r1.retryAfter = now + 30000;
      }
    } else {
      if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
      cardCounts[w.idx].count = 0;
      cardCounts[w.idx].retryAfter = now + 30000;
      correctOnce.delete(w.idx);
    }
    }

    queue.shift();
    renderStreakDots(w.idx);
    window._mustRetype = true;
    setTimeout(()=>{ inp.value=''; inp.classList.remove('wrong'); inp.focus(); window._mustRetype=false; }, 900);
  }
}

function renderStreakDots(idx) {
  const el=document.getElementById('dots-main'); if(!el) return;
  el.innerHTML='';
  const isAB = studyMode==='AB';
  const counts = cardCounts[idx] || _initCardCount();
  const isDone = doneSet.has(idx);

  if (isAB) {
    // 2 dots total: dot 1 = Round A progress, dot 2 = Round B progress
    // Each dot: empty → yellow (1 correct) → green (2 correct / done)
    const inR2 = round2Set.has(idx);
    const r1Count = counts.r1 ? counts.r1.count : 0;
    const r2Count = counts.r2 ? counts.r2.count : 0;

    // Dot 1: Round A
    const d1 = document.createElement('div');
    const r1Done = inR2 || isDone; // promoted = both corrects done for r1
    if (r1Done) {
      d1.className = 'streak-dot filled'; // green
    } else if (r1Count >= 1) {
      d1.className = 'streak-dot half'; // yellow
    } else {
      d1.className = 'streak-dot';
    }
    d1.title = 'Round A';
    el.appendChild(d1);

    // Dot 2: Round B
    const d2 = document.createElement('div');
    const r2Done = isDone;
    if (r2Done) {
      d2.className = 'streak-dot filled'; // green
    } else if (inR2 && r2Count >= 1) {
      d2.className = 'streak-dot half'; // yellow
    } else {
      d2.className = 'streak-dot';
    }
    d2.title = 'Round B';
    el.appendChild(d2);
  } else {
    // Single mode: 2 dots — yellow on 1, green on 2
    for(let i=0;i<2;i++){
      const d=document.createElement('div');
      if (isDone || counts.count > i) {
        d.className = 'streak-dot filled';
      } else if (i === 0 && counts.count === 1) {
        d.className = 'streak-dot half';
      } else {
        d.className = 'streak-dot';
      }
      el.appendChild(d);
    }
  }
}

function showToast(msg, duration=3500){
  let t=document.getElementById('hanzi-toast');
  if(!t){t=document.createElement('div');t.id='hanzi-toast';
  t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(26,18,16,0.9);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-family:Syne,sans-serif;font-weight:600;z-index:9999;pointer-events:none;transition:opacity 0.4s;white-space:nowrap;';
  document.body.appendChild(t);}
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.style.opacity='0',duration);
}
// ── Audio: speak Chinese word after correct answer ────────────────────────
let _cachedVoices = [];
function _loadVoices() {
  const v = window.speechSynthesis.getVoices();
  if (v.length) _cachedVoices = v;
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _loadVoices;
  _loadVoices();
}

function _getChineseVoice(lang) {
  if (!_cachedVoices.length) _loadVoices();
  return _cachedVoices.find(v => v.lang === lang) ||
         _cachedVoices.find(v => v.lang === 'zh-TW') ||
         _cachedVoices.find(v => v.lang === 'zh-CN') ||
         _cachedVoices.find(v => v.lang.startsWith('zh')) ||
         null;
}

function speakChinese(text) {
  return new Promise(resolve => {
    if (!text || !window.speechSynthesis) {
      console.warn('[speakChinese] no text or no speechSynthesis');
      resolve(); return;
    }
    const lang = (profileData && profileData.accent) || 'zh-TW';
    const voices = window.speechSynthesis.getVoices();
    console.log('[speakChinese] text:', text, '| lang:', lang, '| voices available:', voices.length);

    const doSpeak = () => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 0.85;
      utter.pitch = 1.0;
      const voice = _getChineseVoice(lang);
      console.log('[speakChinese] using voice:', voice ? voice.name : 'none (default)');
      if (voice) utter.voice = voice;
      const fallback = setTimeout(() => {
        console.warn('[speakChinese] fallback timeout fired — onend never came');
        resolve();
      }, 1500);
      utter.onstart = () => console.log('[speakChinese] onstart fired');
      utter.onend = () => { console.log('[speakChinese] onend fired'); clearTimeout(fallback); resolve(); };
      utter.onerror = (e) => { console.error('[speakChinese] onerror:', e.error); clearTimeout(fallback); resolve(); };
      window.speechSynthesis.speak(utter);
      console.log('[speakChinese] speak() called, speaking:', window.speechSynthesis.speaking);
    };

    if (_cachedVoices.length) {
      doSpeak();
    } else {
      const waited = Date.now();
      const poll = setInterval(() => {
        _loadVoices();
        if (_cachedVoices.length || Date.now() - waited > 1000) {
          clearInterval(poll);
          doSpeak();
        }
      }, 50);
    }
  });
}

function norm(s){return s.trim().toLowerCase().replace(/\s+/g,' ');}
function engMatch(input,answer){
  const a=answer.split(/[,\/]/).map(s=>s.trim().toLowerCase());
  return a.some(x=>x===input.trim().toLowerCase());
}
// ── Pause / Resume: convert absolute timestamps ↔ remaining ms ───────────
function pauseStudyTimers() {
  const now = Date.now();
  Object.values(cardCounts).forEach(cc => {
    if (cc.retryAfter !== undefined) {
      cc._remainingMs = Math.max(0, cc.retryAfter - now);
      cc.retryAfter = Infinity;
    } else {
      if (cc.r1) { cc.r1._remainingMs = Math.max(0, cc.r1.retryAfter - now); cc.r1.retryAfter = Infinity; }
      if (cc.r2) { cc.r2._remainingMs = Math.max(0, cc.r2.retryAfter - now); cc.r2.retryAfter = Infinity; }
    }
  });
}

function resumeStudyTimers() {
  const now = Date.now();
  Object.values(cardCounts).forEach(cc => {
    if (cc._remainingMs !== undefined) {
      cc.retryAfter = cc._remainingMs > 0 ? now + cc._remainingMs : 0;
      delete cc._remainingMs;
    } else {
      if (cc.r1 && cc.r1._remainingMs !== undefined) {
        cc.r1.retryAfter = cc.r1._remainingMs > 0 ? now + cc.r1._remainingMs : 0;
        delete cc.r1._remainingMs;
      }
      if (cc.r2 && cc.r2._remainingMs !== undefined) {
        cc.r2.retryAfter = cc.r2._remainingMs > 0 ? now + cc.r2._remainingMs : 0;
        delete cc.r2._remainingMs;
      }
    }
  });
  nextCard();
}

// ── Progressive hint: first tap = masked hint, second tap = full reveal ───
// State tracked per-card via w._hintStage: undefined → 'hinted' → 'revealed'

function askRobbieHint(){
  const w=currentWord;
  if(!w) return;

  if (!w._hintStage) {
    // ── Stage 1: masked hint ─────────────────────────────────────────────
    _markHintWrong(w);
    playHintTone();
    const inp = document.getElementById('inp-main');
    if (inp) { inp.classList.add('wrong'); setTimeout(() => inp.classList.remove('wrong'), 600); }
    stats.reveals++;

    const isAB = studyMode==='AB';
    const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;
    let hintHtml;
    if (effectivePhase==='A') {
      const words = w.english.split(' ');
      const masked = words.map((wd, i) => i === 0 ? wd[0] + '_'.repeat(Math.max(1, wd.length - 1)) : wd[0] + '…').join(' ');
      hintHtml = `<strong>🧑‍🏫 Robbie:</strong> English → <span style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(masked)}</span>`;
    } else {
      const words = w.english.split(' ');
      const masked = words.map((wd, i) => i === 0 ? wd[0] + '_'.repeat(Math.max(1, wd.length - 1)) : wd[0] + '…').join(' ');
      hintHtml = `<strong>🧑‍🏫 Robbie:</strong> English → <span style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(masked)}</span>`;
    }

    const banner = document.getElementById('pinyin-hint-banner');
    if (banner) { banner.innerHTML = hintHtml; banner.classList.add('visible'); }

    const btn = document.getElementById('btn-robbie');
    if (btn) btn.textContent = 'Reveal answer 👁';

    w._hintStage = 'hinted';

  } else {
    // ── Stage 2: full reveal ─────────────────────────────────────────────
    const isAB = studyMode==='AB';
    const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;
    const safeChar = w.chinese || (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';

    let revealHtml;
    if (effectivePhase==='B') {
      revealHtml = `<strong>${esc(w.pinyin)}</strong> &nbsp;·&nbsp; ${esc(w.english)}`;
    } else {
      revealHtml = `<strong>${esc(w.pinyin)}</strong> &nbsp;·&nbsp; <span class="chinese-answer">${esc(safeChar)}</span>`;
    }

    // Show full answer in feedback row (clears on type) instead of banner
    const fb = document.getElementById('fb-main');
    const inp = document.getElementById('inp-main');
    const banner = document.getElementById('pinyin-hint-banner');
    if (banner) banner.classList.remove('visible');
    if (fb) fb.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:15px;color:var(--ink)">${revealHtml}</span>`;

    // Clear the moment user types
    const clearOnType = () => { if(fb) fb.innerHTML=''; inp && inp.removeEventListener('input', clearOnType); };
    if (inp) { inp.value=''; inp.classList.remove('correct','wrong'); inp.focus(); inp.addEventListener('input', clearOnType); }

    const btn = document.getElementById('btn-robbie');
    if (btn) btn.textContent = '✨ Revealed';

    w._hintStage = 'revealed';
    w.wasRevealed = true;
    stats.reveals++;
  }
}

function alreadyKnowIt(){
  const w=currentWord;
  if(!w) return;
  const isAB = studyMode==='AB';
  if(!cardCounts[w.idx]) cardCounts[w.idx]=_initCardCount();
  const now = Date.now();
  window._alreadyKnownCount = (window._alreadyKnownCount || 0) + 1;
  playAlreadyKnowTone();

  if (studyAlgorithm === 'batched') {
    // In batched mode: mark done and remove from batchQueue
    if (!cardCounts[w.idx]) cardCounts[w.idx] = { count: 0 };
    const isAB = studyMode === 'AB';
    if (isAB) {
      if (!cardCounts[w.idx].r1) cardCounts[w.idx] = { r1:{count:2}, r2:{count:2} };
      if (round2Set.has(w.idx)) { cardCounts[w.idx].r2.count = 2; }
      else { cardCounts[w.idx].r1.count = 2; round2Set.add(w.idx); cardCounts[w.idx].r2 = {count:2}; }
    } else {
      cardCounts[w.idx].count = 2;
    }
    doneSet.add(w.idx);
    batchQueue = batchQueue.filter(i => i !== w.idx);
    renderStreakDots(w.idx);
    nextBatchedCard();
    return;
  }

  if(isAB){
    if(round2Set.has(w.idx)){
      // In round 2 — mark fully done
      cardCounts[w.idx].r2.count=2;
      doneSet.add(w.idx);
    } else {
      // In round 1 — promote to round 2 immediately, skip round 1 counts
      cardCounts[w.idx].r1.count=2;
      round2Set.add(w.idx);
      cardCounts[w.idx].r2.retryAfter=0;
    }
  } else {
    // Single mode: mark fully mastered (count=2 → done)
    cardCounts[w.idx].count=2;
    doneSet.add(w.idx);
  }

  renderStreakDots(w.idx);
  queue.shift();
  nextCard();
}

function _markHintWrong(w) {
  if (w._hintMarkedWrong) return;
  w._hintMarkedWrong = true;
  w._wrongThisRound = true;
  stats.wrong++;
  wordErrorCounts[w.idx] = (wordErrorCounts[w.idx] || 0) + 1;
  if (studyAlgorithm === 'batched') {
    _batchedMarkWrong(w);
    return;
  }
  const now = Date.now();
  const isAB = studyMode === 'AB';
  if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
  if (isAB) {
    if (round2Set.has(w.idx)) { cardCounts[w.idx].r2.count=0; cardCounts[w.idx].r2.retryAfter=now+30000; }
    else { cardCounts[w.idx].r1.count=0; cardCounts[w.idx].r1.retryAfter=now+30000; }
  } else {
    cardCounts[w.idx].count=0; cardCounts[w.idx].retryAfter=now+30000;
    correctOnce.delete(w.idx);
  }
  renderStreakDots(w.idx);
}

function skipWord(){
  const w=currentWord;
  if(!w) return;
  playAlreadyKnowTone();
  stats.wrong++;
  wordErrorCounts[w.idx] = (wordErrorCounts[w.idx] || 0) + 1;

  const isAB = studyMode==='AB';
  const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;
  const safeChar = w.chinese || (selectedScript==='traditional' ? w.traditional : w.simplified) || w.simplified || w.traditional || '';
  let correctHint;
  if (effectivePhase==='A') { correctHint = `${safeChar} ${w.english}`; }
  else { correctHint = inputMethod==='pinyin' ? `${w.pinyin} ${safeChar}` : safeChar; }

  const fb=document.getElementById('fb-main');
  if(fb) fb.innerHTML=`<span class="feedback-wrong">✗</span> <span class="feedback-answer chinese-answer">${esc(correctHint)}</span>`;

  w._wrongThisRound = true;
  if (studyAlgorithm === 'batched') {
    _batchedMarkWrong(w);
  } else {
    const now = Date.now();
    if (!cardCounts[w.idx]) cardCounts[w.idx] = _initCardCount();
    if (isAB) {
      if (round2Set.has(w.idx)) { cardCounts[w.idx].r2.count=0; cardCounts[w.idx].r2.retryAfter=now+30000; }
      else { cardCounts[w.idx].r1.count=0; cardCounts[w.idx].r1.retryAfter=now+30000; }
    } else {
      cardCounts[w.idx].count=0; cardCounts[w.idx].retryAfter=now+30000;
      correctOnce.delete(w.idx);
    }
    queue.shift(); queue.push(w.idx);
  }
  renderStreakDots(w.idx);
  setTimeout(()=>{ studyAlgorithm==='batched' ? nextBatchedCard() : nextCard(); }, 1200);
}

function hidePinyinBanner(){
  const b=document.getElementById('pinyin-hint-banner'); if(b) b.classList.remove('visible');
  const btn=document.getElementById('btn-robbie'); if(btn) btn.textContent='Ask Teacher Robbie for a hint 🧑‍🏫';
}
function clearInputs(){
  checking=false;
  const inp=document.getElementById('inp-main'); if(inp){inp.value='';inp.classList.remove('correct','wrong');}
  const fb=document.getElementById('fb-main'); if(fb) fb.innerHTML='';
  hidePinyinBanner(); // also resets btn-robbie label
}

// ═══════════════════════════════════════
// PROGRESS & UI
// ═══════════════════════════════════════
function updateProgress(){
  const total=vocab.length, phaseTotal=studyMode==='AB'?total*2:total;
  const offset=studyMode==='AB'&&phase==='B'?total:0;
  const done=doneSet.size+offset;
  document.getElementById('prog-label').textContent=`${done} / ${phaseTotal} done`;
  document.getElementById('prog-phase').textContent=studyMode==='AB'?`Phase ${phase==='A'?1:2} of 2`:`Type ${phase}`;
  document.getElementById('prog-fill').style.width=`${(done/phaseTotal)*100}%`;
}
function updateQueue(){
  const el=document.getElementById('word-queue');
  if(!el) return;
  const chips = activeSet.map((i,pos) => {
    let cls='queue-chip';
    // "halfway" = has 1 correct so far (count=1 or promoted to r2 in AB)
    const isHalfway = (() => {
      if (doneSet.has(i)) return false;
      const cc = cardCounts[i];
      if (!cc) return false;
      const isAB = studyMode === 'AB';
      if (isAB) return round2Set.has(i) ? cc.r2.count === 1 : cc.r1.count === 1;
      return cc.count === 1;
    })();
    if(doneSet.has(i)) cls+=' done';
    else if(isHalfway) cls+=' halfway';
    else if(queue[0]===i) cls+=' current';
    const w=vocab[i]; const ch=selectedScript==='traditional'?w.traditional:w.simplified;
    const label = phase==='A' ? w.english : ch;
    return `<div class="${cls}"><span style="font-size:10px;opacity:0.5;margin-right:3px">${pos+1}</span>${esc(label)}</div>`;
  }).join('');
  const remaining = window._remainingIdx ? window._remainingIdx.length : 0;
  const batchInfo = remaining > 0 ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;width:100%;text-align:center">+${remaining} more words coming after this batch</div>` : '';
  el.innerHTML = chips + batchInfo;
}
function showComplete(){
  const wordsCompleted = Math.max(0, doneSet.size - (window._alreadyKnownCount || 0));
  awardBucks(wordsCompleted);
  clearNowStudying();
  const unitName = selectedUnitIds.map(id => units.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
  broadcastMastery(unitName, wordsCompleted);
  showScreen('screen-complete');
  playCelebrationSound();
  document.getElementById('complete-msg').textContent=`You typed out all ${vocab.length} words correctly twice!`;

  const bucksHtml = profileData
    ? `<div class="stat-box">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px">
          ${renderAvatarEl(getAvatarEmoji(profileData.zodiac, profileData.vibe), profileData.color, 32, '8px')}
          <div class="stat-num" style="color:var(--gold)">+${formatBucks(wordsCompleted)}</div>
        </div>
        <div class="stat-label">Robbie Bucks 💰</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Total: ${formatBucks(robbieBucks)}</div>
      </div>`
    : `<div class="stat-box"><div class="stat-num" style="color:var(--gold)">+${formatBucks(wordsCompleted)}</div><div class="stat-label">Robbie Bucks 💰</div></div>`;

  document.getElementById('stats-row').innerHTML=`
    <div class="stat-box"><div class="stat-num" style="color:var(--green)">${stats.correct}</div><div class="stat-label">Correct</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--red)">${stats.wrong}</div><div class="stat-label">Wrong</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--muted)">${stats.reveals}</div><div class="stat-label">Revealed</div></div>
    ${bucksHtml}`;
  document.getElementById('header-modes').style.display='none';
  document.getElementById('btn-home-header').style.display='';

  renderSessionReport();
}

// ── Session Report ────────────────────────────────────────────────────────
function renderSessionReport() {
  const el = document.getElementById('session-report');
  if (!el) return;

  // Build error list: only words wrong at least once
  const errorEntries = Object.entries(wordErrorCounts)
    .filter(([,count]) => count > 0)
    .map(([idx, count]) => ({ idx: parseInt(idx), count, word: vocab[parseInt(idx)] }))
    .filter(e => e.word)
    .sort((a,b) => b.count - a.count);

  if (errorEntries.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:16px;background:var(--red-light);border-radius:14px;font-size:14px;font-weight:700;color:var(--red)">🎉 Perfect session — no mistakes!</div>`;
    return;
  }

  // Group by error count
  const groups = {};
  errorEntries.forEach(e => {
    if (!groups[e.count]) groups[e.count] = [];
    groups[e.count].push(e);
  });

  // State: selected word indices
  window._reportSelected = new Set(errorEntries.map(e => e.idx)); // all selected by default

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  function buildReport() {
    const counts = Object.keys(groups).map(Number).sort((a,b) => b-a);
    let html = `<div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px;color:var(--ink)">
      ⚠️ Words to review (${errorEntries.length} word${errorEntries.length!==1?'s':''})</div>`;

    counts.forEach(count => {
      const groupWords = groups[count];
      const allChecked = groupWords.every(e => window._reportSelected.has(e.idx));
      const someChecked = groupWords.some(e => window._reportSelected.has(e.idx));
      const groupId = `group-${count}`;

      html += `<div class="report-section">
        <div class="report-group-header" onclick="toggleReportGroup(${count})">
          <div class="report-group-check ${allChecked?'checked':someChecked?'partial':''}" id="gcheck-${count}">
            ${allChecked?'✓':someChecked?'−':''}
          </div>
          <div class="report-group-label">Wrong ${count} time${count!==1?'s':''}</div>
          <div class="report-group-count">${groupWords.length} word${groupWords.length!==1?'s':''}</div>
        </div>
        <div class="report-words" id="${groupId}">`;

      groupWords.forEach(e => {
        const w = e.word;
        const ch = selectedScript==='traditional' ? (w.traditional||w.simplified) : w.simplified;
        const checked = window._reportSelected.has(e.idx);
        html += `<div class="report-word-row" onclick="toggleReportWord(${e.idx}, ${count})">
          <div class="report-word-check ${checked?'checked':''}" id="wcheck-${e.idx}">${checked?'✓':''}</div>
          <span class="report-word-zh">${esc(ch)}</span>
          <span class="report-word-pin">${esc(w.pinyin||'')}</span>
          <span class="report-word-en">${esc(w.english||'')}</span>
        </div>`;
      });

      html += `</div></div>`;
    });

    // Save section
    const selectedCount = window._reportSelected.size;
    const unitOptions = units.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    html += `<div class="report-save-section">
      <div class="report-save-label">Save restudy deck</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${selectedCount} word${selectedCount!==1?'s':''} selected</div>
      <select class="report-unit-select" id="report-parent-unit">
        <option value="">— Choose a unit to save under —</option>
        ${unitOptions}
      </select>
      <button class="report-save-btn" id="report-save-btn" onclick="saveRestudyDeck('${today}')" ${selectedCount===0?'disabled':''}>
        💾 Save as restudy deck →
      </button>
      <div class="report-saved-msg" id="report-saved-msg" style="display:none"></div>
    </div>`;

    el.innerHTML = html;
  }

  window.toggleReportGroup = function(count) {
    const groupWords = groups[count];
    const allChecked = groupWords.every(e => window._reportSelected.has(e.idx));
    groupWords.forEach(e => {
      if (allChecked) window._reportSelected.delete(e.idx);
      else window._reportSelected.add(e.idx);
    });
    buildReport();
  };

  window.toggleReportWord = function(idx, count) {
    if (window._reportSelected.has(idx)) window._reportSelected.delete(idx);
    else window._reportSelected.add(idx);
    buildReport();
  };

  buildReport();
}

function saveRestudyDeck(dateStr) {
  const parentId = document.getElementById('report-parent-unit')?.value;
  if (!parentId) { showToast('⚠️ Please choose a unit to save under', 2500); return; }

  const selectedWords = [...window._reportSelected]
    .map(idx => vocab[idx])
    .filter(Boolean);

  if (selectedWords.length === 0) { showToast('⚠️ No words selected', 2000); return; }

  const parentUnit = units.find(u => u.id === parentId);
  if (!parentUnit) return;

  const deckName = `${parentUnit.name} restudy ${dateStr}`;
  const newUnit = {
    id: 'unit_' + Date.now(),
    name: deckName,
    parentId: parentId,
    vocab: selectedWords,
    createdAt: Date.now(),
    isRestudy: true
  };

  units.push(newUnit);
  saveUnits();

  const btn = document.getElementById('report-save-btn');
  const msg = document.getElementById('report-saved-msg');
  if (btn) btn.disabled = true;
  if (msg) { msg.style.display=''; msg.textContent = `✅ Saved "${deckName}" under ${parentUnit.name}!`; }
  showToast(`✅ Restudy deck saved!`, 3000);
}

// Saved state for each phase so switching doesn't lose progress

function switchPhase(p){
  if(studyMode==='AB') return;
  if(p === phase) return; // already on this phase

  // Save current phase state
  phaseSnapshots[phase] = {
    queue: [...queue],
    doneSet: [...doneSet],
    correctOnce: [...correctOnce],
    activeSet: [...activeSet],
    remainingIdx: window._remainingIdx ? [...window._remainingIdx] : [],
    stats: {...stats}
  };

  studyMode=p; phase=p;

  // Restore saved state if we've been here before
  if (phaseSnapshots[p]) {
    const snap = phaseSnapshots[p];
    queue = snap.queue;
    doneSet = new Set(snap.doneSet);
    correctOnce = new Set(snap.correctOnce);
    activeSet = snap.activeSet;
    window._remainingIdx = snap.remainingIdx;
    stats = snap.stats;
    updateHeaderBadge();
    updatePhaseBanner();
    nextCard();
  } else {
    // First time on this phase — init fresh
    initPhase(p);
  }
  updateHeaderBadge(); showScreen('screen-study');
}
function updateHeaderBadge(){
  document.getElementById('badge-a').classList.toggle('active',phase==='A');
  document.getElementById('badge-b').classList.toggle('active',phase==='B');
}
function goAgain(){
  stats={correct:0,wrong:0,reveals:0}; phase=studyMode==='B'?'B':'A';
  initPhase(phase); showScreen('screen-study');
}
