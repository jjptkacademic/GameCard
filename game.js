// ===== State =====
const state = {
  selectedId: null,
  placements: {},
  timeLeft: CONFIG.timeLimit,
  timerInterval: null,
  gameOver: false,
  lastScore: null,
  timeTaken: 0,
  player: null
};

let surrenderArmed = false;
let surrenderTimer = null;
let hintTimer = null;

// ===== Init =====
function init() {
  const raw = sessionStorage.getItem('player');
  if (!raw) { location.href = 'index.html'; return; }

  state.player = JSON.parse(raw);
  document.getElementById('playerDisplay').textContent =
    `${state.player.name} · ${state.player.class}`;

  renderSlots();
  renderPhotos();
  startTimer();

  document.getElementById('submitBtn').addEventListener('click', checkAnswers);
}

// ===== Shuffle =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Render slots =====
function renderSlots() {
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML = shuffle(CONFIG.personnel).map(p => `
    <div class="slot-card" id="slot-${p.id}" data-slot-id="${p.id}" onclick="onSlotClick(${p.id})">
      <div class="slot-photo-area" id="slot-photo-${p.id}">👤</div>
      <div class="slot-info">
        <div class="slot-name">${p.name}</div>
        <div class="slot-position">${p.position}</div>
      </div>
      <div class="slot-result-icon" id="slot-icon-${p.id}"></div>
    </div>
  `).join('');
}

// ===== Render photos (ไม่มีชื่อ) =====
function renderPhotos() {
  const row = document.getElementById('photoRow');
  row.innerHTML = shuffle(CONFIG.personnel).map(p => `
    <div class="photo-card" id="photo-${p.id}" data-person-id="${p.id}" onclick="onPhotoClick(${p.id})">
      <img src="${p.image}" alt="" loading="lazy" onerror="this.style.display='none'">
      <button class="view-btn" onclick="viewPhoto(event,${p.id})" title="ดูรูปเต็ม">
        <span class="view-icon">🔍</span><span class="view-text"> ดูรูป</span>
      </button>
    </div>
  `).join('');
}

// ===== Photo viewer =====
function viewPhoto(e, personId) {
  e.stopPropagation();
  const person = CONFIG.personnel.find(p => p.id === personId);
  document.getElementById('photoViewImg').src = person.image;
  document.getElementById('photoViewModal').classList.remove('hidden');
}

function closePhotoModal() {
  document.getElementById('photoViewModal').classList.add('hidden');
}

// ===== Photo click =====
function onPhotoClick(personId) {
  if (state.gameOver) return;

  if (state.selectedId === personId) {
    clearSelection();
    return;
  }

  clearSelection();
  state.selectedId = personId;
  document.getElementById(`photo-${personId}`).classList.add('selected');
  document.getElementById('hintBtn').disabled = false;

  document.querySelectorAll('.slot-card').forEach(slot => {
    const slotId = parseInt(slot.dataset.slotId);
    if (!state.placements[slotId]) slot.classList.add('drop-ready');
  });
}

// ===== Slot click =====
function onSlotClick(slotId) {
  if (state.gameOver) return;

  const current = state.placements[slotId];

  // Reset visual feedback for this slot the moment player interacts with it
  resetSlotFeedback(slotId);

  if (state.selectedId !== null) {
    const incoming = state.selectedId;

    if (current) returnToTray(current);

    state.placements[slotId] = incoming;
    markPhotoPlaced(incoming, true);
    showPhotoInSlot(slotId, incoming);

    clearSelection();
    updatePlacedCount();
  } else if (current) {
    state.placements[slotId] = undefined;
    markPhotoPlaced(current, false);
    clearSlot(slotId);

    state.selectedId = current;
    document.getElementById(`photo-${current}`).classList.add('selected');

    document.querySelectorAll('.slot-card').forEach(slot => {
      const sid = parseInt(slot.dataset.slotId);
      if (!state.placements[sid]) slot.classList.add('drop-ready');
    });

    updatePlacedCount();
  }
}

// ===== Helpers =====
function clearSelection() {
  if (state.selectedId !== null) {
    const el = document.getElementById(`photo-${state.selectedId}`);
    if (el) el.classList.remove('selected');
  }
  state.selectedId = null;
  document.getElementById('hintBtn').disabled = true;
  document.querySelectorAll('.slot-card').forEach(s => s.classList.remove('drop-ready'));
  clearHint();
}

function markPhotoPlaced(personId, placed) {
  const el = document.getElementById(`photo-${personId}`);
  if (el) el.classList.toggle('placed', placed);
}

function returnToTray(personId) {
  markPhotoPlaced(personId, false);
}

function showPhotoInSlot(slotId, personId) {
  const person = CONFIG.personnel.find(p => p.id === personId);
  const area = document.getElementById(`slot-photo-${slotId}`);
  area.innerHTML = `<img src="${person.image}" alt="" onerror="this.parentElement.textContent='👤'">`;
}

function clearSlot(slotId) {
  document.getElementById(`slot-photo-${slotId}`).innerHTML = '👤';
}

function resetSlotFeedback(slotId) {
  const card = document.getElementById(`slot-${slotId}`);
  card.classList.remove('correct', 'wrong');
  document.getElementById(`slot-icon-${slotId}`).textContent = '';
}

function updatePlacedCount() {
  const count = Object.values(state.placements).filter(v => v !== undefined).length;
  document.getElementById('placedCount').textContent = `${count}/13`;
}

// ===== Timer =====
function startTimer() {
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();

    if (state.timeLeft <= 10) {
      document.getElementById('timerBox').classList.add('urgent');
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      onTimerEnd();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
  const s = (state.timeLeft % 60).toString().padStart(2, '0');
  document.getElementById('timerValue').textContent = `${m}:${s}`;
}

// ===== Timer runs out =====
function onTimerEnd() {
  if (state.gameOver) return;

  // ปิด check modal ถ้าเปิดอยู่
  document.getElementById('checkModal').classList.add('hidden');

  const score = state.lastScore !== null ? state.lastScore : calcScore();
  state.timeTaken = CONFIG.timeLimit;
  endGame(score, true);
}

// ===== Surrender (2-tap) =====
function surrender() {
  if (state.gameOver) return;

  if (!surrenderArmed) {
    surrenderArmed = true;
    const btn = document.getElementById('surrenderBtn');
    btn.textContent = '⚠️ ยืนยัน?';
    btn.classList.add('armed');
    surrenderTimer = setTimeout(() => {
      surrenderArmed = false;
      btn.textContent = '🏳️';
      btn.classList.remove('armed');
    }, 2500);
    return;
  }

  clearTimeout(surrenderTimer);
  const score = state.lastScore !== null ? state.lastScore : 0;
  state.timeTaken = CONFIG.timeLimit - state.timeLeft;
  endGame(score, false);
}

// ===== Hint =====
function showHint() {
  if (!state.selectedId || state.gameOver) return;

  clearHint();
  clearTimeout(hintTimer);

  const correctSlotId = state.selectedId;

  // Slots ที่ยังไม่ถูก (ไม่รวม slot ที่ถูกต้องแล้ว) และไม่ใช่ correct slot ของรูปที่เลือก
  const candidates = CONFIG.personnel
    .filter(p => p.id !== correctSlotId && state.placements[p.id] !== p.id)
    .map(p => p.id);

  const wrong2 = shuffle(candidates).slice(0, 2);
  const hintSlots = [correctSlotId, ...wrong2];

  hintSlots.forEach(slotId => {
    const el = document.getElementById(`slot-${slotId}`);
    if (el) el.classList.add('hint-glow');
  });

  // auto-clear หลัง 4 วินาที
  hintTimer = setTimeout(clearHint, 4000);
}

function clearHint() {
  document.querySelectorAll('.slot-card.hint-glow').forEach(el => el.classList.remove('hint-glow'));
}

// ===== Check answers (Submit button) =====
function checkAnswers() {
  if (state.gameOver) return;
  clearSelection();

  const score = calcScore();
  state.lastScore = score;

  // แสดง feedback บน slots
  CONFIG.personnel.forEach(p => {
    const placed = state.placements[p.id];
    const card = document.getElementById(`slot-${p.id}`);
    const icon = document.getElementById(`slot-icon-${p.id}`);

    card.classList.remove('correct', 'wrong');
    icon.textContent = '';

    if (placed !== undefined) {
      const correct = placed === p.id;
      card.classList.add(correct ? 'correct' : 'wrong');
      icon.textContent = correct ? '✅' : '❌';
    }
  });

  // อัพเดต score banner (แสดงหลัง popup ปิด)
  updateScoreBanner(score);

  // ถ้าถูกหมด 13/13 → จบเกมทันที ไม่ต้อง popup ตรวจ
  if (score === CONFIG.personnel.length) {
    state.timeTaken = CONFIG.timeLimit - state.timeLeft;
    endGame(score, false);
    return;
  }

  showCheckModal(score);
}

function calcScore() {
  return CONFIG.personnel.filter(p => state.placements[p.id] === p.id).length;
}

function updateScoreBanner(score) {
  document.getElementById('lastScoreDisplay').textContent = score;
  document.getElementById('scoreBanner').classList.remove('hidden');
}

// ===== Check modal =====
function showCheckModal(score) {
  const pct = score / 13;
  let emoji = '😅';
  let title = 'ลองอีกทีนะ!';

  if (pct >= 0.8)      { emoji = '🔥'; title = 'เกือบแล้ว!'; }
  else if (pct >= 0.5) { emoji = '👍'; title = 'ไม่เลวนะ!'; }
  else if (pct > 0)    { emoji = '💪'; title = 'สู้ต่อไป!'; }

  const wrong = CONFIG.personnel.filter(p =>
    state.placements[p.id] !== undefined && state.placements[p.id] !== p.id
  ).length;
  const empty = CONFIG.personnel.filter(p => state.placements[p.id] === undefined).length;

  document.getElementById('checkEmoji').textContent = emoji;
  document.getElementById('checkTitle').textContent = title;
  document.getElementById('checkScore').textContent = score;
  document.getElementById('checkDetail').innerHTML =
    `ถูก <b>${score}</b> · ผิด <b>${wrong}</b> · ยังไม่วาง <b>${empty}</b>`;

  document.getElementById('checkModal').classList.remove('hidden');
}

function continueGame() {
  document.getElementById('checkModal').classList.add('hidden');
}

// ===== End game =====
function endGame(score, timedOut) {
  state.gameOver = true;
  clearInterval(state.timerInterval);
  document.getElementById('submitBtn').disabled = true;
  clearSelection();

  setTimeout(() => showResult(score, timedOut), timedOut ? 300 : 600);
  saveScore(score);
}

// ===== Show result =====
function showResult(score, timedOut) {
  const pct = score / 13;
  let emoji = '😅';
  let title = 'ลองใหม่นะ!';

  if (pct === 1)        { emoji = '🏆'; title = 'เต็มเลย! เก่งมาก!'; }
  else if (pct >= 0.8)  { emoji = '🎉'; title = 'ดีมากเลย!'; }
  else if (pct >= 0.5)  { emoji = '👍'; title = 'ไม่เลว!'; }

  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultSubtitle').textContent =
    timedOut ? 'หมดเวลา — คะแนนจาก check ล่าสุด' : `ถูกทั้งหมด! ใช้เวลา ${state.timeTaken} วินาที`;
  document.getElementById('resultScore').textContent = score;
  document.getElementById('resultTime').textContent =
    timedOut ? `เวลา 60 วินาที (ครบ)` : `เวลา ${state.timeTaken} วินาที`;

  document.getElementById('resultModal').classList.remove('hidden');
}

// ===== Save to Apps Script =====
async function saveScore(score) {
  const statusEl = document.getElementById('saveStatus');
  const btnHome  = document.getElementById('btnHome');

  if (CONFIG.appScriptUrl === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    statusEl.textContent = '⚠️ ยังไม่ได้ตั้งค่า Apps Script URL';
    statusEl.classList.add('error');
    btnHome.textContent = 'กลับหน้าหลัก';
    btnHome.disabled = false;
    return;
  }

  try {
    const params = new URLSearchParams({
      action: 'submit',
      name: state.player.name,
      class: state.player.class,
      score,
      time: state.timeTaken
    });
    await fetch(`${CONFIG.appScriptUrl}?${params}`);
    statusEl.textContent = '✅ บันทึกคะแนนแล้ว!';
    statusEl.classList.add('saved');
    loadResultRanking();
  } catch {
    statusEl.textContent = '❌ บันทึกไม่สำเร็จ — กดกลับได้เลย';
    statusEl.classList.add('error');
  }

  btnHome.textContent = 'กลับหน้าหลัก';
  btnHome.disabled = false;
}

// ===== Ranking in result modal =====
async function loadResultRanking() {
  const container = document.getElementById('resultRanking');
  const body      = document.getElementById('resultRankingBody');

  body.innerHTML = '<p style="text-align:center;color:#6b7280;font-size:0.85rem;padding:8px 0">กำลังโหลด...</p>';
  container.classList.remove('hidden');

  try {
    const res  = await fetch(`${CONFIG.appScriptUrl}?action=ranking`);
    const data = await res.json();

    if (!data.rows || data.rows.length === 0) {
      body.innerHTML = '';
      return;
    }

    body.innerHTML = `
      <table class="result-ranking-table">
        <thead>
          <tr><th>#</th><th>ชื่อ</th><th>ชั้น</th><th>คะแนน</th><th>วิ</th></tr>
        </thead>
        <tbody>
          ${data.rows.map((row, i) => {
            const mine = row.name === state.player.name && String(row.class) === String(state.player.class);
            return `<tr class="${mine ? 'my-row' : ''}">
              <td>${i + 1}</td>
              <td>${escHtml(row.name)}</td>
              <td>${escHtml(row.class)}</td>
              <td>${row.score}/13</td>
              <td>${row.time}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch {
    body.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:0.85rem">โหลด ranking ไม่ได้</p>';
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

init();
