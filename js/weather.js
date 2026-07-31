// ============================================================
// ПОГОДА И ЧАСЫ — показывает время и погоду в 3 городах
// ============================================================

// Два интервала обновления — обычный и экономичный
const WEATHER_UPDATE_NORMAL = 30 * 60 * 1000;   // 30 минут
const WEATHER_UPDATE_ECO = 4 * 60 * 60 * 1000;  // 4 часа

// Таймаут запроса: если API не ответил за 10 секунд — прерываем
const WEATHER_FETCH_TIMEOUT = 10000;

// Ключи для сохранения кэша погоды в localStorage
const WEATHER_CACHE_KEY = 'weather_cache';
const WEATHER_CACHE_TIME_KEY = 'weather_cache_time';

// Список городов для часов (с часовыми поясами)
const cities = [
  { id: 'clock-pattaya', zone: 'Asia/Bangkok' },
  { id: 'clock-arkh', zone: 'Europe/Moscow' },
  { id: 'clock-nhatrang', zone: 'Asia/Ho_Chi_Minh' }
];

// Обновляет время в часах (раз в минуту, синхронно с началом минуты —
// секунды на экране не показываются, а минуты переключаются ровно в :00)
function updateClocks() {
  const now = new Date();
  cities.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) el.textContent = new Intl.DateTimeFormat('ru-RU', {
      timeZone: c.zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
  });
}

// Показываем время сразу при загрузке страницы
updateClocks();

// Синхронизация часов с началом минуты.
// Первый тик происходит ровно в :00 секунд ближайшей минуты, дальше — каждые 60 сек.
// Без этого часы могли бы отставать до 59 секунд от реального времени.
let clockInterval = null;
const msToNextMinute = 60000 - (Date.now() % 60000); // миллисекунд до ближайшей минуты
setTimeout(() => {
  updateClocks();
  clockInterval = setInterval(updateClocks, 60000);
}, msToNextMinute);

// ===== ПОГОДА =====
// Города с координатами для API погоды
const wCities = [
  { id: 'pattaya', lat: 12.9236, lon: 100.8825 },
  { id: 'arkh', lat: 64.5401, lon: 40.5433 },
  { id: 'nhatrang', lat: 12.2388, lon: 109.1967 }
];

// Словарь кодов погоды (API возвращает число, мы показываем иконку и текст)
const wCodes = {
  0: { i: '☀️', d: 'Ясно' }, 1: { i: '🌤️', d: 'Малооблачно' }, 2: { i: '⛅', d: 'Облачно' }, 3: { i: '☁️', d: 'Пасмурно' },
  45: { i: '🌫️', d: 'Туман' }, 48: { i: '🌫️', d: 'Изморозь' }, 51: { i: '🌦️', d: 'Лёгкая морось' }, 53: { i: '🌦️', d: 'Морось' },
  55: { i: '🌧️', d: 'Сильная морось' }, 56: { i: '🌧️', d: 'Ледяная морось' }, 57: { i: '🌧️', d: 'Сильная ледяная морось' },
  61: { i: '🌦️', d: 'Небольшой дождь' }, 63: { i: '🌧️', d: 'Дождь' }, 65: { i: '🌧️', d: 'Сильный дождь' },
  66: { i: '🌨️', d: 'Ледяной дождь' }, 67: { i: '🌨️', d: 'Сильный ледяной дождь' }, 71: { i: '🌨️', d: 'Небольшой снег' },
  73: { i: '❄️', d: 'Снег' }, 75: { i: '❄️', d: 'Сильный снег' }, 77: { i: '🌨️', d: 'Снежные зёрна' },
  80: { i: '🌦️', d: 'Ливень' }, 81: { i: '🌧️', d: 'Сильный ливень' }, 82: { i: '⛈️', d: 'Очень сильный ливень' },
  85: { i: '🌨️', d: 'Снегопад' }, 86: { i: '❄️', d: 'Сильный снегопад' }, 95: { i: '⛈️', d: 'Гроза' },
  96: { i: '⛈️', d: 'Гроза с градом' }, 99: { i: '⛈️', d: 'Сильная гроза с градом' }
};

// Единая функция отрисовки погоды на странице
// (используется и при загрузке кэша, и при получении свежих данных)
function displayWeather(cityId, data) {
    const t = Math.round(data.temperature_2m);
    const w = Math.round(data.wind_speed_10m);
    const h = data.relative_humidity_2m;
    const info = wCodes[data.weather_code] || { i: '🌡️', d: 'Нет данных' };
    document.getElementById(`weather-${cityId}`).innerHTML =
        `<div class="weather-main"><span class="weather-icon">${info.i}</span><span class="weather-temp">${t}°C</span></div>` +
        `<div class="weather-desc">${info.d}</div>` +
        `<div class="weather-details"><span>💨 ${w}</span><span>💧 ${h}%</span></div>`;
}

// Мгновенно показывает сохранённую погоду из localStorage
function loadWeatherCache() {
    try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            wCities.forEach(c => {
                if (data[c.id]) displayWeather(c.id, data[c.id]);
            });
        }
    } catch (e) {}
}

// Сохраняет полученные данные в кэш
function saveWeatherCache(data) {
    try {
        safeSetItem(WEATHER_CACHE_KEY, JSON.stringify(data));
        safeSetItem(WEATHER_CACHE_TIME_KEY, String(Date.now()));
    } catch (e) {}
}

// Запрашивает погоду с API open-meteo.com (бесплатно, без ключа)
async function fetchWeather(c) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`, { signal: controller.signal });
    const d = await r.json();
    // Используем единую функцию отрисовки
    displayWeather(c.id, d.current);
    // Возвращаем данные для сохранения в кэш
    return { id: c.id, data: d.current };
  } catch (e) {
    // Показываем ошибку только если кэша нет (чтобы не перекрывать сохранённые данные)
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached || !JSON.parse(cached)[c.id]) {
        document.getElementById(`weather-${c.id}`).innerHTML = '<span class="weather-loading">Нет данных</span>';
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Загружает погоду для всех городов и сохраняет в кэш
async function fetchAllWeather() {
    const allData = {};
    for (const c of wCities) {
        const result = await fetchWeather(c);
        if (result) allData[result.id] = result.data;
    }
    if (Object.keys(allData).length > 0) {
        saveWeatherCache(allData);
    }
}

// Выбирает интервал в зависимости от экономичного режима
function getUpdateInterval() {
    return document.body.classList.contains('eco-active')
        ? WEATHER_UPDATE_ECO
        : WEATHER_UPDATE_NORMAL;
}

// Запускаем таймер с актуальным интервалом
let weatherInterval = setInterval(fetchAllWeather, getUpdateInterval());

// Слушаем переключение экономичного режима из app.js
// и пересоздаём таймер с новым интервалом
window.addEventListener('ecomode-changed', () => {
    clearInterval(weatherInterval);
    weatherInterval = setInterval(fetchAllWeather, getUpdateInterval());
});

// Сначала мгновенно показываем кэш, потом тянем актуальные данные
loadWeatherCache();
fetchAllWeather();