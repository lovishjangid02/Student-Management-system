/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - CORE SCRIPT & AUTHENTICATION (script.js)
 * ==========================================================================
 * Contains global controller logic: auth session checking, logout,
 * database seeding (using LocalStorage), and form submit listeners for login.
 */

// --- Global Seed Database Constants ---
const DEFAULT_STUDENTS = [
    { name: "Aarav Sharma", roll: 101, branch: "Computer Science", phone: 9876543210 },
    { name: "Diya Patel", roll: 102, branch: "Information Technology", phone: 9812345678 },
    { name: "Rohan Das", roll: 103, branch: "Electronics", phone: 9001122334 },
    { name: "Ananya Iyer", roll: 104, branch: "Mechanical Engineering", phone: 9112233445 }
];

const DEFAULT_ATTENDANCE = {
    "2026-07-14": { 101: "present", 102: "present", 103: "absent", 104: "present" },
    "2026-07-13": { 101: "present", 102: "absent", 103: "present", 104: "present" }
};

const DEFAULT_RESULTS = [
    { roll: 101, subject: "Mathematics", marks: 95, grade: "A+" },
    { roll: 101, subject: "Physics", marks: 88, grade: "A" },
    { roll: 102, subject: "Mathematics", marks: 74, grade: "B" },
    { roll: 103, subject: "Computer Science", marks: 92, grade: "A+" },
    { roll: 104, subject: "Physics", marks: 62, grade: "C" }
];

// --- 1. SEED DATABASE TO LOCALSTORAGE ---
function initializeDatabase() {
    // If students key doesn't exist, seed all default values
    if (!localStorage.getItem('students')) {
        localStorage.setItem('students', JSON.stringify(DEFAULT_STUDENTS));
    }
    
    // Seed attendance records
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify(DEFAULT_ATTENDANCE));
    }
    
    // Seed academic results records
    if (!localStorage.getItem('results')) {
        localStorage.setItem('results', JSON.stringify(DEFAULT_RESULTS));
    }
}

// --- 2. AUTHENTICATION PROTECTION (ROUTING GUARD) ---
/**
 * Verifies if the user session exists.
 * If not authenticated and browsing internal dashboards, forces a redirect.
 */
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPath = window.location.pathname;
    
    // Extract filename (e.g. "dashboard.html")
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    // Define public paths that don't require credentials
    const isPublicPage = currentPage === '' || 
                          currentPage === 'index.html' || 
                          currentPage === 'login.html';
    
    if (!isLoggedIn && !isPublicPage) {
        // Not logged in, trying to access a private page -> Redirect to login.html
        window.location.href = './login.html';
    } else if (isLoggedIn && currentPage === 'login.html') {
        // Already logged in, trying to open login -> Redirect to dashboard
        window.location.href = './dashboard.html';
    }
}

/**
 * Destroys the login session flag and redirects back to Login Portal
 */
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = './login.html';
}

// --- 3. PAGE INITIALIZATION ENGINE ---
document.addEventListener('DOMContentLoaded', () => {
    // Seed database files
    initializeDatabase();
    
    // Run auth guard checks
    checkAuth();
    
    // Bind Submit Event specifically if on login.html (form ID exists)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Stop page refresh
            
            // Run field validations
            const isInputsValid = validateFormInputs(loginForm);
            if (!isInputsValid) {
                return; // Stop if empty fields found
            }
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const alertBox = document.getElementById('login-alert');
            
            // Extract input values
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Accept any valid email syntax (like a real Gmail) and a password of >= 6 characters
            if (isValidEmail(email) && password.length >= 6) {
                // Clear any error UI
                alertBox.style.display = 'none';
                
                // Write session and redirect to dashboard
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('loggedInUserEmail', email);
                window.location.href = './dashboard.html';
            } else {
                // Display error prompt
                alertBox.style.display = 'flex';
                emailInput.classList.add('is-invalid');
                passwordInput.classList.add('is-invalid');
            }
        });
        
        // Dynamic input listener to clear validation visual errors when typing
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                clearError(input);
                document.getElementById('login-alert').style.display = 'none';
            });
        });
    }

    // --- 4. GLOBAL SIDEBAR & HEADER INITIALIZATION ---
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        // Dynamic Header User Info
        const userEmail = localStorage.getItem('loggedInUserEmail') || "admin@gmail.com";
        const userEmailDisplay = document.getElementById('display-user-email');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userEmailDisplay) userEmailDisplay.textContent = userEmail;
        if (userAvatar) userAvatar.textContent = userEmail.charAt(0).toUpperCase();

        // Sync Administrator display name / role in header if set in profile
        const adminProfile = JSON.parse(localStorage.getItem('adminProfile')) || {};
        const headerRoleEl = document.querySelector('.user-profile-badge .user-role');
        if (headerRoleEl && adminProfile.role) {
            headerRoleEl.textContent = adminProfile.role;
        }
        const headerNameEl = document.querySelector('.user-profile-badge .user-name');
        if (headerNameEl && adminProfile.name && adminProfile.name !== "Administrator") {
            // If display name is custom, show it in header too (email is fallback)
            // But we keep userEmail as the primary ID if they prefer. Let's just keep email or display name:
            // headerNameEl.textContent = adminProfile.name;
        }

        // Central Mobile Sidebar toggle and outside-dismissal
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const appSidebar = document.getElementById('app-sidebar');
        
        if (menuToggleBtn && appSidebar) {
            menuToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                appSidebar.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (appSidebar.classList.contains('open') && 
                    !appSidebar.contains(e.target) && 
                    e.target !== menuToggleBtn && 
                    !menuToggleBtn.contains(e.target)) {
                    appSidebar.classList.remove('open');
                }
            });
        }

        // Logout Button Action
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }
});
