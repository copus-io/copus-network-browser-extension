# Extension Permissions Audit

This document explains every permission requested by the Copus browser extension and why it's necessary.

## Standard Permissions

### 1. `activeTab`
**Why needed:** Capture screenshot of the current tab for cover images.

**Where used:**
- `background.js:22` - `chrome.tabs.captureVisibleTab()` to create screenshots when user clicks the screenshot button

**User benefit:** Users can quickly capture a screenshot of the current page to use as their work's cover image.

### 2. `tabs`
**Why needed:** Query active tab information, create new tabs, and send messages to tabs.

**Where used:**
- `popup.js:520` - `chrome.tabs.query()` to get current tab information (URL, title)
- `popup.js:1446` - `chrome.tabs.create()` to open work page after publishing
- `popup.js:684` - `chrome.tabs.create()` to open notifications page
- `popup.js:892` - `chrome.tabs.create()` to open My Treasury page
- `popup.js:533` - `chrome.tabs.sendMessage()` to collect page data (images, metadata)
- `popup.js:886, 944` - `chrome.tabs.query()` to send recheck auth messages

**User benefit:**
- Auto-fills page title and URL when curating content
- Opens published work in new tab
- Seamless navigation to notifications and treasury

### 3. `scripting`
**Why needed:** Dynamically inject content script to collect page data when needed.

**Where used:**
- `popup.js:1903` - `chrome.scripting.executeScript()` to inject content script if not already present

**User benefit:** Only injects code when user actively uses the extension (on-demand), respecting privacy and performance.

### 4. `contextMenus`
**Why needed:** Add "Publish to Copus" to right-click menu.

**Where used:**
- `background.js:3` - `chrome.contextMenus.create()` to create context menu item
- `background.js:11` - `chrome.contextMenus.onClicked` to handle menu clicks

**User benefit:** Quick access to publish functionality via right-click menu.

### 5. `storage`
**Why needed:** Store authentication token and user data locally.

**Where used:**
- `background.js:47` - `chrome.storage.local.set()` to store auth data
- `background.js:56` - `chrome.storage.local.remove()` to clear auth data
- `popup.js` (multiple locations) - `chrome.storage.local.get()` to retrieve auth token and user info

**User benefit:** Remember login state so users don't have to re-authenticate every time they open the extension.

## Host Permissions

### `https://api-prod.copus.network/*`
**Why needed:** Make API calls to production backend for publishing, authentication, and fetching user data.

**Where used:**
- `popup.js:681` - API base URL for production environment
- `contentScript.js:110` - Token validation API

### `https://api-test.copus.network/*`
**Why needed:** Make API calls to test backend for development and testing.

**Where used:**
- `contentScript.js:110` - Token validation API for test environment

### `https://copus.network/*`
**Why needed:** Redirect to production site after publishing, monitor authentication state.

**Where used:**
- `popup.js:1443` - Open work page after publishing
- `contentScript.js:66` - Monitor for authentication tokens

### `https://test.copus.network/*`
**Why needed:** Support test environment, monitor authentication state on test site.

**Where used:**
- `contentScript.js:110` - Detect test environment
- `popup.js:1443` - Open work page on test domain if user is logged in there

### `https://copus.ai/*`
**Why needed:** Support legacy domain, monitor authentication state.

**Where used:**
- `contentScript.js:66` - Monitor for authentication tokens on legacy domain

### `<all_urls>`
**Why needed:** Allow content script to run on any website to collect page data (images, title, URL) when user wants to curate content.

**Where used:**
- `contentScript.js` - Runs on all URLs to:
  - Collect page images for cover selection (`collectPageImages()`)
  - Monitor Copus domains for authentication token sync
  - Inject extension marker for main site detection

**User benefit:** Extension works on any website - users can curate content from anywhere on the internet.

**Privacy note:** Content script only collects data when user actively clicks the extension icon. No data is collected or sent without user action.

## Removed Permissions (v1.7.1)

### ~~`tabCapture`~~ - REMOVED
**Reason for removal:** Not used. We use `captureVisibleTab` which only requires `activeTab` permission.
- `tabCapture` is for capturing tab audio/video streams
- `captureVisibleTab` is for screenshots (requires only `activeTab`)

### ~~`https://api.copus.io/*`~~ - REMOVED
**Reason for removal:** Legacy API domain that is no longer used in the codebase.

## Permission Justification Summary

Every permission requested is **actively used** and **necessary** for core functionality:

1. ✅ **User-initiated actions only** - Extension only activates when user clicks it
2. ✅ **Minimal data collection** - Only collects page data (title, URL, images) when user curates
3. ✅ **Transparent purpose** - All permissions serve clear user-facing features
4. ✅ **No background tracking** - Content script only monitors auth on Copus domains
5. ✅ **Secure storage** - Auth tokens stored locally, never shared with third parties

## Testing Checklist

Before each release, verify all permissions are used:

- [ ] Screenshot capture works (`activeTab`)
- [ ] New tabs open after publish (`tabs`)
- [ ] Content script injects on demand (`scripting`)
- [ ] Right-click menu appears (`contextMenus`)
- [ ] Login state persists (`storage`)
- [ ] API calls succeed to production (`api-prod.copus.network`)
- [ ] API calls succeed to test env (`api-test.copus.network`)
- [ ] Works on all websites (`<all_urls>`)
- [ ] Auth syncs on Copus sites (`copus.network`, `test.copus.network`, `copus.ai`)
