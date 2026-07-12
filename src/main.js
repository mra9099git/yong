import { getWindowApi } from './tauriApi.js';
import {
  ensureDataDirs,
  formatDate,
  loadRecord,
  saveRecord,
} from './storage.js';
import {
  loadBibleData,
  parsePassageString,
  formatPassage,
  formatKeyVerseLabel,
} from './bibleUtils.js';
import {
  loadPassageText,
  renderPassageHtml,
  saveChapterInput,
  setUseNlt,
  getUseNlt,
} from './bibleText.js';
import { checkOnline } from './nltApi.js';
import { openVersePicker } from './versePicker.js';
import { initSidebar, refreshSidebar } from './sidebar.js';

const LS_KEY = 'daily-bread-prefs';

/** @type {import('./bibleUtils.js').VerseRange|null} */
let passageRange = null;
/** @type {import('./bibleUtils.js').VerseRange|null} */
let keyVerseRange = null;
let currentDate = formatDate();
let saveTimer = null;
let isDirty = false;
let inputChapterQueue = [];
let currentInputChapter = null;

const els = {};

function showInitError(message) {
  let bar = document.getElementById('init-error');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'init-error';
    bar.className = 'init-error';
    document.body.prepend(bar);
  }
  bar.textContent = message;
}

async function init() {
  if (!window.__TAURI__) {
    showInitError('Tauri 환경이 아닙니다. 실행.bat 또는 npm run tauri dev 로 실행해 주세요.');
    return;
  }

  try {
    await loadBibleData();
  } catch (err) {
    console.error(err);
    showInitError(`초기화 오류: ${err?.message || err}. 구절 선택이 동작하지 않을 수 있습니다.`);
  }

  loadPrefs();
  applyPrefs();
  setupResizeHandles();
  cacheElements();
  bindEvents();

  try {
    await ensureDataDirs();
  } catch (err) {
    console.error(err);
    showInitError(`데이터 폴더 생성 실패: ${err?.message || err}. 문서\\일용할양식 폴더 권한을 확인해 주세요.`);
  }

  initSidebar({
    onDateSelect: (date) => openDate(date),
    onDelete: async (date) => {
      if (date === currentDate) await openDate(formatDate());
      else await refreshSidebar(currentDate);
    },
  });

  try {
    const { getCurrentWindow } = getWindowApi();
    const win = getCurrentWindow();
    win.onCloseRequested(async () => {
      if (isDirty) await doSave();
    });
  } catch (err) {
    console.error('창 닫기 핸들러 등록 실패:', err);
  }

  try {
    await openDate(formatDate());
  } catch (err) {
    console.error(err);
    showInitError(`오늘 기록 열기 실패: ${err?.message || err}`);
    await refreshSidebar(formatDate());
  }
}

function cacheElements() {
  els.headerDate = document.getElementById('header-date');
  els.headerPassage = document.getElementById('header-passage');
  els.headerKeyVerse = document.getElementById('header-key-verse');
  els.bibleContent = document.getElementById('bible-content');
  els.biblePanel = document.getElementById('bible-panel');
  els.btnToggleBible = document.getElementById('btn-toggle-bible');
  els.btnInputBible = document.getElementById('btn-input-bible');
  els.interpretation = document.getElementById('interpretation');
  els.meditation = document.getElementById('meditation');
  els.saveStatus = document.getElementById('save-status');
  els.nltToggle = document.getElementById('nlt-toggle');
  els.nltOffline = document.getElementById('nlt-offline-msg');
  els.inputModal = document.getElementById('input-modal');
  els.inputModalTitle = document.getElementById('input-modal-title');
  els.inputModalText = document.getElementById('input-modal-text');
  els.inputModalWarning = document.getElementById('input-modal-warning');
}

function bindEvents() {
  document.getElementById('btn-pick-passage')?.addEventListener('click', () => {
    openVersePicker('passage', (range) => {
      passageRange = range;
      keyVerseRange = null;
      markDirty();
      updateHeader();
      refreshBible();
    }, passageRange);
  });

  document.getElementById('btn-pick-key')?.addEventListener('click', () => {
    if (!passageRange) {
      alert('먼저 구절을 선택해 주세요.');
      return;
    }
    openVersePicker('key', (range) => {
      keyVerseRange = range;
      markDirty();
      updateHeader();
      refreshBible();
    }, keyVerseRange);
  });

  els.btnToggleBible?.addEventListener('click', () => {
    els.biblePanel.classList.toggle('collapsed');
    els.btnToggleBible.textContent = els.biblePanel.classList.contains('collapsed') ? '▸' : '▾';
    savePrefs();
  });

  els.btnInputBible?.addEventListener('click', () => openInputModal());

  els.interpretation?.addEventListener('input', markDirty);
  els.meditation?.addEventListener('input', markDirty);

  els.interpretation?.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const ta = els.interpretation;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    markDirty();
  });

  els.nltToggle?.addEventListener('change', async () => {
    const online = await checkOnline();
    if (els.nltToggle.checked && !online) {
      els.nltToggle.checked = false;
      els.nltOffline?.classList.remove('hidden');
      return;
    }
    els.nltOffline?.classList.add('hidden');
    setUseNlt(els.nltToggle.checked);
    savePrefs();
    refreshBible();
  });

  setupInputModal();
}

function setupInputModal() {
  const close = () => els.inputModal?.classList.add('hidden');
  document.getElementById('input-modal-close')?.addEventListener('click', close);
  document.getElementById('input-modal-cancel')?.addEventListener('click', close);
  els.inputModal?.querySelector('.modal-backdrop')?.addEventListener('click', close);

  document.getElementById('input-modal-save')?.addEventListener('click', async () => {
    if (!passageRange || currentInputChapter === null) return;
    const text = els.inputModalText.value;
    const result = await saveChapterInput(passageRange, currentInputChapter, text);

    if (result.missing.length) {
      els.inputModalWarning.textContent = `${result.missing.join(', ')}절이 빠졌어요 (저장은 완료됨)`;
      els.inputModalWarning.classList.remove('hidden');
    } else {
      els.inputModalWarning.classList.add('hidden');
    }

    inputChapterQueue = inputChapterQueue.filter((ch) => ch !== currentInputChapter);
    if (inputChapterQueue.length) {
      currentInputChapter = inputChapterQueue[0];
      showInputChapter(currentInputChapter);
    } else {
      close();
      await refreshBible();
    }
  });
}

async function openDate(dateStr) {
  if (isDirty) await doSave();
  currentDate = dateStr;

  let record = await loadRecord(dateStr);
  if (!record) {
    record = {
      date: dateStr,
      passage: '',
      key_verse: '',
      book: '',
      interpretation: '',
      meditation: '',
    };
    try {
      await saveRecord(record);
    } catch (err) {
      console.error('저장 실패:', err);
      showInitError(`저장 실패: ${err?.message || err}`);
    }
  }

  passageRange = parsePassageString(record.passage);
  keyVerseRange = parsePassageString(record.key_verse);
  els.interpretation.value = record.interpretation || '';
  els.meditation.value = record.meditation || '';

  isDirty = false;
  updateHeader();
  await refreshBible();
  await refreshSidebar(currentDate);
}

function updateHeader() {
  els.headerDate.textContent = currentDate;
  els.headerPassage.textContent = passageRange ? formatPassage(passageRange) : '(구절 미선택)';
  els.headerKeyVerse.textContent =
    keyVerseRange && passageRange ? formatKeyVerseLabel(keyVerseRange, passageRange) : '';
}

async function refreshBible() {
  if (!passageRange) {
    els.bibleContent.innerHTML = '<p class="bible-empty">구절을 선택해 주세요.</p>';
    els.btnInputBible?.classList.add('hidden');
    return;
  }

  if (getUseNlt()) {
    const online = await checkOnline();
    if (!online) {
      els.nltOffline?.classList.remove('hidden');
      els.bibleContent.innerHTML = '<p class="bible-empty">오프라인 — NLT를 사용할 수 없습니다</p>';
      return;
    }
    els.nltOffline?.classList.add('hidden');
  }

  const result = await loadPassageText(passageRange, keyVerseRange);

  if (result.error) {
    els.bibleContent.innerHTML = `<p class="bible-empty">${result.error}</p>`;
    els.btnInputBible?.classList.add('hidden');
    return;
  }

  els.bibleContent.innerHTML = renderPassageHtml(result.verses, result.missingChapters);

  if (!getUseNlt() && result.missingChapters?.length) {
    els.btnInputBible?.classList.remove('hidden');
    inputChapterQueue = [...result.missingChapters];
  } else {
    els.btnInputBible?.classList.add('hidden');
  }
}

function openInputModal() {
  if (!inputChapterQueue.length && passageRange) {
    inputChapterQueue = getChaptersNeedingInput();
  }
  if (!inputChapterQueue.length) return;
  currentInputChapter = inputChapterQueue[0];
  showInputChapter(currentInputChapter);
  els.inputModal?.classList.remove('hidden');
}

function getChaptersNeedingInput() {
  if (!passageRange) return [];
  const chapters = [];
  for (let ch = passageRange.startChapter; ch <= passageRange.endChapter; ch++) {
    chapters.push(ch);
  }
  return chapters;
}

function showInputChapter(chapter) {
  els.inputModalTitle.textContent = `${passageRange.book} ${chapter}장 입력`;
  els.inputModalText.value = '';
  els.inputModalWarning.classList.add('hidden');
  const remaining = inputChapterQueue.length;
  document.getElementById('input-modal-hint').textContent =
    remaining > 1
      ? `${chapter}장 입력 (${remaining}장 남음). 절 번호로 시작: 1 본문...`
      : '절 번호로 시작하는 줄 형식으로 입력하세요. 예: 1 태초에...';
}

function markDirty() {
  isDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => doSave(), 2500);
  els.saveStatus.textContent = '저장 중...';
}

async function doSave() {
  const record = {
    date: currentDate,
    passage: passageRange ? formatPassage(passageRange) : '',
    key_verse: keyVerseRange ? formatPassage(keyVerseRange) : '',
    book: passageRange?.book || '',
    interpretation: els.interpretation.value,
    meditation: els.meditation.value,
  };
  await saveRecord(record);
  isDirty = false;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  els.saveStatus.textContent = `자동 저장됨 ${time}`;
  await refreshSidebar(currentDate);
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    if (prefs.sidebarWidth) document.documentElement.style.setProperty('--sidebar-width', prefs.sidebarWidth);
    if (prefs.bibleHeight) document.documentElement.style.setProperty('--bible-height', prefs.bibleHeight);
    if (prefs.interpWidth) document.documentElement.style.setProperty('--interp-width', prefs.interpWidth);
    if (prefs.bibleCollapsed) {
      document.getElementById('bible-panel')?.classList.add('collapsed');
      const btn = document.getElementById('btn-toggle-bible');
      if (btn) btn.textContent = '▸';
    }
    if (prefs.useNlt) {
      setUseNlt(true);
      const toggle = document.getElementById('nlt-toggle');
      if (toggle) toggle.checked = true;
    }
    if (prefs.windowWidth && prefs.windowHeight) {
      const { getCurrentWindow } = getWindowApi();
      getCurrentWindow().setSize({ type: 'Logical', width: prefs.windowWidth, height: prefs.windowHeight }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

function savePrefs() {
  const prefs = {
    sidebarWidth: getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim(),
    bibleHeight: getComputedStyle(document.documentElement).getPropertyValue('--bible-height').trim(),
    interpWidth: getComputedStyle(document.documentElement).getPropertyValue('--interp-width').trim(),
    bibleCollapsed: document.getElementById('bible-panel')?.classList.contains('collapsed'),
    useNlt: getUseNlt(),
  };
  const { getCurrentWindow } = getWindowApi();
  getCurrentWindow()
    .innerSize()
    .then((size) => {
      prefs.windowWidth = size.width;
      prefs.windowHeight = size.height;
      localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    })
    .catch(() => localStorage.setItem(LS_KEY, JSON.stringify(prefs)));
}

function applyPrefs() {
  /* applied in loadPrefs */
}

function setupResizeHandles() {
  setupDrag('sidebar-resize', 'h', (dx) => {
    const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 260;
    const next = Math.max(180, Math.min(400, cur + dx));
    document.documentElement.style.setProperty('--sidebar-width', `${next}px`);
  });

  setupDrag('bible-resize', 'v', (dy) => {
    const panel = document.getElementById('bible-panel');
    if (panel?.classList.contains('collapsed')) return;
    const area = document.getElementById('content-area');
    const ratio = Math.max(0.1, Math.min(0.7, (panel.offsetHeight + dy) / area.offsetHeight));
    document.documentElement.style.setProperty('--bible-height', `${(ratio * 100).toFixed(1)}%`);
  });

  setupDrag('work-resize', 'h', (dx) => {
    const cols = document.querySelector('.work-columns');
    if (!cols) return;
    const ratio = Math.max(0.2, Math.min(0.8, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--interp-width')) / 100 || 0.5) + dx / cols.offsetWidth));
    document.documentElement.style.setProperty('--interp-width', `${(ratio * 100).toFixed(1)}%`);
  });

  let resizeSaveTimer;
  document.addEventListener('mouseup', () => {
    clearTimeout(resizeSaveTimer);
    resizeSaveTimer = setTimeout(savePrefs, 300);
  });
}

function setupDrag(handleId, axis, onDrag) {
  const handle = document.getElementById(handleId);
  if (!handle) return;
  let startX, startY;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (axis === 'h') onDrag(dx);
      else onDrag(dy);
      startX = ev.clientX;
      startY = ev.clientY;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

document.addEventListener('DOMContentLoaded', init);
