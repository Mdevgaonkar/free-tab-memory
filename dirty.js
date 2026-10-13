// Answers the background's "dirty?" before a discard: page's own beforeunload warning, or fields the user typed in.
// ponytail: top frame only, heuristic (non-empty edited field, cleared on form submit). Misses unsaved state in iframes/canvas editors.
const edited = new Set();
const track = (e) => {
  if (e.isTrusted && e.target.nodeType === 1) edited.add(e.target);
};
document.addEventListener("input", track, true);
document.addEventListener("submit", () => edited.clear(), true);

const hasText = (el) => (el.isContentEditable ? el.textContent : el.value)?.trim();

// Fire a fake beforeunload (never navigates) and see if the page's own handler asks to block leaving.
// ponytail: runs the page's unload handlers, so rare side effects like an analytics ping.
function pageBlocksUnload() {
  const e = document.createEvent("BeforeUnloadEvent");
  e.initEvent("beforeunload", false, true);
  dispatchEvent(e);
  return e.defaultPrevented || e.returnValue !== "";
}

chrome.runtime.onMessage.addListener((_, __, send) => {
  send(pageBlocksUnload() || [...edited].some((el) => el.isConnected && hasText(el)));
});
