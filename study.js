// ═══════════════════════════════════════
// MODE SELECT
// ═══════════════════════════════════════
function selectScript(s) {
  selectedScript=s;
  document.getElementById('btn-simplified').classList.toggle('active',s==='simplified');
  document.getElementById('btn-traditional').classList.toggle('active',s==='traditional');
}
function selectInput(m) {
  inputMethod=m;
  document.getElementById('btn-bpmf').classList.toggle('active',m==='bpmf');
  document.getElementById('btn-pinyin').classList.toggle('active',m==='pinyin');
  // Update mode card descriptions
  if (m==='pinyin') {
    document.getElementById('card-A-desc').innerHTML = 'See <strong>English</strong><br>Type pinyin + character';
    document.getElementById('card-B-desc').innerHTML = 'See <strong>character</strong><br>Type pinyin + English';
    showToast('📱 This mode is best when on a phone!');
  } else {
    document.getElementById('card-A-desc').innerHTML = 'See <strong>English</strong><br>Type the character';
    document.getElementById('card-B-desc').innerHTML = 'See <strong>character</strong><br>Type the English';
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
  clearSession();
  stats={correct:0,wrong:0,reveals:0}; wordErrorCounts={};
  phase = studyMode==='B' ? 'B' : 'A';
  initPhase(phase);
  showScreen('screen-study');
  document.getElementById('btn-home-header').style.display='';
  document.getElementById('header-modes').style.display=studyMode==='AB'?'none':'flex';
  updateHeaderBadge();
  const unitName = selectedUnitIds.map(id => units.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
  setNowStudying(unitName);
}

// ═══════════════════════════════════════
// STUDY ENGINE
// ═══════════════════════════════════════

// For Full Circuit (AB): each card has r1count and r2count (need 2 each to master)
// round2Set = set of indices currently in round 2
let round2Set = new Set();
let cardCounts = {}; // idx -> {r1:0, r2:0}

function initPhase(p) {
  phase=p; window._pinyinNoticeSeen=false;
  doneSet=new Set(); correctOnce=new Set(); checking=false;
  round2Set=new Set(); cardCounts={};
  let allIdx = getSelectedVocabIndices();
  if (wordOrder==='shuffle') shuffleArray(allIdx);
  activeSet = allIdx.slice(0, batchSize);
  window._remainingIdx = allIdx.slice(batchSize);
  // init counts for first batch
  activeSet.forEach(i => { cardCounts[i]={r1:0,r2:0}; });
  queue = [...activeSet];
  updatePhaseBanner(); nextCard();
}

function updatePhaseBanner() {
  document.getElementById('phase-banner').style.display='none';
}

function shuffleArray(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} }

function nextCard() {
  clearInputs(); updateProgress(); updateQueue();
  if (queue.length===0) {
    if (studyMode==='AB') {
      // Check if everything is mastered
      const allMastered = activeSet.every(i => doneSet.has(i));
      if (allMastered) {
        const added = addNextBatch();
        if (added) {
          // init counts for new cards
          activeSet.filter(i=>!cardCounts[i]).forEach(i=>{ cardCounts[i]={r1:0,r2:0}; });
          nextCard(); return;
        }
        clearSession(); showComplete(); return;
      }
      // Rebuild queue: round2 cards first, then round1 cards not yet done
      const r2 = activeSet.filter(i => round2Set.has(i) && !doneSet.has(i));
      const r1 = activeSet.filter(i => !round2Set.has(i) && !doneSet.has(i));
      queue = [...r2, ...r1];
      if (wordOrder==='shuffle') { shuffleArray(queue); }
    } else {
      const allDone = activeSet.every(i => doneSet.has(i));
      if (allDone) {
        const added = addNextBatch();
        if (added) {
          activeSet.filter(i=>!cardCounts[i]).forEach(i=>{ cardCounts[i]={r1:0,r2:0}; });
          nextCard(); return;
        }
        clearSession(); showComplete(); return;
      }
      queue = activeSet.filter(i => !doneSet.has(i));
      if (wordOrder==='shuffle') shuffleArray(queue);
    }
  }
  const idx=queue[0];
  currentWord={...vocab[idx],idx};
  renderCard();
}

function renderCard() {
  const w=currentWord;
  checking=false;
  const ch=selectedScript==='traditional'?w.traditional:w.simplified;
  w.chinese=ch;
  hidePinyinBanner();
  const rb=document.getElementById('btn-reveal');
  if(rb){rb.classList.remove('used');rb.textContent='Reveal ✨';}

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
    // Round 1 / Type A: see Chinese+pinyin → type English
    const roundLabel = isAB ? 'Round 1  ·  ' : 'Type A  ·  ';
    document.getElementById('card-label-top').textContent = roundLabel + 'See character → Type English';
   document.getElementById('card-prompt').innerHTML =
      `<div class="prompt-chinese">${esc(ch)}</div>
      <div style="font-size:15px;color:var(--muted);margin-top:6px;font-family:'DM Mono',monospace">${esc(w.pinyin)}</div>`;
    document.getElementById('inputs-section').innerHTML = isPinyin
      ? `<div class="input-label">Pinyin <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input" id="inp-main" type="text" placeholder="pīnyīn…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-main"></div>
      <div class="input-label">English</div>
      <input class="study-input" id="inp-english" type="text" placeholder="English meaning…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-english"></div>`
      : `<div class="input-label">Character <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input chinese-input" id="inp-main" type="text" placeholder="漢字…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-main"></div>
      <div class="input-label">English</div>
      <input class="study-input" id="inp-english" type="text" placeholder="English meaning…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-english"></div>`;
  } else {
    // Round 2 / Type B: see English → type Chinese (BPMF: char only, Pinyin: char+pinyin)
    const roundLabel = isAB ? 'Round 2  ·  ' : 'Type B  ·  ';
    document.getElementById('card-label-top').textContent = isPinyin
      ? roundLabel + 'See English → Type pinyin + character'
      : roundLabel + 'See English → Type the character';
   document.getElementById('card-prompt').innerHTML = `<div class="prompt-english">${esc(w.english)}</div>`;
    document.getElementById('inputs-section').innerHTML = isPinyin
      ? `<div class="input-label">Pinyin <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input" id="inp-main" type="text" placeholder="pīnyīn…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-main"></div>
      <div class="input-label">Character</div>
      <input class="study-input chinese-input" id="inp-english" type="text" placeholder="漢字…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-english"></div>`
      : `<div class="input-label">Character <div class="streak-dots" id="dots-main"></div></div>
      <input class="study-input chinese-input" id="inp-main" type="text" placeholder="漢字…" autocomplete="off" spellcheck="false" autocorrect="off">
      <div class="feedback-row" id="fb-main"></div>`;
  }

  renderStreakDots(w.idx);
  const inp=document.getElementById('inp-main');
  if(inp){
    inp.addEventListener('input',onInputChange);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')checkAnswer(true);});
    inp.addEventListener('paste',e=>e.preventDefault());
    inp.addEventListener('copy',e=>e.preventDefault());
    inp.addEventListener('cut',e=>e.preventDefault());
    setTimeout(()=>inp.focus(),50);
  }
}

// ── Pinyin mode matching helpers ──────────────────
function splitPinyinInput(input) {
  input = input.trim();
  const tokens = input.split(/\s+/);
  const cjk = [], latin = [];
  for (const t of tokens) {
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(t)) cjk.push(t);
    else latin.push(t);
  }
  return { charsTyped: cjk.join(''), pinyinTyped: latin.join(' ').trim() };
}

function pinyinStrictMatch(typed, correct) {
  const n = s => s.toLowerCase().replace(/\s+/g,'');
  return n(typed) === n(correct);
}

function onInputChange() {
  const banner=document.getElementById('pinyin-hint-banner');
  if(banner && banner.classList.contains('visible')) {
    banner.classList.remove('visible');
    const btn=document.getElementById('btn-reveal');
    if(btn) btn.textContent='Reveal ✨';
  }
  if(checking) return;
  const inp=document.getElementById('inp-main');
  if(!inp||!inp.value.trim()) return;
}

// Returns true if the input value is correct for current card/mode
function checkAnswerLogic(val) {
  const w=currentWord;
  const isPinyin = inputMethod==='pinyin';
  const isAB = studyMode==='AB';
  const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;

  if (effectivePhase==='A') {
    // Always just English
    return engMatch(val, w.english);
  } else {
    // Phase B
    if (isPinyin) {
      // Need pinyin + character (either order)
      const {charsTyped, pinyinTyped} = splitPinyinInput(val);
      return norm(charsTyped)===norm(w.chinese) && pinyinStrictMatch(pinyinTyped, w.pinyin);
    } else {
      // BPMF: character only
      return norm(val)===norm(w.chinese);
    }
  }
}

function checkAnswer(manual=true) {
  if(checking) return;
  const w=currentWord, inp=document.getElementById('inp-main');
  if(!inp) return;
  const ok=checkAnswerLogic(inp.value);
  const isAB = studyMode==='AB';

  if(ok){
    checking=true;
    inp.classList.add('correct');
    const fb=document.getElementById('fb-main');
    const chForSpeak = selectedScript==='traditional' ? w.traditional : w.simplified;
    if(fb) fb.innerHTML=`<span class="feedback-correct">✓</span> <button onclick="speakChinese('${(chForSpeak||'').replace(/'/g,"\\'")}') " style="background:none;border:none;font-size:18px;cursor:pointer;padding:0 4px;vertical-align:middle;opacity:0.7;" title="Hear it again">🔊</button>`;
    stats.correct++;
    queue.shift();

    if (isAB) {
      if (!cardCounts[w.idx]) cardCounts[w.idx]={r1:0,r2:0};
      if (round2Set.has(w.idx)) {
        // Round 2
        cardCounts[w.idx].r2++;
        if (cardCounts[w.idx].r2 >= 2) {
          doneSet.add(w.idx); // mastered!
        } else {
          placeInQueue(w.idx, adaptiveCorrectOffset());
        }
      } else {
        // Round 1
        cardCounts[w.idx].r1++;
        if (cardCounts[w.idx].r1 >= 2) {
          round2Set.add(w.idx); // promote to round 2
          placeInQueue(w.idx, 1); // bring back soon as round 2 card
        } else {
          placeInQueue(w.idx, adaptiveCorrectOffset());
        }
      }
    } else {
      // Single mode A or B — need correctOnce (2 correct to master)
      if(correctOnce.has(w.idx)){
        correctOnce.delete(w.idx); doneSet.add(w.idx);
      } else {
        correctOnce.add(w.idx);
        placeInQueue(w.idx, adaptiveCorrectOffset());
      }
    }

    renderStreakDots(w.idx);
    const chText = selectedScript==='traditional' ? w.traditional : w.simplified;
    setTimeout(async () => {
      await speakChinese(chText || w.simplified);
      setTimeout(nextCard, 150);
    }, 150);

  } else if(manual){
    inp.classList.add('wrong');
    const fb=document.getElementById('fb-main');
    const isPinyin = inputMethod==='pinyin';
    const effectivePhase = isAB ? (round2Set.has(w.idx) ? 'B' : 'A') : phase;
    let correctHint;
    if (effectivePhase==='A') {
      correctHint = w.english;
    } else {
      correctHint = isPinyin ? `${w.pinyin} ${w.chinese}` : w.chinese;
    }
    const isCh = effectivePhase==='B';
    if(fb) fb.innerHTML=`<span class="feedback-wrong">✗</span> <span class="feedback-answer ${isCh?'chinese-answer':''}">${esc(correctHint)}</span>`;
    stats.wrong++;
    wordErrorCounts[w.idx] = (wordErrorCounts[w.idx] || 0) + 1;

    // Reset count for this card
    if (isAB) {
      if (!cardCounts[w.idx]) cardCounts[w.idx]={r1:0,r2:0};
      if (round2Set.has(w.idx)) {
        cardCounts[w.idx].r2=0;
      } else {
        cardCounts[w.idx].r1=0;
      }
    } else {
      correctOnce.delete(w.idx);
    }

    queue.shift();
    placeInQueue(w.idx,5+Math.floor(Math.random()*2));
    renderStreakDots(w.idx);
    window._mustRetype = true;
    setTimeout(()=>{ inp.value=''; inp.classList.remove('wrong'); inp.focus(); window._mustRetype=false; }, 900);
  }
}

function renderStreakDots(idx) {
  const el=document.getElementById('dots-main'); if(!el) return;
  el.innerHTML='';
  const isAB = studyMode==='AB';
  if (isAB) {
    // 4 dots: 2 for round1, 2 for round2
    const counts = cardCounts[idx] || {r1:0,r2:0};
    const inR2 = round2Set.has(idx);
    const isDone = doneSet.has(idx);
    for(let i=0;i<2;i++){
      const d=document.createElement('div');
      const filled = isDone || (inR2 && i<2) || (!inR2 && counts.r1>i);
      d.className='streak-dot'+(filled?' filled':'');
      d.title='Round 1';
      el.appendChild(d);
    }
    const sep=document.createElement('span');
    sep.style.cssText='width:6px;display:inline-block';
    el.appendChild(sep);
    for(let i=0;i<2;i++){
      const d=document.createElement('div');
      const filled = isDone || (inR2 && counts.r2>i);
      d.className='streak-dot'+(filled?' filled':'');
      d.title='Round 2';
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
function speakChinese(text) {
  return new Promise(resolve => {
    if (!text || !window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = (profileData && profileData.accent) || 'zh-TW';
    utter.rate = 0.85;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'zh-TW') ||
                      voices.find(v => v.lang === 'zh-CN') ||
                      voices.find(v => v.lang.startsWith('zh'));
    if (preferred) utter.voice = preferred;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    // Fallback: resolve after 3s max in case onend never fires
    const fallback = setTimeout(resolve, 3000);
    utter.onend = () => { clearTimeout(fallback); resolve(); };
    window.speechSynthesis.speak(utter);
  });
}
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function norm(s){return s.trim().toLowerCase().replace(/\s+/g,' ');}
function engMatch(input,answer){
  const a=answer.split(/[,\/]/).map(s=>s.trim().toLowerCase());
  return a.some(x=>x===input.trim().toLowerCase());
}
function placeInQueue(idx,offset){
  const pos=Math.max(1,Math.min(offset,queue.length));
  queue.splice(pos,0,idx);
}

// Adaptive spacing: how far ahead to place a card after first correct
function adaptiveCorrectOffset() {
  const remaining = queue.length;
  if (remaining <= 15) return remaining;           // end of deck
  if (remaining <= 30) return Math.floor(remaining / 2); // halfway
  return 10 + Math.floor(Math.random() * 3);       // 10-12 ahead
}

function askRobbieHint(){
  const w=currentWord;
  if(!w) return;
  // Check if user has opted out of disclaimer this session
  if(window._robbieHintNoAsk) {
    doRobbieHint();
    return;
  }
  // Show disclaimer modal
  const existing = document.getElementById('robbie-hint-modal');
  if(existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'robbie-hint-modal';
  modal.className = 'edit-word-modal';
  modal.innerHTML = `
    <div class="edit-word-box" style="max-width:320px;text-align:center;background:var(--paper) !important">
      <div style="text-align:center;margin-bottom:4px">👨🏻
      <h3 style="margin:0 0 8px;color:var(--ink)">Ask Teacher Robbie?</h3>
      <div style="font-size:13px;color:var(--ink);font-family:Syne,sans-serif;line-height:1.6;margin-bottom:14px;background:rgba(192,57,43,0.07);padding:10px;border-radius:8px;border:1px solid rgba(192,57,43,0.15)">
        If you ask for a hint, this card will be automatically marked <strong>wrong</strong> and it will cost you <strong>$0.25 Robbie Bucks</strong>.
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" style="padding:12px" onclick="confirmRobbieHint(false)">💸 Pay up ($0.25) — give me the hint!</button>
        <button class="btn-skip" style="padding:12px" onclick="document.getElementById('robbie-hint-modal').remove()">Nevermind</button>
        <button style="background:none;border:none;color:var(--muted);font-size:11px;font-family:Syne,sans-serif;cursor:pointer;padding:4px" 
          onclick="confirmRobbieHint(true)">Don't ask me again this session — just give hint</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
}

function confirmRobbieHint(noAskAgain) {
  if(noAskAgain) window._robbieHintNoAsk = true;
  const modal = document.getElementById('robbie-hint-modal');
  if(modal) modal.remove();
  doRobbieHint();
}

function doRobbieHint(){
  const w=currentWord;
  const banner=document.getElementById('pinyin-hint-banner');
  if(!banner||!w) return;
  // Mark wrong immediately (cost the user)
  stats.wrong++;
  correctOnce.delete(w.idx);
  // Generate fill-in-the-blank pinyin hint
  let hintHtml;
  if(phase==='A'){
    const py=w.pinyin;
    const syllables=py.split(' ');
    const masked=syllables.map(s=>{
      if(s.length<=1) return s;
      const mid=Math.ceil(s.length/2);
      return s[0]+'_'.repeat(mid-1)+s[mid]+(s.length>mid+1?'…':'');
    }).join(' ');
    hintHtml=`<strong>🧑‍🏫 Robbie:</strong> Pinyin → <span style="font-family:'DM Mono',monospace;letter-spacing:2px;color:var(--gold)">${esc(masked)}</span>`;
  } else {
    const eng=w.english;
    const words=eng.split(' ');
    const masked=words.map((wd,i)=>i===0?wd[0]+'_'.repeat(Math.max(1,wd.length-1)):wd[0]+'…').join(' ');
    hintHtml=`<strong>🧑‍🏫 Robbie:</strong> English → <span style="font-family:'DM Mono',monospace;color:var(--gold)">${esc(masked)}</span>`;
  }
  banner.innerHTML=hintHtml;
  banner.classList.add('visible');
  // Deduct Robbie Bucks (free until $25 total earned, then costs $0.25, never goes negative)
  if ((robbieBucks || 0) >= 25) {
    robbieBucks = Math.max(0, (robbieBucks || 0) - 0.25);
    saveBucks();
    showToast('🧑‍🏫 -$0.25 Robbie Bucks', 2000);
  } else {
    showToast('🧑‍🏫 Hint is free! (Hints cost $0.25 once you hit $25.00)', 2500);
  }
  stats.reveals++;
  // hint btn resets with next card — no used class
}

function revealPinyin(){
  const w=currentWord, banner=document.getElementById('pinyin-hint-banner'), btn=document.getElementById('btn-reveal');
  if(!banner) return;
  if (phase==='B') {
    // Type B: show pinyin + english
    banner.innerHTML = `<strong>${esc(w.pinyin)}</strong> &nbsp;·&nbsp; ${esc(w.english)}`;
  } else {
    // Type A: show pinyin + character
    banner.innerHTML = `<strong>${esc(w.pinyin)}</strong> &nbsp;·&nbsp; <span class="chinese-answer">${esc(w.chinese)}</span>`;
  }
  // Same behavior for both: stay on card, hide when user types, can reveal unlimited times
  banner.classList.add('visible');
  if(btn) btn.textContent='✨ Revealed';
  stats.reveals++;
  w.wasRevealed = true;
}
function hidePinyinBanner(){
  const b=document.getElementById('pinyin-hint-banner'); if(b) b.classList.remove('visible');
  const btn=document.getElementById('btn-reveal'); if(btn){btn.classList.remove('used');btn.textContent='Reveal ✨';}
}
function skipWord(){
  const w=currentWord;
  const inp=document.getElementById('inp-main');
  const correctAns = phase==='A' ? w.chinese : w.english;
  const isCh = phase==='A';
  const fb=document.getElementById('fb-main');

  // Show answer OUTSIDE the textbox as a hint
  if(fb) fb.innerHTML=`<span style="color:var(--muted);font-size:13px">Type: </span><span class="feedback-answer ${isCh?'chinese-answer':''}" style="user-select:none">${esc(correctAns)}</span><span style="color:var(--muted);font-size:12px"> to skip →</span>`;

  // Clear input and focus so user must type it themselves
  if(inp){ inp.value=''; inp.classList.remove('correct','wrong'); inp.focus(); }
}
function clearInputs(){
  checking=false;
  const inp=document.getElementById('inp-main'); if(inp){inp.value='';inp.classList.remove('correct','wrong');}
  const fb=document.getElementById('fb-main'); if(fb) fb.innerHTML='';
  hidePinyinBanner();
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
    if(doneSet.has(i)) cls+=' done';
    else if(correctOnce.has(i)) cls+=' halfway';
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
  const wordsCompleted = doneSet.size;
  awardBucks(wordsCompleted);
  clearNowStudying();
  const unitName = selectedUnitIds.map(id => units.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
  broadcastMastery(unitName, wordsCompleted);
  showScreen('screen-complete');
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
