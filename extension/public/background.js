// Mindspace Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Create right-click context menu for selected text
  chrome.contextMenus.create({
    id: 'mindspace-save-selection',
    title: 'Save to Mindspace',
    contexts: ['selection'],
  });

  // Enable side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'mindspace-save-selection' && info.selectionText) {
    const text = info.selectionText.trim();
    if (!text) return;

    const sourceNote = tab?.title ? `\n\n— via ${tab.title}` : '';
    const fullContent = `${text}${sourceNote}`;
    const now = new Date().toISOString();

    const newThought = {
      id: crypto.randomUUID(),
      content: fullContent,
      category: 'study', // default category for web excerpts
      created_at: now,
      updated_at: now,
      deleted_at: null,
      source_url: info.pageUrl || null,
    };

    // Read existing thoughts, prepend new thought, and save
    const data = await chrome.storage.local.get(['thoughts']);
    const existing = Array.isArray(data.thoughts) ? data.thoughts : [];
    await chrome.storage.local.set({ thoughts: [newThought, ...existing] });

    // Show temporary badge confirmation on extension icon
    if (chrome.action?.setBadgeText) {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#2E6930' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2500);
    }
  }
});

