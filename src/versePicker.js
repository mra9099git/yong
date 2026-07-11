import { getBibleData, formatPassage } from './bibleUtils.js';

/** @typedef {import('./bibleUtils.js').VerseRange} VerseRange */

let modalEl = null;
let onSelectCallback = null;
let pickerMode = 'passage';
let selection = { book: null, startChapter: null, startVerse: null, endChapter: null, endVerse: null };
let clickPhase = 'start';

function ensureModal() {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.id = 'verse-picker-modal';
  modalEl.className = 'modal hidden';
  modalEl.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content verse-picker">
      <header class="modal-header">
        <h2 id="picker-title">구절 선택</h2>
        <button type="button" class="btn-icon" id="picker-close" aria-label="닫기">✕</button>
      </header>
      <p class="picker-hint" id="picker-hint">시작 절을 클릭한 뒤, 끝 절을 클릭하세요.</p>
      <div class="picker-selection" id="picker-selection"></div>
      <div class="picker-columns">
        <div class="picker-col" id="picker-books"></div>
        <div class="picker-col" id="picker-chapters"></div>
        <div class="picker-col picker-verses" id="picker-verses"></div>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn" id="picker-cancel">취소</button>
        <button type="button" class="btn btn-primary" id="picker-confirm" disabled>확인</button>
      </footer>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('.modal-backdrop').addEventListener('click', closePicker);
  modalEl.querySelector('#picker-close').addEventListener('click', closePicker);
  modalEl.querySelector('#picker-cancel').addEventListener('click', closePicker);
  modalEl.querySelector('#picker-confirm').addEventListener('click', confirmPicker);

  return modalEl;
}

function resetSelection(book = null) {
  selection = {
    book: book || selection.book,
    startChapter: null,
    startVerse: null,
    endChapter: null,
    endVerse: null,
  };
  clickPhase = 'start';
  updateSelectionDisplay();
}

function updateSelectionDisplay() {
  const el = document.getElementById('picker-selection');
  const confirmBtn = document.getElementById('picker-confirm');
  if (!selection.book) {
    el.textContent = '책을 선택하세요';
    confirmBtn.disabled = true;
    return;
  }
  if (selection.startChapter === null) {
    el.textContent = `${selection.book.korean} — 장을 선택하세요`;
    confirmBtn.disabled = true;
    return;
  }
  if (selection.startVerse === null) {
    el.textContent = `${selection.book.korean} ${selection.startChapter}장 — 절을 선택하세요`;
    confirmBtn.disabled = true;
    return;
  }
  const range = {
    book: selection.book.korean,
    startChapter: selection.startChapter,
    startVerse: selection.startVerse,
    endChapter: selection.endChapter ?? selection.startChapter,
    endVerse: selection.endVerse ?? selection.startVerse,
  };
  el.textContent = formatPassage(range);
  confirmBtn.disabled = false;
}

function renderBooks() {
  const container = document.getElementById('picker-books');
  container.innerHTML = '<h4>성경</h4>';
  const books = getBibleData().books;
  if (!books.length) {
    container.innerHTML += '<p class="picker-empty">성경 목록을 불러오지 못했습니다.<br>앱을 다시 시작해 주세요.</p>';
    return;
  }
  books.forEach((book) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-item' + (selection.book?.id === book.id ? ' active' : '');
    btn.textContent = book.korean;
    btn.addEventListener('click', () => {
      selection.book = book;
      selection.startChapter = null;
      selection.startVerse = null;
      selection.endChapter = null;
      selection.endVerse = null;
      clickPhase = 'start';
      renderBooks();
      renderChapters();
      renderVerses();
      updateSelectionDisplay();
    });
    container.appendChild(btn);
  });
}

function renderChapters() {
  const container = document.getElementById('picker-chapters');
  container.innerHTML = '<h4>장</h4>';
  if (!selection.book) return;
  for (let ch = 1; ch <= selection.book.chapters.length; ch++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-item' + (selection.startChapter === ch ? ' active' : '');
    btn.textContent = `${ch}장`;
    btn.addEventListener('click', () => {
      selection.startChapter = ch;
      selection.startVerse = null;
      selection.endChapter = null;
      selection.endVerse = null;
      clickPhase = 'start';
      renderChapters();
      renderVerses();
      updateSelectionDisplay();
    });
    container.appendChild(btn);
  }
}

function renderVerses() {
  const container = document.getElementById('picker-verses');
  container.innerHTML = '<h4>절</h4>';
  if (!selection.book || !selection.startChapter) return;

  const count = selection.book.chapters[selection.startChapter - 1] || 50;
  const grid = document.createElement('div');
  grid.className = 'verse-grid';

  for (let v = 1; v <= count; v++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-verse';
    btn.textContent = String(v);

    const inRange = isVerseSelected(v);
    if (inRange) btn.classList.add('in-range');

    btn.addEventListener('click', () => handleVerseClick(v));
    grid.appendChild(btn);
  }
  container.appendChild(grid);
}

function isVerseSelected(v) {
  if (selection.startVerse === null) return false;
  const endV = selection.endVerse ?? selection.startVerse;
  const endC = selection.endChapter ?? selection.startChapter;
  if (selection.startChapter === endC) {
    return v >= selection.startVerse && v <= endV;
  }
  return false;
}

function handleVerseClick(v) {
  if (clickPhase === 'start') {
    selection.startVerse = v;
    selection.endChapter = selection.startChapter;
    selection.endVerse = v;
    clickPhase = 'end';
  } else {
    if (v < selection.startVerse) {
      selection.endVerse = selection.startVerse;
      selection.startVerse = v;
    } else {
      selection.endVerse = v;
    }
    selection.endChapter = selection.startChapter;
    clickPhase = 'start';
  }
  renderVerses();
  updateSelectionDisplay();
}

function confirmPicker() {
  if (!selection.book || selection.startVerse === null) return;
  /** @type {VerseRange} */
  const range = {
    book: selection.book.korean,
    startChapter: selection.startChapter,
    startVerse: selection.startVerse,
    endChapter: selection.endChapter ?? selection.startChapter,
    endVerse: selection.endVerse ?? selection.startVerse,
  };
  if (onSelectCallback) onSelectCallback(range);
  closePicker();
}

export function closePicker() {
  if (modalEl) modalEl.classList.add('hidden');
}

/**
 * @param {'passage'|'key'} mode
 * @param {(range: VerseRange) => void} callback
 * @param {VerseRange|null} initial
 */
export function openVersePicker(mode, callback, initial = null) {
  ensureModal();
  pickerMode = mode;
  onSelectCallback = callback;

  document.getElementById('picker-title').textContent =
    mode === 'key' ? '요절 선택' : '구절 선택';
  document.getElementById('picker-hint').textContent =
    mode === 'key'
      ? '요절(단일 절 또는 범위)을 선택하세요.'
      : '시작 절을 클릭한 뒤, 끝 절을 클릭하세요.';

  if (initial) {
    const book = getBibleData().books.find((b) => b.korean === initial.book);
    selection = {
      book: book || null,
      startChapter: initial.startChapter,
      startVerse: initial.startVerse,
      endChapter: initial.endChapter,
      endVerse: initial.endVerse,
    };
    clickPhase = 'start';
  } else {
    resetSelection(null);
  }

  renderBooks();
  renderChapters();
  renderVerses();
  updateSelectionDisplay();
  modalEl.classList.remove('hidden');
}
