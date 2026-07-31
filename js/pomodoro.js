// ============================================================
// ПОМОДОРО ТАЙМЕР — техника продуктивности (25/5/15 минут)
// Отсчёт от таймстампа: не дрейфует в фоновой вкладке
// ============================================================
const POMO_WORK_MIN = 25;              // Время работы
const POMO_SHORT_BREAK_MIN = 5;        // Короткий перерыв
const POMO_LONG_BREAK_MIN = 15;        // Длинный перерыв
const POMO_SESSIONS_BEFORE_LONG = 4;   // После 4 рабочих сессий — длинный перерыв
const POMO_SAVE_INTERVAL = 15000;      // Пишем в localStorage не чаще раза в 15 секунд

// DOM-элементы
const pomoModeEl = document.getElementById('pomo-mode');
const pomoTimeEl = document.getElementById('pomo-time');
const pomoBarEl = document.getElementById('pomo-bar');
const pomoStartBtn = document.getElementById('pomo-start');
const pomoResetBtn = document.getElementById('pomo-reset');
const pomoDots = [
  document.getElementById('dot-1'),
  document.getElementById('dot-2'),
  document.getElementById('dot-3'),
  document.getElementById('dot-4')
];

// Текущее состояние таймера
let pomoState = {
  mode: 'work',
  timeLeft: POMO_WORK_MIN * 60,
  totalTime: POMO_WORK_MIN * 60,
  running: false,
  completedSessions: 0,
  endTime: 0 // момент окончания отсчёта (Date.now() + timeLeft * 1000)
};
let pomoInterval = null;
let lastSavedAt = 0;

// Загружает состояние из localStorage
function loadPomoState() {
  try {
    const saved = JSON.parse(localStorage.getItem(POMO_KEY));
    if (saved) {
      pomoState.mode = saved.mode || 'work';
      // «??» не понимают старые браузеры (до Chrome 80) — это синтаксическая
      // ошибка, роняющая весь скрипт. Проверка != null полностью равноценна
      pomoState.timeLeft = saved.timeLeft != null ? saved.timeLeft : POMO_WORK_MIN * 60;
      pomoState.totalTime = saved.totalTime != null ? saved.totalTime : POMO_WORK_MIN * 60;
      pomoState.completedSessions = saved.completedSessions != null ? saved.completedSessions : 0;
      pomoState.running = false;
    }
  } catch (e) {}
}

// Сохраняет состояние (с троттлингом, если не force)
function savePomoState(force = false) {
  const now = Date.now();
  if (!force && now - lastSavedAt < POMO_SAVE_INTERVAL) return;
  lastSavedAt = now;
  safeSetItem(POMO_KEY, JSON.stringify({
    mode: pomoState.mode,
    timeLeft: pomoState.timeLeft,
    totalTime: pomoState.totalTime,
    completedSessions: pomoState.completedSessions
  }));
}

// Форматирует секунды в вид "MM:SS" (без padStart — его нет в Chrome < 57)
function formatPomoTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// Обновляет все элементы таймера на экране
function updatePomoDisplay() {
  pomoTimeEl.textContent = formatPomoTime(pomoState.timeLeft);
  const progress = pomoState.totalTime > 0 ? (pomoState.timeLeft / pomoState.totalTime) * 100 : 0;
  pomoBarEl.style.width = `${progress}%`;

  if (pomoState.mode === 'work') {
    pomoModeEl.textContent = 'Фокус';
    pomoBarEl.classList.remove('break-mode');
  } else if (pomoState.mode === 'shortBreak') {
    pomoModeEl.textContent = 'Перерыв';
    pomoBarEl.classList.add('break-mode');
  } else {
    pomoModeEl.textContent = 'Длинный перерыв';
    pomoBarEl.classList.add('break-mode');
  }

  pomoStartBtn.textContent = pomoState.running ? '⏸ Пауза' : '▶ Старт';
  pomoStartBtn.classList.toggle('running', pomoState.running);

  pomoDots.forEach((dot, i) => {
    dot.classList.remove('completed', 'active');
    if (i < pomoState.completedSessions) dot.classList.add('completed');
    if (i === pomoState.completedSessions && pomoState.mode === 'work') dot.classList.add('active');
  });

  document.title = pomoState.running
    ? `${formatPomoTime(pomoState.timeLeft)} — ${pomoState.mode === 'work' ? 'Фокус' : 'Перерыв'}`
    : 'Дашборд | Стартовая';
}

// Двойной звуковой сигнал через Web Audio API
function playPomoBeep() {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, delay) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start(actx.currentTime + delay);
      osc.stop(actx.currentTime + delay + 0.3);
    };
    beep(pomoState.mode === 'work' ? 880 : 660, 0);
    beep(pomoState.mode === 'work' ? 1100 : 880, 0.35);
  } catch (e) {}
}

// Переключает режим после завершения фазы
function switchPomoMode() {
  if (pomoState.mode === 'work') {
    pomoState.completedSessions++;
    if (pomoState.completedSessions >= POMO_SESSIONS_BEFORE_LONG) {
      pomoState.mode = 'longBreak';
      pomoState.timeLeft = pomoState.totalTime = POMO_LONG_BREAK_MIN * 60;
      pomoState.completedSessions = 0;
    } else {
      pomoState.mode = 'shortBreak';
      pomoState.timeLeft = pomoState.totalTime = POMO_SHORT_BREAK_MIN * 60;
    }
  } else {
    pomoState.mode = 'work';
    pomoState.timeLeft = pomoState.totalTime = POMO_WORK_MIN * 60;
  }
}

// Тик: время считается от таймстампа, а не декрементом —
// даже если браузер «заморозил» вкладку, значение будет точным
function pomoTick() {
  pomoState.timeLeft = Math.max(0, Math.ceil((pomoState.endTime - Date.now()) / 1000));
  if (pomoState.timeLeft <= 0) {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoState.running = false;
    playPomoBeep();
    switchPomoMode();
    savePomoState(true);
    updatePomoDisplay();
    return;
  }
  savePomoState(); // сработает не чаще раза в 15 секунд
  updatePomoDisplay();
}

// Старт/пауза таймера
function togglePomo() {
  if (pomoState.running) {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoState.timeLeft = Math.max(0, Math.ceil((pomoState.endTime - Date.now()) / 1000));
    pomoState.running = false;
  } else {
    pomoState.running = true;
    pomoState.endTime = Date.now() + pomoState.timeLeft * 1000;
    pomoInterval = setInterval(pomoTick, 500);
  }
  savePomoState(true);
  updatePomoDisplay();
}

// Сброс таймера в исходное состояние
function resetPomo() {
  clearInterval(pomoInterval);
  pomoInterval = null;
  pomoState.running = false;
  pomoState.mode = 'work';
  pomoState.timeLeft = pomoState.totalTime = POMO_WORK_MIN * 60;
  pomoState.completedSessions = 0;
  savePomoState(true);
  updatePomoDisplay();
}

pomoStartBtn.addEventListener('click', togglePomo);
pomoResetBtn.addEventListener('click', resetPomo);

// Сохраняем остаток при скрытии или закрытии вкладки
document.addEventListener('visibilitychange', () => { if (document.hidden) savePomoState(true); });
window.addEventListener('beforeunload', () => savePomoState(true));

loadPomoState();
updatePomoDisplay();