# Contributing to Copus Browser Extension

First off, thank you for considering contributing to the Copus Browser Extension! It's people like you that make Copus such a great tool for content curation.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to support@copus.network.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable
- **Environment**:
  - Browser version
  - Extension version
  - Operating system
- **Console Logs**: Any relevant error messages from browser console

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use case**: Why is this enhancement useful?
- **Detailed description**: How should it work?
- **Alternatives considered**: What other solutions did you think about?
- **Additional context**: Mockups, examples, or references

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/copus-io/copus-network-browser-extension.git
   cd copus-network-browser-extension
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Your Changes**
   - Follow the coding standards below
   - Write meaningful commit messages
   - Test your changes thoroughly

4. **Test Locally**
   - Load the extension in Chrome (chrome://extensions)
   - Enable Developer mode
   - Click "Load unpacked" and select your directory
   - Test all affected functionality

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue numbers
     - Testing performed
     - Screenshots (if UI changes)

## Development Guidelines

### Code Style

- **JavaScript**: Use ES6+ features
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Comments**: Add comments for complex logic
- **Variable naming**: camelCase for variables and functions

### File Organization

```
copus-network-browser-extension/
├── manifest.json          # Extension configuration
├── popup.html            # UI structure
├── popup.js              # UI logic
├── popup.css             # Styles
├── background.js         # Background service worker
├── contentScript.js      # Page content interaction
└── icons/                # Extension icons
```

### Best Practices

1. **Keep it Simple**: Write clear, readable code
2. **Error Handling**: Always handle errors gracefully
3. **User Feedback**: Provide clear feedback for user actions
4. **Performance**: Minimize API calls and optimize image handling
5. **Security**: Never expose API keys or sensitive data
6. **Accessibility**: Ensure UI is accessible to all users

### Testing Checklist

Before submitting a PR, verify:

- [ ] Extension loads without errors
- [ ] All existing features still work
- [ ] New features work as expected
- [ ] UI is responsive and displays correctly
- [ ] Console shows no errors or warnings
- [ ] Works on both production and test environments
- [ ] Authentication flow works correctly
- [ ] Image upload/selection works
- [ ] Category selection works
- [ ] Publishing succeeds
- [ ] Pay-to-unlock settings work (if applicable)

### API Integration

When working with the Copus API:

- Use the correct environment endpoints:
  - Production: `https://api-prod.copus.network/copusV2`
  - Test: `https://api-test.copus.network/copusV2`
- Include proper error handling
- Add loading states for async operations
- Validate responses before using data

### Security Considerations

- Never commit API keys or secrets
- Validate all user inputs
- Sanitize data before display
- Use HTTPS for all API calls
- Store sensitive data securely using Chrome Storage API
- Follow Chrome Extension security best practices

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new functions
- Update manifest.json version according to semantic versioning
- Document any new permissions or APIs used

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Discord**: Join our community for real-time chat
- **Email**: support@copus.network for private inquiries

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Our community hall of fame

## Release Process

1. Version numbers follow [Semantic Versioning](https://semver.org/)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

2. Releases are created by maintainers
3. Change logs are automatically generated from commit messages

## Questions?

Don't hesitate to ask! We're here to help. Open an issue with the "question" label or reach out on Discord.

---

Thank you for contributing to Copus! Together, we're building the Internet Treasure Map.
