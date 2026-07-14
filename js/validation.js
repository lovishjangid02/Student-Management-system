/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - VALIDATION LIBRARY (validation.js)
 * ==========================================================================
 * This utility handles form-level validation logic. It checks for constraints
 * (e.g. non-empty values, numerical values, valid lengths) and toggles style
 * classes to show/hide validation feedback in a user-friendly manner.
 */

/**
 * Checks if a string value is empty or contains only whitespace.
 * @param {string} value - The input value to check.
 * @returns {boolean} True if the value is empty, otherwise false.
 */
function isEmpty(value) {
    return !value || value.trim().length === 0;
}

/**
 * Checks if a string contains only numeric digits.
 * @param {string} value - The input value.
 * @returns {boolean} True if all characters are digits, otherwise false.
 */
function isNumeric(value) {
    return /^\d+$/.test(value);
}

/**
 * Validates an email address syntax.
 * @param {string} value - The input email address.
 * @returns {boolean} True if the email format is correct.
 */
function isValidEmail(value) {
    if (isEmpty(value)) return false;
    // Standard RFC 5322 email regex pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value.trim());
}

/**
 * Validates a Roll Number to ensure it is a positive integer.
 * @param {string} value - The input roll number.
 * @returns {boolean} True if the roll number is valid.
 */
function isValidRollNumber(value) {
    if (isEmpty(value)) return false;
    if (!isNumeric(value)) return false;
    
    const num = parseInt(value, 10);
    return num > 0;
}

/**
 * Validates a Phone Number to ensure it is exactly 10 digits.
 * @param {string} value - The input phone number.
 * @returns {boolean} True if the phone number is valid.
 */
function isValidPhoneNumber(value) {
    if (isEmpty(value)) return false;
    if (!isNumeric(value)) return false;
    return value.length === 10;
}

/**
 * Displays validation error messages on an input element.
 * Adds the 'is-invalid' class and overrides the text of the adjacent error label.
 * @param {HTMLInputElement} inputEl - The input element to target.
 * @param {string} message - The error message text.
 */
function showError(inputEl, message) {
    inputEl.classList.add('is-invalid');
    
    // Find the adjacent .invalid-feedback element
    const feedbackEl = inputEl.nextElementSibling;
    if (feedbackEl && feedbackEl.classList.contains('invalid-feedback')) {
        feedbackEl.textContent = message;
    }
}

/**
 * Removes the validation error states from a given input element.
 * @param {HTMLInputElement} inputEl - The input element to target.
 */
function clearError(inputEl) {
    inputEl.classList.remove('is-invalid');
}

/**
 * Validates standard required inputs inside a form container.
 * If an input is empty or invalid, triggers its error feedback.
 * @param {HTMLFormElement} formEl - The form element to validate.
 * @returns {boolean} True if the form is valid, false otherwise.
 */
function validateFormInputs(formEl) {
    let isValid = true;
    
    // Select all inputs, select boxes, and textareas inside the form
    const inputs = formEl.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        // Clear previous state
        clearError(input);
        
        // Check standard 'required' HTML validation attribute
        if (input.hasAttribute('required') && isEmpty(input.value)) {
            showError(input, `${input.placeholder || 'This field'} is required.`);
            isValid = false;
            return; // Skip further checks for this field
        }
        
        // Email specific checks
        if (input.type === 'email' || input.id === 'email') {
            if (!isValidEmail(input.value)) {
                showError(input, 'Please enter a valid email address (e.g. name@gmail.com).');
                isValid = false;
            }
        }
        
        // Password minimum length check for login/passwords
        if (input.type === 'password' && !isEmpty(input.value)) {
            if (input.value.length < 6) {
                showError(input, 'Password must be at least 6 characters.');
                isValid = false;
            }
        }
        
        // Specific checks for roll numbers based on input IDs
        if (input.id === 'roll' && !isEmpty(input.value)) {
            if (!isValidRollNumber(input.value)) {
                showError(input, 'Please enter a valid positive roll number.');
                isValid = false;
            }
        }
        
        // Specific checks for phone numbers based on input IDs
        if (input.id === 'phone' && !isEmpty(input.value)) {
            if (!isValidPhoneNumber(input.value)) {
                showError(input, 'Please enter a valid 10-digit phone number.');
                isValid = false;
            }
        }
    });
    
    return isValid;
}
