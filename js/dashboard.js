/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - DASHBOARD CONTROLLER (dashboard.js)
 * ==========================================================================
 * Reads stored records from LocalStorage, computes core metrics,
 * populates the recent student additions table, binds header user details,
 * and sets up mobile toggle drawer triggers.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. EXTRACT DATA FROM LOCAL STORAGE
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const results = JSON.parse(localStorage.getItem('results')) || [];

    // 2. COMPUTE STATISTICAL METRICS
    const totalStudentsCount = students.length;
    
    // Count unique academic branches
    const uniqueBranches = new Set(students.map(s => s.branch.trim().toLowerCase()));
    const totalBranchesCount = uniqueBranches.size;
    
    // Total exam grades recorded
    let totalGradesCount = 0;
    if (Array.isArray(results)) {
        totalGradesCount = results.length;
    } else if (typeof results === 'object' && results !== null) {
        Object.keys(results).forEach(subject => {
            totalGradesCount += Object.keys(results[subject] || {}).length;
        });
    }

    // Calculate dynamic attendance rate percentage
    let totalAttendanceDaysCount = 0;
    let presentCount = 0;

    Object.keys(attendance).forEach(date => {
        const dailyLogs = attendance[date];
        if (dailyLogs) {
            Object.keys(dailyLogs).forEach(key => {
                const val = dailyLogs[key];
                if (typeof val === 'object' && val !== null) {
                    // New schema: dailyLogs[subject] = { roll: status }
                    Object.keys(val).forEach(roll => {
                        totalAttendanceDaysCount++;
                        if (val[roll] === 'present') {
                            presentCount++;
                        }
                    });
                } else {
                    // Legacy schema: dailyLogs[roll] = status
                    totalAttendanceDaysCount++;
                    if (val === 'present') {
                        presentCount++;
                    }
                }
            });
        }
    });

    const attendanceRate = totalAttendanceDaysCount > 0 
        ? Math.round((presentCount / totalAttendanceDaysCount) * 100) 
        : 0;

    // 3. ANIMATE METRICS COUNT LOAD (Fulfills UI Micro-Animations)
    animateMetricValue('stat-total-students', 0, totalStudentsCount, 1000);
    animateMetricValue('stat-active-branches', 0, totalBranchesCount, 1000);
    animateMetricValue('stat-grades-count', 0, totalGradesCount, 1000);
    animateMetricPercent('stat-attendance-rate', 0, attendanceRate, 1200);

    // 4. RENDER RECENTLY REGISTERED STUDENTS TABLE
    renderRecentStudents(students);
});

/**
 * Increment animates integers in elements.
 * @param {string} id - HTML node ID.
 * @param {number} start - Beginning index.
 * @param {number} end - Stopping boundary.
 * @param {number} duration - Milliseconds length.
 */
function animateMetricValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (end === 0) {
        obj.textContent = "0";
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Increment animates percentages in elements.
 * @param {string} id - HTML node ID.
 * @param {number} start - Beginning index.
 * @param {number} end - Stopping boundary.
 * @param {number} duration - Milliseconds length.
 */
function animateMetricPercent(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (end === 0) {
        obj.textContent = "0%";
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start) + "%";
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Renders the top 3-4 recently registered students in the table.
 * @param {Array} studentsList - The array of student objects.
 */
function renderRecentStudents(studentsList) {
    const tableBody = document.getElementById('recent-students-table-body');
    if (!tableBody) return;

    if (studentsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="color: var(--text-muted); padding: 2rem;">No student data available.</td>
            </tr>
        `;
        return;
    }

    // Clear loading row
    tableBody.innerHTML = '';

    // Take the last 4 students added and reverse order so newest is at the top
    const recentList = studentsList.slice(-4).reverse();

    recentList.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${student.roll}</strong></td>
            <td>${student.name}</td>
            <td><span class="badge-branch">${student.branch}</span></td>
            <td>${student.phone}</td>
        `;
        tableBody.appendChild(row);
    });
}
