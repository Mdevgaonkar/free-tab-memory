const IDLE_MS = 5 * 60 * 1000;
const EXCLUDE = "Exclude this tab from auto-free";
const INCLUDE = "Include this tab in auto-free";

// Excluded tab ids live for the browser session (tab ids don't survive a restart anyway).
const excluded = async () => (await chrome.storage.session.get({ ex: [] })).ex;
const dirty = (id) => chrome.tabs.sendMessage(id, "dirty").catch(() => false); // no content script (chrome:// etc.) = nothing to lose

async function toggleExclude(tabId) {
  const ex = await excluded();
  const next = ex.includes(tabId) ? ex.filter((i) => i !== tabId) : [...ex, tabId];
  await chrome.storage.session.set({ ex: next });
  return label(tabId);
}
async function label(tabId) {
  chrome.contextMenus.update("exclude", { title: (await excluded()).includes(tabId) ? INCLUDE : EXCLUDE });
}
chrome.tabs.onActivated.addListener(({ tabId }) => label(tabId));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "free", title: "Free tab memory (discard)", contexts: ["page", "action"] });
  chrome.contextMenus.create({ id: "auto", title: "Auto-free tabs idle > 5 min", type: "checkbox", checked: true, contexts: ["page", "action"] });
  chrome.contextMenus.create({ id: "lazy", title: "Lazy-load reopened tab groups", type: "checkbox", checked: true, contexts: ["page", "action"] });
  chrome.contextMenus.create({ id: "exclude", title: EXCLUDE, contexts: ["page", "action"] });
  chrome.storage.local.set({ auto: true, lazy: true });
  chrome.alarms.create("sweep", { periodInMinutes: 1 });
});

async function free(tab) {
  if (await dirty(tab.id)) { // unsaved input: refuse and flag it
    chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    return void setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 3000);
  }
  // Chrome refuses to discard the foreground tab, so switch to a neighbour first.
  if (tab.active) {
    const [other] = (await chrome.tabs.query({ windowId: tab.windowId })).filter((t) => t.id !== tab.id);
    if (!other) return;
    await chrome.tabs.update(other.id, { active: true });
  }
  chrome.tabs.discard(tab.id);
}

chrome.contextMenus.onClicked.addListener((info, tab) =>
  info.menuItemId === "free" ? free(tab)
    : info.menuItemId === "exclude" ? toggleExclude(tab.id)
    : chrome.storage.local.set({ [info.menuItemId]: info.checked })
);
chrome.action.onClicked.addListener(free);

// Reopened tab groups: keep only the foreground tab loaded, discard the new background ones as soon as their URL is known.
// ponytail: also catches ctrl+clicked links opened into a group; set is lost if the worker sleeps mid-restore.
const fresh = new Set();
chrome.tabs.onCreated.addListener(async (t) => {
  if (!t.active && (await chrome.storage.local.get("lazy")).lazy) fresh.add(t.id);
});
chrome.tabs.onRemoved.addListener((id) => fresh.delete(id));
chrome.tabs.onUpdated.addListener((id, info, t) => {
  if (!fresh.has(id)) return;
  if (t.active) return void fresh.delete(id);
  if (t.groupId !== -1 && (t.url || t.pendingUrl)) {
    fresh.delete(id);
    chrome.tabs.discard(id);
  } else if (info.status === "complete") fresh.delete(id);
});

// lastAccessed updates when a tab is activated; ponytail: in-page interaction in a background tab isn't tracked
chrome.alarms.onAlarm.addListener(async () => {
  if (!(await chrome.storage.local.get("auto")).auto) return;
  const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false, pinned: false });
  const ex = await excluded();
  for (const t of tabs)
    if (Date.now() - t.lastAccessed > IDLE_MS && !ex.includes(t.id) && !(await dirty(t.id))) chrome.tabs.discard(t.id);
});
