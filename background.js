// Toggle sidebar in the active tab
async function toggleSidebar(tab) {
  if (!tab || !tab.id) {
    console.error('[Copus Extension BG] No valid tab to toggle sidebar');
    return;
  }

  // Don't inject into chrome:// or edge:// pages
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
    console.log('[Copus Extension BG] Cannot inject into browser internal pages');
    return;
  }

  try {
    // Try to send message to content script
    await chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
    console.log('[Copus Extension BG] Toggled sidebar in tab:', tab.id);
  } catch (error) {
    // Content script might not be loaded, inject it first
    console.log('[Copus Extension BG] Content script not ready, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
      // Wait a bit for script to initialize, then toggle
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
        } catch (e) {
          console.error('[Copus Extension BG] Failed to toggle after injection:', e);
        }
      }, 100);
    } catch (injectError) {
      console.error('[Copus Extension BG] Failed to inject content script:', injectError);
    }
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('[Copus Extension BG] Icon clicked');
  toggleSidebar(tab);
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  console.log('[Copus Extension BG] Command received:', command);
  if (command === 'toggle-sidebar') {
    toggleSidebar(tab);
  }
});

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copus-publish',
    title: 'Publish to Copus',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copus-publish') {
    // Toggle sidebar instead of opening popup
    toggleSidebar(tab);
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

  // Open URL and inject token after page loads (handles session persistence)
  if (message.type === 'openUrlAndInjectToken') {
    const { url, token, user } = message;
    console.log('[Copus Extension BG] Opening URL and injecting token:', url);

    (async () => {
      try {
        // Create the new tab
        const tab = await chrome.tabs.create({ url });
        console.log('[Copus Extension BG] Created tab:', tab.id);

        if (token) {
          // Wait for the tab to finish loading before injecting
          const injectToken = async (tabId, attempts = 0) => {
            if (attempts > 10) {
              console.log('[Copus Extension BG] Max injection attempts reached');
              return;
            }

            try {
              // Check if content script is ready
              await chrome.tabs.sendMessage(tabId, {
                type: 'injectToken',
                token: token,
                user: user
              });
              console.log('[Copus Extension BG] Successfully injected token into tab');
            } catch (error) {
              // Content script might not be ready yet, retry after delay
              console.log('[Copus Extension BG] Injection attempt', attempts + 1, 'failed, retrying...');
              setTimeout(() => injectToken(tabId, attempts + 1), 500);
            }
          };

          // Start injection attempts after a short delay for page to load
          setTimeout(() => injectToken(tab.id), 1000);
        }
      } catch (error) {
        console.error('[Copus Extension BG] Error opening URL:', error);
      }
    })();

    return true;
  }

  // Fetch image via background script (bypasses CORS)
  if (message.type === 'fetchImageAsDataUrl') {
    (async () => {
      try {
        console.log('[Copus Extension BG] Fetching image:', message.url);
        const response = await fetch(message.url);

        if (!response.ok) {
          sendResponse({ success: false, error: `HTTP ${response.status}` });
          return;
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = () => {
          const dataUrl = reader.result;
          console.log('[Copus Extension BG] Image fetched, size:', blob.size, 'type:', blob.type);
          sendResponse({ success: true, dataUrl, mimeType: blob.type, size: blob.size });
        };

        reader.onerror = () => {
          sendResponse({ success: false, error: 'Failed to read image blob' });
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('[Copus Extension BG] Image fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  // Proxy API requests through background script to avoid popup network issues
  if (message.type === 'apiRequest') {
    (async () => {
      try {
        console.log('[Copus Extension BG] Making API request:', message.url);
        const response = await fetch(message.url, {
          method: message.method || 'GET',
          headers: message.headers || {},
          body: message.body ? JSON.stringify(message.body) : undefined
        });

        const data = await response.json();
        console.log('[Copus Extension BG] API response status:', response.status);
        sendResponse({ success: true, data, status: response.status });
      } catch (error) {
        console.error('[Copus Extension BG] API request failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  return undefined;
});
