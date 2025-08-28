// Settings section logic: theme toggle, week start, placeholders
(function(){
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    const maxAge = "; max-age=" + (60 * 60 * 24 * 730);
    document.cookie = name + "=" + (value || "") + expires + maxAge + "; path=/; SameSite=Lax";
  }
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function detectSystemWeekStart(){
    // Attempt to detect first day of week from Intl if available
    try {
      const region = Intl.DateTimeFormat().resolvedOptions().locale;
      // Simple heuristic: Regions using Monday start by default in many locales except US, CA, AU
      const sundayLocales = [/^en-US/i, /^en-CA/i, /^en-AU/i, /^en-PH/i];
      const isSunday = sundayLocales.some(r => r.test(region));
      return isSunday ? 'sunday' : 'monday';
    } catch (e) {
      return 'monday';
    }
  }

  function applyWeekStartPreference(pref){
    // Persist and notify calendar
    setCookie('weekStart', pref, 730);
    try { localStorage.setItem('weekStart', pref); } catch(e){}
    if (window.berryCalendar && typeof window.berryCalendar.setWeekStart === 'function'){
      window.berryCalendar.setWeekStart(pref);
    }
  }

  function initSettings(){
    // Theme toggle initial state based on cookies from theme-switcher
    const themeToggle = document.getElementById('settings-theme-toggle');
    if (themeToggle){
      const userSelectedTheme = getCookie('userTheme') || getCookie('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const current = userSelectedTheme || (prefersDark ? 'dark' : 'light');
      themeToggle.checked = current === 'dark';
      themeToggle.addEventListener('change', (e)=>{
        const newTheme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        setCookie('userTheme', newTheme, 730);
        setCookie('theme', newTheme, 730);
        try { localStorage.setItem('userTheme', newTheme); } catch(e){}
      });
    }

    // Language select
    const languageSelect = document.getElementById('settings-language');
    if (languageSelect) {
      // Set current language
      const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
      languageSelect.value = currentLang;
      
      languageSelect.addEventListener('change', (e) => {
        const newLang = e.target.value;
        if (window.i18n) {
          window.i18n.setLanguage(newLang);
        }
      });
    }

    // Week start select
    const weekSelect = document.getElementById('settings-weekstart');
    if (weekSelect){
      let saved = getCookie('weekStart') || (function(){ try {return localStorage.getItem('weekStart');} catch(e){return null;}})();
      if (!saved || saved === 'system'){
        const system = detectSystemWeekStart();
        saved = 'system';
        // Also set calendar immediately using system
        if (window.berryCalendar && typeof window.berryCalendar.setWeekStart === 'function'){
          window.berryCalendar.setWeekStart(system);
        }
      } else {
        // Apply saved
        if (window.berryCalendar && typeof window.berryCalendar.setWeekStart === 'function'){
          window.berryCalendar.setWeekStart(saved);
        }
      }
      weekSelect.value = saved;
      weekSelect.addEventListener('change', (e)=>{
        const val = e.target.value;
        if (val === 'system'){
          const detected = detectSystemWeekStart();
          applyWeekStartPreference('system');
          if (window.berryCalendar && typeof window.berryCalendar.setWeekStart === 'function'){
            window.berryCalendar.setWeekStart(detected);
          }
        } else {
          applyWeekStartPreference(val);
        }
      });
    }
  }

  // Account management functions
  function updateAccountInfo() {
    const userAccountInfo = document.getElementById('userAccountInfo');
    const notLoggedInMessage = document.getElementById('notLoggedInMessage');
    const userDisplayName = document.getElementById('userDisplayName');
    const userDisplayEmail = document.getElementById('userDisplayEmail');
    
    // Check if user is authenticated via AuthManager
    if (window.authManager && window.authManager.currentUser) {
      const user = window.authManager.currentUser;
      
      if (userAccountInfo) userAccountInfo.style.display = 'block';
      if (notLoggedInMessage) notLoggedInMessage.style.display = 'none';
      
      if (userDisplayName) {
        userDisplayName.textContent = user.displayName || user.email.split('@')[0];
      }
      
      if (userDisplayEmail) {
        userDisplayEmail.textContent = user.email;
      }
    } else {
      if (userAccountInfo) userAccountInfo.style.display = 'none';
      if (notLoggedInMessage) notLoggedInMessage.style.display = 'block';
    }
  }

  function setupDeleteAccountButton() {
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        showDeleteAccountModal();
      });
    }
  }

  // Modal functions for delete account confirmation
  function showDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    const confirmInput = document.getElementById('deleteConfirmInput');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (modal) {
      modal.style.display = 'flex';
      confirmInput.value = '';
      confirmBtn.disabled = true;
      
      // Focus on input after modal animation
      setTimeout(() => {
        confirmInput.focus();
      }, 300);
    }
  }

  function hideDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function setupDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    const closeBtn = document.querySelector('.delete-modal-close');
    const cancelBtn = document.querySelector('.cancel-btn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const confirmInput = document.getElementById('deleteConfirmInput');
    
    if (!modal) return;

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', hideDeleteAccountModal);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', hideDeleteAccountModal);
    }

    // Click outside to close
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        hideDeleteAccountModal();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        hideDeleteAccountModal();
      }
    });

    // Input validation
        if (confirmInput) {
            confirmInput.addEventListener('input', function() {
                const isValid = this.value.toLowerCase() === 'delete';
                if (confirmBtn) {
                    confirmBtn.disabled = !isValid;
                }
            });
        }

        // Confirm delete
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
                if (confirmInput.value.toLowerCase() === 'delete') {
          hideDeleteAccountModal();
          
          if (!window.authManager || !window.authManager.currentUser) {
            alert('No user is currently logged in.');
            return;
          }

          try {
            // Import Firebase functions
            const { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            // First attempt to delete without re-authentication
            try {
              await deleteUser(window.authManager.currentUser);
              alert('Your account has been successfully deleted.');
              window.location.href = '/';
            } catch (deleteError) {
              if (deleteError.code === 'auth/requires-recent-login') {
                // Re-authenticate and try again
                try {
                  const provider = new GoogleAuthProvider();
                  await reauthenticateWithPopup(window.authManager.currentUser, provider);
                  
                  // Now try to delete again
                  await deleteUser(window.authManager.currentUser);
                  alert('Your account has been successfully deleted.');
                  window.location.href = '/';
                } catch (reauthError) {
                  console.error('Re-authentication failed:', reauthError);
                  alert('Re-authentication failed. Please try logging out and back in manually.');
                }
              } else {
                throw deleteError;
              }
            }
          } catch (error) {
            console.error('Error deleting account:', error);
            alert('An error occurred while deleting your account. Please try again later.');
          }
        }
      });
    }
  }

  function initAccountSection() {
    updateAccountInfo();
    setupDeleteAccountButton();
    setupDeleteAccountModal();
    
    // Listen for auth state changes
    if (window.authManager) {
      // Set up a periodic check for auth state changes
      const checkAuthState = () => {
        updateAccountInfo();
      };
      
      // Check every 500ms for auth state changes
      setInterval(checkAuthState, 500);
    }
  }

  // Enhanced initSettings function
  function initSettingsEnhanced() {
    initSettings();
    initAccountSection();
    
    // Initialize delete account modal
    setupDeleteAccountModal();
  }

  // Expose to nav-section loader
  window.initSettingsSection = initSettingsEnhanced;

  // If settings already visible on initial load
  document.addEventListener('DOMContentLoaded', ()=>{
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length === 3 && pathParts[1] === 'dashboard' && pathParts[2] === 'settings'){
      initSettingsEnhanced();
    }
  });
})();