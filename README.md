# free-tab-memory

Chrome extension to free memory without closing the tabs. It discards tabs (Chrome's own "Memory Saver" mechanism): the tab stays in the tab strip and reloads when you click it.

## Installation

1. Clone or download this repository and unzip it somewhere permanent. Chrome loads the extension from this folder, so don't delete it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Optional: pin the extension from the puzzle-piece menu.

Chrome will warn that the extension can "read and change all your data on all websites". This is needed so the extension can check tabs for unsaved work. Nothing leaves your browser.

After updating the code, click the reload icon on the extension card. The right-click menu items are created on install, so if one is missing, remove the extension and load it again.

## Usage

Right-click on a page, or right-click the extension icon, to open the menu. Chrome doesn't let extensions add items to the tab's own right-click menu.

## Features

- **Free tab memory (discard):** frees the current tab on demand. Also available by clicking the toolbar icon. If it's the active tab, you're switched to a neighbouring tab first, because Chrome can't discard the foreground tab.
- **Auto-free idle tabs:** every minute, tabs not opened for more than 5 minutes are discarded. Pinned tabs and tabs playing audio are skipped. On by default, toggle from the menu.
- **Exclude a tab from auto-free:** "Exclude this tab from auto-free" in the menu protects a single tab. The same item then reads "Include this tab in auto-free". Lasts for the browser session.
- **Unsaved-work protection:** a tab is not freed, by auto or manual, if it appears to have unsaved changes. The extension fires a fake `beforeunload` event to see if the page's own "leave site?" handler objects, and also checks for text typed into fields that hasn't been submitted. The manual action shows a "!" badge when it refuses.
- **Lazy-load reopened tab groups:** when a tab group is reopened, only the foreground tab loads. The other new background tabs in the group are discarded as soon as their URL is known, avoiding a memory and CPU spike. On by default, toggle from the menu.

## Limitations

- "Idle" means the tab hasn't been switched to. Activity inside a background tab doesn't reset the timer.
- Unsaved-work detection is a best guess. It checks the top page only (not iframes) and can't see unsaved state in canvas editors or custom apps that don't use normal text fields.
- Firing `beforeunload` runs the page's unload handlers, which can rarely cause side effects such as an analytics ping.
- Lazy-load also catches links you ctrl+click into a group, and can miss tabs if Chrome puts the extension's background worker to sleep mid-restore.
- Tabs that were open before installing need a reload to be covered by unsaved-work detection.
