function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 마크다운(볼드·줄바꿈) → contenteditable HTML */
export function markdownToHtml(md) {
  if (!md) return '';
  const escaped = escapeHtml(md);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/** contenteditable → 마크다운 */
export function htmlToMarkdown(el) {
  if (!el) return '';
  const clone = el.cloneNode(true);

  clone.querySelectorAll('strong, b').forEach((node) => {
    const text = node.textContent || '';
    node.replaceWith(document.createTextNode(`**${text}**`));
  });

  let html = clone.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/div>/gi, '\n');
  html = html.replace(/<div[^>]*>/gi, '');
  html = html.replace(/<\/p>/gi, '\n');
  html = html.replace(/<p[^>]*>/gi, '');
  html = html.replace(/&nbsp;/gi, ' ');

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let text = tmp.textContent || '';
  text = text.replace(/\u00a0/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.replace(/^\n+/, '').replace(/\n+$/, '');
}

export function setEditableMarkdown(el, md) {
  if (!el) return;
  el.innerHTML = markdownToHtml(md || '');
}

export function getEditableMarkdown(el) {
  return htmlToMarkdown(el);
}
