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

// Function to check for authentication token in localStorage
async function checkForAuthToken() {
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
      // Check if it's a valid JWT format (3 parts separated by dots)
      const tokenParts = token.split('.');
      console.log('[Copus Extension] Token parts:', tokenParts.length);

      if (tokenParts.length === 3) {
        console.log('[Copus Extension] Found valid JWT token in localStorage');

        try {
          // Validate token with correct API endpoint
          console.log('[Copus Extension] Validating token with API...');
          const response = await fetch('https://api-test.copus.network/client/user/userInfo', {
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
            chrome.runtime.sendMessage({
              type: 'clearAuthToken'
            });
          }
        } catch (error) {
          console.error('[Copus Extension] Token validation error:', error);
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
      // No token found, clear extension storage
      console.log('[Copus Extension] No token found in localStorage, clearing extension storage');
      chrome.runtime.sendMessage({
        type: 'clearAuthToken'
      });
    }
  } else {
    console.log('[Copus Extension] Not monitoring this domain:', currentDomain);
  }
}

// Check for token on page load and when localStorage changes
console.log('[Copus Extension] Content script loaded on:', window.location.href);
setTimeout(checkForAuthToken, 1000); // Delay to ensure page is fully loaded
checkForAuthToken();

// Monitor localStorage changes for auth token
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  console.log('[Copus Extension] localStorage.setItem called:', key);
  if (key === 'copus_token') {
    console.log('[Copus Extension] copus_token stored, re-checking auth...');
    setTimeout(checkForAuthToken, 100); // Re-validate after token update
  }
};

localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  console.log('[Copus Extension] localStorage.removeItem called:', key);
  if (key === 'copus_token') {
    console.log('[Copus Extension] copus_token removed, clearing extension storage...');
    chrome.runtime.sendMessage({
      type: 'clearAuthToken'
    });
  }
};

// Also monitor for storage events (for cross-tab changes)
window.addEventListener('storage', function(e) {
  console.log('[Copus Extension] Storage event:', e.key, e.newValue ? 'set' : 'removed');
  if (e.key === 'copus_token') {
    console.log('[Copus Extension] copus_token changed via storage event, re-checking...');
    setTimeout(checkForAuthToken, 100);
  }
});

// Periodic check every 5 seconds (as backup)
setInterval(() => {
  console.log('[Copus Extension] Periodic auth check...');
  checkForAuthToken();
}, 5000);

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
    console.log('[Copus Extension] Received recheck auth request from popup');
    checkForAuthToken();
    sendResponse({ success: true });
  }
});
