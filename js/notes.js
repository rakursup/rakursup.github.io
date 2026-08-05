// ============================================================
// БЫСТРЫЕ ЗАМЕТКИ — сохраняются автоматически при наборе
// ============================================================
const notesInput = document.getElementById('notes-input');
const notesStatus = document.getElementById('notes-status');
const notesClearBtn = document.getElementById('notes-clear');
const notesCounter = document.getElementById('notes-counter'); // Счётчик символов

// Максимальное количество символов в заметках
const MAX_NOTES_LENGTH = 1000;
// Физический лимит поля (на случай, если в HTML нет атрибута maxlength)
notesInput.maxLength = MAX_NOTES_LENGTH;

// Обновляет счётчик и меняет цвет при приближении к лимиту
function updateCounter() {
  const current = notesInput.value.length;
  notesCounter.textContent = `${current} / ${MAX_NOTES_LENGTH}`;
  notesCounter.classList.remove('warning', 'danger');
  if (current >= MAX_NOTES_LENGTH) {
    notesCounter.classList.add('danger');       // Красный — лимит достигнут
  } else if (current >= MAX_NOTES_LENGTH * 0.9) {
    notesCounter.classList.add('warning');      // Оранжевый — больше 90% лимита
  }
}

// Сохраняет заметки с задержкой 500мс (чтобы не писать при каждом нажатии клавиши).
// Во время глобального сброса запись блокируется флагом __dashboardResetInProgress.
const debouncedSaveNotes = debounce(() => {
  if (window.__dashboardResetInProgress) return;

  safeSetItem(NOTES_KEY, notesInput.value);
  notesStatus.textContent = 'Сохранено';
  notesStatus.classList.remove('saving');
}, 500);

// Загружает заметки при открытии страницы
function loadNotes() {
  const saved = localStorage.getItem(NOTES_KEY);
  if (saved !== null) notesInput.value = saved.slice(0, MAX_NOTES_LENGTH);
  updateCounter();
}

// При вводе текста — показываем "Сохранение..." и запускаем отложенное сохранение
notesInput.addEventListener('input', () => {
  // Страховка от вставки сверх лимита
  if (notesInput.value.length > MAX_NOTES_LENGTH) {
    notesInput.value = notesInput.value.slice(0, MAX_NOTES_LENGTH);
  }
  updateCounter();
  notesStatus.textContent = 'Сохранение...';
  notesStatus.classList.add('saving');
  debouncedSaveNotes();
});

// Кнопка очистки заметок (с подтверждением)
notesClearBtn.addEventListener('click', () => {
  if (notesInput.value.trim() === '') return;
  if (confirm('Очистить все заметки?')) {
    notesInput.value = '';
    localStorage.removeItem(NOTES_KEY);
    notesStatus.textContent = 'Очищено';
    notesStatus.classList.remove('saving');
    updateCounter();
    setTimeout(() => { notesStatus.textContent = 'Сохранено'; }, 1500);
  }
});
loadNotes();