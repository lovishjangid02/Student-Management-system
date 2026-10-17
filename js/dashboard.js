/**
 * ==========================================================================
 * STUDENT MANAGEMENT SYSTEM - DASHBOARD CONTROLLER (dashboard.js)
 * ==========================================================================
 * Reads stored records from LocalStorage and Python API, computes core metrics,
 * populates the recent student additions table, and binds count animations.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. INITIALIZE API & EXTRACT DATA
    if (window.EduApi) {
        await window.EduApi.init();
    }

    const students = JSON.parse(localStorage.getItem('students')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const results = JSON.parse(localStorage.getItem('results')) || [];

    // Try fetching aggregated stats directly from backend
    let backendStats = null;
    if (window.EduApi && window.EduApi.isOnline) {
        backendStats = await window.EduApi.getStats();
    }

    let totalStudentsCount = 0;
    let totalBranchesCount = 0;
    let totalGradesCount = 0;
    let attendanceRate = 0;

    if (backendStats && backendStats.success) {
        totalStudentsCount = backendStats.totalStudents;
        totalBranchesCount = backendStats.totalBranches;
        totalGradesCount = backendStats.totalGrades;
        attendanceRate = backendStats.attendanceRate;
    } else {
        // 2. COMPUTE STATISTICAL METRICS LOCALLY
        totalStudentsCount = students.length;
        
        // Count unique academic branches
        const uniqueBranches = new Set(students.map(s => (s.branch || "").trim().toLowerCase()).filter(Boolean));
        totalBranchesCount = uniqueBranches.size;
        
        // Total exam grades recorded
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
                        Object.keys(val).forEach(roll => {
                            totalAttendanceDaysCount++;
                            if (val[roll] === 'present') {
                                presentCount++;
                            }
                        });
                    } else {
                        totalAttendanceDaysCount++;
                        if (val === 'present') {
                            presentCount++;
                        }
                    }
                });
            }
        });

        attendanceRate = totalAttendanceDaysCount > 0 
            ? Math.round((presentCount / totalAttendanceDaysCount) * 100) 
            : 0;
    }

    // 3. ANIMATE METRICS COUNT LOAD
    animateMetricValue('stat-total-students', 0, totalStudentsCount, 800);
    animateMetricValue('stat-active-branches', 0, totalBranchesCount, 800);
    animateMetricValue('stat-grades-count', 0, totalGradesCount, 800);
    animateMetricPercent('stat-attendance-rate', 0, attendanceRate, 1000);

    // 4. RENDER RECENTLY REGISTERED STUDENTS TABLE
    renderRecentStudents(students);
});

/**
 * Increment animates integers in elements.
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
 * Renders the top recently registered students in the table.
 * @param {Array} studentsList - The array of student objects.
 */
function renderRecentStudents(studentsList) {
    const tableBody = document.getElementById('recent-students-table-body');
    if (!tableBody) return;

    if (!studentsList || studentsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="color: var(--text-muted); padding: 2rem;">No student data available.</td>
            </tr>
        `;
        return;
    }

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
