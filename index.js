async function loadRanking() {
  const loading = document.getElementById('rankingLoading');
  const table   = document.getElementById('rankingTable');
  const empty   = document.getElementById('rankingEmpty');
  const tbody   = document.getElementById('rankingBody');

  if (CONFIG.appScriptUrl === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    loading.textContent = '⚠️ ยังไม่ได้ตั้งค่า Apps Script URL';
    return;
  }

  try {
    const url = `${CONFIG.appScriptUrl}?action=ranking`;
    const res = await fetch(url);
    const data = await res.json();

    loading.classList.add('hidden');

    if (!data.rows || data.rows.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    tbody.innerHTML = data.rows.map((row, i) => {
      const rank = i + 1;
      let badgeHtml = `<span class="rank-badge rank-${rank}">${rank}</span>`;
      if (rank > 3) badgeHtml = rank;

      return `<tr>
        <td>${badgeHtml}</td>
        <td>${escHtml(row.name)}</td>
        <td>${escHtml(row.class)}</td>
        <td><span class="score-pill">${row.score}/13</span></td>
        <td>${row.time}</td>
      </tr>`;
    }).join('');

    table.classList.remove('hidden');
  } catch {
    loading.textContent = 'โหลด ranking ไม่ได้ — ตรวจสอบ Apps Script URL';
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name  = document.getElementById('playerName').value.trim();
  const cls   = document.getElementById('playerClass').value.trim();
  if (!name || !cls) return;

  sessionStorage.setItem('player', JSON.stringify({ name, class: cls }));
  window.location.href = 'game.html';
});

loadRanking();
