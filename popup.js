console.log('Popup script loaded');

const state = {
  coverImage: null,
  coverSourceType: null,
  coverImageFile: null, // Store original file for upload
  images: [],
  activeTabId: null,
  activeWindowId: null,
  imageSelectionVisible: false,
  pageTitle: '',
  pageUrl: '',
  authToken: null,
  userInfo: null,
  isLoggedIn: false,
  selectedTopic: 'life' // Default to life topic
};

const elements = {};

// Local storage functions for token management
function saveAuthToken(token) {
  try {
    localStorage.setItem('copus_auth_token', token);
    console.log('Auth token saved to local storage');
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

function loadAuthToken() {
  try {
    const token = localStorage.getItem('copus_auth_token');
    console.log('Auth token loaded from local storage:', token ? 'Found' : 'Not found');
    return token;
  } catch (error) {
    console.error('Failed to load auth token:', error);
    return null;
  }
}

function clearAuthToken() {
  try {
    localStorage.removeItem('copus_auth_token');
    console.log('Auth token cleared from local storage');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

function cacheElements() {
  // Login screen elements
  elements.loginScreen = document.getElementById('login-screen');
  elements.loginButton = document.getElementById('login-button');
  elements.mainContainer = document.getElementById('main-container');

  // Main app elements
  elements.pageUrlDisplay = document.getElementById('page-url-display');
  elements.pageTitleInput = document.getElementById('page-title-input');
  elements.coverContainer = document.getElementById('cover-container');
  elements.coverEmpty = document.getElementById('cover-empty');
  elements.coverPreview = document.getElementById('cover-preview');
  elements.coverRemove = document.getElementById('cover-remove');
  elements.coverUpload = document.getElementById('cover-upload');
  elements.coverScreenshot = document.getElementById('cover-screenshot');
  elements.imageSelectionToggle = document.getElementById('toggle-detected-images');
  elements.topicSelect = document.getElementById('topic-select');
  elements.recommendationInput = document.getElementById('recommendation-input');
  elements.charCounter = document.getElementById('char-counter');
  elements.titleCharCounter = document.getElementById('title-char-counter');
  elements.publishButton = document.getElementById('publish-button');
  elements.cancelButton = document.getElementById('cancel-button');
  elements.statusMessage = document.getElementById('status-message');
  elements.toast = document.getElementById('toast');
  elements.compactMain = document.querySelector('.compact-main');
  elements.imageSelectionView = document.getElementById('image-selection-view');
  elements.imageSelectionGrid = document.getElementById('image-selection-grid');
  elements.goBackButton = document.getElementById('go-back-button');

  // Notification elements
  elements.notificationBell = document.getElementById('notification-bell');
  elements.notificationBadge = document.getElementById('notification-badge');
  elements.notificationCount = document.getElementById('notification-count');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Clear any existing classes and content
  toast.className = 'toast';
  toast.textContent = message;

  // Add type-specific styling
  if (type === 'error') {
    toast.classList.add('error');
  } else if (type === 'success') {
    toast.classList.add('success');
  }

  // Show the toast
  toast.classList.add('show');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Legacy function for compatibility
function setStatus(message, type = 'info') {
  if (type === 'error' || type === 'success') {
    showToast(message, type);
  }
}

function setCoverImage(coverImage, sourceType, originalFile = null) {
  state.coverImage = coverImage;
  state.coverSourceType = sourceType;
  state.coverImageFile = originalFile; // Store original file for upload

  if (coverImage && coverImage.src) {
    elements.coverPreview.src = coverImage.src;
    elements.coverPreview.hidden = false;
    elements.coverEmpty.hidden = true;
    elements.coverRemove.hidden = false;
    elements.coverContainer.classList.add('cover-container--has-image');
  } else {
    elements.coverPreview.hidden = true;
    elements.coverEmpty.hidden = false;
    elements.coverRemove.hidden = true;
    elements.coverContainer.classList.remove('cover-container--has-image');
    if (elements.coverUpload) {
      elements.coverUpload.value = '';
    }
    state.coverImageFile = null; // Clear file reference
  }

  updateImageSelectionHighlight();
}

function clearCoverImage() {
  setCoverImage(null, null);
  // No status message needed for cover removal
}

function updateImageSelectionHighlight() {
  // No longer needed since we removed the inline image selection
  // Images are now shown in a popup window
}

function determineMainImage(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const sorted = [...images].sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    return areaB - areaA;
  });

  return sorted[0] || null;
}

function updateDetectedImagesButton(images) {
  if (!elements.imageSelectionToggle) {
    return;
  }

  // Button will be enabled/disabled based on images

  // Update button text based on whether images are detected or not
  const detectSvg = `<svg width="20" height="20" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.9948 0.500006C10.5996 0.498025 8.25482 1.18784 6.24185 2.48663C6.0933 2.58469 5.98943 2.73746 5.95283 2.91173C5.91623 3.08601 5.94987 3.26769 6.04642 3.41729C6.14297 3.56688 6.29463 3.67229 6.46843 3.71059C6.64223 3.7489 6.82412 3.71701 6.97455 3.62185C8.57635 2.58919 10.4173 1.98755 12.3195 1.8751V7.6424C11.131 7.79321 10.0262 8.33508 9.1791 9.18276C8.33195 10.0305 7.79043 11.1359 7.63971 12.3252H1.87609C1.99486 10.3308 2.64799 8.40516 3.76691 6.75044L3.97287 8.20662C3.9958 8.36899 4.07696 8.51746 4.2012 8.62438C4.32544 8.7313 4.4843 8.78936 4.64816 8.78775H4.74608C4.92338 8.76263 5.08344 8.66808 5.19109 8.52489C5.29873 8.3817 5.34513 8.2016 5.32008 8.02418L4.89127 4.99356C4.86617 4.81615 4.77168 4.65598 4.62858 4.54827C4.48548 4.44057 4.30549 4.39414 4.12819 4.4192L1.10288 4.8449C0.923777 4.86955 0.761796 4.96437 0.652568 5.10852C0.543339 5.25266 0.49581 5.43433 0.520436 5.61354C0.545062 5.79275 0.639826 5.95484 0.783881 6.06413C0.927937 6.17343 1.10948 6.22099 1.28858 6.19635L2.63917 6.00377C1.02956 8.38917 0.291884 11.2573 0.550688 14.1239C0.809493 16.9904 2.04892 19.6798 4.05971 21.738C6.07049 23.7961 8.72944 25.0969 11.5876 25.4206C14.4457 25.7444 17.328 25.0714 19.7477 23.5151C19.8963 23.4171 20.0001 23.2643 20.0367 23.09C20.0733 22.9157 20.0397 22.7341 19.9431 22.5845C19.8466 22.4349 19.6949 22.3295 19.5211 22.2912C19.3473 22.2529 19.1654 22.2848 19.015 22.3799C17.4132 23.4126 15.5722 24.0142 13.6701 24.1267V18.3594C14.8586 18.2085 15.9633 17.6667 16.8105 16.819C17.6576 15.9713 18.1991 14.8659 18.3499 13.6766H24.1135C23.9947 15.671 23.3416 17.5966 22.2227 19.2513L22.0167 17.7951C21.9916 17.6159 21.8964 17.454 21.7521 17.345C21.6077 17.2361 21.426 17.1889 21.2469 17.214C21.0678 17.2391 20.906 17.3344 20.797 17.4788C20.6881 17.6233 20.641 17.8051 20.6661 17.9843L21.0949 21.0251C21.1179 21.1874 21.199 21.3359 21.3232 21.4428C21.4475 21.5498 21.6063 21.6078 21.7702 21.6062H21.8647L24.8799 21.1805C25.059 21.1559 25.221 21.061 25.3302 20.9169C25.4395 20.7727 25.487 20.5911 25.4624 20.4119C25.4377 20.2327 25.343 20.0706 25.1989 19.9613C25.0549 19.852 24.8733 19.8044 24.6942 19.8291L23.3436 20.0216C24.6191 18.1413 25.3583 15.9487 25.4816 13.6795C25.6049 11.4103 25.1076 9.1504 24.0434 7.14282C22.9791 5.13524 21.3881 3.45594 19.4414 2.2855C17.4946 1.11506 15.2659 0.497769 12.9948 0.500006ZM12.3195 24.1267C9.60389 23.9609 7.04272 22.8068 5.11894 20.8817C3.19515 18.9567 2.0417 16.3939 1.87609 13.6766H7.63971C7.79043 14.8659 8.33195 15.9713 9.1791 16.819C10.0262 17.6667 11.131 18.2085 12.3195 18.3594V24.1267ZM15.0207 13.6766H16.9858C16.845 14.5053 16.4503 15.2698 15.8563 15.8642C15.2623 16.4586 14.4983 16.8536 13.6701 16.9944V15.028C13.6701 14.8488 13.5989 14.677 13.4723 14.5502C13.3456 14.4235 13.1739 14.3523 12.9948 14.3523C12.8157 14.3523 12.6439 14.4235 12.5173 14.5502C12.3906 14.677 12.3195 14.8488 12.3195 15.028V16.9944C11.4913 16.8536 10.7273 16.4586 10.1333 15.8642C9.53924 15.2698 9.14454 14.5053 9.0038 13.6766H10.9689C11.148 13.6766 11.3198 13.6054 11.4464 13.4787C11.573 13.352 11.6442 13.1801 11.6442 13.0009C11.6442 12.8217 11.573 12.6498 11.4464 12.5231C11.3198 12.3963 11.148 12.3252 10.9689 12.3252H9.0038C9.14454 11.4964 9.53924 10.7319 10.1333 10.1375C10.7273 9.54314 11.4913 9.14819 12.3195 9.00736V10.9737C12.3195 11.1529 12.3906 11.3248 12.5173 11.4515C12.6439 11.5782 12.8157 11.6494 12.9948 11.6494C13.1739 11.6494 13.3456 11.5782 13.4723 11.4515C13.5989 11.3248 13.6701 11.1529 13.6701 10.9737V9.00736C14.4983 9.14819 15.2623 9.54314 15.8563 10.1375C16.4503 10.7319 16.845 11.4964 16.9858 12.3252H15.0207C14.8416 12.3252 14.6698 12.3963 14.5432 12.5231C14.4165 12.6498 14.3454 12.8217 14.3454 13.0009C14.3454 13.1801 14.4165 13.352 14.5432 13.4787C14.6698 13.6054 14.8416 13.6766 15.0207 13.6766ZM18.3499 12.3252C18.1991 11.1359 17.6576 10.0305 16.8105 9.18276C15.9633 8.33508 14.8586 7.79321 13.6701 7.6424V1.8751C16.3857 2.04082 18.9468 3.19501 20.8706 5.12002C22.7944 7.04503 23.9479 9.60783 24.1135 12.3252H18.3499Z" fill="currentColor"/>
  </svg>`;

  if (!Array.isArray(images) || images.length === 0) {
    // No images - make button transparent and disabled
    elements.imageSelectionToggle.innerHTML = `${detectSvg}<span>Detect</span>`;
    elements.imageSelectionToggle.disabled = true;
    elements.imageSelectionToggle.style.opacity = '0.4';
    elements.imageSelectionToggle.style.cursor = 'not-allowed';
  } else {
    // Images found - show count beside text and enable button
    elements.imageSelectionToggle.innerHTML = `${detectSvg}<span>Detect (${images.length})</span>`;
    elements.imageSelectionToggle.disabled = false;
    elements.imageSelectionToggle.style.opacity = '1';
    elements.imageSelectionToggle.style.cursor = 'pointer';
  }
}

// Helper function to convert data URL or image URL to File object
async function convertImageToFile(imageSrc, fileName = 'cover-image.png') {
  try {
    console.log('Converting image to file:', fileName);

    let response;
    if (imageSrc.startsWith('data:')) {
      // Handle data URLs (screenshots, uploaded files)
      const dataUrlParts = imageSrc.split(',');
      const mimeMatch = dataUrlParts[0].match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const byteString = atob(dataUrlParts[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      return new File([arrayBuffer], fileName, { type: mimeType });
    } else {
      // Handle regular URLs (detected images)
      response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }

      const blob = await response.blob();
      const mimeType = blob.type || 'image/png';
      const extension = mimeType.split('/')[1] || 'png';

      return new File([blob], `${fileName.split('.')[0]}.${extension}`, { type: mimeType });
    }
  } catch (error) {
    console.error('Error converting image to file:', error);
    throw new Error('Failed to convert image: ' + error.message);
  }
}

async function uploadImageToS3(file) {
  try {
    console.log('[Copus Extension] Uploading image to S3:', file.name, file.size, file.type);

    // Get authentication token
    let result = { copus_token: null };
    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      result.copus_token = localStorage.getItem('copus_token');
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    // Add authorization header if token is available
    if (result.copus_token) {
      headers['Authorization'] = `Bearer ${result.copus_token}`;
      console.log('[Copus Extension] Added Authorization header for image upload');
    } else {
      console.warn('[Copus Extension] No auth token found for image upload');
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/client/common/uploadImage2S3`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    console.log('Image upload response status:', response.status);

    if (!response.ok) {
      throw new Error('Image upload failed (' + response.status + ')');
    }

    const responseData = await response.json();
    console.log('Image upload response:', responseData);

    // Check API-level status code (S3 upload API uses status: 1 for success)
    if (responseData.status && responseData.status !== 1) {
      throw new Error(responseData.msg || 'Image upload API error (status: ' + responseData.status + ')');
    }

    // Return the uploaded image URL
    const imageUrl = responseData.data || responseData.url || responseData.imageUrl;
    if (!imageUrl) {
      throw new Error('No image URL returned from upload API');
    }

    console.log('Image uploaded successfully:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

function updateCharacterCount() {
  const text = elements.recommendationInput.value;
  const count = text.length;
  const maxLength = 1000;

  elements.charCounter.textContent = count + '/' + maxLength;

  // Remove existing classes
  elements.charCounter.classList.remove('near-limit', 'at-limit');

  // Add appropriate class based on character count
  if (count >= maxLength) {
    elements.charCounter.classList.add('at-limit');
  } else if (count >= maxLength * 0.9) { // 90% of limit
    elements.charCounter.classList.add('near-limit');
  }
}

function updateTitleCharCounter() {
  const text = elements.pageTitleInput.value;
  const count = text.length;
  const maxLength = 75;

  elements.titleCharCounter.textContent = count + '/' + maxLength;

  // Remove existing classes
  elements.titleCharCounter.classList.remove('near-limit', 'at-limit');

  // Add appropriate class based on character count
  if (count >= maxLength) {
    elements.titleCharCounter.classList.add('at-limit');
  } else if (count >= maxLength * 0.9) { // 90% of limit (68 characters)
    elements.titleCharCounter.classList.add('near-limit');
  }
}

function handleTopicSelection(event) {
  const topicId = event.target.value;
  if (!topicId) return;

  // Update state
  state.selectedTopic = topicId;
  console.log('Topic selected:', topicId);
}

// Get the selected category ID (now comes directly from API)
function getTopicCategoryId(selectedValue) {
  // The selectedValue is now the category ID from the API
  const categoryId = parseInt(selectedValue);
  return categoryId || 0;
}

function handleCancel() {
  console.log('Cancel button clicked, closing window');
  window.close();
}

function goBackToMain() {
  console.log('goBackToMain called');
  elements.imageSelectionView.hidden = true;
  elements.compactMain.hidden = false;
}

function openImageSelectionView() {
  // Don't proceed if button is disabled
  if (elements.imageSelectionToggle.disabled) {
    return;
  }

  console.log('openImageSelectionView called, current images:', state.images);

  // Load page data only when user clicks detect
  if (!Array.isArray(state.images) || state.images.length === 0) {
    console.log('No images cached, loading page data...');

    // Load page data on demand
    loadPageData(state.activeTabId).then(() => {
      console.log('Page data loaded, images found:', state.images ? state.images.length : 0);
      if (Array.isArray(state.images) && state.images.length > 0) {
        showImageSelection();
      }
      // Don't show error message when no images detected
    }).catch(error => {
      console.error('Failed to load page data:', error);
      // Don't show error message
    });
    return;
  }

  console.log('Using cached images, showing selection...');
  showImageSelection();
}

function showImageSelection() {
  console.log('showImageSelection called with', state.images.length, 'images');

  // Clear and populate the image grid
  elements.imageSelectionGrid.innerHTML = '';

  if (!Array.isArray(state.images) || state.images.length === 0) {
    elements.imageSelectionGrid.innerHTML = '<div class="image-selection__empty">No images detected on this page.</div>';
  } else {
    state.images.forEach(function(image, index) {
      console.log('Creating image option', index, ':', image.src);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-option';

      const img = document.createElement('img');
      img.src = image.src;
      img.alt = 'Detected image option';

      button.appendChild(img);

      button.addEventListener('click', function() {
        console.log('Image selected:', image.src);
        setCoverImage({ src: image.src }, 'page');
        // No status message needed for image selection
        goBackToMain();
      });

      elements.imageSelectionGrid.appendChild(button);
    });
  }

  // Show image selection view
  console.log('Switching to image selection view');
  elements.compactMain.hidden = true;
  elements.imageSelectionView.hidden = false;
}

async function queryActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function fetchPageData(tabId) {
  return new Promise((resolve, reject) => {
    // Reduce timeout for faster fallback
    const timeoutId = setTimeout(() => {
      reject(new Error('Page data fetch timeout'));
    }, 500); // Reduced to 500ms for faster failure

    chrome.tabs.sendMessage(tabId, { type: 'collectPageData' }, (response) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function initializeTestToken() {
  // For testing purposes, save the test token if no token exists
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImxhc3RQYXNzd29yZFJlc2V0VGltZSI6MTc1ODc4MzgzNiwibGFzdExvZ2luVGltZSI6MTc1ODc4NDAyMywiZXhwIjoxNzkwMzIwMDIzLCJpYXQiOjE3NTg3ODQwMjN9.Nr51Ydw68FhTZEELyQeNeKAZXDLzZsFhJXGtqCasSRw';

  try {
    const existingToken = localStorage.getItem('copus_auth_token');
    if (!existingToken) {
      localStorage.setItem('copus_auth_token', testToken);
      state.authToken = testToken;
    } else {
      state.authToken = existingToken;
    }
  } catch (error) {
    // Fallback if localStorage fails
    state.authToken = testToken;
  }
}

// Quick token existence check (no API call)
async function quickTokenCheck() {
  try {
    let result = { copus_token: null };

    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      // Fallback to localStorage
      result.copus_token = localStorage.getItem('copus_token');
    }

    // Return true if token exists and looks like a JWT
    if (result.copus_token && result.copus_token.split('.').length === 3) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Copus Extension] Quick token check failed:', error);
    return false;
  }
}

// Notification functions
async function fetchUnreadNotificationCount() {
  try {
    console.log('[Copus Extension] Fetching unread notification count...');

    // Check if user is authenticated
    let result = { copus_token: null };
    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      result.copus_token = localStorage.getItem('copus_token');
    }

    if (!result.copus_token) {
      console.log('[Copus Extension] No token found, setting unread count to 0');
      updateNotificationBadge(0);
      return;
    }

    // Fetch unread count from API (plugin-specific endpoint)
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/plugin/plugin/user/msg/countMsg`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${result.copus_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Copus Extension] Notification API response status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('[Copus Extension] Notification API response:', responseData);

      // Handle different API response formats (same logic as main site)
      let unreadCount = 0;
      if (typeof responseData === 'number') {
        unreadCount = responseData;
      } else if (responseData.data !== undefined && typeof responseData.data === 'number') {
        unreadCount = responseData.data;
      } else if (responseData.status === 1 && responseData.data !== undefined) {
        unreadCount = typeof responseData.data === 'number' ? responseData.data : 0;
      } else if (responseData.count !== undefined && typeof responseData.count === 'number') {
        unreadCount = responseData.count;
      }

      console.log('[Copus Extension] Unread notification count:', unreadCount);
      updateNotificationBadge(unreadCount);
    } else {
      console.log('[Copus Extension] Failed to fetch notification count, setting to 0');
      updateNotificationBadge(0);
    }
  } catch (error) {
    console.error('[Copus Extension] Error fetching notification count:', error);
    updateNotificationBadge(0);
  }
}

function updateNotificationBadge(count) {
  console.log('[Copus Extension] Updating notification badge with count:', count);

  if (!elements.notificationBadge || !elements.notificationCount) {
    console.warn('[Copus Extension] Notification badge elements not found');
    return;
  }

  if (count > 0) {
    elements.notificationBadge.style.display = 'flex';
    elements.notificationCount.textContent = count > 99 ? '99+' : count.toString();
  } else {
    elements.notificationBadge.style.display = 'none';
  }
}

function handleNotificationClick() {
  console.log('[Copus Extension] Notification bell clicked, redirecting to notifications page');

  if (chrome?.tabs?.create) {
    chrome.tabs.create({
      url: 'http://localhost:5177/notification'
    });
  } else {
    // Fallback - open in same window
    window.open('http://localhost:5177/notification', '_blank');
  }

  // Close the popup after opening notifications page
  window.close();
}

// Helper function to get the API base URL
function getApiBaseUrl() {
  // For now, always use the production/test API
  // This ensures the extension works even if local backend isn't running
  // TODO: Add automatic detection of local vs production environment
  return 'https://api-test.copus.network';
}

// Authentication functions
async function checkAuthentication() {
  try {
    console.log('[Copus Extension] Checking authentication...');

    // Check if chrome.storage is available, fallback to localStorage
    let result = { copus_token: null, copus_user: null };

    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token', 'copus_user']);
      console.log('[Copus Extension] Chrome storage result:', result);
    } else {
      console.warn('[Copus Extension] Chrome storage API not available, using localStorage fallback');
      // Fallback to localStorage (less reliable but better than nothing)
      try {
        result.copus_token = localStorage.getItem('copus_token');
        result.copus_user = localStorage.getItem('copus_user');
        if (result.copus_user) {
          result.copus_user = JSON.parse(result.copus_user);
        }
        console.log('[Copus Extension] localStorage fallback result:', result);
      } catch (error) {
        console.error('[Copus Extension] localStorage fallback failed:', error);
      }
    }

    if (!result.copus_token) {
      console.log('[Copus Extension] No token found in storage');
      return { authenticated: false };
    }

    console.log('[Copus Extension] Token found, validating...');

    // Use plugin-specific userInfo endpoint
    const apiBaseUrl = getApiBaseUrl();
    const apiUrl = `${apiBaseUrl}/plugin/plugin/user/userInfo`;

    console.log('[Copus Extension] Using API URL:', apiUrl);

    // Verify token validity by making a test API call with the plugin endpoint
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${result.copus_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Copus Extension] API response status:', response.status);

    if (response.ok) {
      const userData = await response.json();
      console.log('[Copus Extension] Token is valid');
      console.log('[Copus Extension] Full API response:', JSON.stringify(userData, null, 2));
      console.log('[Copus Extension] User data structure:', userData.data);
      console.log('[Copus Extension] User faceUrl field exists:', 'faceUrl' in (userData.data || {}));
      console.log('[Copus Extension] User faceUrl value:', userData.data?.faceUrl);
      console.log('[Copus Extension] User faceUrl type:', typeof userData.data?.faceUrl);
      console.log('[Copus Extension] User avatar field exists:', 'avatar' in (userData.data || {}));
      console.log('[Copus Extension] User avatar value:', userData.data?.avatar);
      console.log('[Copus Extension] User avatarUrl field exists:', 'avatarUrl' in (userData.data || {}));
      console.log('[Copus Extension] User avatarUrl value:', userData.data?.avatarUrl);
      console.log('[Copus Extension] User profileImage field exists:', 'profileImage' in (userData.data || {}));
      console.log('[Copus Extension] User profileImage value:', userData.data?.profileImage);

      // Update storage with latest user data
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({
          'copus_user': userData.data
        });
      }

      return {
        authenticated: true,
        user: userData.data
      };
    } else {
      console.log('[Copus Extension] Token is invalid, removing...');
      // Token is invalid, remove it
      if (chrome?.storage?.local) {
        await chrome.storage.local.remove(['copus_token', 'copus_user']);
      }
      return { authenticated: false };
    }
  } catch (error) {
    console.error('[Copus Extension] Authentication check failed:', error);
    return { authenticated: false };
  }
}

function showLoginScreen() {
  console.log('[Copus Extension] Showing login screen');
  elements.loginScreen.style.display = 'flex';
  elements.mainContainer.style.display = 'none';
  state.isLoggedIn = false;
}

function showMainApp(user = null) {
  console.log('[Copus Extension] Showing main app');
  elements.loginScreen.style.display = 'none';
  elements.mainContainer.style.display = 'flex';
  state.isLoggedIn = true;
  state.userInfo = user;

  // Update user avatar if available
  if (user) {
    updateUserAvatar(user);
  }
}

function updateUserAvatar(user) {
  console.log('[Copus Extension] updateUserAvatar called with user:', JSON.stringify(user, null, 2));
  const avatarElement = document.querySelector('.avatar div');
  console.log('[Copus Extension] Avatar element found:', !!avatarElement);

  if (avatarElement && user) {
    console.log('[Copus Extension] User object keys:', Object.keys(user));
    console.log('[Copus Extension] User faceUrl:', user.faceUrl);
    console.log('[Copus Extension] User avatar:', user.avatar);
    console.log('[Copus Extension] User avatarUrl:', user.avatarUrl);
    console.log('[Copus Extension] User profileImage:', user.profileImage);
    console.log('[Copus Extension] User username:', user.username);

    // Use the same avatar logic as the main site
    // Priority: user.faceUrl (if exists and not empty) → user.avatar → local default profile SVG
    const avatarUrl = user.faceUrl ||
                     user.avatar ||
                     'profile-default.svg'; // Use local SVG file matching main site

    console.log('[Copus Extension] Final avatar URL:', avatarUrl);
    console.log('[Copus Extension] Avatar source:', user.faceUrl ? 'user faceUrl' : user.avatar ? 'user avatar' : 'profile-default.svg');

    // Test if the image loads successfully
    const testImg = new Image();
    testImg.onload = function() {
      console.log('[Copus Extension] ✅ Image loaded successfully from:', avatarUrl);
      avatarElement.style.backgroundImage = `url(${avatarUrl})`;
      avatarElement.style.backgroundSize = 'cover';
      avatarElement.style.backgroundPosition = 'center';
      avatarElement.style.borderRadius = '50%';
      avatarElement.textContent = ''; // Remove the placeholder
    };
    testImg.onerror = function() {
      console.error('[Copus Extension] ❌ Failed to load image:', avatarUrl);
      console.error('[Copus Extension] Image error event:', this);
      console.error('[Copus Extension] Falling back to user initial');
      // Use fallback - user initial
      const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
      avatarElement.textContent = initial;
      avatarElement.style.backgroundImage = 'none';
    };

    // Add additional debugging for the image loading process
    testImg.onabort = function() {
      console.error('[Copus Extension] Image loading aborted:', avatarUrl);
    };

    console.log('[Copus Extension] Starting image load test...');
    testImg.src = avatarUrl;

    // Add click handler to redirect to My treasury page
    avatarElement.style.cursor = 'pointer';
    avatarElement.title = 'Go to My Treasury';

    // Remove any existing click handlers
    avatarElement.onclick = null;

    // Add new click handler
    avatarElement.onclick = function() {
      console.log('[Copus Extension] Redirecting to My treasury page');
      if (chrome?.tabs?.create) {
        chrome.tabs.create({
          url: 'http://localhost:5177/my-treasury'
        });
      } else {
        // Fallback - open in same window
        window.open('http://localhost:5177/my-treasury', '_blank');
      }
    };
  }
}

function handleLogin() {
  console.log('[Copus Extension] Handling login click');

  // Open the Copus login page in a new tab
  chrome.tabs.create({
    url: 'http://localhost:5177/login' // Point to the development server
  }, (tab) => {
    console.log('[Copus Extension] Opened login tab:', tab.id);
  });

  // Close the popup after opening login page
  window.close();
}

// Background validation without blocking UI
async function validateUserInBackground() {
  console.log('[Copus Extension] Starting background authentication validation...');

  // Force a fresh check by asking content scripts to re-validate tokens
  try {
    if (chrome?.tabs?.query) {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('localhost:5177') || tab.url.includes('copus'))) {
          if (chrome?.tabs?.sendMessage) {
            chrome.tabs.sendMessage(tab.id, { type: 'recheckAuth' }).catch(() => {
              // Ignore errors if content script not available
            });
          }
        }
      });
    }
  } catch (error) {
    console.log('[Copus Extension] Could not message content scripts:', error);
  }

  // Check authentication status
  const authResult = await checkAuthentication();

  if (!authResult.authenticated) {
    console.log('[Copus Extension] Background validation: User not authenticated');
    // Only switch to login if we're not already showing it
    if (elements.loginScreen.style.display === 'none') {
      showLoginScreen();
    }
    return;
  }

  console.log('[Copus Extension] Background validation: User authenticated');
  // Update user info if we're showing the main app
  if (elements.mainContainer.style.display === 'flex') {
    state.isLoggedIn = true;
    state.userInfo = authResult.user;
    if (authResult.user) {
      updateUserAvatar(authResult.user);
    }

    // Fetch notification count when user is authenticated
    fetchUnreadNotificationCount();

    // Fetch categories when user is authenticated
    fetchCategories();
  }
}

async function loginUser() {
  console.log('[Copus Extension] Initializing authentication...');

  // Force a fresh check by asking content scripts to re-validate tokens
  try {
    if (chrome?.tabs?.query) {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('localhost:5177') || tab.url.includes('copus'))) {
          if (chrome?.tabs?.sendMessage) {
            chrome.tabs.sendMessage(tab.id, { type: 'recheckAuth' }).catch(() => {
              // Ignore errors if content script not available
            });
          }
        }
      });
    }
  } catch (error) {
    console.log('[Copus Extension] Could not message content scripts:', error);
  }

  // Check authentication status
  const authResult = await checkAuthentication();

  if (!authResult.authenticated) {
    console.log('[Copus Extension] User not authenticated, showing login screen');
    showLoginScreen();
    return;
  }

  console.log('[Copus Extension] User authenticated, showing main app');
  showMainApp(authResult.user);
}

async function fetchCategories() {
  try {
    console.log('[Copus Extension] Fetching categories from API...');

    // Get authentication token
    let result = { copus_token: null };
    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      result.copus_token = localStorage.getItem('copus_token');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if available
    if (result.copus_token) {
      headers['Authorization'] = `Bearer ${result.copus_token}`;
      console.log('[Copus Extension] Added Authorization header for categories API');
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/plugin/plugin/author/article/categoryList`, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[Copus Extension] Categories API response status:', response.status);

    if (!response.ok) {
      throw new Error('Failed to load categories (' + response.status + ')');
    }

    const responseData = await response.json();
    console.log('[Copus Extension] Categories API response:', responseData);

    // Extract categories from the nested response structure
    const categories = responseData?.data?.data || responseData?.data || responseData;

    if (!Array.isArray(categories)) {
      console.warn('[Copus Extension] Unexpected category response format:', responseData);
      throw new Error('Unexpected category response format.');
    }

    console.log('[Copus Extension] Found', categories.length, 'categories');
    populateTopicSelect(categories);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Copus Extension] Categories fetch timeout - using fallback options');
    } else {
      console.error('[Copus Extension] Error fetching categories:', error);
    }
    // Use fallback categories
    populateTopicSelect([]);
  }
}

function populateTopicSelect(categories) {
  console.log('[Copus Extension] Populating topic select with categories:', categories);

  if (!Array.isArray(categories) || categories.length === 0) {
    console.warn('[Copus Extension] No categories from API, using fallback static options');
    // Fallback to static options if API fails
    elements.topicSelect.innerHTML = `
      <option value="" disabled selected>Select a topic...</option>
      <option value="1">Life</option>
      <option value="2">Art</option>
      <option value="3">Design</option>
      <option value="4">Technology</option>
    `;
    return;
  }

  // Clear existing options and add placeholder
  elements.topicSelect.innerHTML = '<option value="" disabled selected>Select a topic...</option>';

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id || category.value || '';
    option.textContent = category.name || category.label || 'Unnamed category';
    elements.topicSelect.appendChild(option);
    console.log('[Copus Extension] Added category:', category.name, 'with ID:', option.value);
  });

  console.log('[Copus Extension] Successfully populated', categories.length, 'categories');
}

function validateForm() {
  if (!state.isLoggedIn) {
    setStatus('Please wait while logging in...', 'error');
    return false;
  }

  if (!elements.pageTitleInput.value.trim()) {
    setStatus('Title is required.', 'error');
    return false;
  }

  if (!state.coverImage || !state.coverImage.src) {
    setStatus('Cover image is required.', 'error');
    return false;
  }

  if (!elements.topicSelect.value) {
    setStatus('Topic is required.', 'error');
    return false;
  }

  if (!elements.recommendationInput.value.trim()) {
    setStatus('Recommendation is required.', 'error');
    return false;
  }

  return true;
}

async function publishToCopus(payload) {
  console.log('=== publishToCopus function called ===');
  console.log('Payload received:', payload);

  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/plugin/plugin/author/article/edit`;
  console.log('Using endpoint:', endpoint);

  let response;
  try {
    // Get authentication token
    let result = { copus_token: null };
    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      result.copus_token = localStorage.getItem('copus_token');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if token is available
    if (result.copus_token) {
      headers['Authorization'] = `Bearer ${result.copus_token}`;
      console.log('[Copus Extension] Added Authorization header for publish API');
    } else {
      console.warn('[Copus Extension] No auth token found for publish API');
    }

    console.log('Making API call to edit endpoint...');
    console.log('Headers:', headers);
    console.log('Request body:', JSON.stringify(payload));

    response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log('Edit API call completed with status:', response.status);
  } catch (networkError) {
    console.error('Network error during edit API call:', networkError);
    throw new Error('Network error: ' + networkError.message);
  }

  let responseBody = null;
  const rawBody = await response.text();

  console.log('API Response Status:', response.status);
  console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
  console.log('API Raw Response Body:', rawBody);

  if (rawBody) {
    try {
      responseBody = JSON.parse(rawBody);
      console.log('API Parsed Response:', responseBody);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Invalid JSON response from API.');
    }
  }

  if (!response.ok) {
    // Handle expected 403 for non-authenticated users
    if (response.status === 403) {
      throw new Error('Login required to publish.');
    }

    const errorMessage =
      (responseBody && (responseBody.error || responseBody.message)) ||
      'Request failed (' + response.status + ')';
    console.error('API Error Response:', errorMessage);
    throw new Error(errorMessage);
  }

  // Check API-level status code (Copus API uses numeric status codes)
  console.log('Checking response success indicators...');
  console.log('responseBody.success:', responseBody && responseBody.success);
  console.log('responseBody.status:', responseBody && responseBody.status);
  console.log('responseBody.msg:', responseBody && responseBody.msg);

  if (responseBody && responseBody.status) {
    // Status 1 or 1000 typically means success in this API
    if (responseBody.status !== 1 && responseBody.status !== 1000) {
      const apiMsg = responseBody.msg || '';
      // Don't throw "success" as an error message
      const errorMsg = (apiMsg && apiMsg.toLowerCase() !== 'success')
        ? apiMsg
        : 'API error (status: ' + responseBody.status + ')';
      console.error('API returned error status:', responseBody.status, errorMsg);
      throw new Error(errorMsg);
    }
  }

  if (responseBody && responseBody.success === false) {
    const apiMessage = responseBody.message || responseBody.error || '';
    // Don't throw "success" as an error message
    const errorMsg = (apiMessage && apiMessage.toLowerCase() !== 'success')
      ? apiMessage
      : 'Publishing failed.';
    console.error('API returned success=false:', errorMsg);
    throw new Error(errorMsg);
  }

  // Consider it successful if we get here with a 2xx status and no error indicators
  const message = 'Published successfully!';

  console.log('Publish operation completed successfully');
  return { success: true, message, data: responseBody };
}

async function handlePublish() {
  if (!validateForm()) {
    return;
  }

  try {
    elements.publishButton.disabled = true;

    // Add paper plane animation to button
    elements.publishButton.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="paper-plane">
          <div class="paper-plane__trail">
            <div class="paper-plane__trail-line"></div>
          </div>
          <div class="paper-plane__icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M20.33 3.66996C20.1408 3.48213 19.9035 3.35008 19.6442 3.28833C19.3849 3.22659 19.1135 3.23753 18.86 3.31996L4.23 8.19996C3.95 8.29996 3.7 8.49996 3.53 8.76996C3.36 9.03996 3.3 9.35996 3.36 9.65996C3.42 9.95996 3.6 10.22 3.86 10.39C4.12 10.56 4.44 10.62 4.74 10.56L9.3 9.49996L14.8 15L13.74 19.56C13.68 19.86 13.74 20.18 13.91 20.44C14.08 20.7 14.34 20.88 14.64 20.94C14.73 20.96 14.82 20.97 14.91 20.97C15.16 20.97 15.41 20.89 15.62 20.74C15.83 20.59 15.99 20.37 16.08 20.12L20.96 5.49996C21.0323 5.24547 21.0354 4.97715 20.9688 4.72193C20.9023 4.46671 20.7687 4.23423 20.58 4.04996L20.33 3.66996Z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <span>Publishing...</span>
      </div>
    `;

    // Load page data now if not already loaded (for auto cover image detection)
    if (!state.images || state.images.length === 0) {
      // No status message needed while detecting page images
      try {
        await loadPageData(state.activeTabId);
        // If we found images and no cover is selected, auto-select the main one
        if (state.images.length > 0 && (!state.coverImage || !state.coverImage.src)) {
          const mainImage = determineMainImage(state.images);
          if (mainImage && mainImage.src) {
            setCoverImage({ src: mainImage.src }, 'page');
          }
        }
      } catch (error) {
        // Continue without page images if detection fails
        console.log('Page image detection failed, continuing with manual cover selection');
      }
    }

    // No status message needed while uploading

    let coverUrl;
    let fileToUpload;

    // Determine how to handle the cover image based on source type
    if (state.coverSourceType === 'upload' && state.coverImageFile) {
      // Use original file for uploads
      fileToUpload = state.coverImageFile;
      console.log('Using original uploaded file for S3 upload');
    } else if (state.coverImage && state.coverImage.src) {
      // Convert screenshot or detected image to file
      const fileName = state.coverSourceType === 'screenshot'
        ? 'screenshot.png'
        : 'detected-image.jpg';

      console.log('Converting', state.coverSourceType, 'image to file for S3 upload');

      try {
        fileToUpload = await convertImageToFile(state.coverImage.src, fileName);
      } catch (convertError) {
        console.error('Image conversion failed:', convertError);
        throw new Error('Image processing failed: ' + convertError.message);
      }
    } else {
      throw new Error('No cover image available');
    }

    // Upload the image to S3
    try {
      console.log('Calling uploadImageToS3 with file:', fileToUpload);
      coverUrl = await uploadImageToS3(fileToUpload);
      console.log('✅ S3 upload SUCCESS! Received URL:', coverUrl);

      if (!coverUrl) {
        throw new Error('S3 upload returned empty URL');
      }
    } catch (uploadError) {
      console.error('❌ S3 upload FAILED:', uploadError);
      throw new Error('Image upload failed: ' + uploadError.message);
    }

    const payload = {
      categoryId: getTopicCategoryId(elements.topicSelect.value),
      content: elements.recommendationInput.value.trim(),
      coverUrl: coverUrl,
      targetUrl: state.pageUrl,
      title: elements.pageTitleInput.value.trim() || state.pageTitle
    };

    console.log('📝 Final payload with S3 URL:', payload);
    console.log('🚀 About to call publishToCopus function...');
    // No status message needed while publishing

    try {
      const result = await publishToCopus(payload);
      console.log('✅ publishToCopus completed successfully, result:', result);
      console.log('✅ Result structure:', JSON.stringify(result, null, 2));

      const successMessage = result.message || 'You\'ve shared your treasure!';
      showToast(successMessage, 'success');
      console.log('🎉 Entire publish flow completed successfully');

      // Get the article UUID from the response
      // The API returns: { status: 1, msg: "success", data: "uuid-string" }
      // So result.data.data is the UUID string directly
      let articleUuid = null;

      if (typeof result.data?.data === 'string') {
        // UUID is a string directly in result.data.data
        articleUuid = result.data.data;
      } else if (result.data?.data?.uuid) {
        // UUID is in an object with uuid property
        articleUuid = result.data.data.uuid;
      } else if (typeof result.data === 'string') {
        // UUID is directly in result.data
        articleUuid = result.data;
      } else if (result.data?.uuid) {
        // UUID is in result.data.uuid
        articleUuid = result.data.uuid;
      }

      console.log('✅ Extracted article UUID:', articleUuid);

      if (articleUuid) {
        // Open the work page in a new window after a short delay
        setTimeout(() => {
          const workUrl = `http://localhost:5177/work/${articleUuid}`;
          console.log('✅ Opening work page in new window:', workUrl);

          if (chrome?.tabs?.create) {
            chrome.tabs.create({ url: workUrl });
          } else {
            window.open(workUrl, '_blank');
          }

          // Close the extension popup
          window.close();
        }, 1500);
      } else {
        console.error('❌ No UUID found in response');
        console.error('Response data:', result.data);
      }
    } catch (publishError) {
      console.error('❌ publishToCopus FAILED:', publishError);
      throw publishError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('❌ OVERALL PUBLISH ERROR:', error);
    showToast('Publishing failed: ' + error.message, 'error');
  } finally {
    console.log('🏁 Publish attempt completed, re-enabling button');
    elements.publishButton.disabled = false;
    // Restore button text
    elements.publishButton.innerHTML = 'Publish';
  }
}

// Image Cropper
class ImageCropper {
  constructor() {
    this.modal = document.getElementById('image-cropper-modal');
    this.canvas = document.getElementById('cropper-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.confirmBtn = document.getElementById('cropper-confirm');
    this.cancelBtn = document.getElementById('cropper-cancel');

    this.image = null;
    this.loadedImage = null;
    this.cropArea = { x: 0, y: 0, width: 0, height: 0 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.originalCropArea = null;
    this.aspectRatio = 16 / 9;
    this.imgDimensions = { width: 0, height: 0 };
    this.onCropCallback = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.confirmBtn.addEventListener('click', this.handleConfirm.bind(this));
    this.cancelBtn.addEventListener('click', this.handleCancel.bind(this));
  }

  show(file, onCrop) {
    this.onCropCallback = onCrop;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImage = img;
        this.initializeCropper(img);
        this.modal.style.display = 'flex';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  hide() {
    this.modal.style.display = 'none';
  }

  initializeCropper(img) {
    const maxWidth = 300;
    const maxHeight = 220;
    let displayWidth = img.width;
    let displayHeight = img.height;

    if (displayWidth > maxWidth || displayHeight > maxHeight) {
      const scale = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
      displayWidth *= scale;
      displayHeight *= scale;
    }

    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;
    this.imgDimensions = { width: displayWidth, height: displayHeight };

    // Full width initial crop
    let cropWidth = displayWidth;
    let cropHeight = displayWidth / this.aspectRatio;

    if (cropHeight > displayHeight) {
      cropHeight = displayHeight;
      cropWidth = displayHeight * this.aspectRatio;
    }

    this.cropArea = {
      x: (displayWidth - cropWidth) / 2,
      y: (displayHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    };

    this.drawCanvas();
  }

  drawCanvas() {
    const { ctx, canvas, loadedImage, cropArea } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

    // Draw overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, cropArea.y);
    ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
    ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - (cropArea.x + cropArea.width), cropArea.height);
    ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - (cropArea.y + cropArea.height));

    // Draw crop frame
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    const handles = [
      { x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
      { x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 }
    ];

    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  getResizeHandle(x, y) {
    const handleSize = 8;
    const tolerance = 4;
    const { cropArea } = this;

    const handles = [
      { type: 'nw', x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
      { type: 'ne', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
      { type: 'se', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
      { type: 'sw', x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 }
    ];

    for (const handle of handles) {
      if (x >= handle.x - tolerance && x <= handle.x + handleSize + tolerance &&
          y >= handle.y - tolerance && y <= handle.y + handleSize + tolerance) {
        return handle.type;
      }
    }

    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      return 'move';
    }

    return null;
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = this.getResizeHandle(x, y);
    if (handle) {
      this.resizeHandle = handle;
      this.isDragging = true;
      this.dragStart = { x, y };
      this.originalCropArea = { ...this.cropArea };
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging || !this.resizeHandle) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - this.dragStart.x;
    const dy = y - this.dragStart.y;

    let newCropArea = { ...this.originalCropArea };

    if (this.resizeHandle === 'move') {
      newCropArea.x = Math.max(0, Math.min(this.originalCropArea.x + dx, this.imgDimensions.width - this.originalCropArea.width));
      newCropArea.y = Math.max(0, Math.min(this.originalCropArea.y + dy, this.imgDimensions.height - this.originalCropArea.height));
    } else {
      // Handle corner resizing
      const corners = {
        'nw': () => {
          newCropArea.x = Math.max(0, this.originalCropArea.x + dx);
          newCropArea.width = Math.max(50, this.originalCropArea.width - dx);
          newCropArea.height = newCropArea.width / this.aspectRatio;
          newCropArea.y = this.originalCropArea.y + this.originalCropArea.height - newCropArea.height;
        },
        'ne': () => {
          newCropArea.width = Math.max(50, this.originalCropArea.width + dx);
          newCropArea.height = newCropArea.width / this.aspectRatio;
          newCropArea.y = this.originalCropArea.y + this.originalCropArea.height - newCropArea.height;
        },
        'se': () => {
          newCropArea.width = Math.max(50, this.originalCropArea.width + dx);
          newCropArea.height = newCropArea.width / this.aspectRatio;
        },
        'sw': () => {
          newCropArea.x = Math.max(0, this.originalCropArea.x + dx);
          newCropArea.width = Math.max(50, this.originalCropArea.width - dx);
          newCropArea.height = newCropArea.width / this.aspectRatio;
        }
      };

      if (corners[this.resizeHandle]) {
        corners[this.resizeHandle]();
      }
    }

    // Keep within bounds
    newCropArea.x = Math.max(0, Math.min(newCropArea.x, this.imgDimensions.width - newCropArea.width));
    newCropArea.y = Math.max(0, Math.min(newCropArea.y, this.imgDimensions.height - newCropArea.height));
    newCropArea.width = Math.min(newCropArea.width, this.imgDimensions.width - newCropArea.x);
    newCropArea.height = Math.min(newCropArea.height, this.imgDimensions.height - newCropArea.y);

    this.cropArea = newCropArea;
    this.drawCanvas();
  }

  handleMouseUp() {
    this.isDragging = false;
    this.resizeHandle = null;
  }

  async handleConfirm() {
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');

    const scaleX = this.loadedImage.width / this.imgDimensions.width;
    const scaleY = this.loadedImage.height / this.imgDimensions.height;

    const actualCrop = {
      x: this.cropArea.x * scaleX,
      y: this.cropArea.y * scaleY,
      width: this.cropArea.width * scaleX,
      height: this.cropArea.height * scaleY
    };

    outputCanvas.width = Math.min(1920, actualCrop.width);
    outputCanvas.height = Math.min(1080, actualCrop.height);

    outputCtx.drawImage(
      this.loadedImage,
      actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
      0, 0, outputCanvas.width, outputCanvas.height
    );

    outputCanvas.toBlob((blob) => {
      if (blob && this.onCropCallback) {
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        this.onCropCallback(file);
      }
      this.hide();
    }, 'image/jpeg', 0.9);
  }

  handleCancel() {
    this.hide();
  }
}

// Initialize cropper
const imageCropper = new ImageCropper();

function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  // Show cropper instead of directly setting image
  imageCropper.show(file, (croppedFile) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage({ src: reader.result }, 'upload', croppedFile);
    };
    reader.readAsDataURL(croppedFile);
  });

  event.target.value = '';
}

async function handleScreenshotCapture() {
  console.log('handleScreenshotCapture called');
  try {
    elements.coverScreenshot.disabled = true;
    // No status message needed while capturing

    const tab = await queryActiveTab();

    if (!tab) {
      throw new Error('No active tab available for capture.');
    }

    const screenshot = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'captureScreenshot', windowId: tab.windowId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.success) {
            reject(new Error(response && response.error ? response.error : 'Screenshot failed.'));
            return;
          }

          resolve(response.dataUrl);
        }
      );
    });

    setCoverImage({ src: screenshot }, 'screenshot');
    // No status message needed for screenshot success
  } catch (error) {
    setStatus('Unable to capture screenshot: ' + error.message, 'error');
  } finally {
    elements.coverScreenshot.disabled = false;
  }
}

async function initialize() {
  console.time('TOTAL_INIT');
  console.time('cache_elements');
  cacheElements();
  console.timeEnd('cache_elements');

  console.time('setup_initial_state');
  // Ensure cover remove button starts hidden
  if (elements.coverRemove) {
    elements.coverRemove.hidden = true;
  }

  // Initialize authentication token
  initializeTestToken();

  // Quick token check to decide initial screen (no API call yet)
  const hasToken = await quickTokenCheck();
  if (hasToken) {
    // Start with main app if token exists, validate in background
    elements.loginScreen.style.display = 'none';
    elements.mainContainer.style.display = 'flex';
    console.log('[Copus Extension] Token found, starting with main app');
  } else {
    // Start with login screen if no token
    elements.loginScreen.style.display = 'flex';
    elements.mainContainer.style.display = 'none';
    console.log('[Copus Extension] No token found, starting with login screen');
  }

  console.timeEnd('setup_initial_state');

  console.time('add_event_listeners');
  // Set up event listeners immediately (UI is now interactive)

  // Login screen event listener
  elements.loginButton.addEventListener('click', handleLogin);

  // Main app event listeners
  elements.coverUpload.addEventListener('change', handleFileUpload);
  elements.coverScreenshot.addEventListener('click', handleScreenshotCapture);
  elements.coverRemove.addEventListener('click', clearCoverImage);
  elements.imageSelectionToggle.addEventListener('click', openImageSelectionView);
  elements.goBackButton.addEventListener('click', goBackToMain);
  elements.recommendationInput.addEventListener('input', updateCharacterCount);
  elements.pageTitleInput.addEventListener('input', updateTitleCharCounter);
  elements.publishButton.addEventListener('click', handlePublish);
  elements.cancelButton.addEventListener('click', handleCancel);

  // Add topic dropdown event listener
  elements.topicSelect.addEventListener('change', handleTopicSelection);

  // Add notification bell event listener
  if (elements.notificationBell) {
    elements.notificationBell.addEventListener('click', handleNotificationClick);
  }
  console.timeEnd('add_event_listeners');

  console.time('update_character_count');
  // Initialize character count
  updateCharacterCount();

  // Initialize topic selection (starts with no selection)
  state.selectedTopic = elements.topicSelect.value || '';
  console.timeEnd('update_character_count');

  console.time('query_active_tab');
  // Get tab info quickly (this is usually fast)
  const tab = await queryActiveTab();
  console.timeEnd('query_active_tab');

  if (!tab) {
    setStatus('Unable to determine the active tab.', 'error');
    console.timeEnd('TOTAL_INIT');
    return;
  }

  console.time('populate_ui');
  state.activeTabId = tab.id;
  state.activeWindowId = tab.windowId;
  state.pageTitle = tab.title || 'Untitled page';
  state.pageUrl = tab.url || 'Unknown URL';

  // Populate the UI elements immediately
  elements.pageUrlDisplay.textContent = state.pageUrl;
  elements.pageTitleInput.value = state.pageTitle.length > 75 ? state.pageTitle.substring(0, 75) : state.pageTitle;
  updateTitleCharCounter();

  // Set up ready state immediately - NO network operations for instant loading
  // Run authentication validation in background (non-blocking)
  validateUserInBackground();

  // Extension is ready - no status message needed
  console.timeEnd('populate_ui');

  console.timeEnd('TOTAL_INIT');

  // Load page data in background to auto-select cover image (like before)
  // This runs after UI is interactive, so it doesn't slow down opening
  setTimeout(() => {
    loadPageData(state.activeTabId).catch(error => {
      console.log('Background page data loading failed:', error);
    });
  }, 100); // Small delay to ensure UI is fully rendered

  // Note: userInfo and notification count are fetched once on popup open
  // via validateUserInBackground() which calls checkAuthentication() and fetchUnreadNotificationCount()
  // No periodic polling - data is fresh on each popup open
}

// Separate function for page data loading (non-blocking)
async function loadPageData(tabId) {
  try {
    // First try to inject content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['contentScript.js']  // Fixed: use correct filename
      });
      console.log('Content script injected successfully');
    } catch (injectionError) {
      console.log('Content script injection failed or already exists:', injectionError.message);
      // Continue anyway - script might already be injected
    }

    const pageData = await fetchPageData(tabId);

    if (pageData && Array.isArray(pageData.images)) {
      state.images = pageData.images;
      updateDetectedImagesButton(pageData.images);
      const mainImage = determineMainImage(pageData.images);
      if (mainImage && mainImage.src) {
        setCoverImage({ src: mainImage.src }, 'page');
        // Cover auto-selected - no status message needed
      } else {
        setCoverImage(null, null);
        // Ready state - no status message needed
      }
    } else {
      state.images = [];
      setCoverImage(null, null);
      updateDetectedImagesButton([]);
    }
  } catch (error) {
    console.error('Page data loading failed:', error);
    state.images = [];
    setCoverImage(null, null);
    updateDetectedImagesButton([]);
    // Ready state - no status message needed
  }
}

// Execute immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
