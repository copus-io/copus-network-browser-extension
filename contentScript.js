// Inject marker IMMEDIATELY to indicate extension is installed
// This MUST run before any other code to ensure the main site can detect it
document.documentElement.setAttribute('data-copus-extension-installed', 'true');
console.log('[Copus Extension] Injected extension marker into DOM at:', window.location.href);

// ========== SIDEBAR INJECTION ==========
let sidebarRoot = null;
let sidebarVisible = false;
let sidebarInitialized = false;

// Toggle sidebar visibility
function toggleSidebar() {
  console.log('[Copus Extension] toggleSidebar called, current state:', sidebarVisible);

  if (!sidebarInitialized) {
    createSidebar();
    sidebarInitialized = true;
    sidebarVisible = true;
  } else if (sidebarRoot) {
    sidebarVisible = !sidebarVisible;
    const container = sidebarRoot.shadowRoot.querySelector('.copus-sidebar-container');
    if (container) {
      container.style.transform = sidebarVisible ? 'translateX(0)' : 'translateX(100%)';
    }
  }
}

// Create the sidebar with Shadow DOM for CSS isolation
function createSidebar() {
  console.log('[Copus Extension] Creating sidebar...');

  // Remove existing sidebar if any
  const existing = document.getElementById('copus-sidebar-root');
  if (existing) {
    existing.remove();
  }

  // Create root element
  sidebarRoot = document.createElement('div');
  sidebarRoot.id = 'copus-sidebar-root';
  sidebarRoot.style.cssText = 'position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483647; pointer-events: none;';

  // Attach shadow DOM (closed for better isolation)
  const shadow = sidebarRoot.attachShadow({ mode: 'closed' });

  // Inject CSS and HTML
  shadow.innerHTML = getSidebarHTML();

  // Append to document
  document.body.appendChild(sidebarRoot);

  // Initialize sidebar functionality
  initializeSidebar(shadow);

  console.log('[Copus Extension] Sidebar created successfully');
}

// Get sidebar HTML template
function getSidebarHTML() {
  return `
    <style>
      ${getSidebarCSS()}
    </style>
    <div class="copus-sidebar-container" style="transform: translateX(0);">
      <div class="copus-sidebar-backdrop"></div>
      <div class="copus-sidebar">
        <!-- Close Button -->
        <button class="sidebar-close-btn" type="button" aria-label="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Toast Notification -->
        <div id="toast" class="toast"></div>

        <!-- Login Screen -->
        <div id="login-screen" class="login-screen" style="display: none;">
          <div class="login-container">
            <div class="login-content">
              <div class="login-text">
                <h1 class="login-title">Please log in to start!</h1>
                <p class="login-subtitle">Discover and share internet gems</p>
              </div>
              <button id="login-button" class="login-button">
                <span>Log in</span>
              </button>
            </div>
            <div class="login-mascot">
              <img src="https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg" alt="Copus Octopus" class="octopus-image" />
            </div>
          </div>
        </div>

        <!-- Main Extension Content -->
        <div id="main-container" class="compact-container" style="display: none;">
          <!-- Header -->
          <header class="compact-header">
            <div class="brand">
              <a href="https://copus.network/" target="_blank" class="logo-link">
                <div class="logo">
                  <svg width="25" height="25" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="30" height="30" rx="15" fill="#F23A00"/>
                    <path d="M15.8975 5C16.5927 4.99742 16.9432 5.06308 17.5049 5.2998C18.0231 5.51823 18.3723 5.76429 18.8037 6.21582C19.4729 6.91628 19.8268 7.67954 19.9404 8.66406C20.0344 9.47896 19.8862 10.2536 19.3428 11.7793C19.1515 12.3164 18.9688 12.9074 18.9365 13.0928C18.8216 13.7532 19.0357 14.2181 19.5898 14.5098C20.1689 14.8146 20.8332 15.0153 21.4082 14.7266C21.8047 14.5274 21.9571 13.8716 22.1934 13C22.1934 12.0001 22.3793 11.3848 23.1016 11C23.8239 10.6152 24.9945 11.2777 25 12C25.0054 12.7223 24.4752 14.3995 23.6387 15C22.2458 15.9999 21.2031 16.3627 20.0684 16.4238C19.7604 16.4404 19.5141 16.4723 19.5215 16.4941C19.5639 16.6197 20.3337 17.4868 20.6221 17.7344C21.068 18.1171 21.4135 18.3388 22.3789 18.8604C22.8185 19.0978 23.3252 19.3964 23.5049 19.5234C23.9148 19.8132 24.3132 20.2492 24.4756 20.5869C24.9135 21.4976 24.5211 22.7095 23.6387 23.1729C23.3614 23.3183 22.9461 23.3466 22.752 23.2334C22.6416 23.1689 22.6438 23.1654 22.9121 23.0059C23.2917 22.7801 23.6247 22.4364 23.7725 22.1182C23.9276 21.7839 23.9203 21.3592 23.7549 21.1143C23.6121 20.903 23.1369 20.6528 22.1934 20.292C20.3378 19.5824 19.8205 19.2288 18.1055 17.4912C17.669 17.049 17.3027 16.6959 17.291 16.707C17.2799 16.7188 17.3915 17.0973 17.5391 17.5479C17.9339 18.7535 18.2609 19.4303 18.9014 20.3711C19.5971 21.393 19.7735 21.7009 19.918 22.1387C20.2116 23.0284 20.0718 23.824 19.5068 24.4756C19.0308 25.0244 18.4561 25.16 18.1367 24.7988C18.0004 24.6446 18.0121 24.6048 18.1924 24.6035C18.5488 24.6007 19.0075 24.2218 19.1309 23.8281C19.2755 23.3664 19.0227 22.6858 18.4561 22.0146C18.2653 21.7887 17.9419 21.4062 17.7373 21.165C17.0086 20.3059 16.4516 19.2641 15.9658 17.8477C15.8276 17.4448 15.705 17.1491 15.6934 17.1904C15.6816 17.2324 15.6244 17.5023 15.5664 17.791C15.3394 18.9211 14.9482 19.9421 14.4873 20.6045C14.3654 20.7796 13.9944 21.2499 13.6631 21.6494C13.3318 22.0489 12.9823 22.4962 12.8867 22.6436C12.7058 22.9223 12.5694 23.3179 12.5693 23.5635C12.5693 23.7693 12.6937 24.0533 12.8691 24.248C13.0161 24.411 13.5232 24.705 13.6572 24.7051C13.7107 24.7052 13.7109 24.7188 13.6602 24.7832C13.4797 25.0124 13.0936 25.068 12.8027 24.9062C12.3444 24.651 11.9117 23.8478 11.8311 23.1016C11.7547 22.3934 12.0836 21.5001 12.7227 20.6797C13.5297 19.6438 13.6636 19.3336 14.0156 17.6797C14.0844 17.3563 14.1551 17.0516 14.1729 17.0029C14.1903 16.9546 14.0029 17.1382 13.7559 17.4111C13.1633 18.0659 12.362 18.8238 11.9297 19.1387C11.4307 19.5021 10.8512 19.7908 9.9541 20.1211C9.5226 20.28 9.03171 20.475 8.86328 20.5547C7.54808 21.1769 7.54703 22.1224 8.86035 23.0518C8.95099 23.1159 9.03522 23.1772 9.04883 23.1885C9.10548 23.2364 8.90976 23.3011 8.70508 23.3018C8.11474 23.3035 7.4131 22.6145 7.21777 21.8418C7.12266 21.4653 7.13242 21.0127 7.24414 20.6396C7.48775 19.8266 8.15302 19.2333 9.3125 18.7939C9.84615 18.5917 10.569 18.2156 10.9619 17.9365C11.1265 17.8196 11.5361 17.4963 11.8711 17.2188L12.4795 16.7139L12.3223 16.6807C12.2355 16.6624 11.9857 16.6218 11.7666 16.5898C10.757 16.4427 10.1917 16.5896 8.32031 16C6.44901 15.4104 5.94824 14.5 5.94824 14.5C5.94269 14.4954 5 13.7155 5 12C5.00007 10.2796 7.00741 10.0817 7.37109 11C7.67957 11.7794 7.21835 12.5 7.21777 13C7.21726 13.5 7.3957 14.4527 8.05078 14.7266C8.70582 15.0002 9.74555 15 10.6943 15C11.4782 15 12.5037 14.6918 12.7158 13.8721C12.8467 13.3659 12.6671 12.3436 12.2207 11.0479C11.8663 10.0192 11.7851 9.62287 11.7891 8.94922C11.7931 8.26706 11.8864 7.84241 12.1641 7.24512C12.5376 6.44168 13.0857 5.88169 13.9004 5.4707C14.5578 5.13912 15.1353 5.00287 15.8975 5ZM14.877 11.5645C14.2001 11.5646 13.9601 12.2255 13.96 12.5078C13.96 12.9587 14.3868 13.4042 14.877 13.4043C15.4936 13.4043 15.7998 12.892 15.7998 12.5078C15.7997 12.1236 15.5038 11.5645 14.877 11.5645ZM23.5449 11.915C23.2771 11.915 23.0596 12.1446 23.0596 12.4268C23.0598 12.7088 23.2772 12.9375 23.5449 12.9375C23.8124 12.9372 24.0291 12.7086 24.0293 12.4268C24.0293 12.1447 23.8126 11.9153 23.5449 11.915ZM6.50098 10.9424C6.23313 10.9424 6.01563 11.1709 6.01562 11.4531C6.01562 11.7353 6.23313 11.9639 6.50098 11.9639C6.76866 11.9637 6.98535 11.7352 6.98535 11.4531C6.98534 11.1711 6.76865 10.9426 6.50098 10.9424ZM13.5674 9.43359C13.2997 9.4337 13.0831 9.66233 13.083 9.94434C13.083 10.2265 13.2996 10.455 13.5674 10.4551C13.8352 10.4551 14.0527 10.2265 14.0527 9.94434C14.0526 9.66227 13.8351 9.43359 13.5674 9.43359ZM16.4775 9.43359C16.2098 9.43359 15.9923 9.66227 15.9922 9.94434C15.9922 10.2265 16.2097 10.4551 16.4775 10.4551C16.7454 10.4551 16.9629 10.2265 16.9629 9.94434C16.9628 9.66228 16.7453 9.43362 16.4775 9.43359Z" fill="white"/>
                  </svg>
                </div>
              </a>
            </div>
            <div class="header-actions">
              <!-- Notification Bell -->
              <div id="notification-bell" class="notification-bell" title="Notifications">
                <img
                  src="https://c.animaapp.com/mft4oqz6uyUKY7/img/notification.svg"
                  alt="Notification"
                  class="notification-icon"
                />
                <div id="notification-badge" class="notification-badge" style="display: none;">
                  <span id="notification-count">0</span>
                </div>
              </div>
              <!-- Avatar -->
              <div class="avatar">
                <div style="width:25px;height:25px;border-radius:50%;background:#ccc;display:flex;align-items:center;justify-content:center;color:#666;font-size:10px;">U</div>
              </div>
            </div>
          </header>

          <!-- Main Content -->
          <main class="compact-main">
            <!-- Link Section - Hidden -->
            <section class="field-section" style="display: none;">
              <label class="field-label">Link</label>
              <div class="link-display" id="page-url-display">http://xxxxx.com</div>
            </section>

            <!-- Cover Section -->
            <section class="field-section">
              <label class="field-label">Cover</label>
              <div id="cover-container" class="cover-area">
                <div id="cover-empty" class="cover-empty">
                  <div class="cover-actions-compact">
                    <label class="upload-button" for="cover-upload">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                      Upload from device
                    </label>
                    <input id="cover-upload" type="file" accept="image/*" hidden />

                    <div class="action-icons">
                      <button id="cover-screenshot" class="icon-button" type="button" title="Capture screenshot">
                        <svg width="20" height="20" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M23.5 3.5778V13.4514C23.5 13.8104 23.3602 14.1547 23.1114 14.4086C22.8625 14.6625 22.525 14.8051 22.1731 14.8051C21.8212 14.8051 21.4836 14.6625 21.2348 14.4086C20.986 14.1547 20.8462 13.8104 20.8462 13.4514V3.5778C20.8462 3.52921 20.8368 3.48109 20.8185 3.4362C20.8003 3.3913 20.7736 3.35051 20.7399 3.31615C20.7062 3.28179 20.6663 3.25453 20.6223 3.23594C20.5783 3.21734 20.5311 3.20777 20.4835 3.20777H3.55192C3.50141 3.20272 3.45041 3.20854 3.40224 3.22486C3.35407 3.24118 3.30979 3.26763 3.27226 3.30251C3.23474 3.33739 3.20482 3.37991 3.18442 3.42733C3.16402 3.47475 3.1536 3.52602 3.15385 3.5778V13.4514C3.15385 13.8104 3.01405 14.1547 2.7652 14.4086C2.51635 14.6625 2.17884 14.8051 1.82692 14.8051C1.475 14.8051 1.13749 14.6625 0.888647 14.4086C0.6398 14.1547 0.5 13.8104 0.5 13.4514V3.5778C0.499973 3.17059 0.579154 2.76742 0.732958 2.39166C0.886761 2.0159 1.11213 1.67501 1.396 1.38875C1.67987 1.1025 2.0166 0.876559 2.38667 0.724036C2.75675 0.571513 3.15282 0.495435 3.55192 0.500212H20.4481C20.8472 0.495435 21.2432 0.571513 21.6133 0.724036C21.9834 0.876559 22.3201 1.1025 22.604 1.38875C22.8879 1.67501 23.1132 2.0159 23.267 2.39166C23.4208 2.76742 23.5 3.17059 23.5 3.5778ZM22.1819 17.621C23.0002 18.4985 23.4566 19.6634 23.4566 20.8746C23.4566 22.0858 23.0002 23.2507 22.1819 24.1282C21.7755 24.5626 21.2868 24.9082 20.7454 25.1441C20.204 25.3799 19.6213 25.501 19.0327 25.5C18.444 25.501 17.8613 25.3799 17.32 25.1441C16.7786 24.9082 16.2899 24.5626 15.8835 24.1282C15.2229 23.4166 14.7963 22.5125 14.6631 21.5418C14.5299 20.5712 14.6968 19.5824 15.1404 18.713L12 15.4008L8.85961 18.713C9.30194 19.5827 9.46804 20.5712 9.3349 21.5416C9.20175 22.5119 8.77594 23.4159 8.11654 24.1282C7.71012 24.5626 7.22139 24.9082 6.68002 25.1441C6.13866 25.3799 5.55595 25.501 4.96731 25.5C4.37866 25.501 3.79596 25.3799 3.25459 25.1441C2.71323 24.9082 2.22449 24.5626 1.81808 24.1282C0.999758 23.2507 0.543388 22.0858 0.543388 20.8746C0.543388 19.6634 0.999758 18.4985 1.81808 17.621C2.46858 16.9175 3.32916 16.4535 4.26539 16.3017C5.20163 16.1498 6.16079 16.3186 6.99308 16.7817L10.1512 13.4514L6.11731 9.19147C5.88529 8.93167 5.76141 8.58999 5.77185 8.23868C5.78229 7.88737 5.92624 7.55398 6.17325 7.309C6.42027 7.06401 6.75099 6.92664 7.09549 6.92593C7.43999 6.92523 7.77125 7.06124 8.01923 7.30521L12 11.5109L15.9808 7.31423C16.2274 7.06803 16.5584 6.92955 16.9035 6.92816C17.2485 6.92676 17.5806 7.06257 17.8291 7.30677C18.0777 7.55097 18.2232 7.88436 18.2349 8.23621C18.2465 8.58806 18.1234 8.93071 17.8915 9.19147L13.8488 13.4604L17.0069 16.7907C17.8392 16.3276 18.7984 16.1589 19.7346 16.3107C20.6708 16.4626 21.5314 16.9265 22.1819 17.63V17.621ZM6.20577 19.5073C6.04693 19.3346 5.85508 19.197 5.64207 19.1029C5.42907 19.0088 5.19942 18.9603 4.96731 18.9603C4.7352 18.9603 4.50555 19.0088 4.29254 19.1029C4.07953 19.197 3.88769 19.3346 3.72885 19.5073C3.39499 19.8758 3.20957 20.3592 3.20957 20.861C3.20957 21.3629 3.39499 21.8463 3.72885 22.2148C3.88769 22.3875 4.07953 22.5251 4.29254 22.6192C4.50555 22.7133 4.7352 22.7618 4.96731 22.7618C5.19942 22.7618 5.42907 22.7133 5.64207 22.6192C5.85508 22.5251 6.04693 22.3875 6.20577 22.2148C6.53963 21.8463 6.72505 21.3629 6.72505 20.861C6.72505 20.3592 6.53963 19.8758 6.20577 19.5073ZM20.2712 19.5073C20.1123 19.3346 19.9205 19.197 19.7075 19.1029C19.4944 19.0088 19.2648 18.9603 19.0327 18.9603C18.8006 18.9603 18.5709 19.0088 18.3579 19.1029C18.1449 19.197 17.9531 19.3346 17.7942 19.5073C17.4604 19.8758 17.275 20.3592 17.275 20.861C17.275 21.3629 17.4604 21.8463 17.7942 22.2148C17.9531 22.3875 18.1449 22.5251 18.3579 22.6192C18.5709 22.7133 18.8006 22.7618 19.0327 22.7618C19.2648 22.7618 19.4944 22.7133 19.7075 22.6192C19.9205 22.5251 20.1123 22.3875 20.2712 22.2148C20.605 21.8463 20.7904 21.3629 20.7904 20.861C20.7904 20.3592 20.605 19.8758 20.2712 19.5073Z" fill="currentColor"/>
                        </svg>
                        <span>Capture</span>
                      </button>

                      <button id="toggle-detected-images" class="icon-button" type="button" title="Detect images">
                        <svg width="20" height="20" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9948 0.500006C10.5996 0.498025 8.25482 1.18784 6.24185 2.48663C6.0933 2.58469 5.98943 2.73746 5.95283 2.91173C5.91623 3.08601 5.94987 3.26769 6.04642 3.41729C6.14297 3.56688 6.29463 3.67229 6.46843 3.71059C6.64223 3.7489 6.82412 3.71701 6.97455 3.62185C8.57635 2.58919 10.4173 1.98755 12.3195 1.8751V7.6424C11.131 7.79321 10.0262 8.33508 9.1791 9.18276C8.33195 10.0305 7.79043 11.1359 7.63971 12.3252H1.87609C1.99486 10.3308 2.64799 8.40516 3.76691 6.75044L3.97287 8.20662C3.9958 8.36899 4.07696 8.51746 4.2012 8.62438C4.32544 8.7313 4.4843 8.78936 4.64816 8.78775H4.74608C4.92338 8.76263 5.08344 8.66808 5.19109 8.52489C5.29873 8.3817 5.34513 8.2016 5.32008 8.02418L4.89127 4.99356C4.86617 4.81615 4.77168 4.65598 4.62858 4.54827C4.48548 4.44057 4.30549 4.39414 4.12819 4.4192L1.10288 4.8449C0.923777 4.86955 0.761796 4.96437 0.652568 5.10852C0.543339 5.25266 0.49581 5.43433 0.520436 5.61354C0.545062 5.79275 0.639826 5.95484 0.783881 6.06413C0.927937 6.17343 1.10948 6.22099 1.28858 6.19635L2.63917 6.00377C1.02956 8.38917 0.291884 11.2573 0.550688 14.1239C0.809493 16.9904 2.04892 19.6798 4.05971 21.738C6.07049 23.7961 8.72944 25.0969 11.5876 25.4206C14.4457 25.7444 17.328 25.0714 19.7477 23.5151C19.8963 23.4171 20.0001 23.2643 20.0367 23.09C20.0733 22.9157 20.0397 22.7341 19.9431 22.5845C19.8466 22.4349 19.6949 22.3295 19.5211 22.2912C19.3473 22.2529 19.1654 22.2848 19.015 22.3799C17.4132 23.4126 15.5722 24.0142 13.6701 24.1267V18.3594C14.8586 18.2085 15.9633 17.6667 16.8105 16.819C17.6576 15.9713 18.1991 14.8659 18.3499 13.6766H24.1135C23.9947 15.671 23.3416 17.5966 22.2227 19.2513L22.0167 17.7951C21.9916 17.6159 21.8964 17.454 21.7521 17.345C21.6077 17.2361 21.426 17.1889 21.2469 17.214C21.0678 17.2391 20.906 17.3344 20.797 17.4788C20.6881 17.6233 20.641 17.8051 20.6661 17.9843L21.0949 21.0251C21.1179 21.1874 21.199 21.3359 21.3232 21.4428C21.4475 21.5498 21.6063 21.6078 21.7702 21.6062H21.8647L24.8799 21.1805C25.059 21.1559 25.221 21.061 25.3302 20.9169C25.4395 20.7727 25.487 20.5911 25.4624 20.4119C25.4377 20.2327 25.343 20.0706 25.1989 19.9613C25.0549 19.852 24.8733 19.8044 24.6942 19.8291L23.3436 20.0216C24.6191 18.1413 25.3583 15.9487 25.4816 13.6795C25.6049 11.4103 25.1076 9.1504 24.0434 7.14282C22.9791 5.13524 21.3881 3.45594 19.4414 2.2855C17.4946 1.11506 15.2659 0.497769 12.9948 0.500006ZM12.3195 24.1267C9.60389 23.9609 7.04272 22.8068 5.11894 20.8817C3.19515 18.9567 2.0417 16.3939 1.87609 13.6766H7.63971C7.79043 14.8659 8.33195 15.9713 9.1791 16.819C10.0262 17.6667 11.131 18.2085 12.3195 18.3594V24.1267ZM15.0207 13.6766H16.9858C16.845 14.5053 16.4503 15.2698 15.8563 15.8642C15.2623 16.4586 14.4983 16.8536 13.6701 16.9944V15.028C13.6701 14.8488 13.5989 14.677 13.4723 14.5502C13.3456 14.4235 13.1739 14.3523 12.9948 14.3523C12.8157 14.3523 12.6439 14.4235 12.5173 14.5502C12.3906 14.677 12.3195 14.8488 12.3195 15.028V16.9944C11.4913 16.8536 10.7273 16.4586 10.1333 15.8642C9.53924 15.2698 9.14454 14.5053 9.0038 13.6766H10.9689C11.148 13.6766 11.3198 13.6054 11.4464 13.4787C11.573 13.352 11.6442 13.1801 11.6442 13.0009C11.6442 12.8217 11.573 12.6498 11.4464 12.5231C11.3198 12.3963 11.148 12.3252 10.9689 12.3252H9.0038C9.14454 11.4964 9.53924 10.7319 10.1333 10.1375C10.7273 9.54314 11.4913 9.14819 12.3195 9.00736V10.9737C12.3195 11.1529 12.3906 11.3248 12.5173 11.4515C12.6439 11.5782 12.8157 11.6494 12.9948 11.6494C13.1739 11.6494 13.3456 11.5782 13.4723 11.4515C13.5989 11.3248 13.6701 11.1529 13.6701 10.9737V9.00736C14.4983 9.14819 15.2623 9.54314 15.8563 10.1375C16.4503 10.7319 16.845 11.4964 16.9858 12.3252H15.0207C14.8416 12.3252 14.6698 12.3963 14.5432 12.5231C14.4165 12.6498 14.3454 12.8217 14.3454 13.0009C14.3454 13.1801 14.4165 13.352 14.5432 13.4787C14.6698 13.6054 14.8416 13.6766 15.0207 13.6766ZM18.3499 12.3252C18.1991 11.1359 17.6576 10.0305 16.8105 9.18276C15.9633 8.33508 14.8586 7.79321 13.6701 7.6424V1.8751C16.3857 2.04082 18.9468 3.19501 20.8706 5.12002C22.7944 7.04503 23.9479 9.60783 24.1135 12.3252H18.3499Z" fill="currentColor"/>
                        </svg>
                        <span>Detect</span>
                      </button>
                    </div>
                  </div>
                </div>
                <img id="cover-preview" class="cover-preview" alt="Selected cover preview" hidden />
                <button id="cover-remove" class="cover-remove" type="button" hidden>×</button>
              </div>
            </section>

            <!-- Title Section -->
            <section class="field-section">
              <label class="field-label">Title</label>
              <div class="textarea-wrapper">
                <input id="page-title-input" class="field-input" type="text" value="" maxlength="75" required />
                <div class="char-counter" id="title-char-counter">0/75</div>
              </div>
            </section>

            <!-- Recommendation Section -->
            <section class="field-section">
              <label class="field-label">Recommendation</label>
              <div class="textarea-wrapper">
                <textarea id="recommendation-input" class="field-textarea" placeholder="What did you find valuable about this link?" maxlength="1000" required></textarea>
                <div class="char-counter" id="char-counter">0/1000</div>
              </div>
            </section>

            <!-- Treasury Selection Section -->
            <section class="field-section">
              <label class="field-label">Select treasury</label>
              <button id="treasury-select-button" class="treasury-select-button" type="button">
                <span id="treasury-select-text">Choose treasuries...</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </section>

            <!-- x402 Payment Section -->
            <section class="field-section payment-section">
              <div class="payment-header">
                <div class="payment-label-group">
                  <img src="https://c.animaapp.com/ih9UJdKk/img/x402-icon-blue-2@2x.png" alt="x402" class="x402-icon" />
                  <label class="field-label">Enable Pay-to-visit</label>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="pay-to-visit-toggle" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div id="payment-details" class="payment-details" style="display: none;">
                <div class="payment-amount-group">
                  <div class="amount-input-wrapper">
                    <input type="number" id="payment-amount" class="amount-input" value="0.01" step="0.001" min="0" aria-label="Payment amount" />
                  </div>
                  <span class="currency-label">USD</span>
                </div>
                <div class="payment-info">
                  <div class="income-info">
                    <div class="income-label-group">
                      <span>Estimated income</span>
                      <button type="button" class="info-button" title="Estimated income is 45% of the price.">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
                          <text x="6" y="9" text-anchor="middle" font-size="8" fill="currentColor" font-weight="bold">?</text>
                        </svg>
                      </button>
                      <span>:</span>
                    </div>
                    <span id="estimated-income" class="income-value">0.0004 per unlock</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button id="cancel-button" class="btn-cancel">Cancel</button>
              <button id="publish-button" class="btn-publish" type="button">Publish</button>
            </div>

            <p id="status-message" class="status-message" role="alert"></p>
          </main>
        </div>

        <!-- Image Selection View -->
        <div id="image-selection-view" class="image-selection-view" hidden>
          <div class="image-selection-header">
            <button id="go-back-button" class="back-button">←</button>
            <h2>Detected Images</h2>
          </div>
          <div id="image-selection-grid" class="image-selection-grid"></div>
        </div>

        <!-- Treasury Selection Modal -->
        <div id="treasury-selection-modal" class="treasury-modal" style="display: none;">
          <div class="treasury-modal-backdrop" id="treasury-modal-backdrop"></div>
          <div class="treasury-modal-content">
            <button id="treasury-modal-close" class="treasury-modal-close" type="button" aria-label="Close dialog">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686868" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="treasury-modal-header">
              <h2 id="choose-dialog-title">Choose treasuries</h2>
              <button id="treasury-create-trigger" class="treasury-new-btn" type="button">
                <img src="https://c.animaapp.com/eANMvAF7/img/plus.svg" alt="Add" width="20" height="20" />
                <span>New treasury</span>
              </button>
            </div>
            <div id="treasury-create-form" class="treasury-create-form" style="display: none;">
              <input type="text" id="new-treasury-name" class="treasury-create-input" placeholder="Enter treasury name..." maxlength="50" />
              <div class="treasury-create-actions">
                <button id="treasury-create-cancel" class="treasury-create-btn treasury-create-btn-cancel" type="button">Cancel</button>
                <button id="treasury-create-confirm" class="treasury-create-btn treasury-create-btn-confirm" type="button">Create</button>
              </div>
            </div>
            <div class="treasury-search-wrapper">
              <img src="https://c.animaapp.com/eANMvAF7/img/icon-search.svg" alt="Search" class="treasury-search-icon" width="18" height="18" />
              <input type="search" id="treasury-search-input" class="treasury-search-input" placeholder="Search" />
            </div>
            <div id="treasury-list" class="treasury-list">
              <div class="treasury-loading">Loading treasuries...</div>
            </div>
            <div class="treasury-modal-actions">
              <button id="treasury-modal-cancel" class="treasury-action-cancel" type="button">Cancel</button>
              <button id="treasury-modal-save" class="treasury-action-save" type="button">Save</button>
            </div>
          </div>
        </div>

        <!-- Image Cropper Modal -->
        <div id="image-cropper-modal" class="cropper-modal" style="display: none;">
          <div class="cropper-content">
            <h3 class="cropper-title">Crop Image</h3>
            <div class="cropper-canvas-wrapper">
              <canvas id="cropper-canvas" class="cropper-canvas"></canvas>
            </div>
            <div class="cropper-instructions">
              <div>Drag to move / Drag corners to resize</div>
              <div>16:9 aspect ratio</div>
            </div>
            <div class="cropper-actions">
              <button id="cropper-cancel" class="btn-cancel">Cancel</button>
              <button id="cropper-confirm" class="btn-publish">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Get sidebar CSS
function getSidebarCSS() {
  return \`
    /* Sidebar Container */
    .copus-sidebar-container {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 380px;
      display: flex;
      pointer-events: auto;
      transition: transform 0.3s ease;
      z-index: 2147483647;
    }

    .copus-sidebar-backdrop {
      display: none;
    }

    .copus-sidebar {
      width: 100%;
      height: 100%;
      background: #f8f9fa;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .sidebar-close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.05);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      z-index: 100;
      transition: all 0.2s ease;
    }

    .sidebar-close-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #333;
    }

    /* CSS Variables */
    :host {
      --bg-primary: #f8f9fa;
      --bg-white: #ffffff;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --text-muted: #999999;
      --border-light: #e5e5e5;
      --border-dashed: #cccccc;
      --color-red: #ff4a17;
      --color-pink: #ea7db7;
      --color-green: #2b8649;
      --color-blue: #2191fb;
      --color-yellow: #c9b71f;
      --required-color: #ff4a17;
      --success-color: #1f9d55;
      --error-color: #d64545;
      font-size: 14px;
    }

    * {
      box-sizing: border-box;
    }

    /* Compact Container */
    .compact-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

    /* Compact Header */
    .compact-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      padding-right: 48px;
      background: var(--bg-primary);
      flex-shrink: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notification-bell {
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .notification-bell:hover {
      transform: rotate(12deg) scale(1.05);
    }

    .notification-icon {
      width: 25px;
      height: 25px;
      transform: rotate(12deg);
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #F23A00;
      color: white;
      font-size: 10px;
      font-weight: bold;
      border-radius: 50%;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 2px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-link {
      text-decoration: none;
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .logo {
      width: 25px;
      height: 25px;
      background: transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      overflow: hidden;
    }

    /* Main Content */
    .compact-main {
      flex: 1;
      padding: 4px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    /* Field Sections */
    .field-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .field-label {
      font-weight: 400;
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Inputs */
    .field-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: var(--bg-white);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s ease;
    }

    .field-input:focus {
      border-color: var(--color-blue);
      box-shadow: 0 0 0 3px rgba(33, 145, 251, 0.1);
    }

    .field-textarea {
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: var(--text-primary);
      resize: none;
      outline: none;
      min-height: 60px;
      line-height: 1.4;
    }

    .field-textarea::placeholder {
      color: var(--text-muted);
    }

    .textarea-wrapper {
      background: var(--bg-white);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      position: relative;
    }

    .textarea-wrapper:focus-within {
      border-color: var(--color-blue);
      box-shadow: 0 0 0 3px rgba(33, 145, 251, 0.1);
    }

    .textarea-wrapper .field-input {
      border: none;
      background: transparent;
      padding-right: 50px;
    }

    .char-counter {
      position: absolute;
      bottom: 8px;
      right: 12px;
      font-size: 10px;
      color: var(--text-muted);
      pointer-events: none;
    }

    /* Cover Area */
    .cover-area {
      border: 2px dashed var(--border-dashed);
      border-radius: 8px;
      background: var(--bg-white);
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-empty {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px;
      gap: 8px;
    }

    .cover-actions-compact {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .upload-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-white);
      border: 1px solid var(--border-light);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-button:hover {
      background: #f0f0f0;
      border-color: var(--text-secondary);
    }

    .action-icons {
      display: flex;
      gap: 16px;
    }

    .icon-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: color 0.2s ease;
      min-width: 50px;
      height: 45px;
    }

    .icon-button:hover {
      color: var(--text-primary);
    }

    .icon-button span {
      font-size: 12px;
      font-weight: 500;
    }

    .cover-preview {
      position: absolute;
      inset: 2px;
      width: calc(100% - 4px);
      height: calc(100% - 4px);
      object-fit: cover;
      border-radius: 6px;
    }

    .cover-remove {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-remove:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: auto;
      padding-top: 8px;
      padding-bottom: 16px;
    }

    .btn-cancel {
      padding: 8px 20px;
      background: transparent;
      border: none;
      border-radius: 25px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: #f0f0f0;
    }

    .btn-publish {
      padding: 8px 20px;
      background: var(--color-red);
      border: none;
      border-radius: 25px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      min-width: 100px;
      height: 36px;
    }

    .btn-publish:hover {
      background: #e03d0f;
    }

    .btn-publish:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Toast */
    .toast {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-red);
      color: white;
      padding: 8px 16px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      max-width: 320px;
      text-align: center;
    }

    .toast.show {
      opacity: 1;
    }

    .toast.success {
      background: var(--success-color);
    }

    .toast.error {
      background: var(--color-red);
    }

    .status-message {
      display: none;
    }

    /* Login Screen */
    .login-screen {
      width: 100%;
      height: 100%;
      background: #f8f9fa;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .login-container {
      width: 100%;
      height: 100%;
      padding: 40px 30px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    .login-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 40px;
      width: 100%;
      max-width: 280px;
      text-align: center;
      z-index: 2;
    }

    .login-text {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      text-align: center;
    }

    .login-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
      line-height: 1.3;
    }

    .login-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 400;
      color: #7f8c8d;
      margin: 0;
      line-height: 1.4;
    }

    .login-button {
      width: 100%;
      max-width: 240px;
      height: 48px;
      background: transparent;
      border: 2px solid #FF5722;
      border-radius: 25px;
      color: #FF5722;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-button:hover {
      background: rgba(255, 87, 34, 0.05);
      transform: translateY(-1px);
    }

    .login-mascot {
      position: absolute;
      bottom: -20px;
      left: -20px;
      width: 140px;
      height: 160px;
    }

    .octopus-image {
      width: 140px;
      height: 140px;
      object-fit: contain;
    }

    /* Treasury Selection Button */
    .treasury-select-button {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: var(--bg-white);
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: border-color 0.2s ease;
    }

    .treasury-select-button:hover {
      border-color: var(--color-blue);
    }

    .treasury-select-button.has-selection {
      color: var(--text-primary);
    }

    /* Payment Section */
    .payment-section {
      padding: 3px 0;
      min-height: 85px;
    }

    .payment-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .payment-label-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .x402-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 39px;
      height: 20px;
      cursor: pointer;
    }

    .toggle-switch input[type="checkbox"] {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      border-radius: 50px;
      transition: background-color 0.3s ease;
    }

    .toggle-slider::before {
      content: "";
      position: absolute;
      height: 15px;
      width: 15px;
      left: 2.5px;
      bottom: 2.5px;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.3s ease;
    }

    .toggle-switch input[type="checkbox"]:checked + .toggle-slider {
      background-color: var(--color-green);
    }

    .toggle-switch input[type="checkbox"]:checked + .toggle-slider::before {
      transform: translateX(19px);
    }

    .payment-details {
      margin-top: 2px;
      padding-top: 2px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: slideDown 0.3s ease;
      min-height: 40px;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
      }
      to {
        opacity: 1;
        max-height: 200px;
      }
    }

    .payment-amount-group {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .amount-input-wrapper {
      padding: 6px 12px;
      border: 1px solid var(--border-light);
      border-radius: 15px;
      background: var(--bg-white);
      display: inline-flex;
      align-items: center;
    }

    .amount-input {
      border: none;
      background: transparent;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      text-align: center;
      outline: none;
      width: 80px;
      padding: 0;
    }

    .amount-input::-webkit-inner-spin-button,
    .amount-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .currency-label {
      font-size: 11px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .income-info {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .income-label-group {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .income-label-group span,
    .income-value {
      font-size: 11px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .info-button {
      background: none;
      border: none;
      padding: 2px;
      cursor: help;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Image Selection View */
    .image-selection-view {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--bg-primary);
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
      z-index: 50;
    }

    .image-selection-header {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }

    .image-selection-header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .back-button {
      position: absolute;
      left: 0;
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 8px;
    }

    .back-button:hover {
      color: var(--text-primary);
    }

    .image-selection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
    }

    .image-selection-grid .image-option {
      border: 2px solid transparent;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      background: none;
      transition: border-color 0.2s ease;
    }

    .image-selection-grid .image-option:hover {
      border-color: var(--color-blue);
    }

    .image-selection-grid .image-option img {
      width: 100%;
      height: 100px;
      object-fit: cover;
      display: block;
    }

    /* Treasury Modal */
    .treasury-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .treasury-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
    }

    .treasury-modal-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      width: 340px;
      max-width: 90%;
      max-height: 80%;
      padding: 24px 24px 12px 24px;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      gap: 16px;
    }

    .treasury-modal-close {
      position: absolute;
      top: 8px;
      right: 12px;
      padding: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 20;
    }

    .treasury-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 10px;
      margin-top: 10px;
    }

    .treasury-modal-header h2 {
      margin: 0;
      font-weight: 500;
      font-size: 18px;
      color: #231f20;
    }

    .treasury-new-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      margin-left: auto;
    }

    .treasury-new-btn span {
      font-size: 13px;
      color: #231f20;
    }

    .treasury-search-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      padding: 0 16px;
      border-radius: 15px;
      background: linear-gradient(0deg, rgba(224, 224, 224, 0.4) 0%, rgba(224, 224, 224, 0.4) 100%), #fff;
    }

    .treasury-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      color: #231f20;
      outline: none;
    }

    .treasury-search-input::placeholder {
      color: #686868;
    }

    .treasury-list {
      flex: 1;
      overflow-y: auto;
      max-height: 220px;
      min-height: 80px;
    }

    .treasury-loading,
    .treasury-empty {
      padding: 20px;
      text-align: center;
      color: #686868;
      font-size: 14px;
    }

    .treasury-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
    }

    .treasury-item:hover {
      background-color: #f9fafb;
    }

    .treasury-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .treasury-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
    }

    .treasury-item.selected .treasury-checkbox {
      background: #f23a00;
      border-color: #f23a00;
    }

    .treasury-checkbox svg {
      width: 10px;
      height: 10px;
      color: white;
      opacity: 0;
    }

    .treasury-item.selected .treasury-checkbox svg {
      opacity: 1;
    }

    .treasury-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .treasury-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .treasury-name {
      font-size: 15px;
      color: #231f20;
    }

    .treasury-create-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 10px;
    }

    .treasury-create-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: var(--bg-white);
      font-size: 14px;
      color: #231f20;
      outline: none;
    }

    .treasury-create-input:focus {
      border-color: var(--color-blue);
    }

    .treasury-create-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .treasury-create-btn {
      padding: 8px 16px;
      border-radius: 15px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .treasury-create-btn-cancel {
      background: transparent;
      border: none;
      color: #231f20;
    }

    .treasury-create-btn-confirm {
      background: #f23a00;
      border: none;
      color: white;
      border-radius: 100px;
    }

    .treasury-modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 12px;
      background: white;
      box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
      margin: 0 -24px -12px -24px;
      padding: 12px 24px;
      border-radius: 0 0 15px 15px;
    }

    .treasury-action-cancel {
      padding: 8px 20px;
      border-radius: 15px;
      background: transparent;
      border: none;
      font-size: 14px;
      color: #231f20;
      cursor: pointer;
    }

    .treasury-action-save {
      padding: 8px 20px;
      border-radius: 100px;
      background: #f23a00;
      border: none;
      font-size: 14px;
      font-weight: 700;
      color: white;
      cursor: pointer;
    }

    /* Image Cropper Modal */
    .cropper-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .cropper-content {
      background: white;
      border-radius: 8px;
      padding: 16px;
      width: 340px;
      max-height: 90%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cropper-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
      text-align: center;
      width: 100%;
    }

    .cropper-canvas-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 12px;
      width: 100%;
    }

    .cropper-canvas {
      border: 1px solid #ccc;
      cursor: move;
      display: block;
    }

    .cropper-instructions {
      font-size: 11px;
      color: #666;
      text-align: center;
      margin-bottom: 12px;
      width: 100%;
    }

    .cropper-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
      width: 100%;
    }

    /* Hide cover container when it has an image */
    .cover-area:has(.cover-preview:not([hidden])) {
      border: none;
      background: transparent;
    }

    .cover-area:has(.cover-preview:not([hidden])) .cover-empty {
      display: none;
    }
  \`;
}

// Initialize sidebar functionality
function initializeSidebar(shadow) {
  console.log('[Copus Extension] Initializing sidebar functionality...');

  // Get elements from shadow DOM
  const closeBtn = shadow.querySelector('.sidebar-close-btn');
  const loginScreen = shadow.querySelector('#login-screen');
  const mainContainer = shadow.querySelector('#main-container');
  const loginButton = shadow.querySelector('#login-button');
  const cancelButton = shadow.querySelector('#cancel-button');
  const pageTitleInput = shadow.querySelector('#page-title-input');
  const container = shadow.querySelector('.copus-sidebar-container');

  // Close button handler
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebarVisible = false;
      container.style.transform = 'translateX(100%)';
    });
  }

  // Cancel button handler
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      sidebarVisible = false;
      container.style.transform = 'translateX(100%)';
    });
  }

  // Login button handler - redirect to login page
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      const loginUrl = window.location.hostname.includes('test') || window.location.hostname === 'localhost'
        ? 'https://test.copus.network/login'
        : 'https://copus.network/login';
      window.open(loginUrl, '_blank');
    });
  }

  // Check authentication status and show appropriate screen
  checkSidebarAuth(shadow);

  // Set page title from document
  if (pageTitleInput) {
    pageTitleInput.value = document.title || '';
    updateTitleCharCounter(shadow);
  }

  // Set up character counters
  setupCharacterCounters(shadow);

  // Load sidebar script for full functionality
  loadSidebarScript(shadow);
}

// Check authentication for sidebar
async function checkSidebarAuth(shadow) {
  const loginScreen = shadow.querySelector('#login-screen');
  const mainContainer = shadow.querySelector('#main-container');

  try {
    const result = await chrome.storage.local.get(['copus_token', 'copus_user']);

    if (result.copus_token) {
      // User is logged in
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainContainer) mainContainer.style.display = 'flex';

      // Update avatar if user data available
      if (result.copus_user) {
        const avatar = shadow.querySelector('.avatar div');
        if (avatar && result.copus_user.faceUrl) {
          avatar.innerHTML = \`<img src="\${result.copus_user.faceUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">\`;
        } else if (avatar && result.copus_user.username) {
          avatar.textContent = result.copus_user.username.charAt(0).toUpperCase();
        }
      }
    } else {
      // User is not logged in
      if (loginScreen) loginScreen.style.display = 'flex';
      if (mainContainer) mainContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('[Copus Extension] Error checking auth:', error);
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainContainer) mainContainer.style.display = 'none';
  }
}

// Set up character counters
function setupCharacterCounters(shadow) {
  const pageTitleInput = shadow.querySelector('#page-title-input');
  const recommendationInput = shadow.querySelector('#recommendation-input');

  if (pageTitleInput) {
    pageTitleInput.addEventListener('input', () => updateTitleCharCounter(shadow));
  }

  if (recommendationInput) {
    recommendationInput.addEventListener('input', () => updateRecommendationCharCounter(shadow));
  }
}

function updateTitleCharCounter(shadow) {
  const input = shadow.querySelector('#page-title-input');
  const counter = shadow.querySelector('#title-char-counter');
  if (input && counter) {
    counter.textContent = \`\${input.value.length}/75\`;
  }
}

function updateRecommendationCharCounter(shadow) {
  const input = shadow.querySelector('#recommendation-input');
  const counter = shadow.querySelector('#char-counter');
  if (input && counter) {
    counter.textContent = \`\${input.value.length}/1000\`;
  }
}

// Sidebar state
const sidebarState = {
  coverImage: null,
  coverImageFile: null,
  pageUrl: '',
  pageTitle: '',
  selectedTreasuries: [],
  availableTreasuries: [],
  payToVisit: false,
  paymentAmount: '0.01',
  images: []
};

// Get API base URL based on environment
function getApiBaseUrl() {
  const hostname = window.location.hostname;
  const isTestEnv = hostname.includes('test') || hostname === 'localhost' || hostname === '127.0.0.1';
  return isTestEnv ? 'https://api-test.copus.network' : 'https://api-prod.copus.network';
}

// Get mainsite URL based on environment
function getMainsiteUrl() {
  const hostname = window.location.hostname;
  const isTestEnv = hostname.includes('test') || hostname === 'localhost' || hostname === '127.0.0.1';
  return isTestEnv ? 'https://test.copus.network' : 'https://copus.network';
}

// Show toast notification in sidebar
function showSidebarToast(shadow, message, type = 'success') {
  const toast = shadow.querySelector('#toast');
  if (!toast) return;

  toast.className = 'toast';
  toast.textContent = message;
  if (type === 'error') toast.classList.add('error');
  else if (type === 'success') toast.classList.add('success');

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize all sidebar functionality
function loadSidebarScript(shadow) {
  console.log('[Copus Extension] Initializing sidebar functionality...');

  // Store page info
  sidebarState.pageUrl = window.location.href;
  sidebarState.pageTitle = document.title;

  // Get elements
  const coverUpload = shadow.querySelector('#cover-upload');
  const coverScreenshot = shadow.querySelector('#cover-screenshot');
  const coverPreview = shadow.querySelector('#cover-preview');
  const coverRemove = shadow.querySelector('#cover-remove');
  const coverEmpty = shadow.querySelector('#cover-empty');
  const detectImagesBtn = shadow.querySelector('#toggle-detected-images');
  const imageSelectionView = shadow.querySelector('#image-selection-view');
  const imageSelectionGrid = shadow.querySelector('#image-selection-grid');
  const goBackButton = shadow.querySelector('#go-back-button');
  const treasurySelectBtn = shadow.querySelector('#treasury-select-button');
  const treasurySelectText = shadow.querySelector('#treasury-select-text');
  const treasuryModal = shadow.querySelector('#treasury-selection-modal');
  const treasuryModalClose = shadow.querySelector('#treasury-modal-close');
  const treasuryModalBackdrop = shadow.querySelector('#treasury-modal-backdrop');
  const treasuryModalCancel = shadow.querySelector('#treasury-modal-cancel');
  const treasuryModalSave = shadow.querySelector('#treasury-modal-save');
  const treasuryList = shadow.querySelector('#treasury-list');
  const treasurySearchInput = shadow.querySelector('#treasury-search-input');
  const payToVisitToggle = shadow.querySelector('#pay-to-visit-toggle');
  const paymentDetails = shadow.querySelector('#payment-details');
  const paymentAmount = shadow.querySelector('#payment-amount');
  const estimatedIncome = shadow.querySelector('#estimated-income');
  const publishButton = shadow.querySelector('#publish-button');
  const mainContainer = shadow.querySelector('#main-container');
  const compactMain = shadow.querySelector('.compact-main');

  // Cover image upload
  if (coverUpload) {
    coverUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          sidebarState.coverImage = event.target.result;
          sidebarState.coverImageFile = file;
          if (coverPreview) {
            coverPreview.src = event.target.result;
            coverPreview.hidden = false;
          }
          if (coverEmpty) coverEmpty.hidden = true;
          if (coverRemove) coverRemove.hidden = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Screenshot capture
  if (coverScreenshot) {
    coverScreenshot.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.runtime.sendMessage(
          { type: 'captureScreenshot', windowId: tab.windowId },
          (response) => {
            if (response && response.success) {
              sidebarState.coverImage = response.dataUrl;
              if (coverPreview) {
                coverPreview.src = response.dataUrl;
                coverPreview.hidden = false;
              }
              if (coverEmpty) coverEmpty.hidden = true;
              if (coverRemove) coverRemove.hidden = false;
              showSidebarToast(shadow, 'Screenshot captured!', 'success');
            } else {
              showSidebarToast(shadow, 'Failed to capture screenshot', 'error');
            }
          }
        );
      } catch (error) {
        console.error('[Copus Extension] Screenshot error:', error);
        showSidebarToast(shadow, 'Failed to capture screenshot', 'error');
      }
    });
  }

  // Remove cover
  if (coverRemove) {
    coverRemove.addEventListener('click', () => {
      sidebarState.coverImage = null;
      sidebarState.coverImageFile = null;
      if (coverPreview) {
        coverPreview.src = '';
        coverPreview.hidden = true;
      }
      if (coverEmpty) coverEmpty.hidden = false;
      coverRemove.hidden = true;
      if (coverUpload) coverUpload.value = '';
    });
  }

  // Detect images
  if (detectImagesBtn) {
    detectImagesBtn.addEventListener('click', () => {
      sidebarState.images = collectPageImages();
      if (sidebarState.images.length > 0) {
        // Show image selection view
        if (imageSelectionGrid) {
          imageSelectionGrid.innerHTML = '';
          sidebarState.images.forEach((img, idx) => {
            const btn = document.createElement('button');
            btn.className = 'image-option';
            btn.innerHTML = `<img src="${img.src}" alt="Image ${idx + 1}">`;
            btn.addEventListener('click', () => {
              sidebarState.coverImage = img.src;
              if (coverPreview) {
                coverPreview.src = img.src;
                coverPreview.hidden = false;
              }
              if (coverEmpty) coverEmpty.hidden = true;
              if (coverRemove) coverRemove.hidden = false;
              if (imageSelectionView) imageSelectionView.hidden = true;
              if (mainContainer) mainContainer.style.display = 'flex';
            });
            imageSelectionGrid.appendChild(btn);
          });
        }
        if (imageSelectionView) imageSelectionView.hidden = false;
        if (mainContainer) mainContainer.style.display = 'none';
      } else {
        showSidebarToast(shadow, 'No images detected on this page', 'error');
      }
    });
  }

  // Go back from image selection
  if (goBackButton) {
    goBackButton.addEventListener('click', () => {
      if (imageSelectionView) imageSelectionView.hidden = true;
      if (mainContainer) mainContainer.style.display = 'flex';
    });
  }

  // Treasury selection
  if (treasurySelectBtn) {
    treasurySelectBtn.addEventListener('click', async () => {
      if (treasuryModal) treasuryModal.style.display = 'flex';
      await loadTreasuries(shadow);
    });
  }

  // Close treasury modal
  const closeTreasuryModal = () => {
    if (treasuryModal) treasuryModal.style.display = 'none';
  };
  if (treasuryModalClose) treasuryModalClose.addEventListener('click', closeTreasuryModal);
  if (treasuryModalBackdrop) treasuryModalBackdrop.addEventListener('click', closeTreasuryModal);
  if (treasuryModalCancel) treasuryModalCancel.addEventListener('click', closeTreasuryModal);

  // Save treasury selection
  if (treasuryModalSave) {
    treasuryModalSave.addEventListener('click', () => {
      updateTreasuryButtonText(shadow);
      closeTreasuryModal();
    });
  }

  // Treasury search
  if (treasurySearchInput) {
    treasurySearchInput.addEventListener('input', () => {
      renderTreasuryList(shadow);
    });
  }

  // Pay-to-visit toggle
  if (payToVisitToggle) {
    payToVisitToggle.addEventListener('change', () => {
      sidebarState.payToVisit = payToVisitToggle.checked;
      if (paymentDetails) {
        paymentDetails.style.display = payToVisitToggle.checked ? 'flex' : 'none';
      }
    });
  }

  // Payment amount
  if (paymentAmount) {
    paymentAmount.addEventListener('input', () => {
      sidebarState.paymentAmount = paymentAmount.value;
      updateEstimatedIncome(shadow);
    });
  }

  // Publish button
  if (publishButton) {
    publishButton.addEventListener('click', () => handlePublish(shadow));
  }

  console.log('[Copus Extension] Sidebar functionality initialized');
}

// Load treasuries from API
async function loadTreasuries(shadow) {
  const treasuryList = shadow.querySelector('#treasury-list');
  if (!treasuryList) return;

  treasuryList.innerHTML = '<div class="treasury-loading">Loading treasuries...</div>';

  try {
    const result = await chrome.storage.local.get(['copus_token']);
    if (!result.copus_token) {
      treasuryList.innerHTML = '<div class="treasury-empty">Please log in to view treasuries</div>';
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/client/user/spaces?pageNo=1&pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${result.copus_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch treasuries');

    const data = await response.json();
    sidebarState.availableTreasuries = data.data?.data || data.data || [];
    renderTreasuryList(shadow);
  } catch (error) {
    console.error('[Copus Extension] Error loading treasuries:', error);
    treasuryList.innerHTML = '<div class="treasury-empty">Failed to load treasuries</div>';
  }
}

// Render treasury list
function renderTreasuryList(shadow) {
  const treasuryList = shadow.querySelector('#treasury-list');
  const treasurySearchInput = shadow.querySelector('#treasury-search-input');
  if (!treasuryList) return;

  const searchQuery = treasurySearchInput?.value?.toLowerCase() || '';
  const filtered = sidebarState.availableTreasuries.filter(t =>
    t.name?.toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    treasuryList.innerHTML = '<div class="treasury-empty">No treasuries found</div>';
    return;
  }

  treasuryList.innerHTML = filtered.map(treasury => {
    const isSelected = sidebarState.selectedTreasuries.some(t => t.id === treasury.id);
    return `
      <div class="treasury-item ${isSelected ? 'selected' : ''}" data-id="${treasury.id}">
        <div class="treasury-item-left">
          <div class="treasury-checkbox">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="treasury-avatar">
            ${treasury.coverUrl ? `<img src="${treasury.coverUrl}" alt="">` : `<span class="treasury-avatar-letter">${(treasury.name || 'T').charAt(0)}</span>`}
          </div>
          <span class="treasury-name">${treasury.name || 'Unnamed Treasury'}</span>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  treasuryList.querySelectorAll('.treasury-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const treasury = sidebarState.availableTreasuries.find(t => t.id === id);
      if (!treasury) return;

      const existingIdx = sidebarState.selectedTreasuries.findIndex(t => t.id === id);
      if (existingIdx >= 0) {
        sidebarState.selectedTreasuries.splice(existingIdx, 1);
        item.classList.remove('selected');
      } else {
        sidebarState.selectedTreasuries.push(treasury);
        item.classList.add('selected');
      }
    });
  });
}

// Update treasury button text
function updateTreasuryButtonText(shadow) {
  const treasurySelectText = shadow.querySelector('#treasury-select-text');
  const treasurySelectBtn = shadow.querySelector('#treasury-select-button');
  if (!treasurySelectText) return;

  if (sidebarState.selectedTreasuries.length === 0) {
    treasurySelectText.textContent = 'Choose treasuries...';
    treasurySelectBtn?.classList.remove('has-selection');
  } else if (sidebarState.selectedTreasuries.length === 1) {
    treasurySelectText.textContent = sidebarState.selectedTreasuries[0].name;
    treasurySelectBtn?.classList.add('has-selection');
  } else {
    treasurySelectText.textContent = `${sidebarState.selectedTreasuries.length} treasuries selected`;
    treasurySelectBtn?.classList.add('has-selection');
  }
}

// Update estimated income
function updateEstimatedIncome(shadow) {
  const estimatedIncome = shadow.querySelector('#estimated-income');
  if (!estimatedIncome) return;

  const amount = parseFloat(sidebarState.paymentAmount) || 0;
  const income = (amount * 0.45).toFixed(4);
  estimatedIncome.textContent = `${income} per unlock`;
}

// Handle publish
async function handlePublish(shadow) {
  const publishButton = shadow.querySelector('#publish-button');
  const pageTitleInput = shadow.querySelector('#page-title-input');
  const recommendationInput = shadow.querySelector('#recommendation-input');

  const title = pageTitleInput?.value?.trim();
  const recommendation = recommendationInput?.value?.trim();

  // Validation
  if (!title) {
    showSidebarToast(shadow, 'Please enter a title', 'error');
    return;
  }

  if (!recommendation) {
    showSidebarToast(shadow, 'Please enter a recommendation', 'error');
    return;
  }

  if (sidebarState.selectedTreasuries.length === 0) {
    showSidebarToast(shadow, 'Please select at least one treasury', 'error');
    return;
  }

  try {
    if (publishButton) {
      publishButton.disabled = true;
      publishButton.textContent = 'Publishing...';
    }

    const result = await chrome.storage.local.get(['copus_token']);
    if (!result.copus_token) {
      showSidebarToast(shadow, 'Please log in to publish', 'error');
      return;
    }

    // Upload cover image if present
    let coverUrl = '';
    if (sidebarState.coverImage) {
      try {
        coverUrl = await uploadCoverImage(sidebarState.coverImage, result.copus_token);
      } catch (uploadError) {
        console.error('[Copus Extension] Cover upload failed:', uploadError);
        // Continue without cover
      }
    }

    const apiBaseUrl = getApiBaseUrl();
    const mainsiteUrl = getMainsiteUrl();

    // Create article
    const articleData = {
      title: title,
      content: recommendation,
      targetUrl: sidebarState.pageUrl,
      coverUrl: coverUrl,
      spaceIds: sidebarState.selectedTreasuries.map(t => t.id),
      isPublish: 1
    };

    // Add payment info if enabled
    if (sidebarState.payToVisit && sidebarState.paymentAmount) {
      articleData.targetUrlIsLocked = true;
      articleData.priceInfo = {
        price: parseFloat(sidebarState.paymentAmount)
      };
    }

    const response = await fetch(`${apiBaseUrl}/client/article/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.copus_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(articleData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || `HTTP ${response.status}`);
    }

    const responseData = await response.json();

    showSidebarToast(shadow, 'Done! Thank you for surfacing an internet gem!', 'success');

    // Close sidebar and redirect
    setTimeout(() => {
      sidebarVisible = false;
      const container = shadow.querySelector('.copus-sidebar-container');
      if (container) container.style.transform = 'translateX(100%)';

      // Redirect to article page
      const articleUuid = responseData.data?.uuid || responseData.uuid;
      if (articleUuid) {
        chrome.runtime.sendMessage({
          type: 'openUrlAndInjectToken',
          url: `${mainsiteUrl}/content/${articleUuid}?published=true`,
          token: result.copus_token
        });
      }
    }, 1500);

  } catch (error) {
    console.error('[Copus Extension] Publish error:', error);
    showSidebarToast(shadow, error.message || 'Failed to publish. Please contact hello@copus.io', 'error');
  } finally {
    if (publishButton) {
      publishButton.disabled = false;
      publishButton.textContent = 'Publish';
    }
  }
}

// Upload cover image to S3
async function uploadCoverImage(imageData, token) {
  let file;

  if (imageData.startsWith('data:')) {
    // Convert data URL to File
    const parts = imageData.split(',');
    const mimeMatch = parts[0].match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    file = new File([arrayBuffer], 'cover.png', { type: mimeType });
  } else {
    // Fetch external URL via background script
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'fetchImageAsDataUrl', url: imageData }, (res) => {
        if (res?.success) resolve(res);
        else reject(new Error(res?.error || 'Failed to fetch image'));
      });
    });

    const parts = response.dataUrl.split(',');
    const mimeMatch = parts[0].match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    file = new File([arrayBuffer], 'cover.png', { type: mimeType });
  }

  const formData = new FormData();
  formData.append('file', file);

  const apiBaseUrl = getApiBaseUrl();
  const uploadResponse = await fetch(`${apiBaseUrl}/client/common/uploadImage2S3`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  if (!uploadResponse.ok) throw new Error('Upload failed');

  const uploadData = await uploadResponse.json();
  return uploadData.data || uploadData.url || '';
}

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

    console.log('[Copus Extension] Token sync check:', {
      hasLocalStorageToken: !!localStorage.getItem('copus_token'),
      hasSessionStorageToken: !!sessionStorage.getItem('copus_token'),
      hasExtensionToken: !!result.copus_token,
      url: window.location.href
    });

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
    // Case 3: Extension has token, website doesn't
    // IMPORTANT: Don't auto-clear! The website might just have empty sessionStorage on a new tab
    // Only clear when we receive an explicit logout event from the website
    else if (!websiteToken && result.copus_token) {
      console.log('[Copus Extension] Website has no token but extension does');
      console.log('[Copus Extension] Injecting extension token INTO website storage (preserving login)');

      // ALWAYS inject into localStorage for reliability
      // The mainsite's storage utility checks both localStorage and sessionStorage
      // Using localStorage ensures it persists across tab reloads
      localStorage.setItem('copus_token', result.copus_token);
      if (result.copus_user) {
        localStorage.setItem('copus_user', JSON.stringify(result.copus_user));
      }
      console.log('[Copus Extension] Token injected into localStorage');

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
    // Check BOTH localStorage and sessionStorage (mainsite uses sessionStorage when "Remember me" is NOT checked)
    const token = localStorage.getItem('copus_token') || sessionStorage.getItem('copus_token');
    const userData = localStorage.getItem('copus_user') || sessionStorage.getItem('copus_user');

    console.log('[Copus Extension] Token found:', token ? `${token.substring(0, 20)}...` : 'None');
    console.log('[Copus Extension] Token source:', localStorage.getItem('copus_token') ? 'localStorage' : (sessionStorage.getItem('copus_token') ? 'sessionStorage' : 'none'));
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
          const apiBaseUrl = isTestEnv ? 'https://api-test.copus.network' : 'https://api-prod.copus.network';
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
  // Handle sidebar toggle from background script
  if (message.type === 'toggleSidebar') {
    console.log('[Copus Extension] Received toggleSidebar message');
    toggleSidebar();
    sendResponse({ success: true });
    return true;
  }

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

  // Inject token from extension storage into page storage (for preserving login when navigating)
  if (message.type === 'injectToken') {
    console.log('[Copus Extension] Received injectToken request');
    const { token, user } = message;

    if (token) {
      // Check if the page already has a valid token in EITHER storage
      const localToken = localStorage.getItem('copus_token');
      const sessionToken = sessionStorage.getItem('copus_token');
      const existingToken = localToken || sessionToken;

      if (!existingToken || existingToken !== token) {
        // ALWAYS use localStorage for reliability
        // The mainsite's storage.getItem() checks both localStorage and sessionStorage
        console.log('[Copus Extension] Injecting token into localStorage');
        localStorage.setItem('copus_token', token);
        if (user) {
          localStorage.setItem('copus_user', JSON.stringify(user));
        }
        // Trigger a storage event to notify the React app
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'copus_token',
          newValue: token,
          storageArea: localStorage
        }));
        // Also dispatch custom event
        window.dispatchEvent(new CustomEvent('copus_token_injected', {
          detail: { token: token }
        }));
        sendResponse({ success: true, injected: true });
      } else {
        console.log('[Copus Extension] Token already present, skipping injection');
        sendResponse({ success: true, injected: false, reason: 'already_present' });
      }
    } else {
      sendResponse({ success: false, error: 'No token provided' });
    }
  }
});
