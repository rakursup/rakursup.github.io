// ============================================================
// КУРСЫ ВАЛЮТ — показывает курсы THB, CNY, USD, EUR к RUB
// ============================================================

// Интервалы обновления. Бесплатный тариф exchangerate-api обновляет курсы
// раз в сутки, поэтому опрашивать чаще бессмысленно — только расход лимита
const CURRENCY_UPDATE_NORMAL = 6 * 60 * 60 * 1000;   // 6 часов
const CURRENCY_UPDATE_ECO = 24 * 60 * 60 * 1000;     // 24 часа

const CURRENCY_FETCH_TIMEOUT = 10000;            // Таймаут запроса, 10 секунд
const CURRENCY_CACHE_KEY = 'dashboard_currency_cache'; // Кэш на случай офлайна

// Какие валюты показывать
const CURRENCY_PAIRS = [
  { from: 'THB', to: 'RUB', flag: '🇹🇭', label: 'THB → RUB' },
  { from: 'CNY', to: 'RUB', flag: '🇨🇳', label: 'CNY → RUB' },
  { from: 'USD', to: 'RUB', flag: '🇺🇸', label: 'USD → RUB' },
  { from: 'EUR', to: 'RUB', flag: '🇪🇺', label: 'EUR → RUB' }
];

// Форматирует время следующего обновления в московском часовом поясе.
// На входе — unix-штамп (секунды)
function formatNextUpdate(unixSec) {
  if (!unixSec) return '';
  var d = new Date(unixSec * 1000);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

// Отрисовывает список курсов (rates — объект из API или из кэша).
// Внизу блока выводится время следующего обновления (#currency-date) —
// по нему понятно и когда курсы были получены (за сутки до этого)
function renderCurrencies(rates, nextUnix) {
  const container = document.getElementById('currency-list');
  const dateEl = document.getElementById('currency-date');
  let html = '';
  CURRENCY_PAIRS.forEach(pair => {
    const r = rates[pair.from];
    html += `<div class="currency-row"><div class="currency-pair"><span class="currency-flag">${pair.flag}</span><span>${pair.label}</span></div><div><span class="currency-rate">${r ? (1 / r).toFixed(2) : '--'} ₽</span></div></div>`;
  });
  container.innerHTML = html;
  const nextStr = formatNextUpdate(nextUnix);
  dateEl.textContent = nextStr ? `Обновится: ${nextStr} МСК` : '';
}

// Запрашивает курсы с API exchangerate-api.com (бесплатно).
// async — значит возвращает Promise; его ждёт кнопка обновления,
// чтобы остановить вращение иконки по завершении запроса
async function fetchCurrencies() {
  const container = document.getElementById('currency-list');
  const dateEl = document.getElementById('currency-date');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CURRENCY_FETCH_TIMEOUT);
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/RUB', { signal: controller.signal });
    const data = await res.json();
    // Бесплатный эндпоинт (v4) отдаёт только time_last_updated — момент
    // последнего обновления. Курсы обновляются раз в сутки, поэтому
    // следующее обновление = последнее + 24 часа (86400 сек)
    const nextUpdate = data.time_last_updated ? data.time_last_updated + 86400 : null;
    renderCurrencies(data.rates, nextUpdate);
    // Сохраняем на случай офлайн-старта
    safeSetItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates: data.rates, date: data.date, next: nextUpdate }));
  } catch (e) {
    // Нет связи — показываем последний сохранённый курс, если есть
    try {
      const cached = JSON.parse(localStorage.getItem(CURRENCY_CACHE_KEY));
      if (cached && cached.rates) {
        renderCurrencies(cached.rates, cached.next);
        return;
      }
    } catch (cacheErr) {}
    container.innerHTML = '<div class="currency-loading">Не удалось загрузить курсы</div>';
    dateEl.textContent = '';
  } finally {
    clearTimeout(timer);
  }
}

// ===== КНОПКА ПРИНУДИТЕЛЬНОГО ОБНОВЛЕНИЯ =====
// Обновляет курсы без перезагрузки страницы. Иконка вращается, пока идёт
// запрос; повторные клики во время загрузки игнорируются
var currencyRefreshBtn = document.getElementById('currency-refresh');
function stopCurrencySpin() {
  currencyRefreshBtn.classList.remove('spinning');
}
currencyRefreshBtn.addEventListener('click', function () {
  if (currencyRefreshBtn.classList.contains('spinning')) return;
  currencyRefreshBtn.classList.add('spinning');
  fetchCurrencies().then(stopCurrencySpin, stopCurrencySpin);
});

// Выбирает интервал в зависимости от экономичного режима
function getCurrencyInterval() {
    return document.body.classList.contains('eco-active')
        ? CURRENCY_UPDATE_ECO
        : CURRENCY_UPDATE_NORMAL;
}

// Запускаем таймер с актуальным интервалом
let currencyInterval = setInterval(fetchCurrencies, getCurrencyInterval());

// Слушаем переключение экономичного режима из app.js
// и пересоздаём таймер с новым интервалом
window.addEventListener('ecomode-changed', () => {
    clearInterval(currencyInterval);
    currencyInterval = setInterval(fetchCurrencies, getCurrencyInterval());
});

fetchCurrencies();