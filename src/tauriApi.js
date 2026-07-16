/** Tauri 바닐라 JS(번들러 없음)용 API 접근 */
function api() {
  const t = window.__TAURI__;
  if (!t) {
    throw new Error('Tauri API를 사용할 수 없습니다. npm run tauri dev 로 실행해 주세요.');
  }
  return t;
}

export function getFs() {
  return api().fs;
}

export function getHttp() {
  return api().http;
}

export function getWindowApi() {
  return api().window;
}

/** @param {string} cmd @param {Record<string, unknown>} [args] */
export function invoke(cmd, args) {
  return api().core.invoke(cmd, args);
}
