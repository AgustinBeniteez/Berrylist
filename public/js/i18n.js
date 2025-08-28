// Sistema de Internacionalización (i18n)
class I18n {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
        this.fallbackLanguage = 'en';
        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch('/js/translations.json');
            this.translations = await response.json();
            
            // Detectar idioma guardado o del navegador
            const savedLanguage = this.getSavedLanguage();
            if (savedLanguage && this.translations[savedLanguage]) {
                this.currentLanguage = savedLanguage;
            } else {
                this.currentLanguage = this.detectBrowserLanguage();
            }
            
            // Aplicar traducciones iniciales
            this.applyTranslations();
            
            // Disparar evento personalizado para notificar que las traducciones están listas
            document.dispatchEvent(new CustomEvent('translationsLoaded', {
                detail: { language: this.currentLanguage }
            }));
            
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    getSavedLanguage() {
        // Intentar obtener de cookies primero
        const cookieLanguage = this.getCookie('language');
        if (cookieLanguage) return cookieLanguage;
        
        // Luego de localStorage
        try {
            return localStorage.getItem('language');
        } catch (e) {
            return null;
        }
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        // Verificar si el idioma del navegador está disponible
        if (this.translations[langCode]) {
            return langCode;
        }
        
        return this.fallbackLanguage;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        const maxAge = "; max-age=" + (60 * 60 * 24 * 730);
        document.cookie = name + "=" + (value || "") + expires + maxAge + "; path=/; SameSite=Lax";
    }

    setLanguage(langCode) {
        if (!this.translations[langCode]) {
            console.warn(`Language '${langCode}' not available`);
            return;
        }
        
        this.currentLanguage = langCode;
        
        // Guardar en cookies y localStorage
        this.setCookie('language', langCode, 730);
        try {
            localStorage.setItem('language', langCode);
        } catch (e) {
            console.warn('Could not save language to localStorage');
        }
        
        // Aplicar traducciones
        this.applyTranslations();
        
        // Actualizar el atributo lang del HTML
        document.documentElement.lang = langCode;
        
        // Disparar evento de cambio de idioma
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: langCode }
        }));
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        // Navegar por las claves anidadas
        for (const k of keys) {
            if (translation && typeof translation === 'object' && translation[k] !== undefined) {
                translation = translation[k];
            } else {
                // Fallback al idioma por defecto
                translation = this.translations[this.fallbackLanguage];
                for (const k2 of keys) {
                    if (translation && typeof translation === 'object' && translation[k2] !== undefined) {
                        translation = translation[k2];
                    } else {
                        console.warn(`Translation key '${key}' not found`);
                        return key;
                    }
                }
                break;
            }
        }
        
        // Si la traducción es un string, reemplazar parámetros
        if (typeof translation === 'string') {
            return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }
        
        return translation || key;
    }

    applyTranslations() {
        // Aplicar traducciones a elementos con atributo data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Aplicar traducciones a elementos con atributo data-i18n-html (para contenido HTML)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translation = this.t(key);
            element.innerHTML = translation;
        });
        
        // Aplicar traducciones a placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            element.placeholder = translation;
        });
        
        // Aplicar traducciones a títulos
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            element.title = translation;
        });
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    // Método específico para obtener traducciones del calendario
    getCalendarTranslations() {
        return {
            months: this.t('calendar.months'),
            weekdays: this.t(`calendar.weekdays`),
            loadingCalendar: this.t('calendar.loadingCalendar')
        };
    }

    // Método para actualizar el selector de idioma en configuraciones
    updateLanguageSelector() {
        const languageSelect = document.getElementById('settings-language');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
            languageSelect.disabled = false; // Habilitar el selector
        }
    }
}

// Crear instancia global
window.i18n = new I18n();

// Función de conveniencia global para traducciones
window.t = function(key, params) {
    return window.i18n.t(key, params);
};

// Escuchar cuando las traducciones estén listas
document.addEventListener('translationsLoaded', function(event) {
    console.log('Translations loaded for language:', event.detail.language);
    
    // Actualizar selector de idioma si existe
    if (window.i18n) {
        window.i18n.updateLanguageSelector();
    }
});

// Escuchar cambios de idioma
document.addEventListener('languageChanged', function(event) {
    console.log('Language changed to:', event.detail.language);
    
    // Actualizar calendario si existe
    if (window.berryCalendar && typeof window.berryCalendar.updateLanguage === 'function') {
        window.berryCalendar.updateLanguage();
    }
    
    // Actualizar selector de idioma
    if (window.i18n) {
        window.i18n.updateLanguageSelector();
    }
});