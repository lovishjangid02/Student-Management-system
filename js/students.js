/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - STUDENTS CONTROLLER (students.js)
 * ==========================================================================
 * Handles directory listing, queries, real-time filters, deletions,
 * database cascades (removing attendance/grades), and toast alerts.
 * Fully integrated with Python backend API & data/database.json.
 */

// Scope variable definitions
let studentsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. INITIALIZE API & READ DATABASE
    if (window.EduApi) {
        await window.EduApi.init();
        studentsList = await window.EduApi.getStudents();
    } else {
        studentsList = JSON.parse(localStorage.getItem('students')) || [];
    }

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
    const uniqueBranches = [...new Set(list.map(s => (s.branch || "").trim()))].filter(Boolean).sort();

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
    const searchInput = document.getElementById('search-input');
    const branchFilter = document.getElementById('branch-filter');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedBranch = branchFilter ? branchFilter.value : 'all';

    const filtered = studentsList.filter(student => {
        // Search matches Name or Roll Number
        const nameMatch = (student.name || "").toLowerCase().includes(query);
        const rollMatch = (student.roll || "").toString().includes(query);
        const matchesSearch = nameMatch || rollMatch;

        // Branch matches dropdown selection
        const matchesBranch = selectedBranch === 'all' || 
            (student.branch || "").toLowerCase().trim() === selectedBranch;

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

    if (!list || list.length === 0) {
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
            <td>${escapeHtml(student.name)}</td>
            <td><span class="badge-branch">${escapeHtml(student.branch)}</span></td>
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

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Deletes a student profile from database with cascaded relational cleanups.
 * Attached to the window object to run inside dynamic HTML templates.
 * @param {number} rollNum - Roll number of student to remove.
 */
window.deleteStudent = async function(rollNum) {
    const isConfirmed = confirm(`Are you sure you want to delete student with Roll No. ${rollNum}?`);
    if (!isConfirmed) return;

    if (window.EduApi) {
        await window.EduApi.deleteStudent(rollNum);
        studentsList = await window.EduApi.getStudents();
    } else {
        studentsList = studentsList.filter(s => s.roll !== rollNum);
        localStorage.setItem('students', JSON.stringify(studentsList));
    }

    // Update the View Table & Filters
    populateBranchFilter(studentsList);
    applyFilters();

    // Trigger Success Toast Banner Notification
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
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 1. Run basic structure validation
        let isValid = validateFormInputs(form);
        if (!isValid) return;

        const rollInput = document.getElementById('roll');
        const nameInput = document.getElementById('name');
        const branchInput = document.getElementById('branch');
        const phoneInput = document.getElementById('phone');

        const rollVal = parseInt(rollInput.value.trim(), 10);

        // 2. Assemble student record
        const newStudent = {
            roll: rollVal,
            name: nameInput.value.trim(),
            branch: branchInput.value.trim(),
            phone: parseInt(phoneInput.value.trim(), 10)
        };

        // 3. Save via EduApi (communicates with Flask backend and database.json)
        if (window.EduApi) {
            const res = await window.EduApi.addStudent(newStudent);
            if (!res.success) {
                showError(rollInput, res.message || "Roll number already registered in database.");
                return;
            }
        } else {
            const rollExists = studentsList.some(s => s.roll === rollVal);
            if (rollExists) {
                showError(rollInput, "Roll number already registered in database.");
                return;
            }
            studentsList.push(newStudent);
            localStorage.setItem('students', JSON.stringify(studentsList));
        }

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
async function initializeEditStudentPage(form) {
    const urlParams = new URLSearchParams(window.location.search);
    const rollParam = parseInt(urlParams.get('roll'), 10);

    // 1. Lookup student record in database
    let student = null;
    if (window.EduApi) {
        student = await window.EduApi.getStudent(rollParam);
    } else {
        student = studentsList.find(s => s.roll === rollParam);
    }

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
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Validate details
        const isValid = validateFormInputs(form);
        if (!isValid) return;

        const updatedData = {
            name: nameInput.value.trim(),
            branch: branchInput.value.trim(),
            phone: parseInt(phoneInput.value.trim(), 10)
        };

        if (window.EduApi) {
            const res = await window.EduApi.updateStudent(rollParam, updatedData);
            if (!res.success) {
                alert(res.message || "Failed to update student details.");
                return;
            }
        } else {
            student.name = updatedData.name;
            student.branch = updatedData.branch;
            student.phone = updatedData.phone;
            localStorage.setItem('students', JSON.stringify(studentsList));
        }

        // Redirect back with notification query flag
        window.location.href = './students.html?success=edited';
    });

    // Dynamic error removal
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });
}
