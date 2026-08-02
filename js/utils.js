// ============================================================
// УТИЛИТЫ — вспомогательные функции для всего приложения
// Этот файл загружается первым, так как другие файлы его используют
// ============================================================

// ===== ИДЕНТИФИКАТОР ЭКЗЕМПЛЯРА (разделение настроек по папкам) =====
// Дашборд — локальная версия: копии в разных папках должны иметь раздельные
// настройки, а скопированная папка — стартовать с дефолта. localStorage
// привязан к origin, а все file:// страницы браузер считает одним origin,
// поэтому к ключам добавляется префикс из пути к папке.
// Для file:// у каждой папки свой путь → свой префикс → своё хранилище.
// Для http(s) (GitHub, локальный сервер) префикс пустой — там разделение
// уже обеспечивает origin, а настройки GitHub остаются прежними.
// Префикс считается в inline-скрипте index.html (чтобы тема применилась до
// отрисовки) и сохраняется в window.__instancePrefix; здесь используем его
// с запасным расчётом. Логика должна совпадать с index.html
function getInstancePrefix() {
    if (typeof window.__instancePrefix === 'string') return window.__instancePrefix;
    if (location.protocol !== 'file:') return '';
    var path = location.href;
    try { path = decodeURIComponent(path); } catch (e) {}
    path = path.split(/[?#]/)[0].replace(/\/[^\/]*$/, '');
    var h = 0;
    for (var i = 0; i < path.length; i++) {
        h = ((h << 5) - h + path.charCodeAt(i)) | 0;
    }
    return 'i' + Math.abs(h) + '_';
}

const INSTANCE_PREFIX = getInstancePrefix();

// Собирает имя ключа с учётом префикса экземпляра.
// Используется и для ключей, объявленных в других модулях (эко, заметки календаря)
function storageKey(name) {
    return INSTANCE_PREFIX + name;
}

// Ключи для сохранения данных в браузере (localStorage)
// localStorage — это "память" браузера, данные не пропадают после закрытия
const STORAGE_KEY = storageKey('dashboard_bookmarks');      // Закладки
const RADIO_STORAGE_KEY = storageKey('dashboard_radio');    // Настройки радио
const THEME_KEY = storageKey('theme');                      // Тема (светлая/тёмная)
const ACCENT_KEY = storageKey('accent_color');              // Акцентный цвет
const BG_KEY = storageKey('bg_image');                      // Фоновое изображение
const ENGINE_KEY = storageKey('preferred_engine');          // Поисковик
const NOTES_KEY = storageKey('dashboard_notes');            // Заметки
const POMO_KEY = storageKey('dashboard_pomodoro');          // Помодоро-таймер

// Безопасное сохранение в localStorage
// Если хранилище переполнено — пытается очистить старые данные
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.warn(`localStorage переполнен при записи "${key}". Попытка очистки...`);
            const cleanupOrder = [BG_KEY, RADIO_STORAGE_KEY, THEME_KEY, ACCENT_KEY];
            for (const cleanKey of cleanupOrder) {
                if (cleanKey === key) continue;
                try {
                    localStorage.removeItem(cleanKey);
                    localStorage.setItem(key, value);
                    if (cleanKey === BG_KEY) {
                        const bgLayer = document.getElementById('bg-layer');
                        if (bgLayer) bgLayer.style.backgroundImage = 'none';
                    }
                    return true;
                } catch (retryError) { continue; }
            }
            alert('⚠️ Недостаточно места в хранилище браузера.');
            return false;
        }
        console.error('Ошибка localStorage:', e);
        return false;
    }
}

// Вычисляет размер строки в байтах (нужно для проверки размера картинок)
function estimateSize(str) {
    return new Blob([str]).size;
}

// "Задержка" выполнения функции
// Пример: если пользователь быстро печатает, сохранять заметки только раз в 500мс
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Защита от XSS-атак: экранирует опасные символы (& < > " ') в безопасные HTML-сущности
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// Проверяет, что URL безопасный (разрешены только http, https, mailto).
// Блокирует опасные схемы javascript: и data: (например, javascript:alert(1)).
// Если протокол не указан (ya.ru, www.site.com), добавляет https:// — иначе
// браузер сочтёт ссылку относительной и откроет 404 на текущем домене
function sanitizeUrl(url) {
    if (!url) return '#';
    let trimmed = url.trim();
    if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) return '#';
    // Определяем, есть ли протокол. Настоящая схема («https:», «mailto:») точек
    // не содержит; если «схема» с точкой (ya.ru:8080) — это домен с портом,
    // протокол не указан → тоже добавляем https://
    const scheme = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (!scheme || scheme[1].includes('.')) {
        trimmed = 'https://' + trimmed;
    }
    try {
        const p = new URL(trimmed);
        return ['https:', 'http:', 'mailto:'].includes(p.protocol) ? trimmed : '#';
    } catch { return '#'; }
}

// Чистит текст коротких записей (заметки календаря): убирает управляющие
// и невидимые символы (zero-width пробел, ZWNJ, BOM) — защиту от «кракозябр»
// из вставленного текста, схлопывает повторные пробелы. Кириллицу и эмодзи
// не трогает: zero-width joiner (\u200D) сохранён — он склеивает составные эмодзи
function cleanNoteText(s) {
    if (!s) return '';
    return s.replace(/[\u0000-\u001F\u007F\u200B\u200C\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}