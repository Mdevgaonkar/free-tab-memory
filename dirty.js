// Answers the background's "busy?" before a discard: unsaved input or playing media.
// ponytail: top frame only, heuristic (non-empty edited field, cleared on form submit). Misses unsaved state in iframes/canvas editors.
const edited = new Set();
const track = (e) => {
  if (e.isTrusted && e.target.nodeType === 1) edited.add(e.target);
};
document.addEventListener("input", track, true);
document.addEventListener("submit", () => edited.clear(), true);

const hasText = (el) => (el.isContentEditable ? el.textContent : el.value)?.trim();
const hasUnsavedInput = () => [...edited].some((el) => el.isConnected && hasText(el));
const mediaPlaying = () => [...document.querySelectorAll("video,audio")].some((m) => !m.paused && !m.ended);

chrome.runtime.onMessage.addListener((_, __, send) => {
  send(hasUnsavedInput() || mediaPlaying());
});
