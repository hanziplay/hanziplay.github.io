// ── Tutorial System ──
const TUTORIAL_KEY = 'hanziplay_tutorial_done';
let tutorialStep = 0;
let tutorialSteps = [];

// ── Interactive Tutorial System ──────────────────────────────────────────
// Each step can have:
//   text, highlight (CSS selector), action (required click selector),
//   screen (navigate before showing), nextBtn (show next button or not),
//   actionLabel (shown below text when action required)
function getTutorialSteps() {
  // scrollTo: 0 = scroll to top, 'middle' = scroll to middle, null = don't scroll
  return [
    // 0: Welcome — just Next
    { text: "👋 Welcome to HanziPlay! I'm Teacher Robbie, and I'll show you around.", highlight: null, nextBtn: true, scrollTo: 0 },
    // 1: Explain profile avatar — require tap, then we navigate to profile
    { text: "👤 Up here is your profile avatar. It shows your name and Robbie Bucks balance. Go ahead and tap it!", highlight: '#header-avatar', action: '#header-avatar', actionLabel: "Tap your avatar to continue →", nextBtn: false, scrollTo: 0 },
    // 2: Profile screen — just Next (we manually navigate back in advance)
    { text: "🙋 This is your Profile! You can set your name, pick your zodiac animal, and see your Robbie Bucks here. Tap Next to go back.", highlight: null, nextBtn: true, scrollTo: 0, onAdvance: function(){ navigateTutorialHome(); } },
    // 3: Leaderboard — require tap
    { text: "🏆 This is the Leaderboard — earn Robbie Bucks by studying and climb to the top! One word studied = one Robbie Buck. Tap it!", highlight: '#header-leaderboard', action: '#header-leaderboard', actionLabel: "Tap the Leaderboard to continue →", nextBtn: false, scrollTo: 0 },
    // 4: Leaderboard screen — Next navigates back home
    { text: "🥇 See the rankings here! The more you study, the higher you climb. Tap Next to head back home.", highlight: null, nextBtn: true, scrollTo: 0, onAdvance: function(){ navigateTutorialHome(); } },
    // 5: Start/Library button — require tap
    { text: "🚀 This button opens your Unit Library where all your vocab sets are stored. Tap it!", highlight: '#btn-get-started', action: '#btn-get-started', actionLabel: "Tap 'Get Started' to open the library →", nextBtn: false, scrollTo: 'middle' },
    // 6: Library overview — Next
    { text: "📂 This is your Unit Library! All your vocab sets live here — upload once, study forever. Tap a unit to select it for study.", highlight: null, nextBtn: true, scrollTo: 0 },
    // 7: New Unit — require tap
    { text: "➕ Let's add your first unit! Tap the '+ New Unit' button to create a vocab list.", highlight: '#btn-new-unit', action: '#btn-new-unit', actionLabel: "Tap + New Unit to continue →", nextBtn: false, scrollTo: 0 },
    // 8: Import/add screen — explain, then Next goes back to library
    { text: "✏️ Here you can type in vocab words or paste a list. Give your unit a name, add your words, then save! Tap Next when ready.", highlight: null, nextBtn: true, scrollTo: 0, onAdvance: function(){ navigateTutorialLibrary(); } },
    // 9: Library — explain multi-select, then finish
    { text: "✅ Back in the library, tap units to select them (you can pick multiple!), then hit the big Start button. That's it! Tap Next to finish.", highlight: null, nextBtn: true, scrollTo: 0 },
    // 10: Done!
    { text: "🎉 You're all set! Study hard, earn Robbie Bucks, and climb the leaderboard. 加油！⛽ Let's go!", highlight: null, nextBtn: true, scrollTo: 0 }
  ];
}

function navigateTutorialHome() {
  renderHome();
  showScreen('screen-home');
}

function navigateTutorialLibrary() {
  showScreen('screen-library');
}

function startTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  initTutorial();
}

function initTutorial() {
  tutorialSteps = getTutorialSteps();
  tutorialStep = 0;
  showScreen('screen-home');
  renderHome();
  document.getElementById('tutorial-overlay').style.display = 'block';
  document.getElementById('tutorial-highlight').style.display = 'none';
  applyTutorialStep();
  setTimeout(() => {
    document.getElementById('tutorial-bubble').classList.add('visible');
    document.getElementById('tutorial-mascot-wrap').classList.add('visible');
  }, 350);
}

// ── Mobile per-step positioning ──────────────────────────────────────────
// APPROACH: Set everything via JS inline styles — these beat all CSS rules.
// Robbie always at BOTTOM. Bubble always directly above Robbie. Same corner.
//
// Corner per step (chosen so bubble never covers the highlighted element):
//   Step 0  Welcome, no highlight                  → br
//   Step 1  Avatar = top-RIGHT                     → bl
//   Step 2  Profile screen, no highlight           → br
//   Step 3  Leaderboard btn = BOTTOM-LEFT area     → br  ← was wrong before
//   Step 4  Leaderboard screen, no highlight       → br
//   Step 5  Get Started btn = LEFT-CENTRE          → br  (btn is on left, bubble right)
//   Step 6  Library screen, no highlight           → br
//   Step 7  New Unit btn = top-RIGHT               → bl
//   Step 8  Import screen, no highlight            → br
//   Step 9  Library, no highlight                  → br
//   Step 10 Done                                   → br
function applyMobileTutorialPosition(stepIndex) {
  if (window.innerWidth > 600) return;

  const mascot = document.getElementById('tutorial-mascot-wrap');
  const bubble = document.getElementById('tutorial-bubble');

  const corners = ['br','bl','br','br','br','br','br','bl','br','br','br'];
  const isRight = (corners[stepIndex] || 'br') === 'br';

  // Place mascot in the chosen bottom corner first
  mascot.style.top = ''; mascot.style.bottom = '-40px';
  if (isRight) {
    mascot.style.left = ''; mascot.style.right = '8px';
  } else {
    mascot.style.right = ''; mascot.style.left = '8px';
  }

  // Force bubble width
  const bubbleW = 160;
  bubble.style.width    = bubbleW + 'px';
  bubble.style.maxWidth = bubbleW + 'px';
  bubble.style.minWidth = '0px';
  bubble.style.boxSizing = 'border-box';

  // Use rAF so mascot layout has settled before we measure it
  requestAnimationFrame(function() {
    const mascotRect = mascot.getBoundingClientRect();
    const GAP = 10;
    const bubbleBottom = window.innerHeight - mascotRect.top + GAP;
    bubble.style.top    = '';
    bubble.style.bottom = bubbleBottom + 'px';

    // Align bubble horizontally with mascot, clamped to screen edges
    const EDGE_PAD = 6;
    bubble.style.left  = '';
    bubble.style.right = '';

    if (isRight) {
      // Right-align bubble flush with mascot right edge
      const rightOffset = window.innerWidth - mascotRect.right;
      bubble.style.right = Math.max(EDGE_PAD, rightOffset) + 'px';
    } else {
      // Left-align bubble flush with mascot left edge
      bubble.style.left = Math.max(EDGE_PAD, mascotRect.left) + 'px';
    }

    // Compute tail position pointing at Robbie head centre
    const bubbleRect = bubble.getBoundingClientRect();
    const mascotCentreX = mascotRect.left + mascotRect.width / 2;
    const tailX = Math.min(Math.max(20, mascotCentreX - bubbleRect.left), bubbleW - 20);

    // Inject scoped style for the ::after tail
    let tailStyle = document.getElementById('tutorial-tail-style');
    if (!tailStyle) {
      tailStyle = document.createElement('style');
      tailStyle.id = 'tutorial-tail-style';
      document.head.appendChild(tailStyle);
    }
    tailStyle.textContent =
      '#tutorial-bubble::after { display:block !important; bottom:-10px; top:auto; ' +
      'left:' + tailX + 'px !important; right:auto !important; ' +
      'border-top-color:white; border-bottom:none; ' +
      'border-left-color:transparent; border-right-color:transparent; }';
  });
}

function applyTutorialStep() {
  const step = tutorialSteps[tutorialStep];
  if (!step) { endTutorial(); return; }

  // Render text
  document.getElementById('tutorial-text').innerHTML = step.text;

  // Apply mobile positioning for this step
  applyMobileTutorialPosition(tutorialStep);
  // Always ensure mascot is visible (in case step transition reset it)
  document.getElementById('tutorial-mascot-wrap').classList.add('visible');

  // Action label
  const lbl = document.getElementById('tutorial-action-label');
  if (lbl) lbl.style.display = step.actionLabel ? 'block' : 'none';
  if (lbl && step.actionLabel) lbl.textContent = step.actionLabel;

  // Progress dots
  const prog = document.getElementById('tutorial-progress');
  prog.innerHTML = tutorialSteps.map((_, i) =>
    `<div class="tutorial-dot ${i === tutorialStep ? 'active' : ''}"></div>`
  ).join('');

  // Next button visibility
  const btn = document.getElementById('tutorial-next');
  btn.style.display = step.nextBtn ? 'block' : 'none';
  btn.textContent = tutorialStep === tutorialSteps.length - 1 ? "Let's go! 🚀" : "Next →";
  // Ensure bubble is always interactive
  document.getElementById('tutorial-bubble').style.pointerEvents = 'all';

  // Scroll to appropriate position for this step
  if (step.scrollTo === 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (step.scrollTo === 'middle') {
    const mid = (document.body.scrollHeight - window.innerHeight) / 2;
    window.scrollTo({ top: Math.max(0, mid), behavior: 'smooth' });
  } else if (typeof step.scrollTo === 'number') {
    window.scrollTo({ top: step.scrollTo, behavior: 'smooth' });
  }

  // Highlight
  setTimeout(() => highlightElement(step.highlight), 200);

  // Wire up required action
  if (step.action) {
    wireTutorialAction(step.action);
  } else {
    clearTutorialAction();
  }
}

let _tutorialActionEl = null;
let _tutorialActionHandler = null;

function wireTutorialAction(selector) {
  clearTutorialAction();
  // Allow overlay to pass clicks through to action element
  document.getElementById('tutorial-overlay').style.pointerEvents = 'none';
  // Wait a tick for DOM to update after screen transitions
  setTimeout(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    _tutorialActionEl = el;
    _tutorialActionHandler = function(e) {
      e.stopPropagation && e.stopPropagation();
      // Let the real click handler fire first, then advance
      setTimeout(() => tutorialAdvance(), 400);
    };
    el.addEventListener('click', _tutorialActionHandler, { once: true });
    // Highlight it with a pulse
    el.style.outline = '3px solid var(--red)';
    el.style.outlineOffset = '3px';
  }, 300);
}

function clearTutorialAction() {
  if (_tutorialActionEl) {
    _tutorialActionEl.style.outline = '';
    _tutorialActionEl.style.outlineOffset = '';
    if (_tutorialActionHandler) {
      _tutorialActionEl.removeEventListener('click', _tutorialActionHandler);
    }
  }
  _tutorialActionEl = null;
  _tutorialActionHandler = null;
  // Restore pointer events to overlay
  const ov = document.getElementById('tutorial-overlay');
  if (ov) ov.style.pointerEvents = 'none';
}

function tutorialAdvance() {
  clearTutorialAction();
  const currentStep = tutorialSteps[tutorialStep];
  tutorialStep++;
  if (tutorialStep >= tutorialSteps.length) {
    endTutorial();
    return;
  }
  // Run onAdvance hook from the step we just left (e.g. navigate back home)
  if (currentStep && typeof currentStep.onAdvance === 'function') {
    currentStep.onAdvance();
    setTimeout(() => applyTutorialStep(), 400);
  } else {
    setTimeout(() => applyTutorialStep(), 250);
  }
}

function highlightElement(selector) {
  const hl = document.getElementById('tutorial-highlight');
  if (!selector) {
    hl.style.display = 'none';
    return;
  }
  const el = document.querySelector(selector);
  if (!el) { hl.style.display = 'none'; return; }

  const rect = el.getBoundingClientRect();
  const pad = 10;
  hl.style.display = 'block';
  hl.style.left = (rect.left - pad) + 'px';
  hl.style.top = (rect.top - pad) + 'px';
  hl.style.width = (rect.width + pad * 2) + 'px';
  hl.style.height = (rect.height + pad * 2) + 'px';
}

function tutorialNext() {
  tutorialAdvance();
}

function tutorialBack() {
  clearTutorialAction();
  if (tutorialStep > 0) {
    tutorialStep--;
    // Navigate to the correct screen for this step
    const screenForStep = [
      'screen-home',        // 0 welcome
      'screen-home',        // 1 tap avatar
      'screen-profile',     // 2 profile screen
      'screen-home',        // 3 tap leaderboard
      'screen-leaderboard', // 4 leaderboard screen
      'screen-home',        // 5 get started button
      'screen-library',     // 6 library overview
      'screen-library',     // 7 + new unit button
      'screen-import',      // 8 import screen
      'screen-library',     // 9 multi-select
      'screen-home',        // 10 done
    ];
    const target = screenForStep[tutorialStep];
    if (target === 'screen-home') { renderHome(); showScreen('screen-home'); }
    else if (target === 'screen-library') { showScreen('screen-library'); }
    else if (target === 'screen-profile') { showScreen('screen-profile'); }
    else if (target === 'screen-leaderboard') { showScreen('screen-leaderboard'); }
    else if (target === 'screen-import') { showScreen('screen-import'); }
    setTimeout(() => applyTutorialStep(), 350);
  }
}

function replayTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
  initTutorial();
}

function toggleTutorialBubble() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay.style.display === 'block') {
    endTutorial();
  } else {
    replayTutorial();
  }
}

function endTutorial() {
  clearTutorialAction();
  localStorage.setItem(TUTORIAL_KEY, '1');
  document.getElementById('tutorial-bubble').classList.remove('visible');
  document.getElementById('tutorial-mascot-wrap').classList.remove('visible');
  document.body.style.overflow = '';
  setTimeout(() => {
    document.getElementById('tutorial-overlay').style.display = 'none';
    document.getElementById('tutorial-highlight').style.display = 'none';
    showScreen('screen-home');
    renderHome();
  }, 400);
}
