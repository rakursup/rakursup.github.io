// ============================================================
// ПОГОДА И ЧАСЫ — 3 слота с выбором города из списка
// ============================================================

// Интервалы обновления погоды
const WEATHER_UPDATE_NORMAL = 30 * 60 * 1000;   // 30 минут
const WEATHER_UPDATE_ECO = 4 * 60 * 60 * 1000;  // 4 часа

// Таймаут запроса к API
const WEATHER_FETCH_TIMEOUT = 10000;

// Ключи localStorage
const WEATHER_CACHE_KEY = 'weather_cache';
const WEATHER_CACHE_TIME_KEY = 'weather_cache_time';
const WEATHER_CITIES_KEY = 'weather_cities';

// Города по умолчанию (Паттайя, Архангельск, Нячанг)
const WEATHER_DEFAULTS = ['pattaya', 'arkh', 'nhatrang'];

// ===== БАЗА ГОРОДОВ =====
// Каждый слот привязан к своей стране:
//   слот 0 → Таиланд, слот 1 → Россия, слот 2 → Вьетнам
const CITIES_DB = [
  {
    country: 'Таиланд',
    cities: [
      { id: 'pattaya',    name: 'Паттайя',    icon: '🏖️', lat: 12.9236, lon: 100.8825, zone: 'Asia/Bangkok' },
      { id: 'bangkok',    name: 'Бангкок',    icon: '🏙️', lat: 13.7563, lon: 100.5018, zone: 'Asia/Bangkok' },
      { id: 'phuket',     name: 'Пхукет',     icon: '🏝️', lat: 7.8804,  lon: 98.3923,  zone: 'Asia/Bangkok' },
      { id: 'chiangmai',  name: 'Чиангмай',   icon: '🏔️', lat: 18.7883, lon: 98.9853,  zone: 'Asia/Bangkok' },
      { id: 'krabi',      name: 'Краби',      icon: '🏞️', lat: 8.0863,  lon: 98.9063,  zone: 'Asia/Bangkok' },
      { id: 'samui',      name: 'Самуи',      icon: '🌴', lat: 9.5120,  lon: 100.0136, zone: 'Asia/Bangkok' },
      { id: 'huahin',     name: 'Хуахин',     icon: '⛱️', lat: 12.5707, lon: 99.9588,  zone: 'Asia/Bangkok' },
      { id: 'kochang',    name: 'Ко Чанг',    icon: '🐘', lat: 12.0287, lon: 102.2740, zone: 'Asia/Bangkok' },
      { id: 'kolanta',    name: 'Ко Ланта',   icon: '🏝️', lat: 7.6488,  lon: 99.0375,  zone: 'Asia/Bangkok' },
      { id: 'kolipe',     name: 'Ко Липе',    icon: '🐚', lat: 6.4867,  lon: 99.3000,  zone: 'Asia/Bangkok' }
    ]
  },
  {
    country: 'Россия',
    cities: [
      { id: 'kaliningrad', name: 'Калининград',           icon: '🏰', lat: 54.7104, lon: 20.4522,  zone: 'Europe/Kaliningrad' },
      { id: 'moscow',      name: 'Москва',                icon: '🏛️', lat: 55.7558, lon: 37.6173,  zone: 'Europe/Moscow' },
      { id: 'arkh',        name: 'Архангельск',           icon: '🏔️', lat: 64.5401, lon: 40.5433,  zone: 'Europe/Moscow' },
      { id: 'samara',      name: 'Самара',                icon: '🌊', lat: 53.1959, lon: 50.1002,  zone: 'Europe/Samara' },
      { id: 'ekb',         name: 'Екатеринбург',          icon: '⛰️', lat: 56.8389, lon: 60.6057,  zone: 'Asia/Yekaterinburg' },
      { id: 'omsk',        name: 'Омск',                  icon: '🌾', lat: 54.9885, lon: 73.3242,  zone: 'Asia/Omsk' },
      { id: 'novosibirsk', name: 'Новосибирск',           icon: '🔬', lat: 55.0084, lon: 82.9357,  zone: 'Asia/Novosibirsk' },
      { id: 'irkutsk',     name: 'Иркутск',              icon: '🦭', lat: 52.2978, lon: 104.2964, zone: 'Asia/Irkutsk' },
      { id: 'vladivostok', name: 'Владивосток',           icon: '🚢', lat: 43.1056, lon: 131.8735, zone: 'Asia/Vladivostok' },
      { id: 'kamchatka',   name: 'Петропавловск-Камчатский', icon: '🌋', lat: 53.0446, lon: 158.6483, zone: 'Asia/Kamchatka' }
    ]
  },
  {
    country: 'Вьетнам',
    cities: [
      { id: 'nhatrang',  name: 'Нячанг',    icon: '🌴', lat: 12.2388, lon: 109.1967, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'hanoi',     name: 'Ханой',     icon: '🏯', lat: 21.0285, lon: 105.8542, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'hcm',       name: 'Хошимин',   icon: '🏙️', lat: 10.8231, lon: 106.6297, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'danang',    name: 'Дананг',    icon: '🌉', lat: 16.0544, lon: 108.2022, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'hue',       name: 'Хюэ',       icon: '👑', lat: 16.4637, lon: 107.5909, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'hoian',     name: 'Хойан',     icon: '🏮', lat: 15.8801, lon: 108.3380, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'dalat',     name: 'Далат',     icon: '🌸', lat: 11.9404, lon: 108.4583, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'vungtau',   name: 'Вунгтау',   icon: '⛵', lat: 10.3460, lon: 107.0843, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'phuquoc',   name: 'Фукуок',    icon: '🏝️', lat: 10.2899, lon: 103.9840, zone: 'Asia/Ho_Chi_Minh' },
      { id: 'sapa',      name: 'Сапа',      icon: '🌾', lat: 22.3364, lon: 103.8436, zone: 'Asia/Ho_Chi_Minh' }
    ]
  }
];

// ===== СОСТОЯНИЕ =====
// Текущие города в слотах (массив из 3 id)
var currentCities = loadSelectedCities();

// Читает выбранные города из localStorage (или возвращает дефолт)
function loadSelectedCities() {
  try {
    var saved = localStorage.getItem(WEATHER_CITIES_KEY);
    if (saved) {
      var arr = JSON.parse(saved);
      // Валидация: массив из 3 строк, каждая существует в базе
      if (arr && arr.length === 3) {
        var valid = true;
        for (var i = 0; i < 3; i++) {
          if (!findCity(i, arr[i])) valid = false;
        }
        if (valid) return arr;
      }
    }
  } catch (e) {}
  return WEATHER_DEFAULTS.slice();
}

// Сохраняет текущий выбор в localStorage
function saveSelectedCities() {
  try {
    safeSetItem(WEATHER_CITIES_KEY, JSON.stringify(currentCities));
  } catch (e) {}
}

// Ищет город по id в списке конкретного слота
function findCity(slotIndex, cityId) {
  var list = CITIES_DB[slotIndex].cities;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === cityId) return list[i];
  }
  return null;
}

// Возвращает объект города для слота по его текущему id
function getSlotCity(slotIndex) {
  return findCity(slotIndex, currentCities[slotIndex]);
}

// ===== СЕЛЕКТЫ (выпадающие списки городов) =====

// Строит список опций для слота и заполняет его в DOM.
// Перестраивает только содержимое (innerHTML) и текст триггера —
// клики обрабатывает один делегированный слушатель на .weather-grid,
// поэтому при перестройке списка обработчики не дублируются
function buildCitySelect(slotIndex) {
  var item = document.querySelector('.weather-item[data-slot="' + slotIndex + '"]');
  if (!item) return;
  var optionsList = item.querySelector('.weather-city-options');
  var nameSpan = item.querySelector('.weather-city-name');
  var group = CITIES_DB[slotIndex];
  var activeId = currentCities[slotIndex];

  // Заголовок страны (не кликабельный)
  var html = '<li class="country-label">' + group.country + '</li>';
  for (var i = 0; i < group.cities.length; i++) {
    var c = group.cities[i];
    var cls = c.id === activeId ? ' class="active-city"' : '';
    var fullName = c.icon + ' ' + c.name;
    html += '<li data-id="' + c.id + '"' + cls + ' title="' + fullName + '">' + fullName + '</li>';
  }
  optionsList.innerHTML = html;

  // Обновляем текст и title триггера (полное имя — во всплывающей подсказке)
  var activeCity = getSlotCity(slotIndex);
  if (activeCity) {
    var label = activeCity.icon + ' ' + activeCity.name;
    nameSpan.textContent = label;
    nameSpan.title = label;
  }
}

// Закрывает все открытые селекты
function closeAllSelects() {
  var lists = document.querySelectorAll('.weather-city-options.active');
  for (var i = 0; i < lists.length; i++) {
    lists[i].classList.remove('active');
  }
  var triggers = document.querySelectorAll('.weather-city-trigger');
  for (var j = 0; j < triggers.length; j++) {
    triggers[j].setAttribute('aria-expanded', 'false');
  }
}

// Единый обработчик кликов для всех трёх селектов (делегирование —
// тот же подход, что в app.js для кнопок закладок). Слушатель ставится
// один раз и не дублируется при перестройке списков
document.querySelector('.weather-grid').addEventListener('click', function (e) {
  // Клик по городу в открытом списке
  var li = e.target.closest('li[data-id]');
  if (li) {
    var item = li.closest('.weather-item');
    if (item) selectCity(parseInt(item.dataset.slot, 10), li.dataset.id);
    closeAllSelects();
    return;
  }

  // Клик по триггеру — открыть/закрыть список
  var trigger = e.target.closest('.weather-city-trigger');
  if (trigger) {
    e.stopPropagation();
    var optionsList = trigger.parentElement.querySelector('.weather-city-options');
    var isOpen = optionsList.classList.contains('active');
    closeAllSelects();
    if (!isOpen) {
      optionsList.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
    }
  }
});

// Закрытие по клику вне селекта
document.addEventListener('click', function () {
  closeAllSelects();
});

// Выбор нового города для слота
function selectCity(slotIndex, cityId) {
  if (currentCities[slotIndex] === cityId) return;
  currentCities[slotIndex] = cityId;
  saveSelectedCities();

  // Перестраиваем селект (обновляем галочку и текст)
  buildCitySelect(slotIndex);

  // Обновляем часы и погоду для этого слота
  updateClocks();
  fetchSlotWeather(slotIndex);
}

// ===== ЧАСЫ =====

// Обновляет время во всех трёх слотах
function updateClocks() {
  var now = new Date();
  for (var i = 0; i < 3; i++) {
    var el = document.getElementById('clock-' + i);
    var city = getSlotCity(i);
    if (el && city) {
      el.textContent = new Intl.DateTimeFormat('ru-RU', {
        timeZone: city.zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
    }
  }
}

// Первый показ времени
updateClocks();

// Синхронизация с началом минуты
var clockInterval = null;
var msToNextMinute = 60000 - (Date.now() % 60000);
setTimeout(function () {
  updateClocks();
  clockInterval = setInterval(updateClocks, 60000);
}, msToNextMinute);

// ===== ПОГОДА =====

// Словарь кодов погоды
var wCodes = {
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

// Отрисовка погоды для слота
function displayWeather(slotIndex, data) {
  var t = Math.round(data.temperature_2m);
  var w = Math.round(data.wind_speed_10m);
  var h = data.relative_humidity_2m;
  var info = wCodes[data.weather_code] != null ? wCodes[data.weather_code] : { i: '🌡️', d: 'Нет данных' };
  var el = document.getElementById('weather-' + slotIndex);
  if (el) {
    el.innerHTML =
      '<div class="weather-main"><span class="weather-icon">' + info.i + '</span><span class="weather-temp">' + t + '°C</span></div>' +
      '<div class="weather-desc">' + info.d + '</div>' +
      '<div class="weather-details"><span>💨 ' + w + '</span><span>💧 ' + h + '%</span></div>';
  }
}

// Кэш: мгновенный показ сохранённых данных
function loadWeatherCache() {
  try {
    var cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return;
    var data = JSON.parse(cached);
    for (var i = 0; i < 3; i++) {
      var cityId = currentCities[i];
      if (data[cityId]) displayWeather(i, data[cityId]);
    }
  } catch (e) {}
}

// Сохранение кэша
function saveWeatherCache(data) {
  try {
    safeSetItem(WEATHER_CACHE_KEY, JSON.stringify(data));
    safeSetItem(WEATHER_CACHE_TIME_KEY, String(Date.now()));
  } catch (e) {}
}

// Запрос погоды для одного слота
function fetchSlotWeather(slotIndex) {
  var city = getSlotCity(slotIndex);
  if (!city) return;

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, WEATHER_FETCH_TIMEOUT);

  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto', { signal: controller.signal })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      displayWeather(slotIndex, d.current);
      // Обновляем кэш для этого города
      try {
        var cached = localStorage.getItem(WEATHER_CACHE_KEY);
        var allData = cached ? JSON.parse(cached) : {};
        allData[city.id] = d.current;
        saveWeatherCache(allData);
      } catch (e) {}
    })
    .catch(function () {
      // Ошибка: показываем заглушку только если кэша нет
      try {
        var cached = localStorage.getItem(WEATHER_CACHE_KEY);
        var data = cached ? JSON.parse(cached) : {};
        if (!data[city.id]) {
          var el = document.getElementById('weather-' + slotIndex);
          if (el) el.innerHTML = '<span class="weather-loading">Нет данных</span>';
        }
      } catch (e) {}
    })
    .finally(function () { clearTimeout(timer); });
}

// Запрос погоды для всех трёх слотов
function fetchAllWeather() {
  for (var i = 0; i < 3; i++) {
    fetchSlotWeather(i);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

// Строим селекты для всех слотов
for (var s = 0; s < 3; s++) {
  buildCitySelect(s);
}

// Сначала кэш, потом свежие данные
loadWeatherCache();
fetchAllWeather();

// ===== ТАЙМЕР ОБНОВЛЕНИЯ =====

function getUpdateInterval() {
  return document.body.classList.contains('eco-active')
    ? WEATHER_UPDATE_ECO
    : WEATHER_UPDATE_NORMAL;
}

var weatherInterval = setInterval(fetchAllWeather, getUpdateInterval());

// Переключение эко-режима — пересоздаём таймер
window.addEventListener('ecomode-changed', function () {
  clearInterval(weatherInterval);
  weatherInterval = setInterval(fetchAllWeather, getUpdateInterval());
});