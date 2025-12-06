// Inject marker IMMEDIATELY to indicate extension is installed
// This MUST run before any other code to ensure the main site can detect it
document.documentElement.setAttribute('data-copus-extension-installed', 'true');
console.log('[Copus Extension] Injected extension marker into DOM at:', window.location.href);

// Sync tokens between website and extension
// Website is ALWAYS the source of truth - when user logs in/out on website, extension follows
async function syncTokens() {
  const allowedDomains = ['copus.ai', 'www.copus.ai', 'copus.network', 'www.copus.network', 'localhost', '127.0.0.1'];
  const currentDomain = window.location.hostname;

  if (!allowedDomains.includes(currentDomain) && !currentDomain.includes('copus')) {
    return; // Not a copus domain
  }

  try {
    const websiteToken = localStorage.getItem('copus_token');
    const websiteUser = localStorage.getItem('copus_user');
    const result = await chrome.storage.local.get(['copus_token', 'copus_user']);

    // Case 1: Both have tokens - ensure they match (website wins if different)
    if (websiteToken && result.copus_token) {
      if (websiteToken !== result.copus_token) {
        console.log('[Copus Extension] Tokens differ - syncing FROM website TO extension');
        await chrome.storage.local.set({
          copus_token: websiteToken,
          copus_user: websiteUser ? JSON.parse(websiteUser) : null
        });
      } else {
        console.log('[Copus Extension] Tokens already in sync');
      }
    }
    // Case 2: Website has token, extension doesn't - sync TO extension (login)
    else if (websiteToken && !result.copus_token) {
      console.log('[Copus Extension] Syncing token FROM website TO extension (login)');
      await chrome.storage.local.set({
        copus_token: websiteToken,
        copus_user: websiteUser ? JSON.parse(websiteUser) : null
      });
      console.log('[Copus Extension] Token synced to extension successfully');
    }
    // Case 3: Extension has token, website doesn't - CLEAR extension (logout)
    // Website is source of truth, so if website logged out, extension should too
    else if (!websiteToken && result.copus_token) {
      console.log('[Copus Extension] Website logged out - clearing extension token');
      await chrome.storage.local.remove(['copus_token', 'copus_user']);
      console.log('[Copus Extension] Extension token cleared (synced logout from website)');

      // Also notify background script to ensure logout is propagated
      chrome.runtime.sendMessage({ type: 'clearAuthToken' });
      console.log('[Copus Extension] Notified background script of logout sync');
    }
    // Case 4: Both empty - already in sync (logged out)
    else {
      console.log('[Copus Extension] Both website and extension logged out - in sync');
    }
  } catch (error) {
    console.error('[Copus Extension] Error syncing tokens:', error);
  }
}

// Sync tokens immediately on page load
syncTokens();

// Listen for logout postMessage from the website
window.addEventListener('message', async (event) => {
  // Verify message is from Copus website
  if (event.data.type === 'COPUS_LOGOUT' && event.data.source === 'copus-website') {
    console.log('[Copus Extension] Received logout postMessage from website');

    try {
      // Clear extension's stored token and user data
      await chrome.storage.local.remove(['copus_token', 'copus_user']);
      console.log('[Copus Extension] Cleared extension storage after logout');

      // Notify background script to ensure all extension state is cleared
      chrome.runtime.sendMessage({ type: 'clearAuthToken' });
      console.log('[Copus Extension] Notified background script of logout');

      // Clear validation cache
      lastValidationTime = 0;
      lastValidatedToken = null;
    } catch (error) {
      console.error('[Copus Extension] Error clearing extension storage on logout:', error);
    }
  }
});

// Listen for logout custom events from the website (legacy support)
window.addEventListener('copus_logout', async (event) => {
  console.log('[Copus Extension] Received logout custom event from website (legacy)');

  try {
    // Clear extension's stored token and user data
    await chrome.storage.local.remove(['copus_token', 'copus_user']);
    console.log('[Copus Extension] Cleared extension storage on logout');

    // Clear validation cache
    lastValidationTime = 0;
    lastValidatedToken = null;

    // Notify website that extension has finished clearing
    // This keeps extension and website in perfect sync
    window.dispatchEvent(new CustomEvent('copus_logout_complete'));
    console.log('[Copus Extension] Sent logout complete confirmation to website');
  } catch (error) {
    console.error('[Copus Extension] Error clearing extension storage on logout:', error);
    // Still send completion event even on error so website doesn't hang
    window.dispatchEvent(new CustomEvent('copus_logout_complete'));
  }
});

function getAbsoluteUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (error) {
    return url;
  }
}

function collectPageImages() {
  const rawImages = Array.from(document.images || []);
  const uniqueSources = new Set();
  const images = [];

  rawImages.forEach((image) => {
    if (!image || !image.src) {
      return;
    }

    const absoluteSrc = getAbsoluteUrl(image.src);

    if (!absoluteSrc || uniqueSources.has(absoluteSrc)) {
      return;
    }

    uniqueSources.add(absoluteSrc);
    images.push({
      src: absoluteSrc,
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0
    });
  });

  const ogImage = document.querySelector("meta[property='og:image']");
  if (ogImage && ogImage.content) {
    const ogSrc = getAbsoluteUrl(ogImage.content);

    if (!uniqueSources.has(ogSrc)) {
      images.unshift({
        src: ogSrc,
        width: 0,
        height: 0
      });
      uniqueSources.add(ogSrc);
    }
  }

  return images;
}

// Cache for validation results to avoid redundant API calls
let lastValidationTime = 0;
let lastValidatedToken = null;
const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Debounce timer for auth checks
let authCheckDebounceTimer = null;

// Function to check for authentication token in localStorage
async function checkForAuthToken(force = false) {
  // Check for Copus domains including localhost development server
  const allowedDomains = ['copus.ai', 'www.copus.ai', 'copus.network', 'www.copus.network', 'api-prod.copus.network', 'localhost', '127.0.0.1'];
  const currentDomain = window.location.hostname;
  const currentPort = window.location.port;

  // Also check for localhost with specific port (5177 for dev server)
  const isLocalDev = (currentDomain === 'localhost' || currentDomain === '127.0.0.1') &&
                    (currentPort === '5177' || currentPort === '3000' || currentPort === '5173');

  console.log('[Copus Extension] Current domain:', currentDomain, 'port:', currentPort);
  console.log('[Copus Extension] Is local dev:', isLocalDev);
  console.log('[Copus Extension] Should monitor:', allowedDomains.includes(currentDomain) || currentDomain.includes('copus') || isLocalDev);

  if (allowedDomains.includes(currentDomain) || currentDomain.includes('copus') || isLocalDev) {
    console.log('[Copus Extension] Checking auth token on:', `${currentDomain}:${currentPort}`);

    // Check for the correct token storage key from main site
    const token = localStorage.getItem('copus_token');
    const userData = localStorage.getItem('copus_user');

    console.log('[Copus Extension] Token found:', token ? `${token.substring(0, 20)}...` : 'None');
    console.log('[Copus Extension] User data found:', userData ? 'Yes' : 'No');

    if (token) {
      // Check cache to avoid redundant API calls
      const now = Date.now();
      const isCacheValid = (now - lastValidationTime) < VALIDATION_CACHE_DURATION;
      const isSameToken = token === lastValidatedToken;

      if (!force && isCacheValid && isSameToken) {
        console.log('[Copus Extension] Using cached validation result (validated', Math.floor((now - lastValidationTime) / 1000), 'seconds ago)');
        return;
      }

      // Check if it's a valid JWT format (3 parts separated by dots)
      const tokenParts = token.split('.');
      console.log('[Copus Extension] Token parts:', tokenParts.length);

      if (tokenParts.length === 3) {
        console.log('[Copus Extension] Found valid JWT token in localStorage');

        try {
          // Detect environment and use appropriate API
          // IMPORTANT: Must match the main site's API endpoints
          const isTestEnv = currentDomain.includes('test') || isLocalDev;
          const apiBaseUrl = isTestEnv ? 'https://api-test.copus.network/copusV2' : 'https://api-prod.copus.network/copusV2';
          const apiUrl = `${apiBaseUrl}/client/user/userInfo`;

          console.log('[Copus Extension] Detected environment:', isTestEnv ? 'TEST' : 'PRODUCTION');
          console.log('[Copus Extension] Validating token with API:', apiUrl);
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('[Copus Extension] API response status:', response.status);

          if (response.ok) {
            const userInfo = await response.json();
            console.log('[Copus Extension] Token validated successfully, user:', userInfo.data?.username || 'Unknown');

            // Update cache
            lastValidationTime = Date.now();
            lastValidatedToken = token;

            // Store both token and user data in extension storage
            chrome.runtime.sendMessage({
              type: 'storeAuthData',
              token: token,
              user: userInfo.data
            }, (response) => {
              console.log('[Copus Extension] Auth data stored in extension');
            });
          } else {
            console.log('[Copus Extension] Token validation failed with status:', response.status);
            // Clear cache but DON'T remove token from storage
            // User might be offline or API might be down
            lastValidationTime = 0;
            lastValidatedToken = null;
          }
        } catch (error) {
          console.error('[Copus Extension] Token validation error:', error);
          // Clear cache but DON'T remove token from storage
          // User might be offline or have network issues
          lastValidationTime = 0;
          lastValidatedToken = null;
        }
      } else {
        console.log('[Copus Extension] Invalid token format (not JWT)');
        chrome.runtime.sendMessage({
          type: 'clearAuthToken'
        });
      }
    } else {
      // No token found in this tab's localStorage
      // DON'T clear extension storage - user might have closed the copus.network tab
      // Extension should keep the token until user explicitly logs out
      console.log('[Copus Extension] No token found in this tab, but keeping extension storage');
      lastValidationTime = 0;
      lastValidatedToken = null;
    }
  } else {
    console.log('[Copus Extension] Not monitoring this domain:', currentDomain);
  }
}

// Debounced version of checkForAuthToken to prevent rapid successive calls
function debouncedAuthCheck(delay = 1000) {
  if (authCheckDebounceTimer) {
    clearTimeout(authCheckDebounceTimer);
  }
  authCheckDebounceTimer = setTimeout(() => {
    checkForAuthToken();
  }, delay);
}

// Check for token on page load and when localStorage changes
console.log('[Copus Extension] Content script loaded on:', window.location.href);

setTimeout(() => checkForAuthToken(false), 1000); // Delay to ensure page is fully loaded

// Monitor localStorage changes for auth token
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (key === 'copus_token') {
    console.log('[Copus Extension] copus_token stored, syncing to extension...');
    // Sync token from website to extension
    syncTokens();
    // Also validate it
    debouncedAuthCheck(2000); // 2 second debounce
  }
};

localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'copus_token') {
    console.log('[Copus Extension] copus_token removed, syncing logout to extension...');
    // Sync logout from website to extension
    syncTokens();
    // Clear cache when token is removed
    lastValidationTime = 0;
    lastValidatedToken = null;
  }
};

// Also monitor for storage events (for cross-tab changes)
window.addEventListener('storage', function(e) {
  if (e.key === 'copus_token') {
    console.log('[Copus Extension] copus_token changed via storage event, syncing...');
    // Sync token changes from other tabs
    syncTokens();
    // Use debounced check to prevent rapid successive calls from cross-tab updates
    debouncedAuthCheck(2000); // 2 second debounce
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'collectPageData') {
    const images = collectPageImages();

    sendResponse({
      title: document.title,
      url: window.location.href,
      images
    });
  }

  if (message.type === 'recheckAuth') {
    console.log('[Copus Extension] Received recheck auth request from popup, forcing validation');
    // Force validation bypass cache when explicitly requested by popup
    checkForAuthToken(true);
    sendResponse({ success: true });
  }
});
