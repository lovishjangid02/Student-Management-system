/**
 * ==========================================================================
 * EDU PORTAL - API CLIENT & DATABASE CONNECTOR (api.js)
 * ==========================================================================
 * Provides seamless communication between frontend and Python Flask backend.
 * Features:
 * - Real-time synchronization with data/database.json
 * - Automatic backend discovery & graceful fallback to local storage
 * - Visual connection indicator in header
 * - Full CRUD methods for Students, Attendance, Results, Stats, and Profile
 */

(function () {
    const EduApi = {
        baseUrl: "http://127.0.0.1:5000",
        isOnline: false,
        initialized: false,

        /**
         * Initializes API connection and checks server status
         */
        async init() {
            if (this.initialized) return;
            this.initialized = true;

            // If page is served via http/https on any port, check origin first
            if (window.location.protocol === "http:" || window.location.protocol === "https:") {
                this.baseUrl = window.location.origin;
            } else {
                this.baseUrl = "http://127.0.0.1:5000";
            }

            try {
                // Check if current origin or default port 5000 has the backend
                let connected = await this.testConnection(this.baseUrl);
                if (!connected && this.baseUrl !== "http://127.0.0.1:5000") {
                    // Try fallback port 5000 if served from LiveServer or different port
                    connected = await this.testConnection("http://127.0.0.1:5000");
                    if (connected) {
                        this.baseUrl = "http://127.0.0.1:5000";
                    }
                }

                this.isOnline = connected;
                if (this.isOnline) {
                    console.log("%c[EduPortal] Connected to Python Backend at: " + this.baseUrl, "color: #10b981; font-weight: bold;");
                    // Sync local storage from backend JSON database
                    await this.syncFromBackend();
                } else {
                    console.warn("[EduPortal] Python Backend not detected. Using LocalStorage fallback mode.");
                }
            } catch (err) {
                console.warn("[EduPortal] Backend check failed, offline mode active.", err);
                this.isOnline = false;
            }

            this.renderConnectionIndicator();
        },

        async testConnection(url) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(`${url}/api/health`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return res.ok;
            } catch (e) {
                return false;
            }
        },

        /**
         * Renders a sleek connection pill in the dashboard header
         */
        renderConnectionIndicator() {
            const headerActions = document.querySelector(".header-right") || document.querySelector(".header-actions");
            if (!headerActions) return;

            // Avoid duplicate pills
            let indicator = document.getElementById("backend-status-pill");
            if (!indicator) {
                indicator = document.createElement("div");
                indicator.id = "backend-status-pill";
                indicator.style.display = "inline-flex";
                indicator.style.alignItems = "center";
                indicator.style.gap = "6px";
                indicator.style.padding = "4px 10px";
                indicator.style.borderRadius = "9999px";
                indicator.style.fontSize = "0.75rem";
                indicator.style.fontWeight = "600";
                indicator.style.marginRight = "12px";
                indicator.style.cursor = "default";
                headerActions.prepend(indicator);
            }

            if (this.isOnline) {
                indicator.style.backgroundColor = "rgba(16, 185, 129, 0.12)";
                indicator.style.color = "#059669";
                indicator.style.border = "1px solid rgba(16, 185, 129, 0.3)";
                indicator.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;"></span> Backend: JSON DB';
                indicator.title = "Connected to Python Flask backend & database.json";
            } else {
                indicator.style.backgroundColor = "rgba(245, 158, 11, 0.12)";
                indicator.style.color = "#d97706";
                indicator.style.border = "1px solid rgba(245, 158, 11, 0.3)";
                indicator.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;"></span> Local Mode';
                indicator.title = "Python backend not running on port 5000. Changes saved locally.";
            }
        },

        /**
         * Pulls full JSON database from Python backend and synchronizes localStorage
         */
        async syncFromBackend() {
            if (!this.isOnline) return;
            try {
                const res = await fetch(`${this.baseUrl}/api/database`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.students) localStorage.setItem("students", JSON.stringify(data.students));
                    if (data.attendance) localStorage.setItem("attendance", JSON.stringify(data.attendance));
                    if (data.results) localStorage.setItem("results", JSON.stringify(data.results));
                    if (data.adminProfile) localStorage.setItem("adminProfile", JSON.stringify(data.adminProfile));
                }
            } catch (e) {
                console.error("[EduPortal] Sync from backend error:", e);
            }
        },

        // ---------------------------------------------------------
        // STUDENTS CRUD
        // ---------------------------------------------------------

        async getStudents(query = "", branch = "") {
            if (this.isOnline) {
                try {
                    let url = `${this.baseUrl}/api/students`;
                    const params = new URLSearchParams();
                    if (query) params.append("search", query);
                    if (branch && branch !== "all") params.append("branch", branch);
                    if (params.toString()) url += `?${params.toString()}`;

                    const res = await fetch(url);
                    if (res.ok) {
                        const json = await res.json();
                        return json.students || [];
                    }
                } catch (e) {
                    console.warn("Backend getStudents failed, using local storage", e);
                }
            }

            // Local fallback
            let list = JSON.parse(localStorage.getItem("students")) || [];
            if (query) {
                const q = query.toLowerCase();
                list = list.filter(s => s.name.toLowerCase().includes(q) || s.roll.toString().includes(q));
            }
            if (branch && branch !== "all") {
                list = list.filter(s => s.branch.toLowerCase().trim() === branch.toLowerCase().trim());
            }
            return list;
        },

        async getStudent(roll) {
            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/students/${roll}`);
                    if (res.ok) {
                        const json = await res.json();
                        return json.student;
                    }
                } catch (e) {
                    console.warn("Backend getStudent failed, using local storage", e);
                }
            }
            const list = JSON.parse(localStorage.getItem("students")) || [];
            return list.find(s => s.roll === Number(roll)) || null;
        },

        async addStudent(student) {
            let result = { success: false, message: "" };

            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/students`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(student)
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        return { success: false, message: json.message || "Failed to add student" };
                    }
                    result = { success: true, student: json.student };
                } catch (e) {
                    console.warn("Backend addStudent failed, using local storage", e);
                }
            }

            // Keep local storage in sync
            let list = JSON.parse(localStorage.getItem("students")) || [];
            const rollExists = list.some(s => s.roll === Number(student.roll));
            if (rollExists && !this.isOnline) {
                return { success: false, message: "Roll number already registered in database." };
            }
            if (!this.isOnline) {
                list.push(student);
                localStorage.setItem("students", JSON.stringify(list));
                result = { success: true, student: student };
            } else {
                // If backend succeeded, ensure local storage has it
                if (!rollExists) list.push(student);
                localStorage.setItem("students", JSON.stringify(list));
            }

            return result;
        },

        async updateStudent(roll, student) {
            let result = { success: false, message: "" };

            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/students/${roll}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(student)
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        return { success: false, message: json.message || "Failed to update student" };
                    }
                    result = { success: true, student: json.student };
                } catch (e) {
                    console.warn("Backend updateStudent failed, using local storage", e);
                }
            }

            // Sync local storage
            let list = JSON.parse(localStorage.getItem("students")) || [];
            const idx = list.findIndex(s => s.roll === Number(roll));
            if (idx !== -1) {
                list[idx].name = student.name;
                list[idx].branch = student.branch;
                list[idx].phone = student.phone;
                localStorage.setItem("students", JSON.stringify(list));
                if (!this.isOnline) result = { success: true, student: list[idx] };
            } else if (!this.isOnline) {
                return { success: false, message: "Student not found in directory." };
            }

            return result;
        },

        async deleteStudent(roll) {
            let success = false;

            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/students/${roll}`, {
                        method: "DELETE"
                    });
                    if (res.ok) success = true;
                } catch (e) {
                    console.warn("Backend deleteStudent failed, using local storage", e);
                }
            }

            // Update local storage
            let list = JSON.parse(localStorage.getItem("students")) || [];
            list = list.filter(s => s.roll !== Number(roll));
            localStorage.setItem("students", JSON.stringify(list));

            // Clean up attendance locally
            const attendance = JSON.parse(localStorage.getItem("attendance")) || {};
            Object.keys(attendance).forEach(date => {
                const logs = attendance[date];
                if (logs) {
                    Object.keys(logs).forEach(key => {
                        if (typeof logs[key] === "object" && logs[key] !== null) {
                            if (logs[key][roll] !== undefined) delete logs[key][roll];
                        } else if (key == roll) {
                            delete logs[key];
                        }
                    });
                }
            });
            localStorage.setItem("attendance", JSON.stringify(attendance));

            // Clean up results locally
            let results = JSON.parse(localStorage.getItem("results")) || {};
            if (Array.isArray(results)) {
                results = results.filter(r => r.roll !== Number(roll));
            } else if (typeof results === "object" && results !== null) {
                Object.keys(results).forEach(subj => {
                    if (results[subj] && results[subj][roll] !== undefined) {
                        delete results[subj][roll];
                    }
                });
            }
            localStorage.setItem("results", JSON.stringify(results));

            return { success: true };
        },

        // ---------------------------------------------------------
        // ATTENDANCE & RESULTS
        // ---------------------------------------------------------

        async getAttendance() {
            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/attendance`);
                    if (res.ok) {
                        const json = await res.json();
                        localStorage.setItem("attendance", JSON.stringify(json.attendance || {}));
                        return json.attendance || {};
                    }
                } catch (e) {
                    console.warn("Backend getAttendance failed, using local storage", e);
                }
            }
            return JSON.parse(localStorage.getItem("attendance")) || {};
        },

        async saveAttendance(date, subject, records) {
            if (this.isOnline) {
                try {
                    await fetch(`${this.baseUrl}/api/attendance`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ date, subject, records })
                    });
                } catch (e) {
                    console.warn("Backend saveAttendance failed, using local storage", e);
                }
            }

            // Sync local storage
            const attendance = JSON.parse(localStorage.getItem("attendance")) || {};
            if (!attendance[date]) attendance[date] = {};
            attendance[date][subject] = records;
            localStorage.setItem("attendance", JSON.stringify(attendance));
            return { success: true };
        },

        async getResults() {
            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/results`);
                    if (res.ok) {
                        const json = await res.json();
                        localStorage.setItem("results", JSON.stringify(json.results || {}));
                        return json.results || {};
                    }
                } catch (e) {
                    console.warn("Backend getResults failed, using local storage", e);
                }
            }
            return JSON.parse(localStorage.getItem("results")) || {};
        },

        async saveResults(subject, records) {
            if (this.isOnline) {
                try {
                    await fetch(`${this.baseUrl}/api/results`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ subject, records })
                    });
                } catch (e) {
                    console.warn("Backend saveResults failed, using local storage", e);
                }
            }

            // Sync local storage
            let results = JSON.parse(localStorage.getItem("results")) || {};
            if (Array.isArray(results)) results = {};
            results[subject] = records;
            localStorage.setItem("results", JSON.stringify(results));
            return { success: true };
        },

        // ---------------------------------------------------------
        // STATS & PROFILE
        // ---------------------------------------------------------

        async getStats() {
            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/stats`);
                    if (res.ok) {
                        return await res.json();
                    }
                } catch (e) {
                    console.warn("Backend getStats failed, computing locally", e);
                }
            }
            return null; // Signals caller to compute locally
        },

        async getProfile() {
            if (this.isOnline) {
                try {
                    const res = await fetch(`${this.baseUrl}/api/profile`);
                    if (res.ok) {
                        const json = await res.json();
                        localStorage.setItem("adminProfile", JSON.stringify(json.profile || {}));
                        return json.profile || {};
                    }
                } catch (e) {
                    console.warn("Backend getProfile failed, using local storage", e);
                }
            }
            return JSON.parse(localStorage.getItem("adminProfile")) || {};
        },

        async saveProfile(profile) {
            if (this.isOnline) {
                try {
                    await fetch(`${this.baseUrl}/api/profile`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(profile)
                    });
                } catch (e) {
                    console.warn("Backend saveProfile failed, using local storage", e);
                }
            }
            localStorage.setItem("adminProfile", JSON.stringify(profile));
            return { success: true };
        },

        async resetDatabase(type = "factory_reset") {
            if (this.isOnline) {
                try {
                    await fetch(`${this.baseUrl}/api/reset`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type })
                    });
                    await this.syncFromBackend();
                    return { success: true };
                } catch (e) {
                    console.warn("Backend resetDatabase failed, using local storage", e);
                }
            }
            return { success: true };
        }
    };

    // Expose globally
    window.EduApi = EduApi;

    // Auto initialize on DOMContentLoaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => EduApi.init());
    } else {
        EduApi.init();
    }
})();
