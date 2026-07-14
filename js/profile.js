/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - PROFILE CONTROLLER (profile.js)
 * ==========================================================================
 * Handles admin profile information, password updating, local storage statistics,
 * danger zone data cleaning, and session updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. INITIAL LOAD
    loadProfileInfo();

    // 2. BIND EVENT LISTENERS
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const resetProfileBtn = document.getElementById('reset-profile-btn');
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');
    const factoryResetBtn = document.getElementById('factory-reset-btn');

    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileDetails);
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', updatePassword);
    }

    if (resetProfileBtn) {
        resetProfileBtn.addEventListener('click', () => {
            loadProfileInfo();
            showToast('Form reset to saved details.');
        });
    }

    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', clearAllStudentData);
    }

    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', triggerFactoryReset);
    }
});

/**
 * Loads profile details and sets up displays, metrics, and input values.
 */
function loadProfileInfo() {
    const userEmail = localStorage.getItem('loggedInUserEmail') || "admin@gmail.com";

    // Setup or retrieve admin info object
    let adminProfile = JSON.parse(localStorage.getItem('adminProfile')) || {};
    
    // Default fallback values if not set
    if (!adminProfile.name) adminProfile.name = "Administrator";
    if (!adminProfile.role) adminProfile.role = "Academic Administrator";
    if (!adminProfile.department) adminProfile.department = "Computer Science & Engineering";
    if (!adminProfile.joinDate) {
        const today = new Date();
        adminProfile.joinDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        localStorage.setItem('adminProfile', JSON.stringify(adminProfile));
    }

    // Fill form elements
    const nameInput = document.getElementById('profile-name-input');
    const emailInput = document.getElementById('profile-email-input');
    const roleInput = document.getElementById('profile-role-input');
    const deptInput = document.getElementById('profile-department-input');

    if (nameInput) nameInput.value = adminProfile.name;
    if (emailInput) emailInput.value = userEmail;
    if (roleInput) roleInput.value = adminProfile.role;
    if (deptInput) deptInput.value = adminProfile.department;

    // Fill display card elements
    const nameLarge = document.getElementById('profile-display-name');
    const emailDisplay = document.getElementById('profile-email-display');
    const joinDateDisplay = document.getElementById('profile-join-date');
    const avatarLarge = document.getElementById('profile-avatar-large');

    if (nameLarge) nameLarge.textContent = adminProfile.name;
    if (emailDisplay) emailDisplay.textContent = userEmail;
    if (joinDateDisplay) joinDateDisplay.textContent = adminProfile.joinDate;
    if (avatarLarge) avatarLarge.textContent = adminProfile.name.charAt(0).toUpperCase();

    // Load database metrics
    updateDatabaseMetrics();

    // Load LocalStorage utilization
    updateStorageMeter();
}

/**
 * Saves modified Account Details to localStorage.
 */
function saveProfileDetails(e) {
    e.preventDefault();

    const nameInput = document.getElementById('profile-name-input');
    const roleInput = document.getElementById('profile-role-input');
    const deptInput = document.getElementById('profile-department-input');

    // Run validations
    const profileForm = document.getElementById('profile-form');
    if (!validateFormInputs(profileForm)) {
        return;
    }

    let adminProfile = JSON.parse(localStorage.getItem('adminProfile')) || {};
    adminProfile.name = nameInput.value.trim();
    adminProfile.role = roleInput.value.trim();
    adminProfile.department = deptInput.value.trim();

    localStorage.setItem('adminProfile', JSON.stringify(adminProfile));

    // Update layout elements dynamically
    const nameLarge = document.getElementById('profile-display-name');
    const avatarLarge = document.getElementById('profile-avatar-large');
    if (nameLarge) nameLarge.textContent = adminProfile.name;
    if (avatarLarge) avatarLarge.textContent = adminProfile.name.charAt(0).toUpperCase();

    showToast('Profile settings updated successfully!');
}

/**
 * Updates the user's login password.
 * (Note: In a pure client-side mockup, we don't have a rigid backend database of passwords,
 * but we check length and match. We can optionally store it in localStorage under 'adminPassword'
 * if we want a complete simulation).
 */
function updatePassword(e) {
    e.preventDefault();

    const currentPass = document.getElementById('current-password');
    const newPass = document.getElementById('new-password');
    const confirmPass = document.getElementById('confirm-password');

    // Basic fields validation
    const passwordForm = document.getElementById('password-form');
    if (!validateFormInputs(passwordForm)) {
        return;
    }

    const savedPassword = localStorage.getItem('adminPassword') || 'admin123'; // Default fallback password

    if (currentPass.value !== savedPassword) {
        showError(currentPass, 'Incorrect current password.');
        return;
    }

    if (newPass.value.length < 6) {
        showError(newPass, 'New password must be at least 6 characters.');
        return;
    }

    if (newPass.value !== confirmPass.value) {
        showError(confirmPass, 'Confirm password does not match new password.');
        return;
    }

    // Save the new password
    localStorage.setItem('adminPassword', newPass.value);

    // Clear inputs
    currentPass.value = '';
    newPass.value = '';
    confirmPass.value = '';

    showToast('Password updated successfully!');
}

/**
 * Scans localStorage tables to update UI metrics.
 */
function updateDatabaseMetrics() {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const results = JSON.parse(localStorage.getItem('results')) || {};

    const studentCountEl = document.getElementById('profile-student-count');
    const recordsCountEl = document.getElementById('profile-records-count');

    if (studentCountEl) studentCountEl.textContent = students.length;

    // Calculate total count of record entries
    let totalRecords = 0;

    // 1. Count attendance dates & rolls marked
    Object.keys(attendance).forEach(date => {
        const subObj = attendance[date] || {};
        // Schema handles date -> subject -> roll: status
        Object.keys(subObj).forEach(subject => {
            if (typeof subObj[subject] === 'object') {
                totalRecords += Object.keys(subObj[subject]).length;
            } else {
                // Backward compatibility with simple schema { roll: status }
                totalRecords++;
            }
        });
    });

    // 2. Count result marks entered
    if (Array.isArray(results)) {
        totalRecords += results.length;
    } else if (typeof results === 'object') {
        Object.keys(results).forEach(subject => {
            totalRecords += Object.keys(results[subject] || {}).length;
        });
    }

    if (recordsCountEl) recordsCountEl.textContent = totalRecords;
}

/**
 * Calculates current LocalStorage size and displays in meter.
 * (5MB is the typical browser quota).
 */
function updateStorageMeter() {
    let totalBytes = 0;
    for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
            totalBytes += ((localStorage[x].length + x.length) * 2); // 2 bytes per char in UTF-16
        }
    }

    const quotaBytes = 5 * 1024 * 1024; // 5 MB
    const percentage = ((totalBytes / quotaBytes) * 100).toFixed(4);

    const fillBar = document.getElementById('storage-bar-fill');
    const label = document.getElementById('storage-label');

    if (fillBar) {
        fillBar.style.width = `${Math.max(percentage * 5, 2.5)}%`; // Make it visible even if tiny
    }

    if (label) {
        const kbSize = (totalBytes / 1024).toFixed(2);
        label.textContent = `${kbSize} KB used of 5,120 KB quota (${(totalBytes / quotaBytes * 100).toFixed(2)}%)`;
    }
}

/**
 * Deletes all student, attendance, and results datasets.
 */
function clearAllStudentData() {
    const confirmation = confirm("WARNING: This will permanently delete all students, attendance sheets, and academic results. This action CANNOT be undone. Are you sure you want to proceed?");
    
    if (confirmation) {
        localStorage.setItem('students', JSON.stringify([]));
        localStorage.setItem('attendance', JSON.stringify({}));
        localStorage.setItem('results', JSON.stringify({}));
        
        loadProfileInfo();
        showToast('All student records, attendance sheets, and grades have been cleared.', true);
    }
}

/**
 * Clears all LocalStorage entries and triggers logout/reset.
 */
function triggerFactoryReset() {
    const confirmation = confirm("CRITICAL WARNING: This will completely wipe all local configurations, passwords, and databases, restoring the application to a fresh installation. You will be logged out immediately. Do you wish to proceed?");
    
    if (confirmation) {
        localStorage.clear();
        showToast('Factory reset complete. Redirecting...', true);
        setTimeout(() => {
            window.location.href = './login.html';
        }, 1500);
    }
}

/**
 * Shows temporary toast notification banners.
 */
function showToast(msg, isWarning = false) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;

    toast.classList.remove('alert-success', 'alert-danger');
    toast.classList.add(isWarning ? 'alert-danger' : 'alert-success');

    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}
