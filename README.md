# Copus - Internet Treasure Map (Browser Extension)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)

A powerful Chrome extension for curating and sharing quality web content. Save, categorize, and monetize your discoveries on the Copus platform using the x402 payment protocol.

## Features

### 🎯 One-Click Content Curation
- Save any webpage to your Copus Treasury with a single click
- Automatically extracts page metadata (title, URL, description, images)
- Smart cover image selection with multiple options:
  - Auto-detected page images
  - Manual screenshot capture
  - Custom image upload

### 📝 Rich Publishing Metadata
- Category selection from Copus taxonomy
- Add your personal recommendation and context
- Customize cover images and titles before publishing

### 💰 Monetization with x402
- Set pay-to-unlock prices for your curated content
- Earn from readers who value your curation
- Gasless USDC payments on Base blockchain
- Instant settlement with no transaction fees for readers

### 🔐 Seamless Authentication
- MetaMask wallet integration
- Coinbase Wallet support
- Email/password authentication option
- Auto-detects environment (production/test)

## Installation

### From Chrome Web Store (Recommended)
1. Visit the [Copus extension page](https://chrome.google.com/webstore) on Chrome Web Store
2. Click "Add to Chrome"
3. Click "Add extension" to confirm

### From Source (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/copus-io/copus-network-browser-extension.git
   cd copus-network-browser-extension
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the cloned repository directory

## Usage

### First Time Setup
1. Click the Copus extension icon in your browser toolbar
2. Log in with your wallet (MetaMask or Coinbase Wallet) or email/password
3. Grant necessary permissions when prompted

### Curating Content
1. Navigate to any webpage you want to save
2. Click the Copus extension icon
3. Review the auto-detected metadata:
   - Title (editable)
   - Cover image (selectable from page images, upload, or screenshot)
   - Category (required)
4. Add your personal recommendation (why this content is valuable)
5. Optionally set a pay-to-unlock price
6. Click "Publish" to save to your Treasury

### Setting Pay-to-Unlock
1. Toggle "Set Pay-to-Unlock" when curating content
2. Select blockchain network (Base Sepolia for testing, Base for production)
3. Choose currency (USDC)
4. Set your price
5. Publish - readers will pay this amount to unlock your curated content

## Development

### Prerequisites
- Chrome or any Chromium-based browser (Edge, Brave, etc.)
- Basic knowledge of JavaScript and Chrome Extension APIs

### Project Structure
```
copus-network-browser-extension/
├── manifest.json          # Extension manifest (v3)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic and UI interactions
├── popup.css             # Popup styles
├── background.js         # Service worker for background tasks
├── contentScript.js      # Content script for page interaction
├── icons/                # Extension icons (16, 32, 48, 128)
└── profile-default.svg   # Default avatar
```

### Key Files

#### manifest.json
Defines extension permissions, content scripts, and configuration.

#### popup.js
Handles the main extension UI:
- Page metadata extraction
- Cover image selection and upload
- Category management
- Publishing workflow
- Authentication flow

#### contentScript.js
Runs on all web pages to:
- Validate authentication tokens
- Detect page content
- Communicate with background script

#### background.js
Service worker that handles:
- Context menu integration
- Cross-tab communication
- Background API calls

### API Integration

The extension communicates with the Copus backend API:

**Production:** `https://api-prod.copus.network/copusV2`
**Test:** `https://api-test.copus.network/copusV2`

Environment detection is automatic based on the domain you're accessing.

### Testing

1. Load the extension in developer mode (see Installation)
2. Open any webpage
3. Click the extension icon to test the curation flow
4. Check the browser console for debugging information

### Building for Production

No build step required - the extension runs directly from source files.

To create a distribution package:
```bash
zip -r copus-extension.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.DS_Store" \
  -x "*README*" \
  -x "*.claude*" \
  -x "*test.html" \
  -x "*debug.html" \
  -x "UI/*"
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards

## Security

### Permissions Explained

The extension requires these permissions:

- `activeTab` - Access current tab to extract page metadata
- `tabs` - Read tab information for content detection
- `scripting` - Inject content scripts for page interaction
- `tabCapture` - Capture screenshots for cover images
- `contextMenus` - Add right-click context menu options
- `storage` - Store user preferences locally

### Data Privacy

- Authentication tokens are stored securely in browser storage
- No personal data is collected without explicit user action
- All API communications use HTTPS
- Wallet signatures happen entirely in your browser

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Copus Website](https://copus.network)
- [Documentation](https://docs.copus.network)
- [API Documentation](https://api-docs.copus.network)
- [Chrome Web Store](https://chrome.google.com/webstore)
- [Report Issues](https://github.com/copus-io/copus-network-browser-extension/issues)

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/copus-io/copus-network-browser-extension/issues)
- Email: support@copus.network
- Discord: [Join our community](https://discord.gg/copus)

## Acknowledgments

Built with:
- Chrome Extension Manifest V3
- x402 Payment Protocol
- Base Blockchain
- MetaMask & Coinbase Wallet integration

---

Made with ❤️ by the Copus team
