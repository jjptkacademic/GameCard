// ===== State =====
const state = {
  selectedId: null,
  placements: {},         // { slotPersonId: placedPersonId }
  timeLeft: CONFIG.timeLimit,
  timerInterval: null,
  gameOver: false,
  lastScore: null,        // null = ยังไม่เคย check, number = score ล่าสุด
  timeTaken: 0,
  player: null
};

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
  document.querySelectorAll('.slot-card').forEach(s => s.classList.remove('drop-ready'));
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
  } catch {
    statusEl.textContent = '❌ บันทึกไม่สำเร็จ — กดกลับได้เลย';
    statusEl.classList.add('error');
  }

  btnHome.textContent = 'กลับหน้าหลัก';
  btnHome.disabled = false;
}

init();
