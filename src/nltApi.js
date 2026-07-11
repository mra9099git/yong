import { fetch } from '@tauri-apps/plugin-http';
import { getBookByKorean } from './bibleUtils.js';

const API_BASE = 'https://api.nlt.to/api/passages';

/** @param {{ book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number }} range */
function toNltRef(range) {
  const book = getBookByKorean(range.book);
  const nltName = book?.nlt || range.book;
  if (range.startChapter === range.endChapter) {
    if (range.startVerse === range.endVerse) {
      return `${nltName}.${range.startChapter}.${range.startVerse}`;
    }
    return `${nltName}.${range.startChapter}.${range.startVerse}-${range.endVerse}`;
  }
  return `${nltName}.${range.startChapter}.${range.startVerse}-${nltName}.${range.endChapter}.${range.endVerse}`;
}

/** @returns {Promise<{ ok: boolean, html?: string, error?: string }>} */
export async function fetchNltPassage(range) {
  const ref = toNltRef(range);
  const url = `${API_BASE}?ref=${encodeURIComponent(ref)}`;
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { ok: false, error: `NLT API 오류 (${response.status})` };
    }
    const html = await response.text();
    return { ok: true, html };
  } catch (err) {
    return { ok: false, error: err?.message || '네트워크 연결을 확인해 주세요.' };
  }
}

/** @param {string} html @returns {Map<string, string>} key = "chapter:verse" */
export function parseNltHtml(html) {
  const verses = new Map();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('verse_export, [class*="verse"]').forEach((el) => {
    const ch = el.getAttribute('ch');
    const vn = el.getAttribute('vn');
    if (ch && vn) {
      const text = el.textContent?.trim() || '';
      verses.set(`${ch}:${vn}`, text);
    }
  });

  if (verses.size === 0) {
    const body = doc.body?.innerHTML || html;
    const parts = body.split(/<span class="vn">(\d+)<\/span>/i);
    let currentChapter = '1';
    const chHeader = body.match(/class="bk_ch_vs_header"[^>]*>([^<:]+):/i);
    if (chHeader) {
      const chNum = body.match(/ch="(\d+)"/);
      if (chNum) currentChapter = chNum[1];
    }
    for (let i = 1; i < parts.length; i += 2) {
      const vn = parts[i];
      const text = parts[i + 1]?.replace(/<[^>]+>/g, '').trim() || '';
      if (text) verses.set(`${currentChapter}:${vn}`, text);
    }
  }

  return verses;
}

export async function checkOnline() {
  try {
    const response = await fetch('https://api.nlt.to/', { method: 'HEAD', connectTimeout: 3000 });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}
