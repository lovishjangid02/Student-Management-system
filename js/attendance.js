/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - ATTENDANCE CONTROLLER (attendance.js)
 * ==========================================================================
 * Handles daily attendance recording, saving/loading from backend API and
 * localStorage, "Mark All" bulk actions, live summary stats, and toasts.
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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. DATABASE LOAD VIA EDU API
    if (window.EduApi) {
        await window.EduApi.init();
        studentsList = await window.EduApi.getStudents();
        attendanceDB = await window.EduApi.getAttendance();
    } else {
        studentsList = JSON.parse(localStorage.getItem('students')) || [];
        attendanceDB = JSON.parse(localStorage.getItem('attendance')) || {};
    }

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
            markAllSelect.selectedIndex = 0;
        });
    }

    // Save attendance
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }

    // 4. INITIAL STAT UPDATE
    updateSummaryStats();
});

/**
 * Renders the attendance table for the currently selected subject + date.
 */
function renderAttendanceTable() {
    const tableBody = document.getElementById('attendance-table-body');
    const subjectSelect = document.getElementById('subject-select');
    const dateInput = document.getElementById('attendance-date');

    if (!tableBody || !subjectSelect || !dateInput) return;

    const selectedSubject = subjectSelect.value;
    const selectedDate = dateInput.value;

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

    if (!studentsList || studentsList.length === 0) {
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

    const savedForDate = attendanceDB[selectedDate] || {};
    const savedForSubject = savedForDate[selectedSubject] || {};

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

    const allRadios = tableBody.querySelectorAll('.status-radio');
    allRadios.forEach(radio => {
        radio.addEventListener('change', updateSummaryStats);
    });

    updateSummaryStats();
}

/**
 * Saves the current attendance grid into backend database & localStorage.
 */
async function saveAttendance() {
    const subjectSelect = document.getElementById('subject-select');
    const dateInput = document.getElementById('attendance-date');

    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedDate = dateInput ? dateInput.value : '';

    if (!selectedSubject || !selectedDate) {
        showToast('Please select a subject and date before saving.', true);
        return;
    }

    if (!studentsList || studentsList.length === 0) {
        showToast('No students registered to save attendance for.', true);
        return;
    }

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

    // Save to local attendance cache
    if (!attendanceDB[selectedDate]) {
        attendanceDB[selectedDate] = {};
    }
    attendanceDB[selectedDate][selectedSubject] = attendanceRecord;
    localStorage.setItem('attendance', JSON.stringify(attendanceDB));

    // Save to Python backend & data/database.json
    if (window.EduApi) {
        await window.EduApi.saveAttendance(selectedDate, selectedSubject, attendanceRecord);
    }

    showToast(`Attendance saved for "${selectedSubject}" on ${selectedDate}.`);
}

/**
 * Updates the summary stat cards at the top based on current selections.
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
 * Shows temporary toast notification banner.
 */
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;

    toast.classList.remove('alert-success', 'alert-danger');
    toast.classList.add(isError ? 'alert-danger' : 'alert-success');

    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}
