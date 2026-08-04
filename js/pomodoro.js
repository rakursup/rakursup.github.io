// ============================================================
// ПОМОДОРО ТАЙМЕР — техника продуктивности с настройками
// Отсчёт от таймстампа: не дрейфует в фоновой вкладке
// ============================================================
// Ключ для хранения настроек в localStorage (с префиксом экземпляра).
// Отдельный от POMO_KEY (utils.js): POMO_KEY хранит состояние таймера
// (mode, timeLeft), этот — настройки пользователя (25/5/15/4)
const POMO_SETTINGS_KEY = storageKey('pomodoro_settings');

const DEFAULT_POMO_SETTINGS = {
    workMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    sessionsBeforeLong: 4
};

// Загружает настройки из localStorage (или значения по умолчанию).
// Оператор || (вместо ??) здесь намеренный: если пользователь сохранит 0,
// возьмётся дефолт. Для таймеров 0 не имеет смысла.
function loadPomoSettings() {
    try {
        const saved = localStorage.getItem(POMO_SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            return {
                workMin: settings.workMin || DEFAULT_POMO_SETTINGS.workMin,
                shortBreakMin: settings.shortBreakMin || DEFAULT_POMO_SETTINGS.shortBreakMin,
                longBreakMin: settings.longBreakMin || DEFAULT_POMO_SETTINGS.longBreakMin,
                sessionsBeforeLong: settings.sessionsBeforeLong || DEFAULT_POMO_SETTINGS.sessionsBeforeLong
            };
        }
    } catch (e) {}
    return { ...DEFAULT_POMO_SETTINGS };
}

function savePomoSettings(settings) {
    safeSetItem(POMO_SETTINGS_KEY, JSON.stringify(settings));
}

let pomoSettings = loadPomoSettings();

const POMO_SAVE_INTERVAL = 15000;

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

let pomoState = {
    mode: 'work',
    timeLeft: pomoSettings.workMin * 60,
    totalTime: pomoSettings.workMin * 60,
    running: false,
    completedSessions: 0,
    endTime: 0
};
let pomoInterval = null;
let lastSavedAt = 0;

// Загружает состояние из localStorage.
// Проверка != null вместо ?? (nullish coalescing) — ?? не понимают
// браузеры до Chrome 80, != null полностью равноценен для null/undefined
function loadPomoState() {
    try {
        const saved = JSON.parse(localStorage.getItem(POMO_KEY));
        if (saved) {
            pomoState.mode = saved.mode || 'work';
            pomoState.timeLeft = saved.timeLeft != null ? saved.timeLeft : pomoSettings.workMin * 60;
            pomoState.totalTime = saved.totalTime != null ? saved.totalTime : pomoSettings.workMin * 60;
            pomoState.completedSessions = saved.completedSessions != null ? saved.completedSessions : 0;
            pomoState.running = false;
        }
    } catch (e) {}
}

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

// Форматирует секунды в вид "MM:SS". Ручной padding вместо padStart() —
// padStart появился только в Chrome 57, ручной вариант работает везде
function formatPomoTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

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

    const visibleDots = Math.min(pomoSettings.sessionsBeforeLong, pomoDots.length);
    pomoDots.forEach((dot, i) => {
        dot.classList.remove('completed', 'active');
        dot.style.display = i < visibleDots ? 'inline-block' : 'none';
        if (i < pomoState.completedSessions) dot.classList.add('completed');
        if (i === pomoState.completedSessions && pomoState.mode === 'work') dot.classList.add('active');
    });

    document.title = pomoState.running
        ? `${formatPomoTime(pomoState.timeLeft)} — ${pomoState.mode === 'work' ? 'Фокус' : 'Перерыв'}`
        : 'Дашборд | Стартовая';
}

// Двойной звуковой сигнал через Web Audio API.
// Разные частоты для работы (выше) и перерыва (ниже) — легко отличить на слух
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

function switchPomoMode() {
    if (pomoState.mode === 'work') {
        pomoState.completedSessions++;
        if (pomoState.completedSessions >= pomoSettings.sessionsBeforeLong) {
            pomoState.mode = 'longBreak';
            pomoState.timeLeft = pomoState.totalTime = pomoSettings.longBreakMin * 60;
            pomoState.completedSessions = 0;
        } else {
            pomoState.mode = 'shortBreak';
            pomoState.timeLeft = pomoState.totalTime = pomoSettings.shortBreakMin * 60;
        }
    } else {
        pomoState.mode = 'work';
        pomoState.timeLeft = pomoState.totalTime = pomoSettings.workMin * 60;
    }
}

// Тик: время считается от таймстампа (endTime - Date.now()), а не декрементом.
// Даже если браузер «заморозил» вкладку, значение будет точным
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
    savePomoState();
    updatePomoDisplay();
}

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

function resetPomo() {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoState.running = false;
    pomoState.mode = 'work';
    pomoState.timeLeft = pomoState.totalTime = pomoSettings.workMin * 60;
    pomoState.completedSessions = 0;
    savePomoState(true);
    updatePomoDisplay();
}

pomoStartBtn.addEventListener('click', togglePomo);
pomoResetBtn.addEventListener('click', resetPomo);

document.addEventListener('visibilitychange', () => { if (document.hidden) savePomoState(true); });
window.addEventListener('beforeunload', () => savePomoState(true));

const pomoEditToggle = document.getElementById('pomo-edit-toggle');
const pomoModalOverlay = document.getElementById('pomo-modal-overlay');
const pomoModalCancel = document.getElementById('pomo-modal-cancel');
const pomoModalSave = document.getElementById('pomo-modal-save');

function openPomoEditor() {
    document.getElementById('pomo-work-min').value = pomoSettings.workMin;
    document.getElementById('pomo-short-break-min').value = pomoSettings.shortBreakMin;
    document.getElementById('pomo-long-break-min').value = pomoSettings.longBreakMin;
    document.getElementById('pomo-sessions-before-long').value = pomoSettings.sessionsBeforeLong;
    
    document.querySelectorAll('.pomo-setting-row input').forEach(input => input.classList.remove('invalid'));
    
    pomoModalOverlay.classList.add('active');
    setTimeout(() => document.getElementById('pomo-work-min').focus(), 100);
}

function closePomoEditor() {
    pomoModalOverlay.classList.remove('active');
}

function savePomoSettingsFromEditor() {
    const limits = {
        'pomo-work-min': { min: 1, max: 120, default: 25 },
        'pomo-short-break-min': { min: 1, max: 60, default: 5 },
        'pomo-long-break-min': { min: 1, max: 120, default: 15 },
        'pomo-sessions-before-long': { min: 1, max: 10, default: 4 }
    };
    
    let hasError = false;
    const values = {};
    
    Object.keys(limits).forEach(id => {
        const input = document.getElementById(id);
        const limit = limits[id];
        input.classList.remove('invalid');
        
        const raw = input.value.trim();
        const parsed = parseInt(raw, 10);
        
        if (raw === '' || isNaN(parsed) || parsed < limit.min || parsed > limit.max) {
            input.classList.add('invalid');
            hasError = true;
        } else {
            values[id] = parsed;
        }
    });
    
    if (hasError) return;
    
    pomoSettings = {
        workMin: values['pomo-work-min'],
        shortBreakMin: values['pomo-short-break-min'],
        longBreakMin: values['pomo-long-break-min'],
        sessionsBeforeLong: values['pomo-sessions-before-long']
    };
    savePomoSettings(pomoSettings);
    
    if (!pomoState.running) {
        pomoState.mode = 'work';
        pomoState.timeLeft = pomoState.totalTime = pomoSettings.workMin * 60;
        pomoState.completedSessions = 0;
        savePomoState(true);
    }
    
    closePomoEditor();
    updatePomoDisplay();
}

pomoEditToggle.addEventListener('click', openPomoEditor);
pomoModalCancel.addEventListener('click', closePomoEditor);
pomoModalSave.addEventListener('click', savePomoSettingsFromEditor);
pomoModalOverlay.addEventListener('click', (e) => { if (e.target === pomoModalOverlay) closePomoEditor(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pomoModalOverlay.classList.contains('active')) closePomoEditor(); });

// Ограничение длины ввода в числовые поля редактора помодоро.
// HTML-атрибут maxlength не работает с type="number" (спецификация HTML),
// поэтому обрезаем значение через JS при каждом вводе.
// Допустимая длина = количество цифр в атрибуте max (3 для 120, 2 для 60/10).
// Работает везде: десктоп, мобильные, вставка из буфера, автозаполнение.
// Дополнительно валидация в savePomoSettingsFromEditor() отклонит
// значения вне диапазона min/max.
document.querySelectorAll('.pomo-setting-row input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        const max = parseInt(this.max, 10);
        if (!max) return;
        const maxDigits = String(max).length;
        // Разрешаем только цифры, удаляем остальное (для вставки текста)
        this.value = this.value.replace(/[^\d]/g, '').slice(0, maxDigits);
    });
});

loadPomoState();
updatePomoDisplay();