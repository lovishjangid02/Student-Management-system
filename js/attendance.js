/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - ATTENDANCE CONTROLLER (attendance.js)
 * ==========================================================================
 * Handles daily attendance recording, saving/loading from localStorage,
 * "Mark All" bulk actions, live summary stat counters, and toast alerts.
 *
 * localStorage Schema for attendance:
 *   Key: "attendance"
 *   Value: {
 *     "2026-07-14": {                  // date string
 *       "Data Structures & Algorithms": {  // subject name
 *         "101": "present",            // roll: status
 *         "102": "absent",
 *         ...
 *       },
 *       "Operating Systems": { ... }
 *     },
 *     ...
 *   }
 */

// ---------- Scope Variables ----------
let studentsList = [];
let attendanceDB = {};

// ---------- 2nd Year CSE Subjects ----------
const CS_SUBJECTS = [
    "Data Structures & Algorithms",
    "Database Management Systems",
    "Operating Systems",
    "Object Oriented Programming",
    "Computer Networks",
    "Discrete Mathematics",
    "Software Engineering",
    "Theory of Computation",
    "Digital Electronics",
    "Computer Organization"
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. DATABASE LOAD
    studentsList = JSON.parse(localStorage.getItem('students')) || [];
    attendanceDB = JSON.parse(localStorage.getItem('attendance')) || {};

    // 2. SET DEFAULT DATE TO TODAY
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // 3. BIND EVENT LISTENERS
    const subjectSelect = document.getElementById('subject-select');
    const markAllSelect = document.getElementById('mark-all-select');
    const saveBtn = document.getElementById('save-attendance-btn');

    // Render table when subject or date changes
    if (subjectSelect) {
        subjectSelect.addEventListener('change', renderAttendanceTable);
    }
    if (dateInput) {
        dateInput.addEventListener('change', renderAttendanceTable);
    }

    // Mark All bulk action
    if (markAllSelect) {
        markAllSelect.addEventListener('change', () => {
            const status = markAllSelect.value;
            if (!status) return;

            const radios = document.querySelectorAll(`.status-radio[value="${status}"]`);
            radios.forEach(radio => {
                radio.checked = true;
            });

            updateSummaryStats();
            // Reset dropdown back to placeholder
            markAllSelect.selectedIndex = 0;
        });
    }

    // Save attendance
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }

    // 4. INITIAL STAT UPDATE (all zeros until subject is selected)
    updateSummaryStats();
});

/**
 * Renders the attendance table for the currently selected subject + date.
 * If saved data exists for that combo, pre-selects the radio buttons.
 */
function renderAttendanceTable() {
    const tableBody = document.getElementById('attendance-table-body');
    const subjectSelect = document.getElementById('subject-select');
    const dateInput = document.getElementById('attendance-date');

    if (!tableBody || !subjectSelect || !dateInput) return;

    const selectedSubject = subjectSelect.value;
    const selectedDate = dateInput.value;

    // Validate selections
    if (!selectedSubject || !selectedDate) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="color: var(--text-muted); padding: 3rem;">
                    Please select both a subject and a date to load the attendance grid.
                </td>
            </tr>
        `;
        updateSummaryStats();
        return;
    }

    // Check for students
    if (studentsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="color: var(--text-muted); padding: 3rem;">
                    No students registered. <a href="./add-student.html" style="color: var(--primary); font-weight:600;">Add students first</a>.
                </td>
            </tr>
        `;
        updateSummaryStats();
        return;
    }

    // Load saved data for this date + subject (if any)
    const savedForDate = attendanceDB[selectedDate] || {};
    const savedForSubject = savedForDate[selectedSubject] || {};

    // Build table rows
    tableBody.innerHTML = '';

    studentsList.forEach(student => {
        const savedStatus = savedForSubject[student.roll] || '';
        const row = document.createElement('tr');

        row.innerHTML = `
            <td><strong>${student.roll}</strong></td>
            <td>${student.name}</td>
            <td><span class="badge-branch">${student.branch}</span></td>
            <td style="text-align:center;">
                <div class="status-group">
                    <input type="radio" name="status-${student.roll}" value="present"
                        class="status-radio" id="present-${student.roll}"
                        ${savedStatus === 'present' ? 'checked' : ''}>
                    <label for="present-${student.roll}" class="status-label">Present</label>

                    <input type="radio" name="status-${student.roll}" value="absent"
                        class="status-radio" id="absent-${student.roll}"
                        ${savedStatus === 'absent' ? 'checked' : ''}>
                    <label for="absent-${student.roll}" class="status-label">Absent</label>

                    <input type="radio" name="status-${student.roll}" value="late"
                        class="status-radio" id="late-${student.roll}"
                        ${savedStatus === 'late' ? 'checked' : ''}>
                    <label for="late-${student.roll}" class="status-label">Late</label>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Bind radio change events for live stat updates
    const allRadios = tableBody.querySelectorAll('.status-radio');
    allRadios.forEach(radio => {
        radio.addEventListener('change', updateSummaryStats);
    });

    updateSummaryStats();
}

/**
 * Saves the current attendance grid into localStorage.
 */
function saveAttendance() {
    const subjectSelect = document.getElementById('subject-select');
    const dateInput = document.getElementById('attendance-date');

    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedDate = dateInput ? dateInput.value : '';

    if (!selectedSubject || !selectedDate) {
        showToast('Please select a subject and date before saving.', true);
        return;
    }

    if (studentsList.length === 0) {
        showToast('No students registered to save attendance for.', true);
        return;
    }

    // Collect all radio values
    const attendanceRecord = {};
    let allMarked = true;

    studentsList.forEach(student => {
        const checked = document.querySelector(`input[name="status-${student.roll}"]:checked`);
        if (checked) {
            attendanceRecord[student.roll] = checked.value;
        } else {
            allMarked = false;
        }
    });

    if (!allMarked) {
        showToast('Please mark attendance for all students before saving.', true);
        return;
    }

    // Save to localStorage with nested structure: attendance[date][subject] = { roll: status }
    if (!attendanceDB[selectedDate]) {
        attendanceDB[selectedDate] = {};
    }
    attendanceDB[selectedDate][selectedSubject] = attendanceRecord;

    localStorage.setItem('attendance', JSON.stringify(attendanceDB));

    showToast(`Attendance saved for "${selectedSubject}" on ${selectedDate}.`);
}

/**
 * Updates the four summary stat cards at the top based on current radio selections.
 */
function updateSummaryStats() {
    const totalEl = document.getElementById('att-stat-total');
    const presentEl = document.getElementById('att-stat-present');
    const absentEl = document.getElementById('att-stat-absent');
    const lateEl = document.getElementById('att-stat-late');

    const allRadios = document.querySelectorAll('#attendance-table-body .status-radio:checked');
    let present = 0, absent = 0, late = 0;

    allRadios.forEach(radio => {
        if (radio.value === 'present') present++;
        else if (radio.value === 'absent') absent++;
        else if (radio.value === 'late') late++;
    });

    if (totalEl) totalEl.textContent = studentsList.length;
    if (presentEl) presentEl.textContent = present;
    if (absentEl) absentEl.textContent = absent;
    if (lateEl) lateEl.textContent = late;
}

/**
 * Shows a temporary toast notification banner.
 * @param {string} msg - Message to display.
 * @param {boolean} isError - If true, shows error styling.
 */
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;

    // Toggle success/error class
    toast.classList.remove('alert-success', 'alert-danger');
    toast.classList.add(isError ? 'alert-danger' : 'alert-success');

    toast.style.display = 'flex';

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}
