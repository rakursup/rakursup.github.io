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
// На входе — unix-штамп (секунды) из поля time_next_update_unix
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
// nextUnix — время следующего обновления (unix, сек); выводится второй
// строкой в московском поясе, чтобы был виден реальный возраст курса
function renderCurrencies(rates, dateStr, nextUnix, fromCache = false) {
  const container = document.getElementById('currency-list'), dateEl = document.getElementById('currency-date');
  let html = '';
  CURRENCY_PAIRS.forEach(pair => {
    const r = rates[pair.from];
    html += `<div class="currency-row"><div class="currency-pair"><span class="currency-flag">${pair.flag}</span><span>${pair.label}</span></div><div><span class="currency-rate">${r ? (1 / r).toFixed(2) : '--'} ₽</span></div></div>`;
  });
  container.innerHTML = html;
  const nextStr = formatNextUpdate(nextUnix);
  dateEl.innerHTML = `Обновлено: ${dateStr}${fromCache ? ' (кэш)' : ''}` +
    (nextStr ? `<span class="currency-next">Обновится: ${nextStr} МСК</span>` : '');
}

// Запрашивает курсы с API exchangerate-api.com (бесплатно).
// async — значит возвращает Promise; его ждёт кнопка обновления,
// чтобы остановить вращение иконки по завершении запроса
async function fetchCurrencies() {
  const container = document.getElementById('currency-list'), dateEl = document.getElementById('currency-date');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CURRENCY_FETCH_TIMEOUT);
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/RUB', { signal: controller.signal });
    const data = await res.json();
    renderCurrencies(data.rates, new Date(data.date).toLocaleDateString('ru-RU'), data.time_next_update_unix);
    // Сохраняем на случай офлайн-старта
    safeSetItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates: data.rates, date: data.date, next: data.time_next_update_unix }));
  } catch (e) {
    // Нет связи — показываем последний сохранённый курс, если есть
    try {
      const cached = JSON.parse(localStorage.getItem(CURRENCY_CACHE_KEY));
      if (cached && cached.rates) {
        renderCurrencies(cached.rates, new Date(cached.date).toLocaleDateString('ru-RU'), cached.next, true);
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