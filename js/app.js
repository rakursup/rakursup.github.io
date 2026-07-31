// ============================================================
// ЯДРО ПРИЛОЖЕНИЯ — закладки, темы, модальные окна
// ============================================================

// ===== КОНСТАНТЫ =====
const APP_VERSION = '1.0.0';
const MAX_IMAGE_WIDTH = 1920;
const IMAGE_QUALITY = 0.7;
const MAX_BG_SIZE_BYTES = 2 * 1024 * 1024;
// Сила размытия, запекаемого в обои при добавлении (в пикселях картинки)
const BG_BLUR = 4;
// Максимум ссылок в одной категории
const MAX_LINKS_PER_CATEGORY = 7;

// Стартовые закладки «из коробки» (показываются при первом запуске)
const DEFAULT_BOOKMARKS = [
    { title: '📧 Почта', links: [{ name: 'Яндекс Почта', url: 'https://mail.yandex.ru/' }, { name: 'Gmail', url: 'https://gmail.com/' }, { name: 'Mail.ru', url: 'https://e.mail.ru/' }, { name: 'Рамблер', url: 'https://mail.rambler.ru/' }] },
    { title: '💬 Соцсети & IT', links: [{ name: 'Habr', url: 'https://habr.ru/' }, { name: 'Вконтакте', url: 'https://vk.com/' }, { name: 'Twitter / X', url: 'https://twitter.com/' }, { name: 'LiveJournal', url: 'https://livejournal.com/' }] },
    { title: '📺 Видео & Стримы', links: [{ name: 'YouTube', url: 'https://youtube.com/' }, { name: 'Twitch', url: 'https://twitch.tv/' }, { name: 'Rutube', url: 'https://rutube.ru/' }, { name: 'VK Видео', url: 'https://vkvideo.ru/' }] },
    { title: '🎬 Кино & Сериалы', links: [{ name: 'Кинопоиск', url: 'https://hd.kinopoisk.ru/' }, { name: 'IVI', url: 'https://ivi.ru/' }, { name: 'HDRezka', url: 'https://rezka.si/' }, { name: 'Tvigle', url: 'https://tvigle.ru/' }] },
    { title: '🛒 Товары & Маркеты', links: [{ name: 'Яндекс Маркет', url: 'https://market.yandex.ru/' }, { name: 'Wildberries', url: 'https://www.wildberries.ru/' }, { name: 'Ozon', url: 'https://www.ozon.ru/' }, { name: 'Авито', url: 'https://www.avito.ru/' }] },
    { title: '🏛️ Услуги & Сервисы', links: [{ name: 'Госуслуги', url: 'https://gosuslugi.ru/' }, { name: 'Авиасейлс', url: 'https://www.aviasales.ru/' }, { name: 'Сравни.ру', url: 'https://sravni.ru/' }, { name: 'Tutu.ru', url: 'https://www.tutu.ru/' }] },
    { title: '🗺️ Карты & Навигация', links: [{ name: 'Яндекс Карты', url: 'https://yandex.ru/maps/' }, { name: '2ГИС', url: 'https://2gis.ru/' }, { name: 'Google Maps', url: 'https://www.google.com/maps' }, { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' }] },
    { title: '📰 Новости & Инфо', links: [{ name: 'ТАСС', url: 'https://tass.ru/' }, { name: 'Интерфакс', url: 'https://www.interfax.ru/' }, { name: 'Lenta.ru', url: 'https://www.lenta.ru/' }, { name: 'Regnum', url: 'https://www.regnum.ru/' }] },
    { title: '🛠️ Инструменты', links: [{ name: 'Яндекс Переводчик', url: 'https://translate.yandex.ru/' }, { name: 'Google Translate', url: 'https://translate.google.com/' }, { name: 'Gismeteo', url: 'https://gismeteo.ru/' }, { name: 'Say7', url: 'https://www.say7.info/' }] },
    { title: '💻 Разработка', links: [{ name: 'GitHub', url: 'https://github.com/' }, { name: 'Stack Overflow', url: 'https://stackoverflow.com/' }, { name: 'ChatGPT', url: 'https://chat.openai.com/' }, { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' }, { name: 'Docker Hub', url: 'https://hub.docker.com/' }, { name: 'CodePen', url: 'https://codepen.io/' }] },
    { title: '☁️ Облака', links: [{ name: 'Яндекс Диск', url: 'https://disk.yandex.ru/' }, { name: 'Google Drive', url: 'https://drive.google.com/' }, { name: 'Облако Mail.ru', url: 'https://cloud.mail.ru/' }, { name: 'Dropbox', url: 'https://www.dropbox.com/' }, { name: 'MEGA', url: 'https://mega.nz/' }, { name: 'OneDrive', url: 'https://onedrive.live.com/' }] },
    { title: '🤖 ИИ-чаты', links: [{ name: 'Qwen AI', url: 'https://chat.qwen.ai/' }, { name: 'ChatGPT', url: 'https://chat.openai.com/' }, { name: 'Яндекс Алиса', url: 'https://alice.yandex.ru/' }, { name: 'Grok AI', url: 'https://grok.com/' }, { name: 'Gemini', url: 'https://gemini.google.com/' }, { name: 'Claude AI', url: 'https://claude.ai/' }] }
];

// ===== ЗАКЛАДКИ =====
let bookmarks = [], isEditing = false, lastFocusedElement = null;

// Загружает закладки из localStorage (или стандартные, если их нет)
function loadBookmarks() {
    const s = localStorage.getItem(STORAGE_KEY);
    bookmarks = s ? (() => {
        try { return JSON.parse(s); }
        catch (e) { return JSON.parse(JSON.stringify(DEFAULT_BOOKMARKS)); }
    })() : JSON.parse(JSON.stringify(DEFAULT_BOOKMARKS));

    // Лёгкая чистка сохранённых данных: убираем случайные пробелы по краям названий и URL
    bookmarks.forEach(cat => {
        if (typeof cat.title === 'string') cat.title = cat.title.trim();
        (cat.links || []).forEach(l => {
            if (typeof l.name === 'string') l.name = l.name.trim();
            if (typeof l.url === 'string') l.url = l.url.trim();
        });
    });
}

// Сохраняет закладки и перерисовывает их на экране
function saveBookmarks() {
    safeSetItem(STORAGE_KEY, JSON.stringify(bookmarks));
    renderBookmarks();
}

// Отрисовывает все карточки закладок на странице
// (перетаскиванием управляет SortableJS — навешивать draggable вручную не нужно)
function renderBookmarks() {
    const grid = document.getElementById('bookmarks-grid'), addBtn = document.getElementById('add-card-btn');
    Array.from(grid.querySelectorAll('.card')).forEach(el => el.remove());
    bookmarks.forEach((cat, ci) => {
        const card = document.createElement('section');
        card.className = 'card';
        card.dataset.index = ci;
        let lh = '';
        cat.links.forEach((l, li) => {
            lh += `<li><a href="${sanitizeUrl(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.name)}</a><button class="edit-controls btn-delete-link" data-action="delete-link" data-cat="${ci}" data-link="${li}">✕</button></li>`;
        });
        card.innerHTML = `<div class="card-header"><h2>${escapeHtml(cat.title)}</h2><button class="edit-controls btn-delete-card" data-action="delete-card" data-index="${ci}">🗑️</button></div><ul>${lh}</ul><button class="edit-controls btn-add-link" data-action="add-link" data-cat="${ci}">+ Добавить ссылку</button>`;
        grid.insertBefore(card, addBtn);
    });
}

// Обработчик кликов по кнопкам удаления/добавления ссылок
document.getElementById('bookmarks-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'delete-card') {
        const i = parseInt(btn.dataset.index);
        if (confirm(`Удалить «${bookmarks[i].title}»?`)) { bookmarks.splice(i, 1); saveBookmarks(); }
    }
    else if (action === 'delete-link') {
        const c = parseInt(btn.dataset.cat), l = parseInt(btn.dataset.link);
        bookmarks[c].links.splice(l, 1);
        saveBookmarks();
    }
    else if (action === 'add-link') {
        const ci = parseInt(btn.dataset.cat);
        // Лимит ссылок в категории (MAX_LINKS_PER_CATEGORY)
        if (bookmarks[ci].links.length >= MAX_LINKS_PER_CATEGORY) {
            alert('⚠️ В категории «' + bookmarks[ci].title + '» уже ' + MAX_LINKS_PER_CATEGORY + ' ссылок.\nУдалите одну, чтобы добавить новую.');
            return;
        }
        openModal('Добавить ссылку', 'Название', true, (n, u) => {
            bookmarks[ci].links.push({ name: n, url: u });
            saveBookmarks();
        });
    }
});

// ===== ПЕРЕТАСКИВАНИЕ КАРТОЧЕК (SortableJS) =====
// Нативный HTML5 Drag & Drop не работает на тач-экранах, поэтому используем
// SortableJS — он умеет и мышь, и тач. На планшете/телефоне перетаскивание
// стартует долгим нажатием (delay), чтобы обычный свайп прокручивал страницу.
let sortableInstance = null;

function initSortable() {
    // Библиотека не загрузилась — работаем без перетаскивания, остальное не страдает
    if (typeof Sortable === 'undefined') return;
    const grid = document.getElementById('bookmarks-grid');
    sortableInstance = Sortable.create(grid, {
        animation: 150,
        draggable: '.card',        // таскаем только карточки; кнопка «Добавить» остаётся на месте
        ghostClass: 'card-ghost',  // подсветка места, куда встанет карточка
        delay: 250,                // тач: drag стартует через 250 мс долгого нажатия
        delayOnTouchOnly: true,    // ...но только на тач-экранах, мышь таскает сразу
        touchStartThreshold: 10,   // сдвинулись > 10px за время delay — это свайп, не drag
        disabled: !isEditing,      // вне режима редактирования перетаскивание выключено
        onEnd: function() {
            // Новый порядок читаем из DOM: data-index помнит исходную позицию карточки
            const newOrder = Array.from(grid.querySelectorAll('.card')).map(el => parseInt(el.dataset.index, 10));
            if (newOrder.every((idx, pos) => idx === pos)) return; // порядок не изменился
            bookmarks = newOrder.map(i => bookmarks[i]);
            saveBookmarks();
        }
    });
}

// ===== МОДАЛЬНОЕ ОКНО =====
const mo = document.getElementById('modal-overlay'), mt = document.getElementById('modal-title'), mln = document.getElementById('modal-label-name'), mn = document.getElementById('modal-input-name'), mu = document.getElementById('modal-input-url'), muf = document.getElementById('modal-url-field');
let mc = null;

// Открывает модальное окно (для добавления ссылок и категорий)
function openModal(title, ln, showUrl, cb) {
    lastFocusedElement = document.activeElement;
    mt.textContent = title;
    mln.textContent = ln;
    mn.value = '';
    mu.value = '';
    mn.classList.remove('invalid');
    mu.classList.remove('invalid');
    muf.style.display = showUrl ? 'block' : 'none';
    mc = cb;
    mo.classList.add('active');
    requestAnimationFrame(() => mn.focus());
}

function closeModal() {
    mo.classList.remove('active');
    mc = null;
    if (lastFocusedElement) lastFocusedElement.focus();
}

// Навигация Tab внутри модального окна (для доступности)
mo.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
        const vis = Array.from(mo.querySelectorAll('input:not([style*="display: none"]), button')).filter(el => el.offsetParent !== null);
        if (!vis.length) return;
        if (e.shiftKey && document.activeElement === vis[0]) {
            e.preventDefault();
            vis[vis.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === vis[vis.length - 1]) {
            e.preventDefault();
            vis[0].focus();
        }
    }
});

document.getElementById('modal-save').addEventListener('click', () => {
    const n = mn.value.trim(), u = mu.value.trim();
    let v = true;
    mn.classList.remove('invalid');
    mu.classList.remove('invalid');
    if (!n) { mn.classList.add('invalid'); mn.focus(); v = false; }
    if (v && muf.style.display !== 'none' && !u) { mu.classList.add('invalid'); mu.focus(); v = false; }
    if (v && muf.style.display !== 'none' && sanitizeUrl(u) === '#') { mu.classList.add('invalid'); mu.focus(); v = false; }
    if (!v) return;
    if (mc) mc(n, u);
    closeModal();
});
document.getElementById('modal-cancel').addEventListener('click', closeModal);
mo.addEventListener('click', e => { if (e.target === mo) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && mo.classList.contains('active')) closeModal(); });
document.getElementById('add-card-btn').addEventListener('click', () => openModal('Новая категория', 'Название', false, n => { bookmarks.push({ title: n, links: [] }); saveBookmarks(); }));

// ===== ⚡ ЭКОНОМИЧНЫЙ РЕЖИМ =====
// Ключ для сохранения состояния в localStorage
const ECO_KEY = 'eco_mode';
const ecoToggle = document.getElementById('eco-toggle');
let isEcoMode = localStorage.getItem(ECO_KEY) === 'true';

// Применяет экономичный режим: классы на body/кнопке, событие для других модулей
function applyEcoMode(enabled) {
    isEcoMode = enabled;
    document.body.classList.toggle('eco-active', enabled);
    ecoToggle.classList.toggle('eco-active', enabled);
    safeSetItem(ECO_KEY, String(enabled));
    // Генерируем событие, чтобы модули погоды/валют узнали об изменении
    window.dispatchEvent(new CustomEvent('ecomode-changed', { detail: { enabled } }));
}

// Переключение по клику
ecoToggle.addEventListener('click', () => {
    applyEcoMode(!isEcoMode);
});

// Применяем сохранённое состояние при загрузке
applyEcoMode(isEcoMode);

// ===== РЕЖИМ РЕДАКТИРОВАНИЯ =====
const et = document.getElementById('edit-toggle');
et.addEventListener('click', () => {
    isEditing = !isEditing;
    document.body.classList.toggle('editing', isEditing);
    et.classList.toggle('edit-active', isEditing);
    // Включаем/выключаем перетаскивание вместе с режимом редактирования
    if (sortableInstance) sortableInstance.option('disabled', !isEditing);
    renderBookmarks();
});

// ===== ТЕМЫ, ЦВЕТА, ФОН =====
const tt = document.getElementById('theme-toggle'), si = document.querySelector('.sun-icon'), mi = document.querySelector('.moon-icon'), hl = document.documentElement, bgLayer = document.getElementById('bg-layer');

function updateSelectArrowColor(colorHex) {
    const arrows = document.querySelectorAll('.arrow-down');
    arrows.forEach(arrow => { arrow.style.borderTopColor = colorHex; });
}

// Меняет акцентный цвет (кнопки, ссылки, заголовки)
function setAccent(color, save = true) {
    document.documentElement.style.setProperty('--accent', color);
    let hoverColor = color;
    // Hover-оттенок для каждого акцентного цвета
    if (color === '#f90') hoverColor = '#ffb347';
    else if (color === '#206a9b') hoverColor = '#2a85c2';
    else if (color === '#E72C98') hoverColor = '#ff66cc';
    else if (color === '#00D1BC') hoverColor = '#0ff0d9';
    document.documentElement.style.setProperty('--accent-hover', hoverColor);
    if (save) safeSetItem(ACCENT_KEY, color);
    document.querySelectorAll('.color-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.color === color); });
    updateSelectArrowColor(color);
}

// Переключает светлую/тёмную тему
function setTheme(t, tr = false) {
    if (tr) {
        document.body.classList.add('theme-transitioning');
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
    }
    hl.setAttribute('data-theme', t);
    safeSetItem(THEME_KEY, t);
    si.style.display = t === 'light' ? 'block' : 'none';
    mi.style.display = t === 'light' ? 'none' : 'block';
}

// Устанавливает фоновое изображение
function setBackground(imgData) {
    if (imgData) { bgLayer.style.backgroundImage = `url(${imgData})`; safeSetItem(BG_KEY, imgData); }
    else { bgLayer.style.backgroundImage = 'none'; localStorage.removeItem(BG_KEY); }
}

// Сжимает большие картинки и запекает размытие, чтобы не переполнять localStorage
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scaleSize = MAX_IMAGE_WIDTH / img.width;
            canvas.width = (scaleSize < 1) ? MAX_IMAGE_WIDTH : img.width;
            canvas.height = (scaleSize < 1) ? img.height * scaleSize : img.height;
            // Запекаем размытие прямо в картинку: рисуем с запасом BG_BLUR по
            // краям, чтобы размытая «прозрачная» кайма ушла за холст (иначе по
            // краям обоев была бы светлая рамка)
            ctx.filter = `blur(${BG_BLUR}px)`;
            ctx.drawImage(img, -BG_BLUR, -BG_BLUR, canvas.width + BG_BLUR * 2, canvas.height + BG_BLUR * 2);
            ctx.filter = 'none';
            const base64 = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
            const size = estimateSize(base64);
            if (size > MAX_BG_SIZE_BYTES) {
                const retryBase64 = canvas.toDataURL('image/jpeg', 0.5);
                const retrySize = estimateSize(retryBase64);
                if (retrySize > MAX_BG_SIZE_BYTES) {
                    alert(`⚠️ Изображение слишком большое (${(retrySize / 1024 / 1024).toFixed(1)} МБ).`);
                    return;
                }
                callback(retryBase64);
            } else {
                callback(base64);
            }
        };
        img.onerror = () => alert('❌ Не удалось загрузить изображение.');
    };
}

// Инициализация темы и цвета при загрузке страницы
function initAppearance() {
    const s = localStorage.getItem(THEME_KEY);
    setTheme(s || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    const savedColor = localStorage.getItem(ACCENT_KEY);
    setAccent(savedColor || '#206a9b', false);
    const savedBg = localStorage.getItem(BG_KEY);
    if (savedBg) setBackground(savedBg);
}

tt.addEventListener('click', () => setTheme(hl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
document.querySelectorAll('.color-btn').forEach(btn => { btn.addEventListener('click', () => setAccent(btn.dataset.color)); });
document.getElementById('btn-bg-trigger').addEventListener('click', () => document.getElementById('bg-file').click());
document.getElementById('bg-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) compressImage(file, (base64) => setBackground(base64));
    e.target.value = '';
});
initAppearance();

// ===== ПОИСК (выпадающий список поисковиков) =====
const searchForm = document.getElementById('search-form');
const qInput = document.getElementById('q');
const customSelectTrigger = document.getElementById('custom-select-trigger');
const customOptionsList = document.getElementById('custom-options');
const selectedSearchEngineText = document.getElementById('selected-search-engine-text');

const searchEngines = {
    'yandex': { name: 'Яндекс', url: 'https://yandex.ru/search/?text=' },
    'google': { name: 'Google', url: 'https://www.google.com/search?q=' },
    'ddg': { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    'shodan': { name: 'Shodan (IoT)', url: 'https://www.shodan.io/search?query=' }
};

let currentSearchEngine = localStorage.getItem(ENGINE_KEY) || 'yandex';
selectedSearchEngineText.textContent = searchEngines[currentSearchEngine].name;

// Выбранный поисковик помечается классом active-engine — цвет и галочку рисует CSS
function updateActiveOption() {
    const options = customOptionsList.querySelectorAll('li');
    options.forEach(option => {
        option.classList.toggle('active-engine', option.getAttribute('data-value') === currentSearchEngine);
    });
}
updateActiveOption();

// Единая функция открытия/закрытия селекта: синхронизирует класс и aria-expanded (для скринридеров)
function setSelectOpen(open) {
    customOptionsList.classList.toggle('active', open);
    customSelectTrigger.setAttribute('aria-expanded', String(open));
}

customSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setSelectOpen(!customOptionsList.classList.contains('active'));
});

// Управление селектом с клавиатуры (Enter/Space/Escape)
customSelectTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectOpen(!customOptionsList.classList.contains('active'));
    } else if (e.key === 'Escape') {
        setSelectOpen(false);
    }
});

customOptionsList.querySelectorAll('li').forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const newEngineValue = option.getAttribute('data-value');
        if (newEngineValue && searchEngines[newEngineValue]) {
            currentSearchEngine = newEngineValue;
            selectedSearchEngineText.textContent = searchEngines[newEngineValue].name;
            safeSetItem(ENGINE_KEY, newEngineValue);
            setSelectOpen(false);
            updateActiveOption();
        }
    });
});

document.addEventListener('click', (e) => {
    if (!customSelectTrigger.contains(e.target) && !customOptionsList.contains(e.target)) {
        setSelectOpen(false);
    }
});

searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const query = qInput.value.trim();
    if (!query) return;
    const engineInfo = searchEngines[currentSearchEngine];
    if (engineInfo) {
        const searchUrl = engineInfo.url + encodeURIComponent(query);
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
});

// ===== ЭКСПОРТ / ИМПОРТ ЗАКЛАДОК =====
// Проверяет, что импортируемый файл имеет правильную структуру
function validateBookmarks(data) {
    if (!Array.isArray(data)) return 'Файл должен содержать массив категорий';
    for (let i = 0; i < data.length; i++) {
        if (!data[i] || typeof data[i].title !== 'string') return `Категория #${i + 1}: отсутствует "title"`;
        if (!Array.isArray(data[i].links)) return `«${data[i].title}»: "links" должно быть массивом`;
        for (let j = 0; j < data[i].links.length; j++) {
            if (!data[i].links[j] || typeof data[i].links[j].name !== 'string' || typeof data[i].links[j].url !== 'string') return `«${data[i].title}», ссылка #${j + 1}: нужны "name" и "url"`;
        }
    }
    return null;
}

// Скачивает все закладки в JSON-файл.
// Через data-URI вместо Blob + URL.createObjectURL — так скачивание работает
// и в старых браузерах (на планшете Blob-вариант не срабатывал)
document.getElementById('btn-export').addEventListener('click', () => {
    const json = JSON.stringify(bookmarks, null, 2);
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    a.download = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Загружает закладки из JSON-файла
document.getElementById('btn-import-trigger').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            const err = validateBookmarks(data);
            if (err) { alert('❌ ' + err); return; }
            if (confirm(`Импортировать ${data.length} категорий?\nТекущие закладки будут заменены.`)) {
                bookmarks = data;
                saveBookmarks();
                alert('✅ Успешно!');
            }
        } catch (err) { alert('❌ ' + err.message); }
        e.target.value = '';
    };
    reader.readAsText(file);
});

// ===== СБРОС К НАСТРОЙКАМ ПО УМОЛЧАНИЮ =====
// Очищает localStorage и перезагружает страницу — сайт возвращается к состоянию
// «из коробки» (стандартные закладки, тема, обои, поисковик и т.д.)
document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Сбросить дашборд к состоянию по умолчанию?\n\nБудут удалены: все измененные закладки и категории, будут стерты заметки, удалены обои. \n\nНе забудьте сохранить ваши закладки через Экспорт и сохранить ваши быстрые заметки, если это необходимо!\n\nЭто действие необратимо.')) {
        localStorage.clear();
        location.reload();
    }
});

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
// Загружаем закладки, рисуем их и включаем перетаскивание (SortableJS)
loadBookmarks();
renderBookmarks();
initSortable();