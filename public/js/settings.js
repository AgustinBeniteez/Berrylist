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

  // Expose to nav-section loader
  window.initSettingsSection = initSettings;

  // If settings already visible on initial load
  document.addEventListener('DOMContentLoaded', ()=>{
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length === 3 && pathParts[1] === 'dashboard' && pathParts[2] === 'settings'){
      initSettings();
    }
  });
})();