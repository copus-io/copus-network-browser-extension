// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copus-publish',
    title: 'Publish to Copus',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copus-publish') {
    // Open the same popup as the toolbar icon
    chrome.action.openPopup();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'captureScreenshot') {
    const targetWindowId = message.windowId;

    chrome.tabs.captureVisibleTab(targetWindowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ success: true, dataUrl });
    });

    return true;
  }

  if (message.type === 'storeAuthData') {
    // Store both token and user data in extension storage
    chrome.storage.local.set({
      'copus_token': message.token,
      'copus_user': message.user
    }, () => {
      console.log('[Copus Extension] Auth data stored successfully');
    });

    return true;
  }

  if (message.type === 'clearAuthToken') {
    // Clear the authentication token and user data from extension storage
    chrome.storage.local.remove(['copus_token', 'copus_user'], () => {
      console.log('[Copus Extension] Auth data cleared successfully');
    });

    return true;
  }

  return undefined;
});
