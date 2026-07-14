/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - STUDENTS CONTROLLER (students.js)
 * ==========================================================================
 * Handles directory listing, queries, real-time filters, deletions,
 * database cascades (removing attendance/grades), and toast alerts.
 */

// Scope variable definitions
let studentsList = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. READ DATABASE
    studentsList = JSON.parse(localStorage.getItem('students')) || [];

    // 2. PAGE INITIALIZATION ROUTING
    const tableBody = document.getElementById('students-table-body');
    const addForm = document.getElementById('add-student-form');
    const editForm = document.getElementById('edit-student-form');

    if (tableBody) {
        // Listing Directory Page
        populateBranchFilter(studentsList);
        renderStudentsTable(studentsList);

        // Bind queries
        const searchInput = document.getElementById('search-input');
        const branchFilter = document.getElementById('branch-filter');
        if (searchInput && branchFilter) {
            searchInput.addEventListener('input', applyFilters);
            branchFilter.addEventListener('change', applyFilters);
        }

        // Check for URL redirect notifications
        checkQueryStringNotifications();
    } else if (addForm) {
        // Student Registration Page
        initializeAddStudentPage(addForm);
    } else if (editForm) {
        // Student Update Page
        initializeEditStudentPage(editForm);
    }
});

/**
 * Parses and populates the branch selection box dynamically.
 * @param {Array} list - Full list of students.
 */
function populateBranchFilter(list) {
    const filterEl = document.getElementById('branch-filter');
    if (!filterEl) return;

    // Reset dropdown to preserve default "All Branches" option
    filterEl.innerHTML = '<option value="all">All Branches</option>';

    // Grab unique branches
    const uniqueBranches = [...new Set(list.map(s => s.branch.trim()))].sort();

    uniqueBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.toLowerCase();
        option.textContent = branch;
        filterEl.appendChild(option);
    });
}

/**
 * Filters the students list based on search terms and selected branch dropdowns.
 */
function applyFilters() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const selectedBranch = document.getElementById('branch-filter').value;

    const filtered = studentsList.filter(student => {
        // Search matches Name or Roll Number
        const nameMatch = student.name.toLowerCase().includes(query);
        const rollMatch = student.roll.toString().includes(query);
        const matchesSearch = nameMatch || rollMatch;

        // Branch matches dropdown selection
        const matchesBranch = selectedBranch === 'all' || 
            student.branch.toLowerCase().trim() === selectedBranch;

        return matchesSearch && matchesBranch;
    });

    renderStudentsTable(filtered);
}

/**
 * Builds table body rows dynamically.
 * @param {Array} list - The filtered array of student records.
 */
function renderStudentsTable(list) {
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;

    if (list.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: var(--text-muted); padding: 3rem;">
                    No student records found matching your filters.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';

    list.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${student.roll}</strong></td>
            <td>${student.name}</td>
            <td><span class="badge-branch">${student.branch}</span></td>
            <td>${student.phone}</td>
            <td class="text-right">
                <div class="action-buttons" style="justify-content: flex-end;">
                    <a href="./edit-student.html?roll=${student.roll}" class="btn btn-secondary btn-xs">
                        Edit
                    </a>
                    <button type="button" class="btn btn-danger btn-xs" onclick="deleteStudent(${student.roll})">
                        Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Deletes a student profile from local database with cascaded relational cleanups.
 * Attached to the window object to run inside dynamic HTML templates.
 * @param {number} rollNum - Roll number of student to remove.
 */
window.deleteStudent = function(rollNum) {
    const isConfirmed = confirm(`Are you sure you want to delete student with Roll No. ${rollNum}?`);
    if (!isConfirmed) return;

    // 1. Remove from Students Array
    studentsList = studentsList.filter(s => s.roll !== rollNum);
    localStorage.setItem('students', JSON.stringify(studentsList));

    // 2. Cascade cleanup: Remove student results record from Database
    let results = JSON.parse(localStorage.getItem('results')) || {};
    if (Array.isArray(results)) {
        results = results.filter(r => r.roll !== rollNum);
    } else if (typeof results === 'object' && results !== null) {
        Object.keys(results).forEach(subject => {
            if (results[subject] && results[subject][rollNum] !== undefined) {
                delete results[subject][rollNum];
            }
        });
    }
    localStorage.setItem('results', JSON.stringify(results));

    // 3. Cascade cleanup: Remove student attendance entries from Database
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    Object.keys(attendance).forEach(date => {
        const dailyLogs = attendance[date];
        if (dailyLogs) {
            Object.keys(dailyLogs).forEach(key => {
                const val = dailyLogs[key];
                if (typeof val === 'object' && val !== null) {
                    // New schema: dailyLogs[subject] = { roll: status }
                    if (val[rollNum] !== undefined) {
                        delete val[rollNum];
                    }
                } else {
                    // Legacy schema: dailyLogs[roll] = status
                    if (key == rollNum) {
                        delete dailyLogs[key];
                    }
                }
            });
        }
    });
    localStorage.setItem('attendance', JSON.stringify(attendance));

    // 4. Update the View Table & Filters
    populateBranchFilter(studentsList);
    applyFilters();

    // 5. Trigger Success Toast Banner Notification
    showToast(`Student with Roll No. ${rollNum} deleted successfully.`);
};

/**
 * Shows temporary toast banners.
 * @param {string} msg - Display string content.
 */
function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;
    toast.style.display = 'flex';

    // Disappear after 3.5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

/**
 * Parses query URL strings and shows corresponding toast prompts.
 */
function checkQueryStringNotifications() {
    const urlParams = new URLSearchParams(window.location.search);
    const successAction = urlParams.get('success');

    if (successAction === 'added') {
        showToast("Student profile registered successfully.");
    } else if (successAction === 'edited') {
        showToast("Student details updated successfully.");
    }
}

/**
 * Configures the student registration forms checks and submit bindings.
 * @param {HTMLFormElement} form - The add-student form node.
 */
function initializeAddStudentPage(form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // 1. Run basic structure validation
        let isValid = validateFormInputs(form);
        if (!isValid) return;

        const rollInput = document.getElementById('roll');
        const nameInput = document.getElementById('name');
        const branchInput = document.getElementById('branch');
        const phoneInput = document.getElementById('phone');

        const rollVal = parseInt(rollInput.value.trim(), 10);

        // 2. Perform business logic: Validate Roll Number uniqueness
        const rollExists = studentsList.some(s => s.roll === rollVal);
        if (rollExists) {
            showError(rollInput, "Roll number already registered in database.");
            return;
        }

        // 3. Assemble and save student record
        const newStudent = {
            roll: rollVal,
            name: nameInput.value.trim(),
            branch: branchInput.value.trim(),
            phone: parseInt(phoneInput.value.trim(), 10)
        };

        studentsList.push(newStudent);
        localStorage.setItem('students', JSON.stringify(studentsList));

        // 4. Redirect with query param for toast triggering
        window.location.href = './students.html?success=added';
    });

    // Clear dynamic error triggers when keypresses are detected
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });
}

/**
 * Parses parameters, populates prefilled tags, and saves edited records.
 * @param {HTMLFormElement} form - The edit-student form node.
 */
function initializeEditStudentPage(form) {
    const urlParams = new URLSearchParams(window.location.search);
    const rollParam = parseInt(urlParams.get('roll'), 10);

    // 1. Lookup student record in database
    const student = studentsList.find(s => s.roll === rollParam);
    if (!student) {
        alert("Student profile not found in directory.");
        window.location.href = './students.html';
        return;
    }

    // 2. Pre-fill input form fields
    const rollInput = document.getElementById('roll');
    const nameInput = document.getElementById('name');
    const branchInput = document.getElementById('branch');
    const phoneInput = document.getElementById('phone');

    rollInput.value = student.roll;
    nameInput.value = student.name;
    branchInput.value = student.branch;
    phoneInput.value = student.phone;

    // 3. Bind form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Validate details
        const isValid = validateFormInputs(form);
        if (!isValid) return;

        // Apply edits to database array
        student.name = nameInput.value.trim();
        student.branch = branchInput.value.trim();
        student.phone = parseInt(phoneInput.value.trim(), 10);

        localStorage.setItem('students', JSON.stringify(studentsList));

        // Redirect back with notification query flag
        window.location.href = './students.html?success=edited';
    });

    // Dynamic error removal
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });
}
