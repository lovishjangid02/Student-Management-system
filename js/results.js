/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - RESULTS CONTROLLER (results.js)
 * ==========================================================================
 * Handles exam result recording per subject, auto-grade calculation,
 * live summary stats, saving to backend API & data/database.json, and toast alerts.
 */

// ---------- Scope Variables ----------
let studentsList = [];
let resultsDB = {};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. DATABASE LOAD VIA EDU API
    if (window.EduApi) {
        await window.EduApi.init();
        studentsList = await window.EduApi.getStudents();
        resultsDB = await window.EduApi.getResults();
    } else {
        studentsList = JSON.parse(localStorage.getItem('students')) || [];
        resultsDB = JSON.parse(localStorage.getItem('results')) || {};
    }

    // 2. BIND EVENT LISTENERS
    const subjectSelect = document.getElementById('result-subject-select');
    const saveBtn = document.getElementById('save-results-btn');

    if (subjectSelect) {
        subjectSelect.addEventListener('change', renderResultsTable);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveResults);
    }

    // 3. INITIAL STAT UPDATE
    updateSummaryStats();
});

/**
 * Calculates a letter grade from marks.
 * @param {number} marks - The marks scored (0-100).
 * @returns {string} Letter grade with colour badge HTML.
 */
function getGrade(marks) {
    if (marks === null || marks === undefined || marks === '') return '—';
    const m = parseInt(marks, 10);
    if (isNaN(m)) return '—';

    if (m >= 90) return '<span class="grade-badge grade-o">O</span>';
    if (m >= 80) return '<span class="grade-badge grade-a-plus">A+</span>';
    if (m >= 70) return '<span class="grade-badge grade-a">A</span>';
    if (m >= 60) return '<span class="grade-badge grade-b-plus">B+</span>';
    if (m >= 50) return '<span class="grade-badge grade-b">B</span>';
    if (m >= 40) return '<span class="grade-badge grade-c">C</span>';
    return '<span class="grade-badge grade-f">F</span>';
}

/**
 * Renders the results table for the selected subject.
 */
function renderResultsTable() {
    const tableBody = document.getElementById('results-table-body');
    const subjectSelect = document.getElementById('result-subject-select');

    if (!tableBody || !subjectSelect) return;

    const selectedSubject = subjectSelect.value;

    if (!selectedSubject) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: var(--text-muted); padding: 3rem;">
                    Please select a subject to load the results grid.
                </td>
            </tr>
        `;
        updateSummaryStats();
        return;
    }

    if (!studentsList || studentsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: var(--text-muted); padding: 3rem;">
                    No students registered. <a href="./add-student.html" style="color: var(--primary); font-weight:600;">Add students first</a>.
                </td>
            </tr>
        `;
        updateSummaryStats();
        return;
    }

    // Load saved marks for this subject
    const savedMarks = resultsDB[selectedSubject] || {};

    tableBody.innerHTML = '';

    studentsList.forEach(student => {
        const savedMark = savedMarks[student.roll];
        const markValue = (savedMark !== undefined && savedMark !== null) ? savedMark : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${student.roll}</strong></td>
            <td>${student.name}</td>
            <td><span class="badge-branch">${student.branch}</span></td>
            <td style="text-align:center;">
                <input type="number" class="marks-input form-control"
                    id="marks-${student.roll}"
                    data-roll="${student.roll}"
                    min="0" max="100"
                    placeholder="0-100"
                    value="${markValue}"
                    style="max-width: 120px; text-align: center; margin: 0 auto; display: block;"
                />
            </td>
            <td style="text-align:center;" class="grade-cell" id="grade-${student.roll}">
                ${getGrade(markValue)}
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Bind live grade + stats calculation on input change
    const allInputs = tableBody.querySelectorAll('.marks-input');
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            let val = parseInt(input.value, 10);
            if (val > 100) { input.value = 100; val = 100; }
            if (val < 0) { input.value = 0; val = 0; }

            const roll = input.getAttribute('data-roll');
            const gradeCell = document.getElementById(`grade-${roll}`);
            if (gradeCell) {
                gradeCell.innerHTML = getGrade(input.value);
            }

            updateSummaryStats();
        });
    });

    updateSummaryStats();
}

/**
 * Saves the current marks grid into backend database & localStorage.
 */
async function saveResults() {
    const subjectSelect = document.getElementById('result-subject-select');
    const selectedSubject = subjectSelect ? subjectSelect.value : '';

    if (!selectedSubject) {
        showToast('Please select a subject before saving.', true);
        return;
    }

    if (!studentsList || studentsList.length === 0) {
        showToast('No students registered to save results for.', true);
        return;
    }

    const marksRecord = {};
    let hasErrors = false;

    studentsList.forEach(student => {
        const input = document.getElementById(`marks-${student.roll}`);
        if (input && input.value !== '') {
            const val = parseInt(input.value, 10);
            if (isNaN(val) || val < 0 || val > 100) {
                hasErrors = true;
            } else {
                marksRecord[student.roll] = val;
            }
        }
    });

    if (hasErrors) {
        showToast('Some marks are invalid. Please enter values between 0 and 100.', true);
        return;
    }

    // Save to local cache
    resultsDB[selectedSubject] = marksRecord;
    localStorage.setItem('results', JSON.stringify(resultsDB));

    // Save to Python backend & data/database.json
    if (window.EduApi) {
        await window.EduApi.saveResults(selectedSubject, marksRecord);
    }

    showToast(`Results saved for "${selectedSubject}" successfully.`);
}

/**
 * Updates the summary stat cards based on current marks inputs.
 */
function updateSummaryStats() {
    const totalEl = document.getElementById('res-stat-total');
    const avgEl = document.getElementById('res-stat-average');
    const highEl = document.getElementById('res-stat-highest');
    const lowEl = document.getElementById('res-stat-lowest');

    if (totalEl) totalEl.textContent = studentsList.length;

    const allInputs = document.querySelectorAll('#results-table-body .marks-input');
    const marks = [];

    allInputs.forEach(input => {
        if (input.value !== '') {
            const val = parseInt(input.value, 10);
            if (!isNaN(val) && val >= 0 && val <= 100) {
                marks.push(val);
            }
        }
    });

    if (marks.length === 0) {
        if (avgEl) avgEl.textContent = '—';
        if (highEl) highEl.textContent = '—';
        if (lowEl) lowEl.textContent = '—';
        return;
    }

    const sum = marks.reduce((a, b) => a + b, 0);
    const avg = (sum / marks.length).toFixed(1);
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);

    if (avgEl) avgEl.textContent = avg + '%';
    if (highEl) highEl.textContent = highest;
    if (lowEl) lowEl.textContent = lowest;
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
