// ═══════════════════════════════════════
// LEADERBOARD + FIREBASE
// ═══════════════════════════════════════
const FB_KEY = 'hanziplay_firebase_config';
let fbInitialized = false;
let firebaseUser = null; // signed-in Google user

// Copy and paste this to replace what you deleted:

const firebaseConfig = {
  apiKey: "AIzaSyDtol-Jq0iWjrIfmw5FdLT4mWVDqYr824M",
  authDomain: "hanziplay-44695.firebaseapp.com",
  databaseURL: "https://hanziplay-44695-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hanziplay-44695",
  storageBucket: "hanziplay-44695.firebasestorage.app",
  messagingSenderId: "152389388932",
  appId: "1:152389388932:web:62c146b0a753a90e8d10d1",
  measurementId: "G-R0Z6K6V7RH"
};


function saveFirebaseConfig(cfg) {}

// ── Firebase init ─────────────────────────────────
async function initFirebase() {
  if (fbInitialized && window._fbDb) return true;
  try {
    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');
    }
    if (!fbInitialized) {
      firebase.initializeApp(firebaseConfig);
      fbInitialized = true;
    }
    // Set LOCAL persistence — user stays signed in on this device until they sign out
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    window._fbDb = firebase.database();
// (connection test removed — onAuthStateChanged handles offline state)
    return true;
  } catch(e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

// ── Google Sign In ────────────────────────────────
async function signInWithGoogle() {
  const btn = document.getElementById('google-signin-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  try {
    const ok = await initFirebase();
    if (!ok) throw new Error('Firebase failed to load');
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    firebaseUser = result.user;
    await onSignedIn();
  } catch(e) {
    console.error('Sign in error:', e);
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Sign in with Google'; }
    const err = document.getElementById('signin-error');
    if (err) err.textContent = 'Sign in failed: ' + e.message;
  }
}

async function onSignedIn() {
  try {
    const snap = await window._fbDb.ref('users/' + firebaseUser.uid).once('value');
    const cloudData = snap.val();
    if (cloudData && cloudData.profile) {
      profileData = cloudData.profile;
      robbieBucks = cloudData.bucks || 0;
saveProfileData();
      localStorage.setItem(BUCKS_KEY, String(robbieBucks));
      updateHeaderAvatar();
      if (profileData.script) selectedScript = profileData.script;
      if (profileData.inputMethod) inputMethod = profileData.inputMethod;
      if (profileData.accent) { draftAccent = profileData.accent; selectAccent(profileData.accent); }
    } else if (profileData) {
      await pushProfileToFirebase();
    }
  } catch(e) {
    console.error('onSignedIn error:', e);
  }

  if (profileData) syncBucksToFirebase();

  // ── Load units from Firebase (vocab sync) ──────────────────
  const hadCloudUnits = await loadUnitsFromFirebase();
  if (hadCloudUnits) {
    showToast(`☁️ Vocab synced — ${units.length} unit${units.length!==1?'s':''} loaded!`, 3000);
  }

  // ── Attach real-time listeners directly here ──
  const notifRef = window._fbDb.ref('notifications/' + firebaseUser.uid);
  const broadcastRef = window._fbDb.ref('broadcast');

  // Personal 加油 listener
  notifRef.on('value', snap => {
    const d = snap.val();
    if (!d) return;
    const id = 'j_' + d.sentAt;
    if (shownNotifIds.has(id)) return;
    shownNotifIds.add(id);
    showToast('jiayou', `加油！ — ${d.fromName}`, d.fromZodiac, d.fromVibe, d.fromColor);
    setTimeout(() => notifRef.remove(), 3000);
  });

  // Broadcast mastery listener
  broadcastRef.on('value', snap => {
    const d = snap.val();
    if (!d || d.fromName === profileData?.name) return;
    const id = 'm_' + d.sentAt;
    if (shownNotifIds.has(id)) return;
    const age = Date.now() - d.sentAt;
    if (age > 10000) { shownNotifIds.add(id); return; } // mark old ones as seen without showing
    shownNotifIds.add(id);
    showToast('mastery', `${d.fromName} mastered ${d.unit} · earned ${formatBucks(d.bucks)}! 🏆`, d.fromZodiac, d.fromVibe, d.fromColor);
  });

  // Start banner refresh interval
  startNotifPolling();

  if (profileData) {
    renderHome();
    showScreen('screen-home');
  } else {
    initProfileSetup(false);
  }
}

async function pushProfileToFirebase() {
  if (!firebaseUser || !window._fbDb || !profileData) return;
  // Use update() not set() so we don't wipe the units subkey
  await window._fbDb.ref('users/' + firebaseUser.uid).update({
    profile: profileData,
    bucks: robbieBucks,
    updatedAt: Date.now()
  });
  // Also update leaderboard entry
  syncBucksToFirebase();
}

function showLeaderboard() {
  showScreen('screen-leaderboard');
  document.getElementById('btn-home-header').style.display = '';
  document.getElementById('header-modes').style.display = 'none';
  renderLeaderboard();
}

async function renderLeaderboard() {
  const notice = document.getElementById('lb-notice');
  notice.innerHTML = `🔥 Connecting to leaderboard...`;
  notice.style.background = 'var(--gold-light)';
  notice.style.borderColor = 'var(--gold)';
  notice.style.color = 'var(--gold)';
  notice.style.display = '';

  const ok = await initFirebase();
  if (ok && window._fbDb) {
    // Small delay to ensure connection is stable
    setTimeout(() => {
      notice.style.display = 'none';
      loadFirebaseScores();
    }, 500);
  } else {
    notice.style.background = 'var(--red-light)';
    notice.style.borderColor = 'var(--red)';
    notice.style.color = 'var(--red)';
    notice.innerHTML = `❌ Could not connect — check your internet connection.<br>
      <button onclick="renderLeaderboard()" style="margin-top:10px;padding:8px 16px;background:var(--ink);color:var(--paper);border:none;border-radius:8px;font-family:'Syne',sans-serif;font-weight:600;cursor:pointer;font-size:13px">Retry</button>`;
    renderLocalLeaderboard();
  }
}

function renderLocalLeaderboard() {
  // Show just the local user for now
  const list = document.getElementById('lb-list');
  if (!profileData) {
    list.innerHTML = `<div class="lb-empty">Set up your profile first to track Robbie Bucks!</div>`;
    return;
  }
  const emoji = getAvatarEmoji(profileData.zodiac, profileData.vibe);
  const bg = getAvatarBg(profileData.color);
  list.innerHTML = `
    <div style="text-align:center;color:var(--muted);font-size:13px;margin-bottom:12px">
      📡 Connect Firebase above to see all players. Your local score:
    </div>
    <div class="lb-entry me">
      <div class="lb-rank" style="color:var(--gold)">★</div>
      <div class="lb-avatar" style="background:${bg}">${emoji}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(profileData.name)} <span style="font-size:11px;color:var(--muted)">(you)</span></div>
        <div class="lb-detail">${profileData.vibe} ${profileData.zodiac}</div>
      </div>
      <div style="text-align:right">
        <div class="lb-bucks">${formatBucks(robbieBucks)}</div>
        <div class="lb-bucks-label">Robbie Bucks</div>
      </div>
    </div>`;
}




function loadScript(src) {
  return new Promise((res,rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function syncBucksToFirebase() {
  if (!window._fbDb || !profileData) return;
  const userId = firebaseUser ? firebaseUser.uid : profileData.name.toLowerCase().replace(/\s+/g,'_') + '_' + (profileData.zodiac||'').toLowerCase();
  // Update leaderboard
  window._fbDb.ref('leaderboard/' + userId).set({
    name: profileData.name,
    zodiac: profileData.zodiac,
    vibe: profileData.vibe,
    color: profileData.color,
    bucks: robbieBucks,
    updatedAt: Date.now()
  });
  // Update user profile node if signed in
  if (firebaseUser) {
    window._fbDb.ref('users/' + firebaseUser.uid + '/bucks').set(robbieBucks);
  }
}

async function loadFirebaseScores() {
  const list = document.getElementById('lb-list');
  const notice = document.getElementById('lb-notice');
  list.innerHTML = `<div class="lb-empty" style="color:var(--gold)">Loading scores... 🔥</div>`;

  // Sync own score first
  if (profileData && window._fbDb) syncBucksToFirebase();

  try {
    // Use Firebase SDK so auth token is included (required by security rules)
    const snap = await window._fbDb.ref('leaderboard').once('value');
    const data = snap.val();

    if (!data) {
      list.innerHTML = `<div class="lb-empty">No scores yet — be the first! 🏆</div>`;
      return;
    }

    // Convert object to array
    const entries = Object.entries(data).map(([key, val]) => ({...val, _key: key}));
    entries.sort((a,b) => (b.bucks||0) - (a.bucks||0));

    const myKey = firebaseUser ? firebaseUser.uid : null;

    if (notice) {
      notice.style.display = '';
      notice.style.background = 'var(--green-light)';
      notice.style.borderColor = 'var(--green)';
      notice.style.color = 'var(--green)';
      notice.innerHTML = `✅ ${entries.length} player${entries.length!==1?'s':''} on the board`;
    }

    list.innerHTML = entries.map((e,i) => {
      const isMe = myKey && e._key === myKey;
      const emoji = getAvatarEmoji(e.zodiac, e.vibe);
      const bg = getAvatarBg(e.color);
      const rankLabel = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
      return `<div class="lb-entry ${isMe?'me':''}">
        <div class="lb-rank">${rankLabel}</div>
        <div class="lb-avatar" style="background:${bg}">${emoji}</div>
        <div class="lb-info">
          <div class="lb-name">${esc(e.name)}${isMe?' <span style="font-size:11px;color:var(--gold)">(you)</span>':''}</div>
          <div class="lb-detail">${e.vibe||''} ${e.zodiac||''}</div>
        </div>
        <div style="text-align:right">
          <div class="lb-bucks">${formatBucks(e.bucks||0)}</div>
          <div class="lb-bucks-label">Robbie Bucks</div>
        </div>
      </div>`;
    }).join('');

  } catch(e) {
    if (notice) {
      notice.style.display = '';
      notice.style.background = 'var(--red-light)';
      notice.style.borderColor = 'var(--red)';
      notice.style.color = 'var(--red)';
      notice.innerHTML = `❌ Could not load scores: ${e.message}`;
    }
  }
}

// ═══════════════════════════════════════
// SOCIAL — NOW STUDYING + 加油 + TOASTS
// ═══════════════════════════════════════

let nowStudyingInterval = null;
let nowStudyingIndex = 0;
let nowStudyingData = [];
let jiayouSentTo = {};
let toastTimeout = null;
let notifCheckInterval = null;

// ── Write "now studying" to Firebase when session starts ──
function setNowStudying(unitName) {
  if (!firebaseUser || !window._fbDb || !profileData) return;
  window._fbDb.ref('nowStudying/' + firebaseUser.uid).set({
    name: profileData.name,
    zodiac: profileData.zodiac,
    vibe: profileData.vibe,
    color: profileData.color,
    unit: unitName,
    startedAt: Date.now()
  });
}

// ── Clear "now studying" when session ends ──
function clearNowStudying() {
  if (!firebaseUser || !window._fbDb) return;
  window._fbDb.ref('nowStudying/' + firebaseUser.uid).remove();
}

// ── Fetch and display Now Studying banner ──
function loadNowStudying() {
  // Data kept fresh by real-time listener — just render
  updateNowStudyingBanner();
}

function updateNowStudyingBanner(data) {
  const wrap = document.getElementById('now-studying-wrap');
  if (!wrap || !firebaseUser) { if(wrap) wrap.style.display='none'; return; }

  if (data !== undefined) {
    const myUid = firebaseUser.uid;
    const now = Date.now();
    nowStudyingData = data ? Object.entries(data)
      .filter(([uid, v]) => uid !== myUid && (now - v.startedAt) < 7200000)
      .map(([uid, v]) => ({...v, uid})) : [];
  }

  if (!nowStudyingData.length) { wrap.style.display='none'; return; }
  wrap.style.display = '';
  renderNowStudyingBanner();

  if (nowStudyingInterval) clearInterval(nowStudyingInterval);
  if (nowStudyingData.length > 1) {
    nowStudyingInterval = setInterval(() => {
      nowStudyingIndex = (nowStudyingIndex + 1) % nowStudyingData.length;
      renderNowStudyingBanner();
    }, 4000);
  }
}

function renderNowStudyingBanner() {
  const wrap = document.getElementById('now-studying-wrap');
  if (!wrap || !nowStudyingData.length) return;
  const e = nowStudyingData[nowStudyingIndex % nowStudyingData.length];
  const alreadySent = jiayouSentTo[e.uid];
  const emoji = getAvatarEmoji(e.zodiac, e.vibe);
  const bg = getAvatarBg(e.color);
  wrap.innerHTML = `<div class="now-studying-banner">
    <div class="now-studying-dot"></div>
    <div style="width:34px;height:34px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${emoji}</div>
    <div class="now-studying-text">
      <strong>${esc(e.name)}</strong> <span>is studying</span><br>
      <span style="color:rgba(255,255,255,0.9);font-weight:700">${esc(e.unit)}</span>
    </div>
    <button class="jiayou-btn" onclick="sendJiayou('${e.uid}','${esc(e.name)}')" ${alreadySent?'disabled':''}>
      ${alreadySent ? '✅ 加油!' : '⛽ 加油!'}
    </button>
  </div>`;
}

// ── Send 加油 notification ──
async function sendJiayou(toUid, toName) {
  if (!firebaseUser || !profileData) return;
  jiayouSentTo[toUid] = true;
  renderNowStudyingBanner();

  // Show immediate feedback to sender
  showToast('jiayou', `You cheered for ${toName}! ⛽`, profileData.zodiac, profileData.vibe, profileData.color);

  const ok = await initFirebase();
  if (!ok || !window._fbDb) return;

  window._fbDb.ref('notifications/' + toUid).set({
    type: 'jiayou',
    fromName: profileData.name,
    fromZodiac: profileData.zodiac,
    fromVibe: profileData.vibe,
    fromColor: profileData.color,
    sentAt: Date.now()
  });
}

// ── Broadcast mastery notification to everyone ──
async function broadcastMastery(unitName, bucks) {
  if (!firebaseUser || !profileData) return;
  const ok = await initFirebase();
  if (!ok || !window._fbDb) return;
  window._fbDb.ref('broadcast').set({
    type: 'mastery',
    fromName: profileData.name,
    fromZodiac: profileData.zodiac,
    fromVibe: profileData.vibe,
    fromColor: profileData.color,
    unit: unitName,
    bucks: bucks,
    sentAt: Date.now()
  });
}

async function checkNotifications() {
  if (!firebaseUser) return;
  try {
    const jiayouRes = await fetch(`https://hanziplay-f3950-default-rtdb.firebaseio.com/notifications/${firebaseUser.uid}.json`);
    const jiayou = await jiayouRes.json();
    console.log('📬 Notification check:', jiayou);

    if (jiayou && jiayou.type === 'jiayou') {
      const notifId = `jiayou_${jiayou.sentAt}`;
      const age = Date.now() - jiayou.sentAt;
      console.log('⛽ 加油 found! Age:', age, 'ms. Already shown:', shownNotifIds.has(notifId));
      if (age < 120000 && !shownNotifIds.has(notifId)) {
        shownNotifIds.add(notifId);
        showToast('jiayou', `加油！ — ${jiayou.fromName}`, jiayou.fromZodiac, jiayou.fromVibe, jiayou.fromColor);
        setTimeout(async () => {
          await fetch(`https://hanziplay-f3950-default-rtdb.firebaseio.com/notifications/${firebaseUser.uid}.json`, {method:'DELETE'});
        }, 3000);
      }
    }

    const broadcastRes = await fetch('https://hanziplay-f3950-default-rtdb.firebaseio.com/broadcast.json');
    const broadcast = await broadcastRes.json();
    if (broadcast && broadcast.type === 'mastery') {
      const notifId = `mastery_${broadcast.sentAt}`;
      const age = Date.now() - broadcast.sentAt;
      if (age < 120000 && broadcast.fromName !== profileData?.name && !shownNotifIds.has(notifId)) {
        shownNotifIds.add(notifId);
        showToast('mastery', `${broadcast.fromName} just mastered ${broadcast.unit} and earned ${formatBucks(broadcast.bucks)}! 🏆`, broadcast.fromZodiac, broadcast.fromVibe, broadcast.fromColor);
      }
    }
  } catch(e) { console.error('notif check error:', e); }
}

// ── Real-time listeners (replaces all polling) ──
let shownNotifIds = new Set();
let notifListenerActive = false;
let nowStudyingListenerActive = false;

async function startRealtimeListeners() {
  if (!firebaseUser || notifListenerActive) return;
  const ok = await initFirebase();
  if (!ok || !window._fbDb) return;
  notifListenerActive = true;

  // 加油 notifications — fires instantly when someone sends 加油
  window._fbDb.ref('notifications/' + firebaseUser.uid).on('value', snapshot => {
    const jiayou = snapshot.val();
    if (!jiayou || jiayou.type !== 'jiayou') return;
    const notifId = 'jiayou_' + jiayou.sentAt;
    const age = Date.now() - jiayou.sentAt;
    if (age < 120000 && !shownNotifIds.has(notifId)) {
      shownNotifIds.add(notifId);
      showToast('jiayou', `加油！ — ${jiayou.fromName}`, jiayou.fromZodiac, jiayou.fromVibe, jiayou.fromColor);
      setTimeout(() => window._fbDb.ref('notifications/' + firebaseUser.uid).remove(), 2000);
    }
  });

  // Mastery broadcast — fires when anyone completes a unit
  window._fbDb.ref('broadcast').on('value', snapshot => {
    const broadcast = snapshot.val();
    if (!broadcast || broadcast.type !== 'mastery') return;
    const notifId = 'mastery_' + broadcast.sentAt;
    const age = Date.now() - broadcast.sentAt;
    if (age < 120000 && broadcast.fromName !== profileData?.name && !shownNotifIds.has(notifId)) {
      shownNotifIds.add(notifId);
      showToast('mastery', `${broadcast.fromName} just mastered ${broadcast.unit} and earned ${formatBucks(broadcast.bucks)}! 🏆`, broadcast.fromZodiac, broadcast.fromVibe, broadcast.fromColor);
    }
  });

  // Now Studying banner — updates instantly when anyone starts/stops studying
  if (!nowStudyingListenerActive) {
    nowStudyingListenerActive = true;
    window._fbDb.ref('nowStudying').on('value', snapshot => {
      updateNowStudyingBanner(snapshot.val());
    });
  }
}

// ── Stop all listeners ──
function stopAllListeners() {
  if (nowStudyingInterval) clearInterval(nowStudyingInterval);
  notifListenerActive = false;
  nowStudyingListenerActive = false;
  if (window._fbDb && firebaseUser) {
    window._fbDb.ref('notifications/' + firebaseUser.uid).off();
    window._fbDb.ref('broadcast').off();
    window._fbDb.ref('nowStudying').off();
  }
}

// Legacy aliases so nothing breaks
function startNotifPolling() { startRealtimeListeners(); }
function stopNotifPolling() { stopAllListeners(); }


loadProfile();
updateHeaderAvatar();

// Check if already signed in from a previous session
function dismissSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 700);
  }
}

async function checkAuthState() {
  // Hard safety net — if anything hangs, dismiss splash and show something after 5s
  const splashSafetyTimer = setTimeout(() => {
    dismissSplash();
    if (!document.querySelector('.screen.active:not(#screen-complete)')) {
      showScreen('screen-signin');
    }
  }, 5000);

  const ok = await initFirebase();
  if (!ok) {
    clearTimeout(splashSafetyTimer);
    dismissSplash();
    showScreen('screen-signin');
    return;
  }

  // Handle redirect result first
  try {
    const result = await firebase.auth().getRedirectResult();
    if (result && result.user) {
      firebaseUser = result.user;
    }
  } catch(e) {
    console.error('Redirect result error:', e);
  }

  firebase.auth().onAuthStateChanged(async user => {
    clearTimeout(splashSafetyTimer);
    dismissSplash();
    if (user) {
      firebaseUser = user;
      await onSignedIn();
    } else {
      // Sign-in is required — always show sign-in screen if no Firebase user
      showScreen('screen-signin');
    }
  });
}

checkAuthState();
