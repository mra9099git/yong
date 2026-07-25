import { getBibleData } from './bibleUtils.js';
import { listAllRecords, deleteRecord, formatDate, parseDate } from './storage.js';

/** @typedef {(date: string) => void} DateSelectHandler */
/** @typedef {(date: string) => Promise<void>} DeleteHandler */

let onDateSelect = null;
let onDelete = null;
let allRecords = [];
let filterText = '';
let filterBook = '';
let calendarMonth = new Date();
/** 현재 보고 있는 날짜 (형광펜) */
let selectedDate = '';

const els = {};

export function initSidebar(handlers) {
  onDateSelect = handlers.onDateSelect;
  onDelete = handlers.onDelete;

  els.calendar = document.getElementById('sidebar-calendar');
  els.filterInput = document.getElementById('sidebar-filter');
  els.bookFilter = document.getElementById('sidebar-book-filter');
  els.recordList = document.getElementById('sidebar-records');
  els.goToday = document.getElementById('btn-go-today');
  els.calPrev = document.getElementById('cal-prev');
  els.calNext = document.getElementById('cal-next');
  els.calTitle = document.getElementById('cal-title');

  populateBookFilter();
  els.filterInput?.addEventListener('input', () => {
    filterText = els.filterInput.value.trim().toLowerCase();
    renderRecordList();
  });
  els.bookFilter?.addEventListener('change', () => {
    filterBook = els.bookFilter.value;
    renderRecordList();
  });
  els.goToday?.addEventListener('click', () => {
    if (onDateSelect) onDateSelect(formatDate());
  });
  els.calPrev?.addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  els.calNext?.addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  renderCalendar();
}

function populateBookFilter() {
  if (!els.bookFilter) return;
  els.bookFilter.innerHTML = '<option value="">전체</option>';
  getBibleData().books.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b.korean;
    opt.textContent = b.korean;
    els.bookFilter.appendChild(opt);
  });
}

export async function refreshSidebar(currentDate) {
  try {
    allRecords = await listAllRecords();
  } catch (err) {
    console.error('기록 목록 로드 실패:', err);
    allRecords = [];
  }
  if (currentDate) {
    selectedDate = currentDate;
    const d = parseDate(currentDate);
    calendarMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  renderCalendar();
  renderRecordList();
}

function getRecordDates() {
  return new Set(allRecords.map((r) => r.date));
}

function renderCalendar() {
  if (!els.calendar) return;
  const dates = getRecordDates();
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  if (els.calTitle) els.calTitle.textContent = `${y}년 ${m + 1}월`;

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = formatDate();

  els.calendar.innerHTML = '';
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  weekdays.forEach((wd) => {
    const h = document.createElement('div');
    h.className = 'cal-weekday';
    h.textContent = wd;
    els.calendar.appendChild(h);
  });

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    els.calendar.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cal-day';
    if (dateStr === today) cell.classList.add('today');
    if (selectedDate && dateStr === selectedDate) cell.classList.add('selected');
    if (dates.has(dateStr)) cell.classList.add('has-record');
    cell.innerHTML = `<span>${d}</span>${dates.has(dateStr) ? '<i class="cal-dot"></i>' : ''}`;
    cell.addEventListener('click', () => {
      if (onDateSelect) onDateSelect(dateStr);
    });
    els.calendar.appendChild(cell);
  }
}

function recordMatchesFilter(record) {
  if (filterBook && record.book !== filterBook) return false;
  if (!filterText) return true;
  const hay = [
    record.passage,
    record.key_verse,
    record.interpretation,
    record.meditation,
    record.book,
    record.date,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(filterText);
}

function renderRecordList() {
  if (!els.recordList) return;
  const filtered = allRecords.filter(recordMatchesFilter).slice(0, 100);
  els.recordList.innerHTML = '';

  if (!filtered.length) {
    els.recordList.innerHTML = '<li class="record-empty">기록이 없습니다</li>';
    return;
  }

  filtered.forEach((record) => {
    const li = document.createElement('li');
    li.className = 'record-item';
    const passage = record.passage || '(구절 없음)';
    li.innerHTML = `
      <button type="button" class="record-link">
        <span class="record-date">${record.date}</span>
        <span class="record-passage">${passage}</span>
      </button>
      <button type="button" class="record-delete" title="삭제">🗑</button>
    `;
    li.querySelector('.record-link').addEventListener('click', () => {
      if (onDateSelect) onDateSelect(record.date);
    });
    li.querySelector('.record-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = confirm(`${record.date} 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`);
      if (!ok) return;
      await deleteRecord(record.date);
      if (onDelete) await onDelete(record.date);
      await refreshSidebar();
    });
    els.recordList.appendChild(li);
  });
}

export function goToToday() {
  if (onDateSelect) onDateSelect(formatDate());
}
