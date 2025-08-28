// Authentication JavaScript for Firebase

// Import Firebase functions (will be available after firebase-config.js loads)
let auth, database;

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Wait for Firebase to be loaded
        await this.waitForFirebase();
        
        // Get Firebase instances
        auth = window.firebaseAuth;
        database = window.firebaseDatabase;
        
        // Set up auth state listener
        this.setupAuthStateListener();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
        
        // Check if we should open login modal from URL parameter
        this.checkForLoginParameter();
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseAuth && window.firebaseDatabase) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupAuthStateListener() {
        // Import onAuthStateChanged dynamically
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            .then(({ onAuthStateChanged }) => {
                onAuthStateChanged(window.firebaseAuth, (user) => {
                    this.currentUser = user;
                    this.updateUI();
                    
                    if (user) {
                        console.log('User signed in:', user.email);
                        
                        // Show loading indicator while syncing data
                        if (window.berryCalendar) {
                            window.berryCalendar.showLoadingIndicator();
                        }
                        
                        // Load user data and sync calendar events in parallel
                        Promise.all([
                            this.loadUserData(),
                            window.berryCalendar ? window.berryCalendar.syncEventsOnLogin() : Promise.resolve()
                        ]).then(() => {
                            console.log('User data and events loaded successfully');
                            if (window.berryCalendar) {
                                window.berryCalendar.hideLoadingIndicator();
                            }
                        }).catch((error) => {
                            console.error('Error loading user data:', error);
                            if (window.berryCalendar) {
                                window.berryCalendar.hideLoadingIndicator();
                            }
                        });
                    } else {
                        console.log('User signed out');
                        // Clear events and cleanup listeners when user logs out
                        if (window.berryCalendar) {
                            window.berryCalendar.cleanupRealtimeListener();
                            window.berryCalendar.events = [];
                            window.berryCalendar.render();
                            window.berryCalendar.attachEventListeners();
                        }
                    }
                });
            });
    }

    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Modal close
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideLoginModal());
        }

        // Click outside modal to close
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideLoginModal();
                }
            });
        }

        // Google sign in button only
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.signInWithGoogle());
        }
    }

    updateUI() {
        const userAccountSection = document.getElementById('userAccountSection');
        const loginSection = document.getElementById('loginSection');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        if (this.currentUser) {
            // User is logged in
            if (userAccountSection) userAccountSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
            
            if (userName) {
                const displayName = this.currentUser.displayName || 
                    this.currentUser.email.split('@')[0];
                // Extraer solo el primer nombre
                const firstName = displayName.split(' ')[0];
                userName.textContent = firstName;
            }
            
            // Manejar foto de perfil
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar && this.currentUser.photoURL) {
                userAvatar.innerHTML = `<img src="${this.currentUser.photoURL}" alt="Profile" class="profile-photo">`;
            } else if (userAvatar) {
                userAvatar.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
        } else {
            // User is not logged in
            if (userAccountSection) userAccountSection.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
        }
    }

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }



    async signInWithGoogle() {
        try {
            const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const provider = new GoogleAuthProvider();
            await signInWithPopup(window.firebaseAuth, provider);
            
            this.showMessage(i18n.t('auth.loginSuccess'), 'success');
            this.hideLoginModal();
        } catch (error) {
            console.error('Google sign in error:', error);
            this.showMessage(this.getErrorMessage(error), 'error');
        }
    }

    async logout() {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(window.firebaseAuth);
            this.showMessage(i18n.t('auth.logoutSuccess'), 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Error logging out', 'error');
        }
    }



    async loginWithGoogle() {
        try {
            const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(window.firebaseAuth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    setLoading(button, isLoading) {
        if (button) {
            button.disabled = isLoading;
            if (isLoading) {
                button.classList.add('loading');
            } else {
                button.classList.remove('loading');
            }
        }
    }

    showMessage(message, type = 'info') {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return i18n.t('auth.loginError');
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/weak-password':
                return i18n.t('auth.passwordTooShort');
            case 'auth/invalid-email':
                return i18n.t('auth.invalidEmail');
            default:
                return error.message || 'An error occurred';
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;
        
        try {
            // Load user's calendar events from Realtime Database
            const { ref, get, set } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userRef = ref(window.firebaseDatabase, `users/${this.currentUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                // Load calendar events if they exist
                if (userData.events) {
                    this.loadCalendarEvents(userData.events);
                }
            } else {
                // Initialize user structure if it doesn't exist
                await this.initializeUserStructure();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async saveUserData(data) {
        if (!this.currentUser) return;
        
        try {
            const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userRef = ref(window.firebaseDatabase, `users/${this.currentUser.uid}`);
            await update(userRef, {
                ...data,
                email: this.currentUser.email,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    loadCalendarEvents(events) {
        // This will be called by the calendar component
        if (window.calendarManager) {
            window.calendarManager.loadEvents(events);
        }
    }

    async saveCalendarEvents(events) {
        await this.saveUserData({ events: events });
    }

    async initializeUserStructure() {
        if (!this.currentUser) return;
        
        try {
            const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userRef = ref(window.firebaseDatabase, `users/${this.currentUser.uid}`);
            
            const initialUserData = {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                photoURL: this.currentUser.photoURL || null,
                events: {},
                settings: {
                    theme: 'light',
                    language: 'en',
                    weekStart: 'monday'
                },
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            
            await set(userRef, initialUserData);
            console.log('User structure initialized in Realtime Database');
        } catch (error) {
            console.error('Error initializing user structure:', error);
        }
    }

    checkForLoginParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('openLogin') === 'true') {
            // Remove the parameter from URL without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Open the login modal
            setTimeout(() => {
                this.showLoginModal();
            }, 500); // Small delay to ensure everything is loaded
        }
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize auth manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager = new AuthManager();
    });
} else {
    window.authManager = new AuthManager();
}