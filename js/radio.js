// ============================================================
// ОНЛАЙН-РАДИО — аудиоплеер с редактируемыми станциями
// ============================================================
// Ключ для хранения станций в localStorage (с префиксом экземпляра)
const RADIO_STATIONS_KEY = storageKey('radio_stations');
const MAX_STATIONS = 7;
const MAX_STATION_NAME_LENGTH = 20;
const MAX_STATION_URL_LENGTH = 300;

// Загружает станции из localStorage (или пустой массив по умолчанию)
function loadRadioStations() {
    try {
        const saved = localStorage.getItem(RADIO_STATIONS_KEY);
        if (saved) {
            const stations = JSON.parse(saved);
            if (Array.isArray(stations)) {
                // Валидация: убираем битые записи
                return stations.filter(s => s && typeof s.name === 'string' && typeof s.url === 'string');
            }
        }
    } catch (e) {}
    return [];
}

// Сохраняет станции в localStorage
function saveRadioStations(stations) {
    safeSetItem(RADIO_STATIONS_KEY, JSON.stringify(stations));
}

// Список радиостанций (загружается из localStorage)
let RADIO_STATIONS = loadRadioStations();

let currentStation = 0, isPlaying = false, errorRetryTimer = null, consecutiveErrors = 0;

// Переименована (isRadioEco), чтобы не конфликтовать с app.js:
// в eco-режиме отключаем автопереключение станций при ошибках (экономим трафик)
let isRadioEco = document.body.classList.contains('eco-active');

// Слушаем переключение режима из app.js
window.addEventListener('ecomode-changed', (e) => {
    isRadioEco = e.detail.enabled;
    if (isRadioEco && errorRetryTimer) {
        clearTimeout(errorRetryTimer);
        errorRetryTimer = null;
    }
});

// DOM-элементы плеера
const audioEl = document.getElementById('radio-audio');
const playBtn = document.getElementById('radio-play');
const playIcon = document.getElementById('radio-play-icon');
const prevBtn = document.getElementById('radio-prev');
const nextBtn = document.getElementById('radio-next');
const volumeSlider = document.getElementById('radio-volume');
const stationName = document.getElementById('radio-name');
const equalizer = document.getElementById('radio-eq');
const errorEl = document.getElementById('radio-error');

// SVG-пути для иконок Play/Pause
const PLAY_PATH = 'M8 5v14l11-7z';
const PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

// Загружает сохранённую станцию и громкость
function loadRadioState() {
    try {
        const saved = JSON.parse(localStorage.getItem(RADIO_STORAGE_KEY));
        if (saved) {
            currentStation = Math.min(saved.station || 0, RADIO_STATIONS.length - 1);
            volumeSlider.value = saved.volume != null ? saved.volume : 50;
            audioEl.volume = (saved.volume != null ? saved.volume : 50) / 100;
        }
    } catch (e) {}
    
    // Если станций нет — показываем подсказку
    if (RADIO_STATIONS.length === 0) {
        stationName.textContent = 'Добавьте радиостанцию';
        playBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        stationName.textContent = RADIO_STATIONS[currentStation].name;
        playBtn.disabled = false;
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    }
}

// Сохраняет состояние с задержкой
const debouncedSaveRadio = debounce(() => {
    safeSetItem(RADIO_STORAGE_KEY, JSON.stringify({ station: currentStation, volume: parseInt(volumeSlider.value) }));
}, 300);
function saveRadioState() { debouncedSaveRadio(); }

// Меняет иконку Play/Pause и анимацию эквалайзера
function updatePlayButton() {
    playIcon.innerHTML = `<path d="${isPlaying ? PAUSE_PATH : PLAY_PATH}"/>`;
    playBtn.classList.toggle('playing', isPlaying);
    equalizer.classList.toggle('active', isPlaying);
}

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    equalizer.classList.remove('active');
}
function hideError() { errorEl.style.display = 'none'; errorEl.textContent = ''; }

// Останавливает радио
function stopRadio() {
    clearTimeout(errorRetryTimer);
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    isPlaying = false;
    updatePlayButton();
}

// Запускает текущую станцию
function playCurrentStation() {
    if (RADIO_STATIONS.length === 0) {
        showError('Добавьте радиостанцию');
        return;
    }
    clearTimeout(errorRetryTimer);
    hideError();
    stationName.textContent = RADIO_STATIONS[currentStation].name;
    audioEl.src = RADIO_STATIONS[currentStation].url;
    audioEl.load();
    const playPromise = audioEl.play();
    if (playPromise) {
        equalizer.classList.add('active');
        playPromise.then(() => {
            isPlaying = true;
            consecutiveErrors = 0;
            updatePlayButton();
        }).catch(err => {
            if (err.name === 'NotAllowedError') {
                equalizer.classList.remove('active');
                isPlaying = false;
                updatePlayButton();
            } else if (err.name === 'AbortError') {
                // play() прерван сменой src — это не ошибка потока
            } else {
                handleStreamError();
            }
        });
    }
    saveRadioState();
}

// Обработчик ошибок потока
function handleStreamError() {
    if (!audioEl.getAttribute('src')) return;
    consecutiveErrors++;

    if (isRadioEco) {
        showError('Поток недоступен. Переключите станцию вручную.');
        stopRadio();
        return;
    }

    if (consecutiveErrors >= RADIO_STATIONS.length) {
        showError('Все станции недоступны');
        stopRadio();
        return;
    }
    showError(`Ошибка потока. Переключение... (${consecutiveErrors}/${RADIO_STATIONS.length})`);
    errorRetryTimer = setTimeout(() => {
        currentStation = (currentStation + 1) % RADIO_STATIONS.length;
        playCurrentStation();
    }, 3000);
}

function togglePlay() {
    if (RADIO_STATIONS.length === 0) {
        showError('Добавьте радиостанцию');
        return;
    }
    if (isPlaying) stopRadio();
    else { consecutiveErrors = 0; playCurrentStation(); }
}

function switchStation(delta) {
    if (RADIO_STATIONS.length === 0) return;
    clearTimeout(errorRetryTimer);
    consecutiveErrors = 0;
    currentStation = ((currentStation + delta) % RADIO_STATIONS.length + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    stationName.textContent = RADIO_STATIONS[currentStation].name;
    saveRadioState();
    if (isPlaying) playCurrentStation();
    else hideError();
}

// Привязываем обработчики к кнопкам
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => switchStation(-1));
nextBtn.addEventListener('click', () => switchStation(1));
volumeSlider.addEventListener('input', function() { audioEl.volume = this.value / 100; saveRadioState(); });
audioEl.addEventListener('error', handleStreamError);
audioEl.addEventListener('stalled', () => { if (isPlaying) equalizer.classList.add('active'); });
audioEl.addEventListener('waiting', () => { if (isPlaying) equalizer.classList.add('active'); });
audioEl.addEventListener('playing', () => { hideError(); isPlaying = true; consecutiveErrors = 0; updatePlayButton(); });

// ===== РЕДАКТОР РАДИОСТАНЦИЙ =====
const radioEditToggle = document.getElementById('radio-edit-toggle');
const radioModalOverlay = document.getElementById('radio-modal-overlay');
const radioModalCancel = document.getElementById('radio-modal-cancel');
const radioModalSave = document.getElementById('radio-modal-save');
const radioStationsEditor = document.getElementById('radio-stations-editor');

// Генерирует HTML редактора станций
function renderRadioEditor() {
    radioStationsEditor.innerHTML = '';
    for (let i = 0; i < MAX_STATIONS; i++) {
        const station = RADIO_STATIONS[i] || { name: '', url: '' };
        const row = document.createElement('div');
        row.className = 'radio-station-row';
        row.innerHTML = `
            <span class="station-number">${i + 1}</span>
            <input type="text" class="station-name-input" 
                   placeholder="Название" 
                   value="${escapeHtml(station.name)}" 
                   maxlength="${MAX_STATION_NAME_LENGTH}"
                   title="Максимум ${MAX_STATION_NAME_LENGTH} символов">
            <input type="text" class="station-url-input" 
                   placeholder="URL потока" 
                   value="${escapeHtml(station.url)}" 
                   maxlength="${MAX_STATION_URL_LENGTH}"
                   title="Максимум ${MAX_STATION_URL_LENGTH} символов">
        `;
        radioStationsEditor.appendChild(row);
    }
}

// Открывает модальное окно
function openRadioEditor() {
    renderRadioEditor();
    radioModalOverlay.classList.add('active');
    // Фокус на первое поле
    const firstInput = radioStationsEditor.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

// Закрывает модальное окно
function closeRadioEditor() {
    radioModalOverlay.classList.remove('active');
}

// Сохраняет станции из модального окна
function saveStationsFromEditor() {
    const nameInputs = radioStationsEditor.querySelectorAll('.station-name-input');
    const urlInputs = radioStationsEditor.querySelectorAll('.station-url-input');
    const newStations = [];
    let hasError = false;

    // Снимаем класс invalid со всех полей
    nameInputs.forEach(input => input.classList.remove('invalid'));
    urlInputs.forEach(input => input.classList.remove('invalid'));

    for (let i = 0; i < MAX_STATIONS; i++) {
        const name = nameInputs[i].value.trim();
        const url = urlInputs[i].value.trim();

        // Пропускаем полностью пустые строки
        if (!name && !url) continue;

        // Валидация: если есть одно поле, должно быть и второе
        if (name && !url) {
            urlInputs[i].classList.add('invalid');
            urlInputs[i].focus();
            hasError = true;
            continue;
        }
        if (!name && url) {
            nameInputs[i].classList.add('invalid');
            nameInputs[i].focus();
            hasError = true;
            continue;
        }

        // Проверка URL через sanitizeUrl
        const sanitizedUrl = sanitizeUrl(url);
        if (sanitizedUrl === '#') {
            urlInputs[i].classList.add('invalid');
            urlInputs[i].focus();
            hasError = true;
            continue;
        }

        newStations.push({ name: name, url: sanitizedUrl });
    }

    if (hasError) return;

    // Сохраняем и обновляем
    RADIO_STATIONS = newStations;
    saveRadioStations(newStations);
    
    // Если текущая станция выходит за пределы — сбрасываем на 0
    if (currentStation >= newStations.length) {
        currentStation = 0;
    }
    
    closeRadioEditor();
    loadRadioState(); // Обновляем UI
    
    // Если играем — перезапускаем с новой станцией
    if (isPlaying && newStations.length > 0) {
        playCurrentStation();
    } else if (newStations.length === 0) {
        stopRadio();
    }
}

// Обработчики модального окна
radioEditToggle.addEventListener('click', openRadioEditor);
radioModalCancel.addEventListener('click', closeRadioEditor);
radioModalSave.addEventListener('click', saveStationsFromEditor);
radioModalOverlay.addEventListener('click', (e) => { if (e.target === radioModalOverlay) closeRadioEditor(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && radioModalOverlay.classList.contains('active')) closeRadioEditor(); });

loadRadioState();