// ============================================================
// КАЛЕНДАРЬ — показывает текущий месяц с навигацией
// ============================================================

const calGrid = document.getElementById('cal-grid');
const calMonthYear = document.getElementById('cal-current-month-year');
const calPrevBtn = document.getElementById('cal-prev-month');
const calNextBtn = document.getElementById('cal-next-month');
let currentCalDate = new Date(); // Текущий отображаемый месяц

// Отрисовывает календарь на указанную дату.
// Сетка всегда 6 недель (42 ячейки) — высота блока постоянная,
// соседние блоки не «скачут» при смене месяца
function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // День недели первого числа (0 = вс)
    const today = new Date();

// «Август 2026»: месяц с заглавной буквы, без суффикса «г.»
    const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });
    calMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year;
    calGrid.innerHTML = '';

    // Ячеек предыдущего месяца в начале (неделя с понедельника)
    const leadDays = (firstDay + 6) % 7;

    // Всегда 42 ячейки: i - leadDays + 1 даёт номер дня относительно 1-го числа,
    // new Date сам переносит отрицательные и лишние числа в соседние месяцы
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(year, month, i - leadDays + 1);
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = cellDate.getDate();

        // Дни соседних месяцев — приглушённые
        if (cellDate.getMonth() !== month) {
            dayCell.classList.add('other-month');
        }
        // Подсвечиваем сегодняшний день
        if (today.getFullYear() === cellDate.getFullYear() &&
            today.getMonth() === cellDate.getMonth() &&
            today.getDate() === cellDate.getDate()) {
            dayCell.classList.add('today');
        }
        calGrid.appendChild(dayCell);
    }
}

// Кнопки навигации: предыдущий/следующий месяц.
// setDate(1) — защита от переполнения: 31-е число не «перескочит» короткий месяц
calPrevBtn.addEventListener('click', () => {
    currentCalDate.setDate(1);
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(currentCalDate);
});

calNextBtn.addEventListener('click', () => {
    currentCalDate.setDate(1);
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(currentCalDate);
});

renderCalendar(currentCalDate);