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
    const extracted = extractPageTitle();
    sendResponse({
      title: (extracted && extracted.title) || document.title,
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
      console.log('[Copus CS] collectPageDataWithRetry called, URL:', currentUrl);

      // Initial delay to give React time to render (title and meta tags)
      await new Promise(r => setTimeout(r, 150));

      const initialTitle = document.title;
      const initialOgImage = document.querySelector("meta[property='og:image']");
      const initialContent = initialOgImage ? initialOgImage.content : null;

      console.log('[Copus CS] Initial state:', { title: initialTitle, ogImage: initialContent });

      // Detect page type and current state
      const isWorkPage = currentUrl.includes('/work/') || currentUrl.includes('/article/');
      const isTreasuryPage = currentUrl.includes('/treasury/') || currentUrl.includes('/space/');
      const isProfilePage = currentUrl.includes('/profile/') || currentUrl.includes('/user/');
      const isCopusSite = currentUrl.includes('copus.network') || currentUrl.includes('copus.io');
      const isDefaultOgImage = !initialContent || initialContent.includes('og-image.jpg');
      const hasWorkTitle = initialTitle && !initialTitle.startsWith('Copus') && initialTitle.includes('–');

      // Check if DOM is stale (URL says treasury but DOM shows work content)
      const initialExtracted = extractPageTitle();
      const isDomStale = initialExtracted && initialExtracted.isStale;

      // Determine if we need to wait for content to update
      let shouldWait = false;
      let waitingForDefault = false;
      let waitingForTreasury = false;

      if (isCopusSite) {
        if (isTreasuryPage && isDomStale) {
          // On treasury page but DOM still showing old content - wait for treasury content
          shouldWait = true;
          waitingForTreasury = true;
          console.log('[Copus CS] Treasury page with stale DOM, will wait for treasury content');
        } else if (isWorkPage && (isDefaultOgImage || !hasWorkTitle)) {
          // On work page but still showing default content - wait for work content
          shouldWait = true;
          waitingForDefault = false;
        } else if (!isWorkPage && !isTreasuryPage && !isProfilePage && (!isDefaultOgImage || hasWorkTitle)) {
          // On homepage but still showing work content - wait for default content
          shouldWait = true;
          waitingForDefault = true;
        }
      }

      console.log('[Copus CS] Wait decision:', { shouldWait, waitingForDefault, waitingForTreasury, isWorkPage, isTreasuryPage, isDefaultOgImage, hasWorkTitle, isDomStale });

      if (shouldWait) {
        // Wait up to 2 seconds for content to update (longer for treasury pages)
        const maxRetries = waitingForTreasury ? 4 : 3;
        for (let i = 0; i < maxRetries; i++) {
          await new Promise(r => setTimeout(r, 500));
          const newTitle = document.title;
          const newOgImage = document.querySelector("meta[property='og:image']");
          const newContent = newOgImage ? newOgImage.content : null;
          const newIsDefault = !newContent || newContent.includes('og-image.jpg');
          const newHasWorkTitle = newTitle && !newTitle.startsWith('Copus') && newTitle.includes('–');

          // Check extracted title for treasury pages
          const newExtracted = extractPageTitle();
          const newIsDomStale = newExtracted && newExtracted.isStale;

          console.log('[Copus CS] Retry', i + 1, ':', { title: newTitle, extractedTitle: newExtracted?.title, ogImage: newContent, isDefault: newIsDefault, isDomStale: newIsDomStale });

          // Check if content has updated to expected state
          let contentReady = false;
          if (waitingForTreasury) {
            // For treasury, we need DOM to have treasury content (not stale)
            contentReady = !newIsDomStale && newExtracted && newExtracted.title;
          } else if (waitingForDefault) {
            contentReady = newIsDefault || newTitle.startsWith('Copus');  // Waiting for homepage defaults
          } else {
            contentReady = !newIsDefault || newHasWorkTitle;              // Waiting for work-specific content
          }

          if (contentReady) {
            console.log('[Copus CS] Content ready, returning data');
            const images = collectPageImages();
            return {
              title: (newExtracted && newExtracted.title) || document.title,
              url: window.location.href,
              images,
              ogImageContent: newOgImage ? newOgImage.content : null
            };
          }
        }
        console.log('[Copus CS] Timeout waiting for content update');
      }

      // Collect current data (either no wait needed or timeout reached)
      const images = collectPageImages();
      const finalOgImage = document.querySelector("meta[property='og:image']");
      const finalExtracted = extractPageTitle();
      const finalTitle = (finalExtracted && finalExtracted.title) || document.title;
      console.log('[Copus CS] Returning final data:', { title: finalTitle, ogImage: finalOgImage?.content, imageCount: images.length });
      return {
        title: finalTitle,
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

  // Show traces indicator on page
  if (message.type === 'showTracesIndicator') {
    showTracesFloatingIndicator(message.count, message.traces);
    sendResponse({ success: true });
    return;
  }

  // Hide traces indicator
  if (message.type === 'hideTracesIndicator') {
    hideTracesFloatingIndicator();
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

// Extract the actual page title from DOM content (for pages where document.title doesn't update)
// Returns { title: string, isStale: boolean } to indicate if the DOM might still be showing old content
function extractPageTitle() {
  const url = window.location.href;

  // For Copus treasury/space pages, look for the name in the page content
  if (url.includes('/treasury/') || url.includes('/space/')) {
    // Look for treasury/space specific elements first
    const treasuryNameElement = document.querySelector('[class*="space-name"], [class*="treasury-name"], [class*="SpaceName"]');
    if (treasuryNameElement && treasuryNameElement.textContent) {
      const text = treasuryNameElement.textContent.trim();
      if (text && text.length > 0 && text.length < 100) {
        return { title: text + ' | Copus', isStale: false };
      }
    }

    // Try h1, but check if it looks like treasury content (short, no article-like patterns)
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent) {
      const text = h1.textContent.trim();
      // Treasury names are usually short and simple
      // Work titles often have punctuation, are longer, or have article-like patterns
      const looksLikeTreasuryName = text.length < 30 && !text.includes('|') && !text.includes('！') && !text.includes('？');
      if (looksLikeTreasuryName) {
        return { title: text + ' | Copus', isStale: false };
      }
    }

    // If we're on treasury URL but can't find treasury-specific content, DOM is probably stale
    return { title: null, isStale: true };
  }

  // For profile pages
  if (url.includes('/profile/') || url.includes('/user/')) {
    const selectors = [
      '[class*="username"]',
      '[class*="profile-name"]',
      '[class*="user-name"]',
      '[class*="UserName"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const text = element.textContent.trim();
        if (text && text.length > 0 && text.length < 50 && !text.includes('|')) {
          return { title: text + ' | Copus', isStale: false };
        }
      }
    }

    return { title: null, isStale: true };
  }

  return { title: null, isStale: false }; // Use document.title as fallback
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

// ========== TRACES FLOATING INDICATOR ==========
// Shows a floating indicator when others have curated this page

const TRACES_INDICATOR_ID = 'copus-traces-indicator';

function showTracesFloatingIndicator(count, traces = []) {
  // Remove existing indicator if any
  hideTracesFloatingIndicator();

  // Don't show on Copus pages
  if (window.location.hostname.includes('copus.network') ||
      window.location.hostname.includes('copus.io')) {
    return;
  }

  // Create the floating indicator
  const indicator = document.createElement('div');
  indicator.id = TRACES_INDICATOR_ID;
  indicator.innerHTML = `
    <div class="copus-traces-bubble">
      <div class="copus-traces-icon">
        <img src="https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg" alt="Copus" width="28" height="28" />
      </div>
      <div class="copus-traces-content">
        <span class="copus-traces-line1"><span class="copus-traces-count">${count}</span> ${count === 1 ? 'person' : 'people'}</span>
        <span class="copus-traces-line2">shared thoughts here</span>
      </div>
      <div class="copus-traces-arrow">→</div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.id = TRACES_INDICATOR_ID + '-styles';
  style.textContent = `
    #${TRACES_INDICATOR_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: copusTracesSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes copusTracesSlideIn {
      from {
        opacity: 0;
        transform: translateX(100px) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes copusTracesPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(242, 58, 0, 0.2); }
      50% { box-shadow: 0 4px 30px rgba(242, 58, 0, 0.35); }
    }

    @keyframes copusTracesWave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }

    .copus-traces-bubble {
      display: flex;
      align-items: center;
      gap: 10px;
      background: white;
      color: #333;
      padding: 12px 16px;
      border-radius: 50px;
      border: 1.5px solid #f23a00;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(242, 58, 0, 0.2);
      transition: all 0.3s ease;
      animation: copusTracesPulse 2s ease-in-out infinite;
    }

    .copus-traces-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(242, 58, 0, 0.3);
      animation: none;
    }

    .copus-traces-bubble:hover .copus-traces-icon img {
      animation: copusTracesWave 0.5s ease-in-out;
    }

    .copus-traces-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .copus-traces-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .copus-traces-line1 {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
      color: #333;
    }

    .copus-traces-count {
      font-weight: 700;
    }

    .copus-traces-line2 {
      font-size: 11px;
      opacity: 0.8;
      line-height: 1.2;
    }

    .copus-traces-arrow {
      font-size: 16px;
      opacity: 0.8;
      transition: transform 0.2s ease;
    }

    .copus-traces-bubble:hover .copus-traces-arrow {
      transform: translateX(3px);
    }

    /* Minimized state after a while */
    #${TRACES_INDICATOR_ID}.minimized .copus-traces-bubble {
      padding: 10px;
      border-radius: 50%;
      border-width: 1.5px;
    }

    #${TRACES_INDICATOR_ID}.minimized .copus-traces-content,
    #${TRACES_INDICATOR_ID}.minimized .copus-traces-arrow {
      display: none;
    }

    #${TRACES_INDICATOR_ID}.minimized .copus-traces-icon img {
      width: 24px;
      height: 24px;
    }

    #${TRACES_INDICATOR_ID}.minimized .copus-traces-icon::after {
      content: '${count}';
      position: absolute;
      top: -12px;
      right: -16px;
      background: #f23a00;
      color: white;
      font-size: 11px;
      font-weight: bold;
      width: 20px;
      height: 20px;
      line-height: 20px;
      border-radius: 50%;
      text-align: center;
      box-shadow: 0 2px 6px rgba(242, 58, 0, 0.4);
    }

    #${TRACES_INDICATOR_ID}.minimized .copus-traces-icon {
      position: relative;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(indicator);

  // Click handler - open extension sidepanel with traces view
  indicator.addEventListener('click', () => {
    console.log('[Copus Traces] Bubble clicked, opening extension panel');
    chrome.runtime.sendMessage({
      type: 'openTracesPanel',
      traces: traces
    }, (response) => {
      if (response && response.success) {
        console.log('[Copus Traces] Panel opened via:', response.method);
      } else {
        console.log('[Copus Traces] Failed to open panel:', response?.error);
      }
    });
  });

  // Minimize after 8 seconds
  setTimeout(() => {
    if (document.getElementById(TRACES_INDICATOR_ID)) {
      indicator.classList.add('minimized');
    }
  }, 8000);

  console.log('[Copus Traces] Showing floating indicator for', count, 'traces');
}

function hideTracesFloatingIndicator() {
  const indicator = document.getElementById(TRACES_INDICATOR_ID);
  const styles = document.getElementById(TRACES_INDICATOR_ID + '-styles');

  if (indicator) indicator.remove();
  if (styles) styles.remove();
}

// Show inline traces panel (sidebar injected into page)
const TRACES_PANEL_ID = 'copus-traces-panel';

function showTracesInlinePanel(traces) {
  // Remove existing panel
  hideTracesInlinePanel();

  const panel = document.createElement('div');
  panel.id = TRACES_PANEL_ID;

  // Build traces HTML
  const tracesHtml = traces.map(trace => {
    const author = trace.authorInfo || {};
    const avatarUrl = author.faceUrl || 'https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg';
    const username = author.username || 'Anonymous';
    const timeAgo = formatTimeAgo(trace.createAt);
    const truncatedContent = trace.content.length > 120 ? trace.content.substring(0, 120) + '...' : trace.content;

    return `
      <div class="copus-trace-card">
        <div class="copus-trace-header">
          <img class="copus-trace-avatar" src="${avatarUrl}" alt="${username}" onerror="this.src='https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg'" />
          <div class="copus-trace-author">
            <span class="copus-trace-username">${username}</span>
            <span class="copus-trace-time">${timeAgo}</span>
          </div>
        </div>
        <p class="copus-trace-text">${truncatedContent}</p>
        <div class="copus-trace-stats">
          <span>💬 ${trace.commentCount || 0}</span>
          <span class="copus-treasure-stat">💎 ${trace.collectCount || 0}</span>
        </div>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="copus-panel-backdrop"></div>
    <div class="copus-panel-content">
      <div class="copus-panel-header">
        <div class="copus-panel-title">
          <img src="https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg" alt="Copus" width="24" height="24" />
          <span>Traces on this page</span>
        </div>
        <button class="copus-panel-close">×</button>
      </div>
      <div class="copus-panel-body">
        ${tracesHtml}
      </div>
      <div class="copus-panel-footer">
        <a href="https://copus.network" target="_blank" class="copus-panel-link">
          Powered by Copus
        </a>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.id = TRACES_PANEL_ID + '-styles';
  style.textContent = `
    #${TRACES_PANEL_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .copus-panel-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      animation: copusFadeIn 0.2s ease-out;
    }

    @keyframes copusFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .copus-panel-content {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 360px;
      max-width: 90vw;
      background: #f8f9fa;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      animation: copusSlideIn 0.3s ease-out;
    }

    @keyframes copusSlideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .copus-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #eee;
    }

    .copus-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }

    .copus-panel-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .copus-panel-close:hover {
      background: #f0f0f0;
      color: #333;
    }

    .copus-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .copus-trace-card {
      background: white;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .copus-trace-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .copus-trace-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      background: #eee;
    }

    .copus-trace-author {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .copus-trace-username {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }

    .copus-trace-time {
      font-size: 11px;
      color: #999;
    }

    .copus-trace-text {
      font-size: 13px;
      line-height: 1.5;
      color: #555;
      margin: 0 0 12px 0;
    }

    .copus-trace-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #888;
    }

    .copus-highfive-btn {
      margin-left: auto;
      background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
      border: 1px solid #ffe066;
      border-radius: 16px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .copus-highfive-btn:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #fff3cc 0%, #ffeb99 100%);
    }

    .copus-panel-footer {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #eee;
      text-align: center;
    }

    .copus-panel-link {
      font-size: 11px;
      color: #999;
      text-decoration: none;
    }

    .copus-panel-link:hover {
      color: #f23a00;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  // Event listeners
  panel.querySelector('.copus-panel-backdrop').addEventListener('click', hideTracesInlinePanel);
  panel.querySelector('.copus-panel-close').addEventListener('click', hideTracesInlinePanel);

  // High-five buttons
  panel.querySelectorAll('.copus-highfive-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const count = parseInt(btn.textContent.replace('👋 ', '')) || 0;
      btn.textContent = '👋 ' + (count + 1);
      btn.style.animation = 'none';
      btn.offsetHeight; // Trigger reflow
      btn.style.animation = 'copusHighfiveWave 0.5s ease';
    });
  });

  // Add highfive animation
  const extraStyle = document.createElement('style');
  extraStyle.textContent = `
    @keyframes copusHighfiveWave {
      0% { transform: scale(1) rotate(0deg); }
      25% { transform: scale(1.2) rotate(-10deg); }
      50% { transform: scale(1.2) rotate(10deg); }
      75% { transform: scale(1.1) rotate(-5deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
  `;
  document.head.appendChild(extraStyle);

  console.log('[Copus Traces] Inline panel opened');
}

function hideTracesInlinePanel() {
  const panel = document.getElementById(TRACES_PANEL_ID);
  const styles = document.getElementById(TRACES_PANEL_ID + '-styles');
  if (panel) panel.remove();
  if (styles) styles.remove();
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return Math.floor(seconds / 604800) + 'w ago';
}

