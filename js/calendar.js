// ============================================================
// КАЛЕНДАРЬ — текущий месяц с навигацией + заметки на день
// ============================================================

const calGrid = document.getElementById('cal-grid');
const calMonthYear = document.getElementById('cal-current-month-year');
const calPrevBtn = document.getElementById('cal-prev-month');
const calNextBtn = document.getElementById('cal-next-month');
const calEditToggle = document.getElementById('cal-edit-toggle');
let currentCalDate = new Date();
let calEditing = false; // режим редактирования заметок

// ===== ЗАМЕТКИ =====
// Ключ с префиксом экземпляра (storageKey из utils.js) — у каждой локальной
// папки свои заметки календаря
const CAL_NOTES_KEY = storageKey('calendar_notes');
const CAL_NOTES_TTL_DAYS = 60; // автоочистка: через 60 дней после дня записи

let calNotes = loadNotes();

function loadNotes() {
  try {
    const s = localStorage.getItem(CAL_NOTES_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) { return {}; }
}
function saveNotes() {
  safeSetItem(CAL_NOTES_KEY, JSON.stringify(calNotes));
}

// Ключ даты — локальный (не UTC), формат ГГГГ-ММ-ДД.
// Без padStart — его нет в старых браузерах
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateKey(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }

// Автоочистка: удаляем записи, у которых день наступил больше 60 дней назад.
// Будущие записи не трогаются. Запускается при загрузке
function cleanupExpiredNotes() {
  const cutoff = Date.now() - CAL_NOTES_TTL_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const key in calNotes) {
    const p = key.split('-');
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (d.getTime() < cutoff) { delete calNotes[key]; changed = true; }
  }
  if (changed) saveNotes();
}

// Доступ для экспорта/импорта (использует app.js)
window.getCalendarNotes = function () { return calNotes; };
window.setCalendarNotes = function (obj) {
  calNotes = (obj && typeof obj === 'object') ? obj : {};
  saveNotes();
  renderCalendar(currentCalDate);
};

// ===== ОТРИСОВКА =====
function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = вс
  const today = new Date();

  const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });
  calMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year;
  calGrid.innerHTML = '';

  const leadDays = (firstDay + 6) % 7; // неделя с понедельника
  // Всегда 42 ячейки (6 недель) — высота блока постоянная
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(year, month, i - leadDays + 1);
    const key = dateKey(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = cellDate.getDate();
    dayCell.dataset.date = key;

    if (cellDate.getMonth() !== month) dayCell.classList.add('other-month');

    const isToday = (today.getFullYear() === cellDate.getFullYear() &&
                     today.getMonth() === cellDate.getMonth() &&
                     today.getDate() === cellDate.getDate());
    if (isToday) dayCell.classList.add('today');

    const note = calNotes[key];
    if (note) {
      dayCell.classList.add('has-note');
      dayCell.title = note; // наведение (десктоп) показывает текст записи
      // Цвет рамки: сегодня — красная, прошедший день — серая, будущий — зелёная
      if (isToday) {
        dayCell.classList.add('note-today');
      } else {
        const cellDay = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (cellDay < todayDay) dayCell.classList.add('note-past');
      }
    }
    calGrid.appendChild(dayCell);
  }
}

// ===== РЕЖИМ РЕДАКТИРОВАНИЯ =====
calEditToggle.addEventListener('click', () => {
  calEditing = !calEditing;
  calEditToggle.classList.toggle('active', calEditing);
  calGrid.classList.toggle('editing', calEditing);
});

// Клик по дню: в режиме правки — редактор, в обычном — просмотр записи
// (тач/клик). Дни без записи в обычном режиме не реагируют
calGrid.addEventListener('click', (e) => {
  const cell = e.target.closest('.calendar-day');
  if (!cell) return;
  const key = cell.dataset.date;
  if (calEditing) openCalModal(key, 'edit');
  else if (calNotes[key]) openCalModal(key, 'view');
});

// ===== МОДАЛКА ЗАМЕТКИ =====
const calOverlay = document.getElementById('cal-modal-overlay');
const calModalTitle = document.getElementById('cal-modal-title');
const calModalView = document.getElementById('cal-modal-view');
const calModalInput = document.getElementById('cal-modal-input');
const calModalSave = document.getElementById('cal-modal-save');
const calModalDelete = document.getElementById('cal-modal-delete');
const calModalCancel = document.getElementById('cal-modal-cancel');
let calModalKey = null;

// «15 августа 2026» (без «г.»)
function formatNoteDate(key) {
  const p = key.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2])
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '');
}

function openCalModal(key, mode) {
  calModalKey = key;
  const note = calNotes[key] || '';
  calModalTitle.textContent = 'Заметка на ' + formatNoteDate(key);

  const isEdit = mode === 'edit';
  calModalView.style.display = isEdit ? 'none' : 'block';
  calModalInput.style.display = isEdit ? 'block' : 'none';
  calModalSave.style.display = isEdit ? '' : 'none';
  calModalDelete.style.display = (isEdit && note) ? '' : 'none';
  calModalCancel.textContent = isEdit ? 'Отмена' : 'Закрыть';

  if (isEdit) calModalInput.value = note;
  else calModalView.textContent = note;

  calOverlay.classList.add('active');
  if (isEdit) calModalInput.focus();
}

function closeCalModal() {
  calOverlay.classList.remove('active');
  calModalKey = null;
}

calModalSave.addEventListener('click', () => {
  // cleanNoteText (utils.js) убирает невидимые/управляющие символы
  const text = cleanNoteText(calModalInput.value);
  if (text) calNotes[calModalKey] = text;
  else delete calNotes[calModalKey]; // пусто — считаем удалением
  saveNotes();
  renderCalendar(currentCalDate);
  closeCalModal();
});

calModalDelete.addEventListener('click', () => {
  delete calNotes[calModalKey];
  saveNotes();
  renderCalendar(currentCalDate);
  closeCalModal();
});

calModalCancel.addEventListener('click', closeCalModal);
calOverlay.addEventListener('click', (e) => { if (e.target === calOverlay) closeCalModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && calOverlay.classList.contains('active')) closeCalModal();
});
calModalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') calModalSave.click();
});

// ===== НАВИГАЦИЯ =====
calPrevBtn.addEventListener('click', () => {
  currentCalDate.setDate(1); // защита от переполнения коротких месяцев
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar(currentCalDate);
});
calNextBtn.addEventListener('click', () => {
  currentCalDate.setDate(1);
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar(currentCalDate);
});

// ===== СТАРТ =====
cleanupExpiredNotes();
renderCalendar(currentCalDate);