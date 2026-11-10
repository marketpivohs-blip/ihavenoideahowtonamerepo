const API = '/api/draw';

let serverOffset = 0;
let drawTime = null;
let started = false;
let prizesRendered = false;

const els = {
  countdown: document.getElementById('countdown'),
  status: document.getElementById('status'),
  prizes: document.getElementById('prizes'),
  participants: document.getElementById('participants'),
  results: document.getElementById('results'),
  resultsList: document.getElementById('results-list'),
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function renderCountdown(ms) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  els.countdown.textContent = `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

function tick() {
  if (started || !drawTime) return;
  const now = Date.now() + serverOffset;
  const ms = drawTime - now;
  if (ms <= 0) {
    els.countdown.textContent = '00:00:00:00';
    poll();
    return;
  }
  renderCountdown(ms);
}

function renderPrizes(prizes) {
  if (prizesRendered) return;
  els.prizes.innerHTML = prizes
    .map(
      (p, i) =>
        `<li><span class="prize-num">${i + 1}</span><span>${p}</span></li>`
    )
    .join('');
  prizesRendered = true;
}

function showResults(results) {
  els.status.textContent = 'Розыгрыш начался!';
  els.countdown.style.display = 'none';
  els.results.hidden = false;
  els.resultsList.innerHTML = results
    .map(
      (r) =>
        `<li><span>${r.prize}</span><strong>${r.code} — ${r.name}</strong></li>`
    )
    .join('');
  // TODO шаг 2: заменить на анимацию двух барабанов
}

async function poll() {
  try {
    const res = await fetch(API, { cache: 'no-store' });
    const data = await res.json();

    serverOffset = data.serverNow - Date.now();
    drawTime = new Date(data.drawTime).getTime();

    if (els.participants) els.participants.textContent = data.participantsCount;
    renderPrizes(data.prizes);

    if (data.started && !started) {
      started = true;
      showResults(data.results);
    }
  } catch (err) {
    console.error('poll failed', err);
  }
}

poll();
setInterval(tick, 1000);
setInterval(poll, 30000);