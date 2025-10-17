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
  const allowedDomains = ['copus.ai', 'www.copus.ai', 'copus.network', 'api-test.copus.network', 'localhost', '127.0.0.1'];
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
          // Use the plugin-specific userInfo endpoint
          const apiUrl = 'https://api-test.copus.network/plugin/plugin/user/userInfo';

          // Validate token with API endpoint
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
            console.log('[Copus Extension] Token validation failed, clearing storage');
            // Clear cache on failed validation
            lastValidationTime = 0;
            lastValidatedToken = null;
            chrome.runtime.sendMessage({
              type: 'clearAuthToken'
            });
          }
        } catch (error) {
          console.error('[Copus Extension] Token validation error:', error);
          // Clear cache on error
          lastValidationTime = 0;
          lastValidatedToken = null;
          chrome.runtime.sendMessage({
            type: 'clearAuthToken'
          });
        }
      } else {
        console.log('[Copus Extension] Invalid token format (not JWT)');
        chrome.runtime.sendMessage({
          type: 'clearAuthToken'
        });
      }
    } else {
      // No token found, clear extension storage and cache
      console.log('[Copus Extension] No token found in localStorage, clearing extension storage');
      lastValidationTime = 0;
      lastValidatedToken = null;
      chrome.runtime.sendMessage({
        type: 'clearAuthToken'
      });
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
    console.log('[Copus Extension] copus_token stored, debouncing auth check...');
    // Use debounced check to prevent rapid successive calls
    debouncedAuthCheck(2000); // 2 second debounce
  }
};

localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'copus_token') {
    console.log('[Copus Extension] copus_token removed, clearing extension storage...');
    // Clear cache when token is removed
    lastValidationTime = 0;
    lastValidatedToken = null;
    chrome.runtime.sendMessage({
      type: 'clearAuthToken'
    });
  }
};

// Also monitor for storage events (for cross-tab changes)
window.addEventListener('storage', function(e) {
  if (e.key === 'copus_token') {
    console.log('[Copus Extension] copus_token changed via storage event, debouncing auth check...');
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
