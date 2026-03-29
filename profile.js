// ═══════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════
const PROFILE_KEY = 'hanziplay_profile';
const BUCKS_KEY = 'hanziplay_bucks';

const ZODIACS = [
  {emoji:'🐭',name:'Rat',zh:'鼠'},{emoji:'🐂',name:'Ox',zh:'牛'},
  {emoji:'🐯',name:'Tiger',zh:'虎'},{emoji:'🐰',name:'Rabbit',zh:'兔'},
  {emoji:'🐉',name:'Dragon',zh:'龍'},{emoji:'🐍',name:'Snake',zh:'蛇'},
  {emoji:'🐴',name:'Horse',zh:'馬'},{emoji:'🐑',name:'Goat',zh:'羊'},
  {emoji:'🐵',name:'Monkey',zh:'猴'},{emoji:'🐓',name:'Rooster',zh:'雞'},
  {emoji:'🐕',name:'Dog',zh:'狗'},{emoji:'🐷',name:'Pig',zh:'豬'}
];
const VIBES = [
  {id:'fierce',label:'😤 Fierce'},{id:'cool',label:'😎 Cool'},
  {id:'happy',label:'😊 Happy'},{id:'sleepy',label:'😴 Sleepy'},
  {id:'royal',label:'👑 Royal'}
];
const COLORS = [
  {id:'ruby',label:'Ruby',hex:'#9B1C1C'},
  {id:'sapphire',label:'Sapphire',hex:'#1E3A6E'},
  {id:'gold',label:'Gold',hex:'#B8860B'},
  {id:'silver',label:'Silver',hex:'#6B7280'},
  {id:'emerald',label:'Emerald',hex:'#065F46'},
  {id:'onyx',label:'Onyx',hex:'#1a1210'}
];

let profileData = null;
let robbieBucks = 0;

// Draft selections during profile setup
let draftName='', draftZodiac=null, draftVibe=null, draftColor=null, draftAccent='zh-TW';

function loadProfile() {
  try { profileData = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { profileData = null; }
  try { robbieBucks = parseInt(localStorage.getItem(BUCKS_KEY))||0; } catch { robbieBucks=0; }

  // Restore saved settings into global state so they persist across sessions
  if (profileData) {
    if (profileData.script) selectedScript = profileData.script;
    if (profileData.inputMethod) inputMethod = profileData.inputMethod;
    if (profileData.accent) draftAccent = profileData.accent;
  }
}
function saveProfileData() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
}
function saveBucks() {
  localStorage.setItem(BUCKS_KEY, String(robbieBucks));
  if (window._fbDb) syncBucksToFirebase();
}
function formatBucks(n) {
  return '$' + n.toFixed(2);
}

function getAvatarBg(colorId) {
  return COLORS.find(c=>c.id===colorId)?.hex || '#1a1210';
}
function getZodiacEmoji(zodiacName) {
  return ZODIACS.find(z=>z.name===zodiacName)?.emoji || '🐉';
}
function getVibeEmoji(vibeId) {
  return '';
}
function getAvatarEmoji(zodiacName, vibeId) {
  return getZodiacEmoji(zodiacName);
}
function renderAvatarEl(emoji, colorId, size=44, radius='50%') {
  const fontSize = Math.floor(size * 0.38);
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${getAvatarBg(colorId)};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;flex-shrink:0;letter-spacing:-2px">${emoji}</div>`;
}

function initProfileSetup(isEdit=false) {
  // Pre-fill if editing
  if (isEdit && profileData) {
    draftName = profileData.name;
    draftZodiac = profileData.zodiac;
    draftVibe = profileData.vibe;
    draftColor = profileData.color;
    draftAccent = profileData.accent || 'zh-TW';
    document.getElementById('profile-name').value = draftName;
    document.getElementById('p1-next').disabled = false;
  } else {
    draftName=''; draftZodiac=null; draftVibe=null; draftColor=null;
    document.getElementById('profile-name').value = '';
    document.getElementById('p1-next').disabled = true;
  }

  // Build zodiac grid
  document.getElementById('zodiac-grid').innerHTML = ZODIACS.map(z=>`
    <button class="zodiac-btn ${draftZodiac===z.name?'selected':''}" onclick="selectZodiac('${z.name}')">
      <span class="zodiac-emoji">${z.emoji}</span>
      <span class="zodiac-name">${z.name}</span>
      <span class="zodiac-zh">${z.zh}</span>
    </button>`).join('');

  // Build vibe grid
  document.getElementById('vibe-grid').innerHTML = VIBES.map(v=>`
    <button class="vibe-btn ${draftVibe===v.id?'selected':''}" onclick="selectVibe('${v.id}')">${v.label}</button>`).join('');

  // Build color grid
  document.getElementById('color-grid').innerHTML = COLORS.map(c=>`
    <div class="color-swatch ${draftColor===c.id?'selected':''}" style="background:${c.hex}" title="${c.label}" onclick="selectColor('${c.id}')"></div>`).join('');
  setTimeout(() => selectAccent(draftAccent || 'zh-TW'), 0);

  updateProfilePreviews();
  profileStep(1);
}

function profileStep(n) {
  for(let i=1;i<=4;i++) {
    document.getElementById(`pstep-${i}`).classList.toggle('active', i===n);
  }
  updateProfilePreviews();
  showScreen('screen-profile');
  document.getElementById('btn-home-header').style.display = profileData ? '' : 'none';
  // Show signed-in Google email
  const emailLabel = document.getElementById('signin-email-label');
  if (emailLabel && firebaseUser && firebaseUser.email) {
    emailLabel.textContent = 'Signed in as ' + firebaseUser.email;
  }
}

function updateProfilePreviews() {
  const emoji = getAvatarEmoji(draftZodiac || 'Dragon', draftVibe);
  const bg = draftColor ? getAvatarBg(draftColor) : '#d4c9b8';
  for(let i=1;i<=4;i++) {
    const el = document.getElementById(`p${i}-avatar`);
    if(el) { el.textContent=emoji; el.style.background=bg; el.style.fontSize='52px'; el.style.letterSpacing='0'; }
  }
}

function checkProfileName() {
  draftName = document.getElementById('profile-name').value.trim();
  document.getElementById('p1-next').disabled = draftName.length < 1;
}

function selectZodiac(name) {
  draftZodiac = name;
  document.querySelectorAll('.zodiac-btn').forEach(b=>b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('p2-next').disabled = false;
  updateProfilePreviews();
}
function selectVibe(id) {
  draftVibe = id;
  document.querySelectorAll('.vibe-btn').forEach(b=>b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('p3-next').disabled = false;
}
function selectAccent(lang) {
  draftAccent = lang;
  const tw = document.getElementById('accent-tw');
  const cn = document.getElementById('accent-cn');
  if (!tw || !cn) return;
  [['zh-TW', tw], ['zh-CN', cn]].forEach(([l, btn]) => {
    btn.style.background = l === lang ? 'var(--ink)' : 'var(--paper)';
    btn.style.color = l === lang ? 'var(--paper)' : 'var(--ink)';
    btn.style.borderColor = l === lang ? 'var(--ink)' : 'var(--border)';
  });
}

function selectColor(id) {
  draftColor = id;
  document.querySelectorAll('.color-swatch').forEach(b=>b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('p4-done').disabled = false;
  updateProfilePreviews();
}

function skipSignIn() {
  // Use app without Google sign in — local only (kept for legacy, no longer called)
  if (profileData) {
    navigateHome();
  } else {
    initProfileSetup(false);
  }
}

// ── Dev bypass: tap 字 five times to skip sign-in ──
let _devTapCount = 0;
let _devTapTimer = null;
function devBypassTap() {
  _devTapCount++;
  // Flash the character to give feedback
  const el = document.getElementById('signin-hanzi');
  if (el) { el.style.opacity = '0.4'; setTimeout(() => el.style.opacity = '1', 120); }
  clearTimeout(_devTapTimer);
  if (_devTapCount >= 5) {
    _devTapCount = 0;
    // Bypass — use app without Firebase auth
    console.warn('DEV BYPASS: skipping sign-in');
    if (profileData) { renderHome(); showScreen('screen-home'); }
    else { initProfileSetup(false); }
    return;
  }
  // Reset count if no tap within 2 seconds
  _devTapTimer = setTimeout(() => { _devTapCount = 0; }, 2000);
}

async function signOut() {
  if (!confirm('Sign out of HanziPlay?')) return;
  try {
    if (window.firebase && firebase.auth) {
      await firebase.auth().signOut();
    }
  } catch(e) {
    console.error('Sign out error:', e);
  }
  // Clear local data
  profileData = null;
  robbieBucks = 0;
  units = [];
  firebaseUser = null;
  try { localStorage.clear(); } catch(e) {}
  // Go back to sign in screen
  showScreen('screen-signin');
}

function saveProfile() {
  profileData = {
    name: document.getElementById('profile-name').value.trim(),
    zodiac: draftZodiac || 'Dragon',
    vibe: draftVibe || 'cool',
    color: draftColor || 'ruby',
    accent: draftAccent || 'zh-TW'
  };
  saveProfileData();
  updateHeaderAvatar();
  // Push to Firebase if signed in
  if (firebaseUser && window._fbDb) pushProfileToFirebase();
  navigateHome();
}

function showProfileEdit() {
  initProfileSetup(true);
}

function updateHeaderAvatar() {
  const el = document.getElementById('header-avatar');
  if (!el) return;
  if (profileData) {
    const emoji = getAvatarEmoji(profileData.zodiac, profileData.vibe);
    el.style.background = getAvatarBg(profileData.color);
    el.textContent = emoji;
    el.style.fontSize = '16px';
    el.style.letterSpacing = '0';
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// Award Robbie Bucks after session
function awardBucks(wordsCompleted) {
  if (!profileData) return;
  robbieBucks += wordsCompleted;
  // Save session duration for leaderboard tooltip
  if (sessionStartTime) {
    const durationSecs = Math.round((Date.now() - sessionStartTime) / 1000);
    const prev = parseInt(localStorage.getItem('hanziplay_total_study_time')) || 0;
    localStorage.setItem('hanziplay_total_study_time', String(prev + durationSecs));
    sessionStartTime = null;
    if (window._fbDb && firebaseUser) syncBucksToFirebase(); // push updated duration
  }
  saveBucks();
}

// ── Streak tracking ───────────────────────────────────
const STREAK_KEY = 'hanziplay_streak';

function loadStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { currentStreak: 0, lastLoginDate: null, longestStreak: 0 }; }
  catch { return { currentStreak: 0, lastLoginDate: null, longestStreak: 0 }; }
}

function saveStreak(data) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function checkAndUpdateStreak() {
  if (!profileData) return;
  const today = new Date().toDateString();
  const streak = loadStreak();

  if (streak.lastLoginDate === today) return; // already logged in today, no change

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = streak.lastLoginDate === yesterday.toDateString();

  if (wasYesterday) {
    streak.currentStreak += 1;
  } else if (streak.lastLoginDate === null) {
    streak.currentStreak = 1;
  } else {
    streak.currentStreak = 1; // streak broken, reset to 1
  }

  streak.longestStreak = Math.max(streak.longestStreak || 0, streak.currentStreak);
  streak.lastLoginDate = today;

  saveStreak(streak);

  // Award streak bonus: Day N = $N
  const bonus = streak.currentStreak;
  robbieBucks += bonus;
  saveBucks();

  if (streak.currentStreak > 1) {
    showToast(`🔥 ${streak.currentStreak}-day streak! +$${bonus.toFixed(2)} Robbie Bucks bonus!`, 4000);
  } else {
    showToast(`👋 Welcome back! +$1.00 login bonus!`, 3000);
  }
}

function getStreakData() {
  return loadStreak();
}

