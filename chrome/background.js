// Service worker. The toolbar button is disabled everywhere and enabled per tab
// only while the content script reports a pull request page (no "tabs" permission needed).

chrome.action.disable();

chrome.runtime.onInstalled.addListener(() => chrome.action.disable());
chrome.runtime.onStartup.addListener(() => chrome.action.disable());

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'serpiff:pr-page' || !sender.tab || sender.tab.id === undefined) return;
  if (message.isPr) chrome.action.enable(sender.tab.id);
  else chrome.action.disable(sender.tab.id);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  try {
    // The content script knows the page URL; ask it for the normalized PR URL.
    const reply = await chrome.tabs.sendMessage(tab.id, { type: 'serpiff:get-pr-url' });
    if (!reply || typeof reply.url !== 'string') return;
    const target = `serpiff://open?url=${encodeURIComponent(reply.url)}`;
    // A browser-initiated navigation to an external scheme. Chrome shows its external-protocol prompt;
    // how it asks for an extension-initiated navigation is unverified. The GitHub page stays as it is.
    await chrome.tabs.update(tab.id, { url: target });
  } catch {
    // No content script in the tab (not a PR page): nothing to do.
  }
});
