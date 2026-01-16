// Inject marker IMMEDIATELY to indicate extension is installed
// This MUST run before any other code to ensure the main site can detect it
if (document.documentElement) {
  document.documentElement.setAttribute('data-copus-extension-installed', 'true');
}

// Set up message listener IMMEDIATELY so sidepanel can communicate
// Function declarations below are hoisted, so they'll be available
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // collectPageData is SYNCHRONOUS - do NOT return true
  if (message.type === 'collectPageData') {
    const images = collectPageImages();
    const ogImage = document.querySelector("meta[property='og:image']");
    sendResponse({
      title: document.title,
      url: window.location.href,
      images,
      ogImageContent: ogImage ? ogImage.content : null
    });
    return; // Synchronous - no return true needed
  }

  // collectPageDataWithRetry - waits for React Helmet to potentially update og:image
  if (message.type === 'collectPageDataWithRetry') {
    const collectWithRetry = async () => {
      const currentUrl = window.location.href;

      // Initial delay to give React time to render (title and meta tags)
      await new Promise(r => setTimeout(r, 150));

      const initialTitle = document.title;
      const initialOgImage = document.querySelector("meta[property='og:image']");
      const initialContent = initialOgImage ? initialOgImage.content : null;

      // Detect page type and current state
      const isWorkPage = currentUrl.includes('/work/') || currentUrl.includes('/article/');
      const isCopusSite = currentUrl.includes('copus.network') || currentUrl.includes('copus.io');
      const isDefaultOgImage = !initialContent || initialContent.includes('og-image.jpg');
      const hasWorkTitle = initialTitle && !initialTitle.startsWith('Copus') && initialTitle.includes('–');

      // Determine if we need to wait for content to update
      let shouldWait = false;
      let waitingForDefault = false;

      if (isCopusSite) {
        if (isWorkPage && (isDefaultOgImage || !hasWorkTitle)) {
          // On work page but still showing default content - wait for work content
          shouldWait = true;
          waitingForDefault = false;
        } else if (!isWorkPage && (!isDefaultOgImage || hasWorkTitle)) {
          // On homepage but still showing work content - wait for default content
          shouldWait = true;
          waitingForDefault = true;
        }
      }

      if (shouldWait) {
        // Wait up to 1.5 seconds for content to update
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 500));
          const newTitle = document.title;
          const newOgImage = document.querySelector("meta[property='og:image']");
          const newContent = newOgImage ? newOgImage.content : null;
          const newIsDefault = !newContent || newContent.includes('og-image.jpg');
          const newHasWorkTitle = newTitle && !newTitle.startsWith('Copus') && newTitle.includes('–');

          // Check if content has updated to expected state
          const contentReady = waitingForDefault
            ? (newIsDefault || newTitle.startsWith('Copus'))  // Waiting for homepage defaults
            : (!newIsDefault || newHasWorkTitle);              // Waiting for work-specific content

          if (contentReady) {
            const images = collectPageImages();
            return {
              title: document.title,
              url: window.location.href,
              images,
              ogImageContent: newOgImage ? newOgImage.content : null
            };
          }
        }
      }

      // Collect current data (either no wait needed or timeout reached)
      const images = collectPageImages();
      const finalOgImage = document.querySelector("meta[property='og:image']");
      return {
        title: document.title,
        url: window.location.href,
        images,
        ogImageContent: finalOgImage ? finalOgImage.content : null
      };
    };

    collectWithRetry().then(data => sendResponse(data));
    return true; // Async response
  }

  // recheckAuth calls async function but we don't wait for it
  if (message.type === 'recheckAuth') {
    checkForAuthToken(true); // Fire and forget
    sendResponse({ success: true });
    return;
  }

  // injectToken is SYNCHRONOUS
  if (message.type === 'injectToken') {
    const { token, user } = message;

    if (token) {
      const existingToken = localStorage.getItem('copus_token') || sessionStorage.getItem('copus_token');

      if (!existingToken || existingToken !== token) {
        localStorage.setItem('copus_token', token);
        if (user) {
          localStorage.setItem('copus_user', JSON.stringify(user));
        }
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'copus_token',
          newValue: token,
          storageArea: localStorage
        }));
        window.dispatchEvent(new CustomEvent('copus_token_injected', {
          detail: { token: token }
        }));
        sendResponse({ success: true, injected: true });
      } else {
        sendResponse({ success: true, injected: false, reason: 'already_present' });
      }
    } else {
      sendResponse({ success: false, error: 'No token provided' });
    }
    return;
  }
});

// Sync tokens between website and extension
// Website is ALWAYS the source of truth - when user logs in/out on website, extension follows
// Important: Check BOTH localStorage AND sessionStorage since mainsite can use either
// CRITICAL: Don't auto-clear extension storage just because website storage is empty on page load
// (new tabs start with empty sessionStorage even if user is logged in elsewhere)
async function syncTokens() {
  const allowedDomains = ['copus.ai', 'www.copus.ai', 'copus.network', 'www.copus.network', 'localhost', '127.0.0.1'];
  const currentDomain = window.location.hostname;

  if (!allowedDomains.includes(currentDomain) && !currentDomain.includes('copus')) {
    return; // Not a copus domain
  }

  try {
    // Check BOTH localStorage and sessionStorage (mainsite uses sessionStorage when "Remember me" is disabled)
    const websiteToken = localStorage.getItem('copus_token') || sessionStorage.getItem('copus_token');
    const websiteUser = localStorage.getItem('copus_user') || sessionStorage.getItem('copus_user');
    const result = await chrome.storage.local.get(['copus_token', 'copus_user']);

    // Case 1: Both have tokens - ensure they match (website wins if different)
    if (websiteToken && result.copus_token) {
      if (websiteToken !== result.copus_token) {
        await chrome.storage.local.set({
          copus_token: websiteToken,
          copus_user: websiteUser ? JSON.parse(websiteUser) : null
        });
      } else {
      }
    }
    // Case 2: Website has token, extension doesn't - sync TO extension (login)
    else if (websiteToken && !result.copus_token) {
      await chrome.storage.local.set({
        copus_token: websiteToken,
        copus_user: websiteUser ? JSON.parse(websiteUser) : null
      });
    }
    // Case 3: Extension has token, website doesn't
    // IMPORTANT: Don't auto-clear! The website might just have empty sessionStorage on a new tab
    // Only clear when we receive an explicit logout event from the website
    else if (!websiteToken && result.copus_token) {

      // ALWAYS inject into localStorage for reliability
      // The mainsite's storage utility checks both localStorage and sessionStorage
      // Using localStorage ensures it persists across tab reloads
      localStorage.setItem('copus_token', result.copus_token);
      if (result.copus_user) {
        localStorage.setItem('copus_user', JSON.stringify(result.copus_user));
      }

      // Dispatch storage event to notify React app of the new token
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'copus_token',
        newValue: result.copus_token,
        storageArea: localStorage
      }));

      // Also dispatch a custom event that the React app might listen to
      window.dispatchEvent(new CustomEvent('copus_token_injected', {
        detail: { token: result.copus_token }
      }));
    }
    // Case 4: Both empty - already in sync (logged out)
    else {
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

    try {
      // Clear extension's stored token and user data
      await chrome.storage.local.remove(['copus_token', 'copus_user']);

      // Notify background script to ensure all extension state is cleared
      chrome.runtime.sendMessage({ type: 'clearAuthToken' });

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

  try {
    // Clear extension's stored token and user data
    await chrome.storage.local.remove(['copus_token', 'copus_user']);

    // Clear validation cache
    lastValidationTime = 0;
    lastValidatedToken = null;

    // Notify website that extension has finished clearing
    // This keeps extension and website in perfect sync
    window.dispatchEvent(new CustomEvent('copus_logout_complete'));
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

  // First, check for og:image (standard SEO meta tag) - highest priority
  const ogImage = document.querySelector("meta[property='og:image']");
  if (ogImage && ogImage.content) {
    const ogSrc = getAbsoluteUrl(ogImage.content);
    if (ogSrc && !uniqueSources.has(ogSrc)) {
      images.push({
        src: ogSrc,
        width: 0,
        height: 0,
        isOgImage: true
      });
      uniqueSources.add(ogSrc);
    }
  }

  // Then collect all page images
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


  if (allowedDomains.includes(currentDomain) || currentDomain.includes('copus') || isLocalDev) {

    // Check for the correct token storage key from main site
    // Check BOTH localStorage and sessionStorage (mainsite uses sessionStorage when "Remember me" is NOT checked)
    const token = localStorage.getItem('copus_token') || sessionStorage.getItem('copus_token');
    const userData = localStorage.getItem('copus_user') || sessionStorage.getItem('copus_user');


    if (token) {
      // Check cache to avoid redundant API calls
      const now = Date.now();
      const isCacheValid = (now - lastValidationTime) < VALIDATION_CACHE_DURATION;
      const isSameToken = token === lastValidatedToken;

      if (!force && isCacheValid && isSameToken) {
        return;
      }

      // Check if it's a valid JWT format (3 parts separated by dots)
      const tokenParts = token.split('.');

      if (tokenParts.length === 3) {

        try {
          // Detect environment and use appropriate API
          // IMPORTANT: Must match the main site's API endpoints
          const isTestEnv = currentDomain.includes('test') || isLocalDev;
          const apiBaseUrl = isTestEnv ? 'https://api-test.copus.network' : 'https://api-prod.copus.network';
          const apiUrl = `${apiBaseUrl}/client/user/userInfo`;

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });


          if (response.ok) {
            const userInfo = await response.json();

            // Update cache
            lastValidationTime = Date.now();
            lastValidatedToken = token;

            // Store both token and user data in extension storage
            chrome.runtime.sendMessage({
              type: 'storeAuthData',
              token: token,
              user: userInfo.data
            }, (response) => {
            });
          } else {
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
        chrome.runtime.sendMessage({
          type: 'clearAuthToken'
        });
      }
    } else {
      // No token found in this tab's localStorage
      // DON'T clear extension storage - user might have closed the copus.network tab
      // Extension should keep the token until user explicitly logs out
      lastValidationTime = 0;
      lastValidatedToken = null;
    }
  } else {
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

setTimeout(() => checkForAuthToken(false), 1000); // Delay to ensure page is fully loaded

// Monitor localStorage changes for auth token
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (key === 'copus_token') {
    // Sync token from website to extension
    syncTokens();
    // Also validate it
    debouncedAuthCheck(2000); // 2 second debounce
  }
};

localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'copus_token') {
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
    // Sync token changes from other tabs
    syncTokens();
    // Use debounced check to prevent rapid successive calls from cross-tab updates
    debouncedAuthCheck(2000); // 2 second debounce
  }
});

