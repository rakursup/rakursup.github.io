// ============================================================
// ПОГОДА — время и погода по Open-Meteo (бесплатно, без ключа)
// ============================================================

// Города, доступные для выбора, сгруппированные по странам
const WEATHER_CITIES = [
  { country: 'Таиланд', cities: [
    { id: 'pattaya', name: 'Паттайя', lat: 12.9236, lon: 100.8825, zone: 'Asia/Bangkok' },
    { id: 'bangkok', name: 'Бангкок', lat: 13.7563, lon: 100.5018, zone: 'Asia/Bangkok' },
    { id: 'phuket', name: 'Пхукет', lat: 7.8804, lon: 98.3923, zone: 'Asia/Bangkok' },
    { id: 'chiangmai', name: 'Чиангмай', lat: 18.7883, lon: 98.9853, zone: 'Asia/Bangkok' }
  ]},
  { country: 'Вьетнам', cities: [
    { id: 'nhatrang', name: 'Нячанг', lat: 12.2585, lon: 109.1967, zone: 'Asia/Ho_Chi_Minh' },
    { id: 'hoian', name: 'Хойан', lat: 15.8801, lon: 108.3380, zone: 'Asia/Ho_Chi_Minh' },
    { id: 'hochiminh', name: 'Хошимин', lat: 10.8231, lon: 106.6297, zone: 'Asia/Ho_Chi_Minh' },
    { id: 'hanoi', name: 'Ханой', lat: 21.0285, lon: 105.8542, zone: 'Asia/Ho_Chi_Minh' }
  ]},
  { country: 'Камбоджа', cities: [
    { id: 'sihanoukville', name: 'Сиануквиль', lat: 10.6253, lon: 103.5234, zone: 'Asia/Phnom_Penh' },
    { id: 'phnompenh', name: 'Пномпень', lat: 11.5564, lon: 104.9282, zone: 'Asia/Phnom_Penh' },
    { id: 'siemreap', name: 'Сиемреап', lat: 13.3671, lon: 103.8448, zone: 'Asia/Phnom_Penh' }
  ]},
  { country: 'Россия', cities: [
    { id: 'arkhangelsk', name: 'Архангельск', lat: 64.5399, lon: 40.5106, zone: 'Europe/Moscow' },
    { id: 'moscow', name: 'Москва', lat: 55.7558, lon: 37.6173, zone: 'Europe/Moscow' },
    { id: 'spb', name: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351, zone: 'Europe/Moscow' },
    { id: 'sochi', name: 'Сочи', lat: 43.6028, lon: 39.7342, zone: 'Europe/Moscow' },
    { id: 'kaliningrad', name: 'Калининград', lat: 54.7104, lon: 20.4522, zone: 'Europe/Kaliningrad' },
    { id: 'ekb', name: 'Екатеринбург', lat: 56.8389, lon: 60.6057, zone: 'Asia/Yekaterinburg' },
    { id: 'novosibirsk', name: 'Новосибирск', lat: 55.0084, lon: 82.9357, zone: 'Asia/Novosibirsk' },
    { id: 'vladivostok', name: 'Владивосток', lat: 43.1155, lon: 131.8855, zone: 'Asia/Vladivostok' },
    { id: 'kamchatka', name: 'Петропавловск-Камчатский', lat: 53.0452, lon: 158.6483, zone: 'Asia/Kamchatka' }
  ]}
];

// Два интервала обновления — обычный и экономичный
const WEATHER_UPDATE_NORMAL = 30 * 60 * 1000;   // 30 минут
const WEATHER_UPDATE_ECO = 4 * 60 * 60 * 1000;  // 4 часа
const WEATHER_FETCH_TIMEOUT = 10000;            // Таймаут запроса, 10 секунд

// Кэширование погоды на случай офлайна (ключи с префиксом экземпляра —
// у каждой локальной папки свой кэш и свои выбранные города)
const WEATHER_CACHE_KEY = storageKey('weather_cache');
const WEATHER_CACHE_TIME_KEY = storageKey('weather_cache_time');
// Хранит выбранные города для трёх слотов
const WEATHER_CITIES_KEY = storageKey('weather_cities');

// Иконки по коду погоды WMO
const WEATHER_ICON_MAP = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

// Состояние виджета: города в слотах, кэш ответов, идущие запросы, таймеры
let weatherSlots = [
  { cityId: 'pattaya' },
  { cityId: 'arkhangelsk' },
  { cityId: 'nhatrang' }
];
let weatherCache = {};
let pendingWeatherSlots = new Set();
let weatherTimers = [];

// Форматирует название города (короткое имя + страна)
function formatCityName(city) {
  return city.name;
}

// ===== КЭШ ПОГОДЫ =====
function getWeatherCache() {
  try {
    const s = localStorage.getItem(WEATHER_CACHE_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) { return {}; }
}
function saveWeatherCache() {
  safeSetItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCache));
}
function saveWeatherCacheTime() {
  safeSetItem(WEATHER_CACHE_TIME_KEY, String(Date.now()));
}
function getWeatherCacheTime() {
  const t = localStorage.getItem(WEATHER_CACHE_TIME_KEY);
  return t ? parseInt(t, 10) : 0;
}
// Кэш свежий, если с последнего обновления прошло меньше обычного интервала
function isWeatherCacheFresh() {
  const t = getWeatherCacheTime();
  return t && (Date.now() - t) < WEATHER_UPDATE_NORMAL;
}

// ===== ВЫБРАННЫЕ ГОРОДА =====
function loadSelectedCities() {
  try {
    const s = localStorage.getItem(WEATHER_CITIES_KEY);
    if (s) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length === 3) {
        weatherSlots = arr.map(function (id) { return { cityId: id }; });
      }
    }
  } catch (e) {}
}
function saveSelectedCities() {
  const ids = weatherSlots.map(function (s) { return s.cityId; });
  safeSetItem(WEATHER_CITIES_KEY, JSON.stringify(ids));
}
// Находит город по id для слота
function getSlotCity(slot) {
  const cityId = weatherSlots[slot].cityId;
  for (let i = 0; i < WEATHER_CITIES.length; i++) {
    for (let j = 0; j < WEATHER_CITIES[i].cities.length; j++) {
      if (WEATHER_CITIES[i].cities[j].id === cityId) return WEATHER_CITIES[i].cities[j];
    }
  }
  return WEATHER_CITIES[0].cities[0];
}

// ===== ЗАГРУЗКА ПОГОДЫ =====
async function fetchWeather(slot) {
  const city = getSlotCity(slot);
  const container = document.getElementById('weather-' + slot);
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, WEATHER_FETCH_TIMEOUT);
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat +
      '&longitude=' + city.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&timezone=' + encodeURIComponent(city.zone);
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    renderWeatherSlot(slot, data.current, city);
    // Сохраняем в кэш на случай офлайна
    weatherCache[city.id] = data.current;
    saveWeatherCache();
    saveWeatherCacheTime();
  } catch (e) {
    // Нет связи — пробуем показать кэш для этого города
    const cached = getWeatherCache()[city.id];
    if (cached) {
      renderWeatherSlot(slot, cached, city);
      return;
    }
    container.innerHTML = '<span class="weather-loading">Нет данных</span>';
  } finally {
    clearTimeout(timer);
  }
}

// ===== ОТРИСОВКА =====
function renderWeatherSlot(slot, current, city) {
  const container = document.getElementById('weather-' + slot);
  const icon = WEATHER_ICON_MAP[current.weather_code] || '🌡️';
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const humidity = Math.round(current.relative_humidity_2m);
  const wind = Math.round(current.wind_speed_10m);
  container.innerHTML =
    '<div class="weather-main">' +
      '<span class="weather-icon">' + icon + '</span>' +
      '<span class="weather-temp">' + (temp > 0 ? '+' : '') + temp + '°</span>' +
    '</div>' +
    '<div class="weather-desc" title="' + (city.name) + '">' + (city.name) + '</div>' +
    '<div class="weather-details">' +
      '<span title="Ощущается как ' + feels + '°">🌡 ' + feels + '°</span>' +
      '<span title="Влажность">💧 ' + humidity + '%</span>' +
      '<span title="Ветер">🌬 ' + wind + '</span>' +
    '</div>';
}

// Часы в каждом слоте идут в часовом поясе своего города
function updateClocks() {
  for (let slot = 0; slot < 3; slot++) {
    const el = document.getElementById('clock-' + slot);
    if (!el) continue;
    const city = getSlotCity(slot);
    try {
      el.textContent = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: city.zone
      }).format(new Date());
    } catch (e) {
      el.textContent = '--:--';
    }
  }
}

// ===== ТАЙМЕРЫ ОБНОВЛЕНИЯ =====
function startWeatherTimer() {
  stopWeatherTimer();
  const interval = document.body.classList.contains('eco-active')
    ? WEATHER_UPDATE_ECO
    : WEATHER_UPDATE_NORMAL;
  weatherTimers.push(setInterval(function () {
    for (let slot = 0; slot < 3; slot++) fetchWeather(slot);
  }, interval));
}
function stopWeatherTimer() {
  weatherTimers.forEach(function (t) { clearInterval(t); });
  weatherTimers = [];
}

// ===== СЕЛЕКТ ВЫБОРА ГОРОДА =====
function renderWeatherCityTrigger(slot) {
  const item = document.querySelector('.weather-item[data-slot="' + slot + '"]');
  if (!item) return;
  const nameEl = item.querySelector('.weather-city-name');
  const city = getSlotCity(slot);
  nameEl.textContent = city.name;
  nameEl.title = city.name;
}

// Строит список городов с заголовками стран для селекта слота
function buildWeatherCityOptions(slot) {
  const item = document.querySelector('.weather-item[data-slot="' + slot + '"]');
  if (!item) return;
  const list = item.querySelector('.weather-city-options');
  let html = '';
  const currentId = weatherSlots[slot].cityId;
  WEATHER_CITIES.forEach(function (group) {
    html += '<li class="country-label">' + group.country + '</li>';
    group.cities.forEach(function (c) {
      const active = (c.id === currentId) ? ' active-city' : '';
      html += '<li class="weather-city-option' + active + '" data-city="' + c.id + '" title="' + c.name + '">' + c.name + '</li>';
    });
  });
  list.innerHTML = html;
}

function openWeatherCityOptions(slot) {
  closeWeatherCityOptions();
  const item = document.querySelector('.weather-item[data-slot="' + slot + '"]');
  if (!item) return;
  buildWeatherCityOptions(slot);
  const list = item.querySelector('.weather-city-options');
  const trigger = item.querySelector('.weather-city-trigger');
  list.classList.add('active');
  trigger.setAttribute('aria-expanded', 'true');
  list.dataset.openSlot = slot;
}
function closeWeatherCityOptions() {
  document.querySelectorAll('.weather-city-options.active').forEach(function (l) {
    l.classList.remove('active');
    const item = l.closest('.weather-item');
    if (item) item.querySelector('.weather-city-trigger').setAttribute('aria-expanded', 'false');
  });
}

// ===== ПОЛНОЕ ОБНОВЛЕНИЕ (кнопка) =====
// Обновляет погоду по кнопке без перезагрузки страницы.
// Возвращает Promise — его ждёт кнопка, чтобы остановить вращение иконки
async function refreshWeather() {
  const promises = [];
  for (let slot = 0; slot < 3; slot++) {
    pendingWeatherSlots.add(slot);
    promises.push(fetchWeather(slot).then(function () {
      pendingWeatherSlots.delete(slot);
    }));
  }
  await Promise.all(promises);
  // Перезапускаем таймер, чтобы следующий авто-обновление пошло с этого момента
  startWeatherTimer();
}

// ===== ОБРАБОТЧИКИ =====
// Кнопка обновления погоды
const weatherRefreshBtn = document.getElementById('weather-refresh');
function stopWeatherSpin() {
  weatherRefreshBtn.classList.remove('spinning');
}
weatherRefreshBtn.addEventListener('click', function () {
  if (weatherRefreshBtn.classList.contains('spinning')) return;
  weatherRefreshBtn.classList.add('spinning');
  refreshWeather().then(stopWeatherSpin, stopWeatherSpin);
});

// Клики по триггерам выбора города в каждом слоте
document.querySelectorAll('.weather-item').forEach(function (item) {
  const slot = parseInt(item.dataset.slot, 10);
  const trigger = item.querySelector('.weather-city-trigger');
  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const list = item.querySelector('.weather-city-options');
    if (list.classList.contains('active')) closeWeatherCityOptions();
    else openWeatherCityOptions(slot);
  });
  // Выбор города из списка
  const list = item.querySelector('.weather-city-options');
  list.addEventListener('click', function (e) {
    e.stopPropagation();
    const opt = e.target.closest('.weather-city-option');
    if (!opt) return;
    weatherSlots[slot].cityId = opt.dataset.city;
    saveSelectedCities();
    renderWeatherCityTrigger(slot);
    fetchWeather(slot);
    closeWeatherCityOptions();
  });
});

// Клик мимо селекта — закрываем
document.addEventListener('click', function () {
  closeWeatherCityOptions();
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initWeather() {
  loadSelectedCities();
  weatherCache = getWeatherCache();
  for (let slot = 0; slot < 3; slot++) {
    renderWeatherCityTrigger(slot);
    fetchWeather(slot);
  }
  updateClocks();
  setInterval(updateClocks, 1000);
  startWeatherTimer();
}

// Эко-режим: пересоздаём таймер с новым интервалом
window.addEventListener('ecomode-changed', function () {
  startWeatherTimer();
});

initWeather();