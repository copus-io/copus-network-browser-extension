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
    // Store token, user data, and login origin in extension storage
    const dataToStore = {
      'copus_token': message.token,
      'copus_user': message.user
    };

    // Store login origin if provided (domain where user is logged in)
    if (message.loginOrigin) {
      dataToStore['copus_login_origin'] = message.loginOrigin;
      console.log('[Copus Extension] Storing login origin:', message.loginOrigin);
    }

    chrome.storage.local.set(dataToStore, () => {
      console.log('[Copus Extension] Auth data stored successfully');
    });

    return true;
  }

  if (message.type === 'clearAuthToken') {
    // Clear the authentication token, user data, and login origin from extension storage
    chrome.storage.local.remove(['copus_token', 'copus_user', 'copus_login_origin'], () => {
      console.log('[Copus Extension] Auth data cleared successfully');
    });

    return true;
  }

  return undefined;
});
