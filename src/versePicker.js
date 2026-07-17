import { getBibleData, formatPassage, enumerateVerses } from './bibleUtils.js';
import { resolveBookName } from './pasteParser.js';

/** @typedef {import('./bibleUtils.js').VerseRange} VerseRange */

let modalEl = null;
let onSelectCallback = null;
let pickerMode = 'passage';
/** @type {VerseRange|null} */
let keyPassageRange = null;
let selection = { book: null, startChapter: null, startVerse: null, endChapter: null, endVerse: null };
let clickPhase = 'start';
let bookFilter = '';

function verseOrder(chapter, verse) {
  return chapter * 10000 + verse;
}

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
      <input type="search" id="picker-search" class="input picker-search" placeholder="책 검색 또는 마태 17 / 마태복음 17:1" />
      <div class="picker-selection" id="picker-selection"></div>
      <div class="picker-columns" id="picker-columns">
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

  const search = modalEl.querySelector('#picker-search');
  search.addEventListener('input', () => {
    bookFilter = search.value.trim();
    applySearchQuery(bookFilter);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySearchQuery(search.value.trim(), true);
    }
  });

  return modalEl;
}

/**
 * @param {string} query
 * @param {boolean} jumpOnEnter
 */
function applySearchQuery(query, jumpOnEnter = false) {
  if (pickerMode === 'key' && keyPassageRange) {
    renderPicker();
    return;
  }

  const q = (query || '').trim();
  if (!q) {
    renderBooks();
    return;
  }

  // 마태 17:1 / 마태복음 17 / Matthew 17:1-3
  const passMatch = q.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+)(?::(\d+))?)?)?$/);
  if (passMatch) {
    const book = resolveBookName(passMatch[1]);
    if (book) {
      const ch = parseInt(passMatch[2], 10);
      selection.book = book;
      selection.startChapter = ch;
      selection.startVerse = passMatch[3] ? parseInt(passMatch[3], 10) : null;
      selection.endChapter = ch;
      if (passMatch[5]) {
        selection.endChapter = parseInt(passMatch[4], 10);
        selection.endVerse = parseInt(passMatch[5], 10);
      } else if (passMatch[4]) {
        selection.endVerse = parseInt(passMatch[4], 10);
      } else if (passMatch[3]) {
        selection.endVerse = parseInt(passMatch[3], 10);
      } else {
        selection.endVerse = null;
      }
      clickPhase = selection.startVerse ? 'end' : 'start';
      bookFilter = book.korean;
      renderBooks();
      renderChapters();
      renderVerses();
      updateSelectionDisplay();
      if (jumpOnEnter && selection.startVerse !== null) {
        const confirmBtn = document.getElementById('picker-confirm');
        if (confirmBtn && !confirmBtn.disabled) confirmPicker();
      }
      return;
    }
  }

  bookFilter = q;
  const book = resolveBookName(q);
  if (book && (jumpOnEnter || book.korean === q || book.english.toLowerCase() === q.toLowerCase())) {
    selection.book = book;
    selection.startChapter = null;
    selection.startVerse = null;
    selection.endChapter = null;
    selection.endVerse = null;
    clickPhase = 'start';
  }
  renderBooks();
  renderChapters();
  renderVerses();
  updateSelectionDisplay();
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

function currentRange() {
  if (selection.startVerse === null || !selection.book) return null;
  return {
    book: selection.book.korean,
    startChapter: selection.startChapter,
    startVerse: selection.startVerse,
    endChapter: selection.endChapter ?? selection.startChapter,
    endVerse: selection.endVerse ?? selection.startVerse,
  };
}

function updateSelectionDisplay() {
  const el = document.getElementById('picker-selection');
  const confirmBtn = document.getElementById('picker-confirm');

  if (pickerMode === 'key' && keyPassageRange) {
    const range = currentRange();
    if (!range) {
      el.textContent = `${formatPassage(keyPassageRange)} 안에서 요절을 선택하세요`;
      confirmBtn.disabled = true;
      return;
    }
    el.textContent = `요절: ${formatPassage(range)}`;
    confirmBtn.disabled = false;
    return;
  }

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
  el.textContent = formatPassage(currentRange());
  confirmBtn.disabled = false;
}

function filteredBooks() {
  const books = getBibleData().books;
  if (!bookFilter || pickerMode === 'key') return books;
  const q = bookFilter.toLowerCase();
  return books.filter(
    (b) =>
      b.korean.includes(bookFilter) ||
      b.english.toLowerCase().includes(q) ||
      b.korean.replace(/복음$/, '').includes(bookFilter),
  );
}

function renderBooks() {
  const container = document.getElementById('picker-books');
  container.innerHTML = '<h4>성경</h4>';
  const books = filteredBooks();
  if (!books.length) {
    container.innerHTML +=
      '<p class="picker-empty">검색 결과가 없습니다.<br>책 이름을 다시 입력해 주세요.</p>';
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
    if (isVerseInSelection(selection.startChapter, v)) btn.classList.add('in-range');
    btn.addEventListener('click', () => handleVerseClick(v));
    grid.appendChild(btn);
  }
  container.appendChild(grid);
}

function renderPassageKeyVerses() {
  const container = document.getElementById('picker-verses');
  container.innerHTML = `<h4>${formatPassage(keyPassageRange)}</h4>`;
  if (!keyPassageRange) return;

  const verses = enumerateVerses(keyPassageRange);
  const multiChapter = keyPassageRange.startChapter !== keyPassageRange.endChapter;
  let lastChapter = null;

  verses.forEach(({ chapter, verse }) => {
    if (multiChapter && chapter !== lastChapter) {
      const heading = document.createElement('div');
      heading.className = 'picker-chapter-label';
      heading.textContent = `${chapter}장`;
      container.appendChild(heading);
      lastChapter = chapter;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-verse';
    btn.textContent = multiChapter ? `${chapter}:${verse}` : String(verse);
    if (isVerseInSelection(chapter, verse)) btn.classList.add('in-range');
    btn.addEventListener('click', () => handleKeyVerseClick(chapter, verse));
    container.appendChild(btn);
  });
}

function isVerseInSelection(chapter, verse) {
  if (selection.startVerse === null) return false;
  const start = verseOrder(selection.startChapter, selection.startVerse);
  const end = verseOrder(selection.endChapter ?? selection.startChapter, selection.endVerse ?? selection.startVerse);
  const current = verseOrder(chapter, verse);
  return current >= Math.min(start, end) && current <= Math.max(start, end);
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

function handleKeyVerseClick(chapter, verse) {
  if (clickPhase === 'start') {
    selection.startChapter = chapter;
    selection.startVerse = verse;
    selection.endChapter = chapter;
    selection.endVerse = verse;
    clickPhase = 'end';
  } else {
    const clicked = verseOrder(chapter, verse);
    const start = verseOrder(selection.startChapter, selection.startVerse);
    if (clicked < start) {
      selection.endChapter = selection.startChapter;
      selection.endVerse = selection.startVerse;
      selection.startChapter = chapter;
      selection.startVerse = verse;
    } else {
      selection.endChapter = chapter;
      selection.endVerse = verse;
    }
    clickPhase = 'start';
  }
  renderPassageKeyVerses();
  updateSelectionDisplay();
}

function confirmPicker() {
  const range = currentRange();
  if (!range) return;
  if (onSelectCallback) onSelectCallback(range);
  closePicker();
}

export function closePicker() {
  if (modalEl) modalEl.classList.add('hidden');
}

function renderPicker() {
  const columns = document.getElementById('picker-columns');
  const search = document.getElementById('picker-search');
  const isKeyInPassage = pickerMode === 'key' && keyPassageRange;

  columns.classList.toggle('key-mode', !!isKeyInPassage);
  if (search) {
    search.classList.toggle('hidden', !!isKeyInPassage);
    if (!isKeyInPassage) search.value = bookFilter;
  }

  if (isKeyInPassage) {
    document.getElementById('picker-books').innerHTML = '';
    document.getElementById('picker-chapters').innerHTML = '';
    renderPassageKeyVerses();
  } else {
    renderBooks();
    renderChapters();
    renderVerses();
  }
  updateSelectionDisplay();
}

/**
 * @param {'passage'|'key'} mode
 * @param {(range: VerseRange) => void} callback
 * @param {VerseRange|null} initial
 * @param {VerseRange|null} passageForKey 요절 선택 시 현재 구절 범위
 */
export function openVersePicker(mode, callback, initial = null, passageForKey = null) {
  ensureModal();
  pickerMode = mode;
  onSelectCallback = callback;
  keyPassageRange = mode === 'key' ? passageForKey : null;
  bookFilter = '';

  document.getElementById('picker-title').textContent =
    mode === 'key' ? '요절 선택' : '구절 선택';

  const search = document.getElementById('picker-search');
  if (search) search.value = '';

  if (mode === 'key' && passageForKey) {
    const book = getBibleData().books.find((b) => b.korean === passageForKey.book);
    document.getElementById('picker-hint').textContent =
      `${formatPassage(passageForKey)} 안에서 요절을 선택하세요. 시작 절 → 끝 절 순으로 클릭합니다.`;
    if (initial && initial.book === passageForKey.book) {
      selection = {
        book: book || null,
        startChapter: initial.startChapter,
        startVerse: initial.startVerse,
        endChapter: initial.endChapter,
        endVerse: initial.endVerse,
      };
    } else {
      selection = { book: book || null, startChapter: null, startVerse: null, endChapter: null, endVerse: null };
    }
    clickPhase = 'start';
  } else if (initial) {
    const book = getBibleData().books.find((b) => b.korean === initial.book);
    selection = {
      book: book || null,
      startChapter: initial.startChapter,
      startVerse: initial.startVerse,
      endChapter: initial.endChapter,
      endVerse: initial.endVerse,
    };
    clickPhase = 'start';
    document.getElementById('picker-hint').textContent =
      mode === 'key'
        ? '요절(단일 절 또는 범위)을 선택하세요.'
        : '시작 절을 클릭한 뒤, 끝 절을 클릭하세요. 위에서 책을 검색할 수 있습니다.';
  } else {
    resetSelection(null);
    selection.book = null;
    document.getElementById('picker-hint').textContent =
      mode === 'key'
        ? '요절(단일 절 또는 범위)을 선택하세요.'
        : '시작 절을 클릭한 뒤, 끝 절을 클릭하세요. 위에서 책을 검색할 수 있습니다.';
  }

  renderPicker();
  modalEl.classList.remove('hidden');
  if (search && mode !== 'key') {
    setTimeout(() => search.focus(), 0);
  }
}
