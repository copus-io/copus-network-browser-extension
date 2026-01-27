// ========== TRACES FEATURE - Detect curations on current URL ==========

// API base URL
function getApiBaseUrl() {
  return 'https://api-prod.copus.network';
}

// Check for traces on a URL and notify content script
async function checkAndShowTraces(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip Copus pages
  if (url.includes('copus.network') || url.includes('copus.io') || url.includes('copus.ai')) {
    return;
  }

  try {
    const apiBaseUrl = getApiBaseUrl();
    const apiUrl = `${apiBaseUrl}/plugin/plugin/author/article/articlesByTargetUrl?pageIndex=0&pageSize=50&targetUrl=${encodeURIComponent(url)}`;

    // Get auth token
    let token = null;
    try {
      const result = await chrome.storage.local.get(['copus_token']);
      token = result.copus_token;
    } catch (e) {
      // Storage might not be available
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    // API returns { status: 1, data: { data: [...], pageCount, pageIndex, pageSize, totalCount } }
    let traces = [];
    if (result.status === 1 && result.data) {
      traces = Array.isArray(result.data.data) ? result.data.data : [];
    }

    if (traces.length > 0) {
      // Send message to content script to show indicator with retry
      const sendWithRetry = async (attempts = 0) => {
        if (attempts > 5) return;
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'showTracesIndicator',
            count: traces.length,
            traces: traces
          });
        } catch (e) {
          setTimeout(() => sendWithRetry(attempts + 1), 500);
        }
      };
      sendWithRetry();
    }
  } catch (e) {
    // Error checking traces - silently fail
  }
}

// Listen for page navigation completion
chrome.webNavigation.onCompleted.addListener((details) => {
  // Only check main frame (not iframes)
  if (details.frameId === 0) {
    // Small delay to ensure content script is ready
    setTimeout(() => {
      checkAndShowTraces(details.tabId, details.url);
    }, 1500);
  }
});

// Also check when tab becomes active (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      checkAndShowTraces(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    // Tab might not exist
  }
});

// Toggle the side panel
async function toggleSidePanel(tab) {
  if (!tab || !tab.id) {
    console.error('[Copus Extension BG] No valid tab to toggle side panel');
    return;
  }

  try {
    // Open the side panel for this tab
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('[Copus Extension BG] Opened side panel for tab:', tab.id);
  } catch (error) {
    console.error('[Copus Extension BG] Failed to open side panel:', error);
  }
}

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  console.log('[Copus Extension BG] Icon clicked');
  toggleSidePanel(tab);
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  console.log('[Copus Extension BG] Command received:', command);
  if (command === 'toggle-sidebar') {
    toggleSidePanel(tab);
  }
});

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.contextMenus.create({
    id: 'copus-publish',
    title: 'Publish to Copus',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copus-publish') {
    // Open side panel
    toggleSidePanel(tab);
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

  // Set flag to show traces view when user opens sidepanel
  if (message.type === 'setShowTracesFlag') {
    console.log('[Copus BG] Setting show traces flag');
    chrome.storage.local.set({ 'copus_show_traces': true }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Open traces panel directly - creates popup window with sidepanel content
  if (message.type === 'openTracesPanel') {
    console.log('[Copus BG] Opening traces panel');

    // Store traces data and flag
    chrome.storage.local.set({
      'copus_show_traces': true,
      'copus_traces_data': message.traces || []
    }, async () => {
      try {
        // Try to open sidepanel first (works if called from valid context)
        if (sender.tab && sender.tab.id) {
          try {
            await chrome.sidePanel.open({ tabId: sender.tab.id });
            console.log('[Copus BG] Sidepanel opened successfully');
            sendResponse({ success: true, method: 'sidepanel' });
            return;
          } catch (e) {
            console.log('[Copus BG] Sidepanel failed, falling back to popup window:', e.message);
          }
        }

        // Fallback: Open as popup window
        const popupWidth = 380;
        const popupHeight = 600;

        // Get current window to position popup
        const currentWindow = await chrome.windows.getCurrent();
        const left = currentWindow.left + currentWindow.width - popupWidth - 20;
        const top = currentWindow.top + 60;

        await chrome.windows.create({
          url: chrome.runtime.getURL('sidepanel.html?view=traces'),
          type: 'popup',
          width: popupWidth,
          height: popupHeight,
          left: Math.max(0, left),
          top: Math.max(0, top)
        });

        console.log('[Copus BG] Traces popup window opened');
        sendResponse({ success: true, method: 'popup' });
      } catch (error) {
        console.error('[Copus BG] Failed to open traces panel:', error);
        sendResponse({ success: false, error: error.message });
      }
    });

    return true;
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
