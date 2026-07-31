// ============================================================
// ОНЛАЙН-РАДИО — аудиоплеер с 7 станциями
// ============================================================
// Список радиостанций
// ⚠️ Jazz FM — поток http://: при размещении страницы по HTTPS браузер
// заблокирует его (mixed content). Relax FM отдаёт HLS (.m3u8) по HTTPS —
// нативный <audio> воспроизводит его только в Safari, в Chrome/Firefox
// нужен hls.js? (без него станция пропускается автопереключением).
const RADIO_STATIONS = [
  { name: 'Relax FM', url: 'https://hls-01-gpm.hostingradio.ru/relaxfm495/playlist.m3u8' },
  { name: 'Record Chill', url: 'https://radiorecord.hostingradio.ru/chil96.aacp' },
  { name: 'Monte Carlo', url: 'https://montecarlo.hostingradio.ru/montecarlo128.mp3' },
  { name: 'Jazz FM', url: 'http://nashe1.hostingradio.ru/jazz-128.mp3' },
  { name: 'SomaFM Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { name: 'SomaFM Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { name: 'SomaFM Secret Agent', url: 'https://ice1.somafm.com/secretagent-128-mp3' }
];
let currentStation = 0, isPlaying = false, errorRetryTimer = null, consecutiveErrors = 0;

// Переименована (isRadioEco), чтобы не конфликтовать с app.js:
// в eco-режиме отключаем автопереключение станций при ошибках (экономим трафик)
let isRadioEco = document.body.classList.contains('eco-active');

// Слушаем переключение режима из app.js
window.addEventListener('ecomode-changed', (e) => {
    isRadioEco = e.detail.enabled;
    // Если в eco-режиме и есть таймер переключения — отменяем его
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
      // «??» не понимают старые браузеры (до Chrome 80) — равноценная проверка != null
      volumeSlider.value = saved.volume != null ? saved.volume : 50;
      audioEl.volume = (saved.volume != null ? saved.volume : 50) / 100;
    }
  } catch (e) {}
  stationName.textContent = RADIO_STATIONS[currentStation].name;
}

// Сохраняет состояние с задержкой (чтобы не писать в localStorage слишком часто)
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

// Обработчик ошибок потока: переключает на следующую станцию
function handleStreamError() {
  // Плеер без источника (ручная остановка) — не переключаем
  if (!audioEl.getAttribute('src')) return;
  consecutiveErrors++;

  // В eco-режиме не переключаем автоматически (экономим трафик)
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
  if (isPlaying) stopRadio();
  else { consecutiveErrors = 0; playCurrentStation(); }
}

function switchStation(delta) {
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
loadRadioState();