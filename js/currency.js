// ============================================================
// КУРСЫ ВАЛЮТ — показывает курсы THB, CNY, USD, EUR к RUB
// ============================================================

// ✔ ИЗМЕНЕНО: два интервала обновления — обычный и экономичный
const CURRENCY_UPDATE_NORMAL = 60 * 60 * 1000;   // 1 час
const CURRENCY_UPDATE_ECO = 6 * 60 * 60 * 1000;  // 6 часов

const CURRENCY_FETCH_TIMEOUT = 10000;            // Таймаут запроса, 10 секунд
const CURRENCY_CACHE_KEY = 'dashboard_currency_cache'; // Кэш на случай офлайна

// Какие валюты показывать
const CURRENCY_PAIRS = [
  { from: 'THB', to: 'RUB', flag: '🇹🇭', label: 'THB → RUB' },
  { from: 'CNY', to: 'RUB', flag: '🇨🇳', label: 'CNY → RUB' },
  { from: 'USD', to: 'RUB', flag: '🇺🇸', label: 'USD → RUB' },
  { from: 'EUR', to: 'RUB', flag: '🇪🇺', label: 'EUR → RUB' }
];

// Отрисовывает список курсов (rates — объект из API или из кэша)
function renderCurrencies(rates, dateStr, fromCache = false) {
  const container = document.getElementById('currency-list'), dateEl = document.getElementById('currency-date');
  let html = '';
  CURRENCY_PAIRS.forEach(pair => {
    const r = rates[pair.from];
    html += `<div class="currency-row"><div class="currency-pair"><span class="currency-flag">${pair.flag}</span><span>${pair.label}</span></div><div><span class="currency-rate">${r ? (1 / r).toFixed(2) : '--'} ₽</span></div></div>`;
  });
  container.innerHTML = html;
  dateEl.textContent = `Обновлено: ${dateStr}${fromCache ? ' (кэш)' : ''}`;
}

// Запрашивает курсы с API exchangerate-api.com (бесплатно)
async function fetchCurrencies() {
  const container = document.getElementById('currency-list'), dateEl = document.getElementById('currency-date');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CURRENCY_FETCH_TIMEOUT);
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/RUB', { signal: controller.signal });
    const data = await res.json();
    renderCurrencies(data.rates, new Date(data.date).toLocaleDateString('ru-RU'));
    // Сохраняем на случай офлайн-старта
    safeSetItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates: data.rates, date: data.date }));
  } catch (e) {
    // Нет связи — показываем последний сохранённый курс, если есть
    try {
      const cached = JSON.parse(localStorage.getItem(CURRENCY_CACHE_KEY));
      if (cached && cached.rates) {
        renderCurrencies(cached.rates, new Date(cached.date).toLocaleDateString('ru-RU'), true);
        return;
      }
    } catch (cacheErr) {}
    container.innerHTML = '<div class="currency-loading">Не удалось загрузить курсы</div>';
    dateEl.textContent = '';
  } finally {
    clearTimeout(timer);
  }
}

// ✔ ДОБАВЛЕНО: выбирает интервал в зависимости от экономичного режима
function getCurrencyInterval() {
    return document.body.classList.contains('eco-active')
        ? CURRENCY_UPDATE_ECO
        : CURRENCY_UPDATE_NORMAL;
}

// ✔ ИЗМЕНЕНО: запускаем таймер с актуальным интервалом
let currencyInterval = setInterval(fetchCurrencies, getCurrencyInterval());

// ✔ ДОБАВЛЕНО: слушаем переключение экономичного режима из app.js
// и пересоздаём таймер с новым интервалом
window.addEventListener('ecomode-changed', () => {
    clearInterval(currencyInterval);
    currencyInterval = setInterval(fetchCurrencies, getCurrencyInterval());
});

fetchCurrencies();