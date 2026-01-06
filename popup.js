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
  // Treasury selection state
  selectedTreasuries: [], // Array of { id: number, name: string, spaceType: number }
  availableTreasuries: [], // All treasuries from API
  treasurySearchQuery: '', // Current search filter
  treasuriesCacheTime: 0, // Timestamp of last treasury fetch
  treasuriesFetchPromise: null, // In-flight fetch promise to avoid duplicate requests
  // x402 payment state
  payToVisit: false, // Payment toggle (default off)
  paymentAmount: '0.01' // Default payment amount in USD
};

const elements = {};

// ========== Local storage functions for token management ==========
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

  // Treasury selection elements
  elements.treasurySelectButton = document.getElementById('treasury-select-button');
  elements.treasurySelectText = document.getElementById('treasury-select-text');
  elements.treasuryModal = document.getElementById('treasury-selection-modal');
  elements.treasuryModalClose = document.getElementById('treasury-modal-close');
  elements.treasurySearchInput = document.getElementById('treasury-search-input');
  elements.treasuryList = document.getElementById('treasury-list');
  elements.treasuryCreateTrigger = document.getElementById('treasury-create-trigger');
  elements.treasuryCreateForm = document.getElementById('treasury-create-form');
  elements.newTreasuryName = document.getElementById('new-treasury-name');
  elements.treasuryCreateCancel = document.getElementById('treasury-create-cancel');
  elements.treasuryCreateConfirm = document.getElementById('treasury-create-confirm');
  elements.treasuryModalCancel = document.getElementById('treasury-modal-cancel');
  elements.treasuryModalSave = document.getElementById('treasury-modal-save');

  // x402 Payment elements
  elements.payToVisitToggle = document.getElementById('pay-to-visit-toggle');
  elements.paymentDetails = document.getElementById('payment-details');
  elements.paymentAmount = document.getElementById('payment-amount');
  elements.estimatedIncome = document.getElementById('estimated-income');
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

// Helper function to fetch image via background script (bypasses CORS)
async function fetchImageViaBackground(imageUrl) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'fetchImageAsDataUrl', url: imageUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response || !response.success) {
          reject(new Error(response?.error || 'Background fetch failed'));
          return;
        }

        resolve({
          dataUrl: response.dataUrl,
          mimeType: response.mimeType,
          size: response.size
        });
      }
    );
  });
}

// Helper function to convert data URL or image URL to File object
async function convertImageToFile(imageSrc, fileName = 'cover-image.png') {
  try {
    console.log('[Copus Extension] Converting image to file:', fileName, 'source type:', imageSrc.substring(0, 50));

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

      const file = new File([arrayBuffer], fileName, { type: mimeType });
      console.log('[Copus Extension] Created file from data URL:', file.name, file.size, 'bytes');
      return file;
    } else {
      // Handle regular URLs (detected images) - may have CORS issues
      console.log('[Copus Extension] Fetching external image URL:', imageSrc);

      // Try direct fetch first
      try {
        const response = await fetch(imageSrc, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Empty blob received');
        }

        const mimeType = blob.type || 'image/png';
        // Handle special MIME types like 'image/svg+xml' -> 'svg'
        let extension = mimeType.split('/')[1] || 'png';
        if (extension.includes('+')) {
          extension = extension.split('+')[0]; // 'svg+xml' -> 'svg'
        }
        const file = new File([blob], `${fileName.split('.')[0]}.${extension}`, { type: mimeType });
        console.log('[Copus Extension] Created file from direct URL fetch:', file.name, file.size, 'bytes');
        return file;
      } catch (fetchError) {
        console.warn('[Copus Extension] Direct fetch failed (likely CORS), trying background script:', fetchError.message);

        // Fallback 1: Use background script to fetch (bypasses CORS)
        try {
          const bgResult = await fetchImageViaBackground(imageSrc);
          console.log('[Copus Extension] Background fetch succeeded, size:', bgResult.size);

          // Convert data URL to File
          const dataUrlParts = bgResult.dataUrl.split(',');
          const mimeMatch = dataUrlParts[0].match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : bgResult.mimeType || 'image/png';

          const byteString = atob(dataUrlParts[1]);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);

          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }

          // Handle special MIME types like 'image/svg+xml' -> 'svg'
          let extension = mimeType.split('/')[1] || 'png';
          if (extension.includes('+')) {
            extension = extension.split('+')[0]; // 'svg+xml' -> 'svg'
          }
          const file = new File([arrayBuffer], `${fileName.split('.')[0]}.${extension}`, { type: mimeType });
          console.log('[Copus Extension] Created file via background fetch:', file.name, file.size, 'bytes');
          return file;
        } catch (bgError) {
          console.warn('[Copus Extension] Background fetch failed, trying canvas approach:', bgError.message);

          // Fallback 2: Use canvas to convert image (works for cross-origin if image is already loaded)
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Try to request with CORS

            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                  if (blob && blob.size > 0) {
                    const file = new File([blob], fileName, { type: 'image/png' });
                    console.log('[Copus Extension] Created file via canvas:', file.name, file.size, 'bytes');
                    resolve(file);
                  } else {
                    reject(new Error('Canvas toBlob failed - image may be tainted by CORS'));
                  }
                }, 'image/png', 0.95);
              } catch (canvasError) {
                reject(new Error('Canvas conversion failed: ' + canvasError.message));
              }
            };

            img.onerror = () => {
              reject(new Error('Failed to load image for canvas conversion'));
            };

            // Set src after handlers to ensure they fire
            img.src = imageSrc;
          });
        }
      }
    }
  } catch (error) {
    console.error('[Copus Extension] Error converting image to file:', error);
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

    if (!result.copus_token) {
      throw new Error('Please log in to upload images. No authentication token found.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'Authorization': `Bearer ${result.copus_token}`
    };
    console.log('[Copus Extension] Added Authorization header for image upload');

    const apiBaseUrl = getApiBaseUrl();
    const uploadUrl = `${apiBaseUrl}/client/common/uploadImage2S3`;
    console.log('[Copus Extension] Upload URL:', uploadUrl);

    // Add timeout to prevent hanging on slow uploads
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for large uploads

    let response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Copus Extension] Fetch error:', error);
      if (error.name === 'AbortError') {
        throw new Error('Image upload timed out after 120 seconds');
      }
      // Check if it's a CORS error
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error: Please check your connection or try again. The server may have rejected the request (CORS).');
      }
      throw error;
    }

    console.log('Image upload response status:', response.status);
    console.log('Image upload response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first for debugging
    const responseText = await response.text();
    console.log('Image upload response raw text:', responseText);

    if (!response.ok) {
      // Try to parse error message from response
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.msg || errorData.message || `Image upload failed (${response.status})`);
      } catch (parseError) {
        throw new Error(`Image upload failed (${response.status}): ${responseText.substring(0, 200)}`);
      }
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from upload API: ' + responseText.substring(0, 200));
    }
    console.log('Image upload response parsed:', responseData);

    // Check API-level status code (S3 upload API uses status: 1 for success)
    if (responseData.status && responseData.status !== 1) {
      throw new Error(responseData.msg || 'Image upload API error (status: ' + responseData.status + ')');
    }

    // Return the uploaded image URL - check multiple possible response formats
    let imageUrl = null;
    if (responseData.data) {
      if (typeof responseData.data === 'string') {
        imageUrl = responseData.data;
      } else if (responseData.data.url) {
        imageUrl = responseData.data.url;
      }
    }
    if (!imageUrl) {
      imageUrl = responseData.url || responseData.imageUrl;
    }

    if (!imageUrl) {
      console.error('Response structure:', JSON.stringify(responseData, null, 2));
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

  // Track this category as recently used
  const selectedOption = event.target.options[event.target.selectedIndex];
  const categoryName = selectedOption.textContent;
  addRecentCategory(parseInt(topicId), categoryName);
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
    // Give enough time for content script to collect images
    const timeoutId = setTimeout(() => {
      console.log('[Copus Extension] fetchPageData timeout after 2 seconds');
      reject(new Error('Page data fetch timeout'));
    }, 2000); // 2 seconds should be enough

    chrome.tabs.sendMessage(tabId, { type: 'collectPageData' }, (response) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        console.log('[Copus Extension] fetchPageData error:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      console.log('[Copus Extension] fetchPageData success, images found:', response?.images?.length || 0);
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
    const response = await fetch(`${apiBaseUrl}/client/user/msg/countMsg`, {
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
      url: 'https://copus.network/notification'
    });
  } else {
    // Fallback - open in same window
    window.open('https://copus.network/notification', '_blank');
  }

  // Close the popup after opening notifications page
  window.close();
}

// Helper function to get the API base URL
function getApiBaseUrl() {
  // Production API - must match the main site's API
  return 'https://api-prod.copus.network';
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
    const apiUrl = `${apiBaseUrl}/client/user/userInfo`;

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
      console.log('[Copus Extension] Token validation failed with status:', response.status);
      // If token is explicitly rejected (401/403), clear it - user needs to re-login
      if (response.status === 401 || response.status === 403) {
        console.log('[Copus Extension] Token rejected by server, clearing storage');
        if (chrome?.storage?.local) {
          await chrome.storage.local.remove(['copus_token', 'copus_user']);
        }
        return { authenticated: false, tokenCleared: true };
      }
      // For other errors (500, etc), don't clear - might be server issue
      return { authenticated: false };
    }
  } catch (error) {
    console.error('[Copus Extension] Authentication check failed:', error);
    // Don't remove token on network errors - user might be offline
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
          url: 'https://copus.network/my-treasury'
        });
      } else {
        // Fallback - open in same window
        window.open('https://copus.network/my-treasury', '_blank');
      }
    };
  }
}

function handleLogin() {
  console.log('[Copus Extension] Handling login click');

  // Open the Copus login page in a new tab
  chrome.tabs.create({
    url: 'https://copus.network/login'
  }, (tab) => {
    console.log('[Copus Extension] Opened login tab:', tab.id);
  });

  // Close the popup after opening login page
  window.close();
}

// Try to read token from any copus.network tab (not just active tab)
async function tryReadTokenFromCopusTabs() {
  try {
    console.log('[Copus Extension] Searching for copus.network tabs...');

    // Get all tabs
    const tabs = await chrome.tabs.query({});

    // Find copus.network or localhost tabs
    const copusTabs = tabs.filter(tab =>
      tab.url && (tab.url.includes('copus.network') || tab.url.includes('localhost:5177'))
    );

    if (copusTabs.length === 0) {
      console.log('[Copus Extension] No copus.network tabs found');
      return null;
    }

    console.log('[Copus Extension] Found', copusTabs.length, 'copus.network tab(s)');

    // Try to read from the first copus tab
    for (const tab of copusTabs) {
      try {
        console.log('[Copus Extension] Attempting to read token from tab:', tab.url);

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Check BOTH localStorage and sessionStorage
            // Mainsite uses sessionStorage when "Remember me" is NOT checked
            const token = localStorage.getItem('copus_token') || sessionStorage.getItem('copus_token');
            const user = localStorage.getItem('copus_user') || sessionStorage.getItem('copus_user');
            return {
              token: token,
              user: user ? JSON.parse(user) : null
            };
          }
        });

        if (results && results[0] && results[0].result) {
          const { token, user } = results[0].result;
          if (token) {
            console.log('[Copus Extension] Successfully read token from copus tab');
            // Store it in extension storage
            if (chrome?.storage?.local) {
              await chrome.storage.local.set({
                'copus_token': token,
                'copus_user': user
              });
              console.log('[Copus Extension] Stored token in extension storage');
            }
            return { token, user };
          } else {
            // No token in this tab - but DON'T clear extension storage!
            // SessionStorage is tab-specific, so this tab might just not have the token
            // The user could still be logged in on another tab or have a valid extension token
            console.log('[Copus Extension] No token found in this copus tab (sessionStorage is tab-specific)');
            // Continue to check other tabs instead of clearing
          }
        }
      } catch (error) {
        console.log('[Copus Extension] Could not read from tab', tab.url, ':', error.message);
        // Continue to next tab
      }
    }

    console.log('[Copus Extension] Could not read token from any copus tab');
  } catch (error) {
    console.log('[Copus Extension] Error searching for copus tabs:', error);
  }
  return null;
}

// Background validation without blocking UI
async function validateUserInBackground() {
  console.log('[Copus Extension] Starting background authentication validation...');

  // First, try to read token from any copus.network tab
  // This syncs the logout state from the main site
  const tabSyncResult = await tryReadTokenFromCopusTabs();

  // If sync found that user logged out on main site, show login screen
  if (tabSyncResult && tabSyncResult.loggedOut) {
    console.log('[Copus Extension] Background validation: User logged out on main site');
    showLoginScreen();
    state.isLoggedIn = false;
    state.userInfo = null;
    return;
  }

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

  console.log('[Copus Extension] Background validation result:', authResult.authenticated);

  // IMPORTANT: If token was cleared (401/403), switch to login screen
  if (authResult.tokenCleared) {
    console.log('[Copus Extension] Background validation: Token rejected, showing login screen');
    showLoginScreen();
    state.isLoggedIn = false;
    state.userInfo = null;
    return;
  }

  // If we're showing the main app (because token exists), keep showing it
  // Only update user info if validation succeeds
  if (authResult.authenticated && elements.mainContainer.style.display === 'flex') {
    console.log('[Copus Extension] Background validation: User authenticated, updating user info');
    state.isLoggedIn = true;
    state.userInfo = authResult.user;
    if (authResult.user) {
      updateUserAvatar(authResult.user);
    }

    // Fetch notification count when user is authenticated
    fetchUnreadNotificationCount();
  } else if (!authResult.authenticated) {
    console.log('[Copus Extension] Background validation: Token validation failed, but keeping current screen');
    // Token validation failed, but DON'T switch to login screen
    // User might be offline or API might be down
    // Let them try to use the extension anyway
  }

}

async function loginUser() {
  console.log('[Copus Extension] Initializing authentication...');

  // First, try to read token from any copus.network tab
  // This syncs the logout state from the main site
  const tabSyncResult = await tryReadTokenFromCopusTabs();

  // If sync found that user logged out on main site, show login screen
  if (tabSyncResult && tabSyncResult.loggedOut) {
    console.log('[Copus Extension] loginUser: User logged out on main site');
    showLoginScreen();
    state.isLoggedIn = false;
    state.userInfo = null;
    return;
  }

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

  // Check if we have a token stored (don't validate via API)
  const hasToken = await quickTokenCheck();

  if (!hasToken) {
    console.log('[Copus Extension] No token found, showing login screen');
    showLoginScreen();
    return;
  }

  console.log('[Copus Extension] Token found, showing main app');
  showMainApp(null);

  // Validate token in background and update user info if successful
  const authResult = await checkAuthentication();
  if (authResult.tokenCleared) {
    console.log('[Copus Extension] loginUser: Token rejected, showing login screen');
    showLoginScreen();
    state.isLoggedIn = false;
    state.userInfo = null;
    return;
  }
  if (authResult.authenticated && authResult.user) {
    console.log('[Copus Extension] Token validated, updating user info');
    state.userInfo = authResult.user;
    updateUserAvatar(authResult.user);
  }
}

// ========== Treasury Selection Functions ==========

/**
 * Fetch user's bindable spaces/treasuries from API
 * API: GET /client/article/bind/bindableSpaces
 *
 * Optimizations:
 * - Uses cache (5 minute TTL) to avoid redundant fetches
 * - Deduplicates in-flight requests
 * - Direct fetch (faster than background script roundtrip)
 */
const TREASURY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchBindableSpaces(forceRefresh = false) {
  // Check cache first (unless force refresh)
  const now = Date.now();
  if (!forceRefresh && state.availableTreasuries.length > 0 && (now - state.treasuriesCacheTime) < TREASURY_CACHE_TTL) {
    console.log('[Copus Extension] Using cached treasuries (' + state.availableTreasuries.length + ' items, cached ' + Math.round((now - state.treasuriesCacheTime) / 1000) + 's ago)');
    return state.availableTreasuries;
  }

  // If there's already a fetch in progress, return that promise (deduplication)
  if (state.treasuriesFetchPromise) {
    console.log('[Copus Extension] Returning existing fetch promise');
    return state.treasuriesFetchPromise;
  }

  // Create the fetch promise
  state.treasuriesFetchPromise = (async () => {
    try {
      console.log('[Copus Extension] Fetching bindable spaces...');

      // Get authentication token
      let result = { copus_token: null };
      if (chrome?.storage?.local) {
        result = await chrome.storage.local.get(['copus_token']);
      } else {
        result.copus_token = localStorage.getItem('copus_token');
      }

      if (!result.copus_token) {
        throw new Error('Authentication required');
      }

      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/client/article/bind/bindableSpaces`;
      console.log('[Copus Extension] Fetching treasuries from:', url);

      // Direct fetch (faster than background script roundtrip)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${result.copus_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch treasuries (${response.status})`);
      }

      const responseData = await response.json();
      console.log('[Copus Extension] Bindable spaces response:', responseData);

      // Handle different API response formats
      let spacesArray = [];
      if (responseData?.data && Array.isArray(responseData.data)) {
        spacesArray = responseData.data;
      } else if (Array.isArray(responseData)) {
        spacesArray = responseData;
      }

      // Sort: Treasury (spaceType 1) first, then Curations (spaceType 2), then by ID descending
      spacesArray.sort((a, b) => {
        if (a.spaceType === 1 && b.spaceType !== 1) return -1;
        if (a.spaceType !== 1 && b.spaceType === 1) return 1;
        if (a.spaceType === 2 && b.spaceType !== 2) return -1;
        if (a.spaceType !== 2 && b.spaceType === 2) return 1;
        return (b.id || 0) - (a.id || 0);
      });

      state.availableTreasuries = spacesArray;
      state.treasuriesCacheTime = Date.now();
      console.log('[Copus Extension] Found', spacesArray.length, 'treasuries');

      return spacesArray;
    } catch (error) {
      console.error('[Copus Extension] Error fetching bindable spaces:', error);
      throw error;
    } finally {
      state.treasuriesFetchPromise = null;
    }
  })();

  return state.treasuriesFetchPromise;
}

/**
 * Prefetch treasuries in background (non-blocking)
 * Call this early to warm up the cache
 */
function prefetchTreasuries() {
  if (state.isLoggedIn) {
    console.log('[Copus Extension] Prefetching treasuries in background...');
    fetchBindableSpaces().catch(err => {
      console.log('[Copus Extension] Prefetch failed (will retry when modal opens):', err.message);
    });
  }
}

/**
 * Create a new treasury/space
 * API: POST /client/article/space/create
 */
async function createNewTreasury(name) {
  try {
    console.log('[Copus Extension] Creating new treasury:', name);

    // Get authentication token
    let result = { copus_token: null };
    if (chrome?.storage?.local) {
      result = await chrome.storage.local.get(['copus_token']);
    } else {
      result.copus_token = localStorage.getItem('copus_token');
    }

    if (!result.copus_token) {
      throw new Error('Authentication required');
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/client/article/space/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.copus_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    console.log('[Copus Extension] Create treasury response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to create treasury (${response.status})`);
    }

    const responseData = await response.json();
    console.log('[Copus Extension] Create treasury response:', responseData);

    // Extract the new treasury from response
    const newTreasury = responseData?.data || responseData;
    return newTreasury;
  } catch (error) {
    console.error('[Copus Extension] Error creating treasury:', error);
    throw error;
  }
}

/**
 * Get display name for a treasury based on spaceType
 * spaceType 1 = Treasury (or name === 'Default Collections Space')
 * spaceType 2 = Curations (or name === 'Default Curations Space')
 */
function getTreasuryDisplayName(treasury) {
  // Detect spaceType from name if not provided (matching main site logic)
  let spaceType = treasury.spaceType;
  if (spaceType === undefined || spaceType === null) {
    if (treasury.name === 'Default Collections Space') {
      spaceType = 1;
    } else if (treasury.name === 'Default Curations Space') {
      spaceType = 2;
    }
  }

  const username = state.userInfo?.username || 'User';

  if (spaceType === 1) {
    return `${username}'s Treasury`;
  }
  if (spaceType === 2) {
    return `${username}'s Curations`;
  }
  return treasury.name || 'Untitled Treasury';
}

/**
 * Open the treasury selection modal
 */
async function openTreasuryModal() {
  console.log('[Copus Extension] Opening treasury modal');

  // Show modal
  elements.treasuryModal.style.display = 'flex';

  // Reset search
  elements.treasurySearchInput.value = '';
  state.treasurySearchQuery = '';

  // Hide create form
  elements.treasuryCreateForm.style.display = 'none';
  elements.newTreasuryName.value = '';

  // Update save button text
  updateSaveButtonText();

  // If we have cached data, show it immediately (no loading state)
  if (state.availableTreasuries.length > 0) {
    console.log('[Copus Extension] Showing cached treasuries immediately');
    renderTreasuryList();

    // Still fetch in background to ensure data is fresh (but don't block UI)
    fetchBindableSpaces().then(() => {
      // Re-render if data changed
      renderTreasuryList();
    }).catch(err => {
      console.log('[Copus Extension] Background refresh failed:', err.message);
    });
  } else {
    // No cached data - show loading and wait for fetch
    elements.treasuryList.innerHTML = '<div class="treasury-loading">Loading treasuries...</div>';

    try {
      await fetchBindableSpaces();
      renderTreasuryList();
    } catch (error) {
      console.error('[Copus Extension] Error loading treasuries:', error);
      elements.treasuryList.innerHTML = '<div class="treasury-empty">Failed to load treasuries</div>';
    }
  }
}

/**
 * Close the treasury selection modal
 */
function closeTreasuryModal() {
  console.log('[Copus Extension] Closing treasury modal');
  elements.treasuryModal.style.display = 'none';
}

/**
 * Render the treasury list with current selection and search filter
 */
function renderTreasuryList() {
  const searchQuery = state.treasurySearchQuery.toLowerCase().trim();

  // Filter treasuries based on search
  const filteredTreasuries = state.availableTreasuries.filter(treasury => {
    const displayName = getTreasuryDisplayName(treasury).toLowerCase();
    const name = (treasury.name || '').toLowerCase();
    return displayName.includes(searchQuery) || name.includes(searchQuery);
  });

  if (filteredTreasuries.length === 0) {
    elements.treasuryList.innerHTML = '<div class="treasury-empty">No treasuries found</div>';
    updateSaveButtonText();
    return;
  }

  // Build the list HTML - matching main site structure
  const listHTML = filteredTreasuries.map(treasury => {
    const isSelected = state.selectedTreasuries.some(t => t.id === treasury.id);
    const displayName = getTreasuryDisplayName(treasury);
    const firstLetter = displayName.charAt(0).toUpperCase();

    // Determine if this is a default space (spaceType 1 or 2, or by name)
    const isDefaultSpace = treasury.spaceType === 1 || treasury.spaceType === 2 ||
      treasury.name === 'Default Collections Space' || treasury.name === 'Default Curations Space';

    // Determine avatar - matching main site's logic:
    // For default Treasury/Curations (spaceType 1 & 2), use user's profile image
    // For custom spaces, use the first article's cover image from this collection
    let avatarHtml;
    let coverImage = '';

    if (isDefaultSpace) {
      // Default space: use user's profile image
      coverImage = state.userInfo?.faceUrl || '';
    } else {
      // Custom space: use first article's cover image
      coverImage = treasury.data?.[0]?.coverUrl || '';
    }

    if (coverImage) {
      avatarHtml = `<img src="${coverImage}" alt="${displayName}" onerror="this.parentElement.innerHTML='<span class=\\'treasury-avatar-letter\\'>${firstLetter}</span>'" />`;
    } else {
      avatarHtml = `<span class="treasury-avatar-letter">${firstLetter}</span>`;
    }

    return `
      <li class="treasury-item ${isSelected ? 'selected' : ''}" data-treasury-id="${treasury.id}">
        <div class="treasury-item-left">
          <div class="treasury-checkbox">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="treasury-avatar">
            ${avatarHtml}
          </div>
          <span class="treasury-name">${displayName}</span>
        </div>
      </li>
    `;
  }).join('');

  elements.treasuryList.innerHTML = `<ul style="list-style: none; margin: 0; padding: 0;">${listHTML}</ul>`;

  // Add click handlers to items
  elements.treasuryList.querySelectorAll('.treasury-item').forEach(item => {
    item.addEventListener('click', () => {
      const treasuryId = parseInt(item.dataset.treasuryId);
      toggleTreasurySelection(treasuryId);
    });
  });

  // Update save button text
  updateSaveButtonText();
}

/**
 * Toggle treasury selection
 */
function toggleTreasurySelection(treasuryId) {
  const treasury = state.availableTreasuries.find(t => t.id === treasuryId);
  if (!treasury) return;

  const existingIndex = state.selectedTreasuries.findIndex(t => t.id === treasuryId);

  if (existingIndex >= 0) {
    // Deselect
    state.selectedTreasuries.splice(existingIndex, 1);
  } else {
    // Select
    state.selectedTreasuries.push({
      id: treasury.id,
      name: getTreasuryDisplayName(treasury),
      spaceType: treasury.spaceType
    });
  }

  // Re-render list to update checkmarks
  renderTreasuryList();
}

/**
 * Update save button text with selection count (matching main site)
 */
function updateSaveButtonText() {
  if (!elements.treasuryModalSave) return;

  const count = state.selectedTreasuries.length;
  if (count > 0) {
    elements.treasuryModalSave.textContent = `Save (${count})`;
  } else {
    elements.treasuryModalSave.textContent = 'Save';
  }
}

/**
 * Handle treasury search input
 */
function handleTreasurySearch(event) {
  state.treasurySearchQuery = event.target.value;
  renderTreasuryList();
}

/**
 * Show the create treasury form
 */
function showTreasuryCreateForm() {
  elements.treasuryCreateForm.style.display = 'flex';
  elements.newTreasuryName.value = '';
  elements.newTreasuryName.focus();
}

/**
 * Hide the create treasury form
 */
function hideTreasuryCreateForm() {
  elements.treasuryCreateForm.style.display = 'none';
  elements.newTreasuryName.value = '';
}

/**
 * Handle creating a new treasury
 */
async function handleCreateTreasury() {
  const name = elements.newTreasuryName.value.trim();

  if (!name) {
    showToast('Please enter a treasury name', 'error');
    return;
  }

  try {
    elements.treasuryCreateConfirm.disabled = true;
    elements.treasuryCreateConfirm.textContent = 'Creating...';

    const newTreasury = await createNewTreasury(name);

    // Add to available treasuries and update cache time
    state.availableTreasuries.unshift(newTreasury);
    state.treasuriesCacheTime = Date.now(); // Update cache since we modified the list

    // Auto-select the new treasury
    state.selectedTreasuries.push({
      id: newTreasury.id,
      name: newTreasury.name || name,
      spaceType: newTreasury.spaceType
    });

    // Re-render and hide form
    renderTreasuryList();
    hideTreasuryCreateForm();

    showToast('Treasury created successfully', 'success');
  } catch (error) {
    console.error('[Copus Extension] Error creating treasury:', error);
    showToast('Failed to create treasury', 'error');
  } finally {
    elements.treasuryCreateConfirm.disabled = false;
    elements.treasuryCreateConfirm.textContent = 'Create';
  }
}

/**
 * Save treasury selection and close modal
 */
function saveTreasurySelection() {
  console.log('[Copus Extension] Saving treasury selection:', state.selectedTreasuries);

  // Update the button text
  updateTreasuryButtonText();

  // Close modal
  closeTreasuryModal();
}

/**
 * Update the treasury select button text based on selection
 */
function updateTreasuryButtonText() {
  if (state.selectedTreasuries.length === 0) {
    elements.treasurySelectText.textContent = 'Choose treasuries...';
    elements.treasurySelectButton.classList.remove('has-selection');
  } else if (state.selectedTreasuries.length === 1) {
    elements.treasurySelectText.textContent = state.selectedTreasuries[0].name;
    elements.treasurySelectButton.classList.add('has-selection');
  } else {
    elements.treasurySelectText.textContent = `${state.selectedTreasuries.length} treasuries selected`;
    elements.treasurySelectButton.classList.add('has-selection');
  }
}

/**
 * Initialize treasury selection event listeners
 */
function initTreasuryEventListeners() {
  // Open modal button
  if (elements.treasurySelectButton) {
    elements.treasurySelectButton.addEventListener('click', openTreasuryModal);
  }

  // Close modal button
  if (elements.treasuryModalClose) {
    elements.treasuryModalClose.addEventListener('click', closeTreasuryModal);
  }

  // Cancel button
  if (elements.treasuryModalCancel) {
    elements.treasuryModalCancel.addEventListener('click', closeTreasuryModal);
  }

  // Save button
  if (elements.treasuryModalSave) {
    elements.treasuryModalSave.addEventListener('click', saveTreasurySelection);
  }

  // Search input
  if (elements.treasurySearchInput) {
    elements.treasurySearchInput.addEventListener('input', handleTreasurySearch);
  }

  // Create trigger button
  if (elements.treasuryCreateTrigger) {
    elements.treasuryCreateTrigger.addEventListener('click', showTreasuryCreateForm);
  }

  // Create cancel button
  if (elements.treasuryCreateCancel) {
    elements.treasuryCreateCancel.addEventListener('click', hideTreasuryCreateForm);
  }

  // Create confirm button
  if (elements.treasuryCreateConfirm) {
    elements.treasuryCreateConfirm.addEventListener('click', handleCreateTreasury);
  }

  // Enter key in create input
  if (elements.newTreasuryName) {
    elements.newTreasuryName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleCreateTreasury();
      }
    });
  }

  // Click on backdrop to close modal
  const backdrop = document.getElementById('treasury-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeTreasuryModal);
  }
}

// ========== x402 Payment Functions ==========

/**
 * Handle payment toggle switch
 */
function handlePaymentToggle(event) {
  const isEnabled = event.target.checked;
  state.payToVisit = isEnabled;

  // Show/hide payment details
  if (elements.paymentDetails) {
    elements.paymentDetails.style.display = isEnabled ? 'flex' : 'none';
  }

  // Update estimated income if enabled
  if (isEnabled) {
    updateEstimatedIncome();
  }
}

/**
 * Handle payment amount input changes
 */
function handlePaymentAmountChange(event) {
  const amount = event.target.value;
  state.paymentAmount = amount;

  // Update estimated income display
  updateEstimatedIncome();
}

/**
 * Calculate and update estimated income display
 * Based on platform fee structure: 45% curator, 45% original creator, 10% platform vault
 */
function updateEstimatedIncome() {
  if (!elements.estimatedIncome) return;

  const amount = parseFloat(state.paymentAmount) || 0;

  // Curator gets 45% of the price
  const curatorShare = amount * 0.45;

  // Format to 4 decimal places
  const formattedIncome = curatorShare.toFixed(4);

  elements.estimatedIncome.textContent = `${formattedIncome} USD per unlock`;
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

  if (!elements.recommendationInput.value.trim()) {
    setStatus('Recommendation is required.', 'error');
    return false;
  }

  // Treasury selection is optional - if not selected, backend auto-binds to user's Curations
  // (Same behavior as mainsite)

  // Validate payment amount if payment is enabled
  if (state.payToVisit) {
    const amount = parseFloat(state.paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatus('Please enter a valid payment amount greater than 0.', 'error');
      return false;
    }
  }

  return true;
}

/**
 * Verify that an article exists on copus.network
 * Polls the API to check if the article is accessible
 * @param {string} articleUuid - The UUID of the article to verify
 * @param {number} maxAttempts - Maximum number of verification attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
async function verifyArticleExists(articleUuid, maxAttempts = 5, delayMs = 1000) {
  const apiBaseUrl = getApiBaseUrl();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Copus Extension] Verifying article exists (attempt ${attempt}/${maxAttempts}):`, articleUuid);

      // Try to fetch article info from the API
      const response = await fetch(`${apiBaseUrl}/client/article/info?uuid=${articleUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Copus Extension] Article verification response:', data);

        // Check if the API returned valid article data
        // status 1 means success, and data should contain article info
        if (data.status === 1 && data.data) {
          console.log('[Copus Extension] Article verified successfully');
          return { exists: true };
        }

        // If status indicates article not found or error
        if (data.status !== 1) {
          console.log('[Copus Extension] Article not found yet, status:', data.status);
        }
      } else if (response.status === 404) {
        console.log('[Copus Extension] Article not found (404)');
      } else {
        console.log('[Copus Extension] Verification request failed with status:', response.status);
      }

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error('[Copus Extension] Verification attempt failed:', error);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    exists: false,
    error: 'Article could not be verified on copus.network. It may not have been published successfully.'
  };
}

async function publishToCopus(payload) {
  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/client/author/article/edit`;

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
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw error;
    }

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

    // Skip page data loading during publish - images are already loaded during init
    // This avoids slow content script injection and speeds up publishing

    let coverUrl;
    let fileToUpload;

    // Debug: Log cover image state
    console.log('[Copus Extension] Cover image state:', {
      coverSourceType: state.coverSourceType,
      hasCoverImage: !!state.coverImage,
      hasCoverImageSrc: !!state.coverImage?.src,
      coverImageSrcType: state.coverImage?.src?.substring(0, 30),
      hasCoverImageFile: !!state.coverImageFile
    });

    // Determine how to handle the cover image based on source type
    if (state.coverSourceType === 'upload' && state.coverImageFile) {
      // Use original file for uploads
      fileToUpload = state.coverImageFile;
      console.log('[Copus Extension] Using original uploaded file:', fileToUpload.name, fileToUpload.size, 'bytes');
    } else if (state.coverImage && state.coverImage.src) {
      // Convert screenshot or detected image to file
      const fileName = state.coverSourceType === 'screenshot'
        ? 'screenshot.png'
        : 'detected-image.jpg';

      console.log('[Copus Extension] Converting', state.coverSourceType, 'image to file');
      console.log('[Copus Extension] Image src preview:', state.coverImage.src.substring(0, 100));

      try {
        fileToUpload = await convertImageToFile(state.coverImage.src, fileName);
        console.log('[Copus Extension] Converted to file:', fileToUpload.name, fileToUpload.size, 'bytes');
      } catch (convertError) {
        console.error('[Copus Extension] Image conversion failed:', convertError);
        throw new Error('Image processing failed: ' + convertError.message);
      }
    } else {
      console.error('[Copus Extension] No cover image available in state');
      throw new Error('No cover image available');
    }

    // Validate file before upload
    if (!fileToUpload || fileToUpload.size === 0) {
      console.error('[Copus Extension] Invalid file to upload:', fileToUpload);
      throw new Error('Image file is empty or invalid');
    }

    // Upload the image to S3
    try {
      console.log('[Copus Extension] Starting S3 upload...');
      coverUrl = await uploadImageToS3(fileToUpload);
      console.log('[Copus Extension] S3 upload complete, URL:', coverUrl);

      if (!coverUrl) {
        throw new Error('S3 upload returned empty URL');
      }
    } catch (uploadError) {
      console.error('[Copus Extension] S3 upload failed:', uploadError);
      throw new Error('Image upload failed: ' + uploadError.message);
    }

    const payload = {
      content: elements.recommendationInput.value.trim(),
      coverUrl: coverUrl,
      targetUrl: state.pageUrl,
      title: elements.pageTitleInput.value.trim() || state.pageTitle,
      // categoryId is required by the API - use 0 as default (uncategorized)
      categoryId: 0,
      // Only include spaceIds if treasuries are selected (optional)
      // If not provided, backend auto-binds to user's Curations
      ...(state.selectedTreasuries.length > 0 ? {
        spaceIds: state.selectedTreasuries.map(t => t.id)
      } : {})
    };

    // Debug: Log the full payload being sent
    console.log('[Copus Extension] Full publish payload:', JSON.stringify(payload, null, 2));

    // Add x402 payment fields if payment is enabled
    // IMPORTANT: Format must match mainsite Create.tsx exactly
    if (state.payToVisit) {
      const parsedPrice = parseFloat(state.paymentAmount || "0.01");
      payload.targetUrlIsLocked = true;
      payload.priceInfo = {
        chainId: "8453", // Base mainnet chain ID as STRING
        currency: "USDC", // Currency symbol, not contract address
        price: parsedPrice // Parse as float, default 0.01
      };
    } else {
      payload.targetUrlIsLocked = false;
    }

    try {
      const result = await publishToCopus(payload);

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

      if (!articleUuid) {
        throw new Error('No article ID returned from server. Publishing may have failed.');
      }

      // Verify the article actually exists on copus.network before showing success
      console.log('[Copus Extension] Verifying article was published:', articleUuid);

      // Update button to show verification status
      elements.publishButton.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>Verifying...</span>
        </div>
      `;

      const verification = await verifyArticleExists(articleUuid);

      if (!verification.exists) {
        throw new Error(verification.error || 'Failed to verify article on copus.network. Publishing may have failed.');
      }

      // Only show success after verification passes
      const successMessage = 'Done! Thank you for surfacing an internet gem!';
      showToast(successMessage, 'success');

      // Open the work page in a new tab
      const workUrl = `https://copus.network/work/${articleUuid}`;

      // Get current auth data from extension storage to inject into target tab
      const authData = await chrome.storage.local.get(['copus_token', 'copus_user']);
      console.log('[Copus Extension] Auth data for redirect:', {
        hasToken: !!authData.copus_token,
        hasUser: !!authData.copus_user
      });

      // Always create a new tab for the work page
      console.log('[Copus Extension] Creating new tab for work page:', workUrl);

      // Send message to background script to create tab and inject token
      chrome.runtime.sendMessage({
        type: 'openUrlAndInjectToken',
        url: workUrl,
        token: authData.copus_token,
        user: authData.copus_user
      });

      // Small delay before closing to ensure messages are sent
      await new Promise(resolve => setTimeout(resolve, 100));
      window.close();
    } catch (publishError) {
      console.error('Publish to Copus failed:', publishError);
      throw publishError;
    }

  } catch (error) {
    console.error('Publishing error:', error);
    showToast('Publishing failed: ' + error.message, 'error');
  } finally {
    elements.publishButton.disabled = false;
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

  // IMPORTANT: First sync with copus.network tabs to get current login state
  // This ensures we show the correct screen (login vs main app)
  // Website is the source of truth for auth state
  const tabSyncResult = await tryReadTokenFromCopusTabs();

  // If sync found that user logged out on main site, clear storage
  if (tabSyncResult && tabSyncResult.loggedOut) {
    console.log('[Copus Extension] Detected logout from copus tabs sync');
    showLoginScreen();
    state.isLoggedIn = false;
    state.userInfo = null;
  } else {
    // Now check token after sync
    const hasToken = await quickTokenCheck();

    if (hasToken) {
      // Start with main app if token exists
      elements.loginScreen.style.display = 'none';
      elements.mainContainer.style.display = 'flex';
      console.log('[Copus Extension] Token found, starting with main app');

      // Load user data from storage and display immediately
      try {
        let result = { copus_user: null };
        if (chrome?.storage?.local) {
          result = await chrome.storage.local.get(['copus_user']);
        } else {
          const userStr = localStorage.getItem('copus_user');
          if (userStr) result.copus_user = JSON.parse(userStr);
        }

        if (result.copus_user) {
          console.log('[Copus Extension] Loaded user from storage, displaying avatar');
          state.userInfo = result.copus_user;
          state.isLoggedIn = true;
          updateUserAvatar(result.copus_user);

          // Prefetch treasuries in background for faster modal opening
          prefetchTreasuries();
        }
      } catch (error) {
        console.log('[Copus Extension] Could not load user from storage:', error);
      }
    } else {
      // No token in storage, show login screen
      elements.loginScreen.style.display = 'flex';
      elements.mainContainer.style.display = 'none';
      console.log('[Copus Extension] No token in storage, showing login screen');
    }
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

  // Add treasury selection event listeners
  initTreasuryEventListeners();

  // Add notification bell event listener
  if (elements.notificationBell) {
    elements.notificationBell.addEventListener('click', handleNotificationClick);
  }

  // Add x402 payment event listeners
  if (elements.payToVisitToggle) {
    elements.payToVisitToggle.addEventListener('change', handlePaymentToggle);
  }
  if (elements.paymentAmount) {
    elements.paymentAmount.addEventListener('input', handlePaymentAmountChange);
  }

  console.timeEnd('add_event_listeners');

  console.time('update_character_count');
  // Initialize character count
  updateCharacterCount();
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

  // Load page data immediately - loadPageData will inject content script if needed
  loadPageData(state.activeTabId).catch(error => {
    console.log('Background page data loading failed:', error);
  });

  // Note: userInfo and notification count are fetched once on popup open
  // via validateUserInBackground() which calls checkAuthentication() and fetchUnreadNotificationCount()
  // No periodic polling - data is fresh on each popup open
}

// Listen for storage changes to detect logout from website
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes.copus_token) {
      console.log('[Copus Extension] Token storage changed:', changes.copus_token);

      // If token was removed (logged out)
      if (!changes.copus_token.newValue && changes.copus_token.oldValue) {
        console.log('[Copus Extension] Token removed - user logged out, showing login screen');
        showLoginScreen();
        state.isLoggedIn = false;
        state.userInfo = null;
      }
      // If token was added (logged in)
      else if (changes.copus_token.newValue && !changes.copus_token.oldValue) {
        console.log('[Copus Extension] Token added - user logged in, refreshing...');
        // Re-validate and show main app
        const hasToken = await quickTokenCheck();
        if (hasToken) {
          showMainApp(null);
          validateUserInBackground();
        }
      }
    }
  });
}

// Separate function for page data loading (non-blocking)
async function loadPageData(tabId) {
  try {
    // Try to fetch data first (content script might already be loaded)
    let pageData;
    try {
      pageData = await fetchPageData(tabId);
    } catch (firstError) {
      console.log('[Copus Extension] First fetch failed, trying to inject content script:', firstError.message);

      // Content script not responding - try to inject it
      // This happens when extension is opened on an already-loaded page
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['contentScript.js']
        });
        console.log('[Copus Extension] Content script injected successfully');

        // Wait a bit for script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Try fetching again
        pageData = await fetchPageData(tabId);
      } catch (injectionError) {
        console.log('[Copus Extension] Content script injection failed:', injectionError.message);
        // Can't inject (might be chrome:// page or other restricted page)
        throw firstError;
      }
    }

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
    console.log('[Copus Extension] Page data loading failed (this is normal for chrome:// pages):', error.message);
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
