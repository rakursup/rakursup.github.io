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
// Ограничение длины названий, чтобы не вылезали из карточек
// (визуально длинные всё равно обрезаются многоточием — см. style.css)
const MAX_TITLE_LENGTH = 30;       // название категории
const MAX_LINK_NAME_LENGTH = 40;   // название ссылки
// Максимальная длина URL: в отличие от названий, длинная ссылка не режется
// молча (обрезанная была бы битой), а отклоняется валидацией в модальном окне
const MAX_URL_LENGTH = 300;        // сама ссылка (URL)

// Стартовые закладки «из коробки» (показываются при первом запуске)
const DEFAULT_BOOKMARKS = [
    { title: '📧 Почта', links: [{ name: 'Яндекс Почта', url: 'https://mail.yandex.ru/' }, { name: 'Gmail', url: 'https://gmail.com/' }, { name: 'Mail.ru', url: 'https://e.mail.ru/' }, { name: 'Рамблер', url: 'https://mail.rambler.ru/' }] },
    { title: '💬 Соцсети & IT', links: [{ name: 'Habr', url: 'https://habr.ru/' }, { name: 'Вконтакте', url: 'https://vk.com/' }, { name: 'Twitter / X', url: 'https://twitter.com/' }, { name: 'LiveJournal', url: 'https://livejournal.com/' }] },
    { title: '📺 Видео & Стримы', links: [{ name: 'YouTube', url: 'https://youtube.com/' }, { name: 'Twitch', url: 'https://twitch.tv/' }, { name: 'Rutube', url: 'https://rutube.ru/' }, { name: 'VK Видео', url: 'https://vkvideo.ru/' }] },
    { title: '🎬 Кино & Сериалы', links: [{ name: 'Кинопоиск', url: 'https://hd.kinopoisk.ru/' }, { name: 'IVI', url: 'https://ivi.ru/' }, { name: 'HDRezka', url: 'https://rezka.si/' }, { name: 'Tvigle', url: 'https://tvigle.ru/' }] },
    { title: '🛒 Товары & Маркеты', links: [{ name: 'Яндекс Маркет', url: 'https://market.yandex.ru/' }, { name: 'Wildberries', url: 'https://www.wildberries.ru/' }, { name: 'Ozon', url: 'https://www.ozon.ru/' }, { name: 'Авито', url: 'https://www.avito.ru/' }] },
    { title: '🏛️ Услуги & Сервисы', links: [{ name: 'Госуслуги', url: 'https://gosuslugi.ru/' }, { name: 'Авиасейлс', url: 'https://www.aviasales.ru/' }, { name: 'Сравни.ру', url: 'https://sravni.ru/' }, { name: 'Tutu.ru', url: 'https://www.tutu.ru/' }] },
    { title: '🗺️ Карты & Навигация', links: [{ name: 'Яндекс Карты', url: 'https://yandex.ru/maps/' }, { name: '2ГИС', url: 'https://2gis.ru/' }, { name: 'Google Maps', url: 'https://www.google.com/maps' }, { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' }] },
    { title: '📰 Новости & Инфо', links: [{ name: 'ТАСС', url: 'https://tass.ru/' }, { name: 'Интерфакс', url: 'https://www.interfax.ru/' }, { name: 'Lenta.ru', url: 'https://lenta.ru/' }, { name: 'Regnum', url: 'https://www.regnum.ru/' }] },
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

// Отрисовывает все карточки закладок на странице.
// Перетаскивание блоков — SortableJS за плашку .card-drag-handle,
// перетаскивание ссылок внутри блока — за грип .link-drag-handle.
// Длинные названия обрезаются многоточием (CSS), title показывает их целиком
function renderBookmarks() {
    const grid = document.getElementById('bookmarks-grid'), addBtn = document.getElementById('add-card-btn');
    Array.from(grid.querySelectorAll('.card')).forEach(el => el.remove());
    bookmarks.forEach((cat, ci) => {
        const card = document.createElement('section');
        card.className = 'card';
        card.dataset.index = ci;
        let lh = '';
        cat.links.forEach((l, li) => {
            lh += `<li data-link="${li}"><span class="link-drag-handle edit-controls" title="Перетащить ссылку"></span><a href="${sanitizeUrl(l.url)}" target="_blank" rel="noopener" title="${escapeHtml(l.name)}">${escapeHtml(l.name)}</a><button class="edit-controls btn-delete-link" data-action="delete-link" data-cat="${ci}" data-link="${li}">✕</button></li>`;
        });
        card.innerHTML = `<div class="card-header"><span class="card-drag-handle" title="Перетащить блок"></span><h2 title="${escapeHtml(cat.title)}">${escapeHtml(cat.title)}</h2><button class="edit-controls btn-rename-card" data-action="rename-card" data-index="${ci}" title="Переименовать">✏️</button><button class="edit-controls btn-delete-card" data-action="delete-card" data-index="${ci}">🗑️</button></div><ul>${lh}</ul><button class="edit-controls btn-add-link" data-action="add-link" data-cat="${ci}">+ Добавить ссылку</button>`;
        grid.insertBefore(card, addBtn);
    });
    // Пересоздаём Sortable-экземпляры списков (DOM пересобран)
    initLinkSortables();
}

// Обработчик кликов по кнопкам удаления/добавления/переименования
document.getElementById('bookmarks-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'delete-card') {
        const i = parseInt(btn.dataset.index);
        if (confirm(`Удалить «${bookmarks[i].title}»?`)) { bookmarks.splice(i, 1); saveBookmarks(); }
    }
    else if (action === 'rename-card') {
        const i = parseInt(btn.dataset.index);
        // Модалка с предзаполненным (и выделенным) текущим названием
        openModal('Переименовать категорию', 'Название', false, (n) => {
            bookmarks[i].title = n;
            saveBookmarks();
        }, bookmarks[i].title);
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
        handle: '.card-drag-handle', // тянем только за плашку-ручку — ссылки в карточке остаются кликабельными
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

// ===== ПЕРЕТАСКИВАНИЕ ССЫЛОК ВНУТРИ КАРТОЧКИ =====
// Отдельный Sortable на каждый <ul>. Экземпляры пересоздаются после каждого
// renderBookmarks (списки перестраиваются), поэтому храним их в массиве
let linkSortables = [];

function initLinkSortables() {
    linkSortables.forEach(s => s.destroy());
    linkSortables = [];
    if (!isEditing || typeof Sortable === 'undefined') return;
    document.querySelectorAll('#bookmarks-grid .card').forEach(card => {
        const ul = card.querySelector('ul');
        const catIndex = parseInt(card.dataset.index, 10);
        linkSortables.push(Sortable.create(ul, {
            animation: 150,
            draggable: 'li',
            handle: '.link-drag-handle',   // тянем только за грип слева от ссылки
            ghostClass: 'link-ghost',
            delay: 250,                    // тач: долгое нажатие, свайп — прокрутка
            delayOnTouchOnly: true,
            touchStartThreshold: 10,
            onEnd: function() {
                const newOrder = Array.from(ul.querySelectorAll('li')).map(li => parseInt(li.dataset.link, 10));
                if (newOrder.every((idx, pos) => idx === pos)) return;
                bookmarks[catIndex].links = newOrder.map(i => bookmarks[catIndex].links[i]);
                saveBookmarks();
            }
        }));
    });
}

// ===== МОДАЛЬНОЕ ОКНО =====
const mo = document.getElementById('modal-overlay'), mt = document.getElementById('modal-title'), mln = document.getElementById('modal-label-name'), mn = document.getElementById('modal-input-name'), mu = document.getElementById('modal-input-url'), muf = document.getElementById('modal-url-field');
let mc = null;

// Открывает модальное окно (добавление ссылок/категорий, переименование).
// initialName — предзаполнить поле и выделить текст (режим переименования).
// Лимит длины названия: для ссылки — MAX_LINK_NAME_LENGTH, для категории —
// MAX_TITLE_LENGTH. Длина URL здесь не ограничивается — её проверяет
// валидация при сохранении (MAX_URL_LENGTH), чтобы не резать ссылку молча
function openModal(title, ln, showUrl, cb, initialName = '') {
    lastFocusedElement = document.activeElement;
    mt.textContent = title;
    mln.textContent = ln;
    mn.value = initialName;
    mu.value = '';
    mn.maxLength = showUrl ? MAX_LINK_NAME_LENGTH : MAX_TITLE_LENGTH;
    mn.classList.remove('invalid');
    mu.classList.remove('invalid');
    muf.style.display = showUrl ? 'block' : 'none';
    mc = cb;
    mo.classList.add('active');
    requestAnimationFrame(() => { mn.focus(); if (initialName) mn.select(); });
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
    // URL длиннее MAX_URL_LENGTH — отклоняем: молча обрезанная ссылка была бы битой
    if (v && muf.style.display !== 'none' && u.length > MAX_URL_LENGTH) { mu.classList.add('invalid'); mu.focus(); v = false; }
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
    // Включаем/выключаем перетаскивание блоков вместе с режимом редактирования
    if (sortableInstance) sortableInstance.option('disabled', !isEditing);
    // Перерисовка сама пересоздаст Sortable-экземпляры списков (initLinkSortables)
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

// Автофокус поля поиска — только на устройствах с мышью/тачпадом.
// На смартфонах и планшетах фокус при загрузке открывает экранную
// клавиатуру и перекидывает страницу снизу вверх — это мешает, а не помогает.
// (pointer: coarse) — основной указатель сенсорный; ontouchstart —
// запасная проверка для старых браузеров
const hasCoarsePointer = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
if (!hasCoarsePointer) qInput.focus();

// ===== ЭКСПОРТ / ИМПОРТ (ЗАКЛАДКИ + ЗАМЕТКИ КАЛЕНДАРЯ) =====
// Проверяет, что массив закладок имеет правильную структуру
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

// Приводит заметки календаря к безопасному виду: объект «дата → строка».
// Всё лишнее (значения не-строки) отбрасывается
function sanitizeCalendarNotes(notes) {
    if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return {};
    const clean = {};
    for (const key in notes) {
        if (typeof notes[key] === 'string') clean[key] = notes[key];
    }
    return clean;
}

// Скачивает резервную копию (закладки + заметки календаря) в JSON-файл.
// Формат: { bookmarks: [...], calendarNotes: {...} }. Импорт понимает и
// старый формат (просто массив закладок) — см. обработчик импорта.
// Через data-URI вместо Blob + URL.createObjectURL — так скачивание работает
// и в старых браузерах (на планшете Blob-вариант не срабатывал)
document.getElementById('btn-export').addEventListener('click', () => {
    const backup = {
        bookmarks: bookmarks,
        calendarNotes: (typeof window.getCalendarNotes === 'function') ? window.getCalendarNotes() : {}
    };
    const json = JSON.stringify(backup, null, 2);
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    a.download = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Загружает резервную копию из JSON-файла. Понимает два формата:
// старый (массив закладок) и новый ({ bookmarks, calendarNotes })
document.getElementById('btn-import-trigger').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            // Разбираем формат: массив = только закладки, объект = закладки + заметки
            let importedBookmarks, importedNotes = null;
            if (Array.isArray(data)) {
                importedBookmarks = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.bookmarks)) {
                importedBookmarks = data.bookmarks;
                importedNotes = sanitizeCalendarNotes(data.calendarNotes);
            } else {
                alert('❌ Неверный формат файла');
                return;
            }
            const err = validateBookmarks(importedBookmarks);
            if (err) { alert('❌ ' + err); return; }
            const notesCount = importedNotes ? Object.keys(importedNotes).length : 0;
            let msg = `Импортировать ${importedBookmarks.length} категорий?`;
            if (notesCount) msg += `\nЗаметок календаря: ${notesCount}.`;
            msg += '\nТекущие данные будут заменены.';
            if (confirm(msg)) {
                bookmarks = importedBookmarks;
                saveBookmarks();
                if (importedNotes && typeof window.setCalendarNotes === 'function') {
                    window.setCalendarNotes(importedNotes);
                }
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