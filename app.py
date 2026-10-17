"""
EduPortal - Student Management System Backend
Flask-based REST API and static server connecting the web frontend with a JSON database.
"""

import os
import json
import threading
from flask import Flask, request, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "database.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Lock for safe concurrent reads/writes to JSON database
db_lock = threading.Lock()

DEFAULT_DB = {
    "students": [
        {"roll": 101, "name": "Aarav Sharma", "branch": "Computer Science", "phone": 9876543210},
        {"roll": 102, "name": "Diya Patel", "branch": "Information Technology", "phone": 9812345678},
        {"roll": 103, "name": "Rohan Das", "branch": "Electronics", "phone": 9001122334},
        {"roll": 104, "name": "Ananya Iyer", "branch": "Mechanical Engineering", "phone": 9112233445}
    ],
    "attendance": {
        "2026-07-14": {
            "Data Structures & Algorithms": {
                "101": "present",
                "102": "present",
                "103": "absent",
                "104": "present"
            },
            "Operating Systems": {
                "101": "present",
                "102": "present",
                "103": "present",
                "104": "absent"
            }
        },
        "2026-07-13": {
            "Data Structures & Algorithms": {
                "101": "present",
                "102": "absent",
                "103": "present",
                "104": "present"
            }
        }
    },
    "results": {
        "Data Structures & Algorithms": {
            "101": 95,
            "102": 74,
            "103": 92,
            "104": 62
        },
        "Operating Systems": {
            "101": 88,
            "102": 81,
            "103": 75,
            "104": 68
        }
    },
    "adminProfile": {
        "name": "Administrator",
        "role": "Academic Administrator",
        "department": "Computer Science & Engineering",
        "email": "admin@gmail.com",
        "joinDate": "October 17, 2026"
    }
}


def load_db():
    with db_lock:
        if not os.path.exists(DB_FILE):
            save_db_unlocked(DEFAULT_DB)
            return json.loads(json.dumps(DEFAULT_DB))
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Ensure core keys exist
                for key in ["students", "attendance", "results", "adminProfile"]:
                    if key not in data:
                        data[key] = DEFAULT_DB[key]
                return data
        except Exception as e:
            print(f"Error reading {DB_FILE}: {e}")
            return json.loads(json.dumps(DEFAULT_DB))


def save_db_unlocked(data):
    # Atomic write pattern using temp file
    temp_file = DB_FILE + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, DB_FILE)


def save_db(data):
    with db_lock:
        save_db_unlocked(data)


# Initialize Flask app serving static frontend files
app = Flask(__name__, static_folder=BASE_DIR)


# Global CORS handler
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path=""):
    return "", 204


# -------------------------------------------------------------
# REST API ENDPOINTS
# -------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "EduPortal backend server is active", "version": "1.0.0"})


@app.route("/api/database", methods=["GET"])
def get_full_database():
    return jsonify(load_db())


@app.route("/api/students", methods=["GET"])
def get_students():
    db = load_db()
    students = db.get("students", [])

    search = request.args.get("search", "").strip().lower()
    branch = request.args.get("branch", "").strip().lower()

    filtered = students
    if search:
        filtered = [
            s for s in filtered
            if search in str(s.get("roll", "")).lower() or search in s.get("name", "").lower()
        ]
    if branch and branch != "all":
        filtered = [s for s in filtered if s.get("branch", "").strip().lower() == branch]

    return jsonify({"success": True, "count": len(filtered), "students": filtered})


@app.route("/api/students/<int:roll>", methods=["GET"])
def get_student_by_roll(roll):
    db = load_db()
    for s in db.get("students", []):
        if s.get("roll") == roll:
            return jsonify({"success": True, "student": s})
    return jsonify({"success": False, "message": f"Student with Roll No. {roll} not found"}), 404


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json(force=True, silent=True) or {}
    name = str(data.get("name", "")).strip()
    branch = str(data.get("branch", "")).strip()
    roll_val = data.get("roll")
    phone_val = data.get("phone")

    if not name:
        return jsonify({"success": False, "message": "Student name cannot be empty"}), 400
    if not branch:
        return jsonify({"success": False, "message": "Branch cannot be empty"}), 400

    try:
        roll = int(roll_val)
        if roll <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Roll number must be a positive integer"}), 400

    try:
        phone_str = str(phone_val).strip()
        if not phone_str.isdigit():
            raise ValueError()
        phone = int(phone_str)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Phone number must contain only numbers"}), 400

    db = load_db()
    students = db.get("students", [])

    # Check for duplicate roll number
    if any(s.get("roll") == roll for s in students):
        return jsonify({"success": False, "message": f"Roll number {roll} already exists"}), 409

    new_student = {
        "roll": roll,
        "name": name,
        "branch": branch,
        "phone": phone
    }

    students.append(new_student)
    db["students"] = students
    save_db(db)

    return jsonify({"success": True, "message": "Student registered successfully", "student": new_student}), 201


@app.route("/api/students/<int:roll>", methods=["PUT"])
def update_student(roll):
    data = request.get_json(force=True, silent=True) or {}
    name = str(data.get("name", "")).strip()
    branch = str(data.get("branch", "")).strip()
    phone_val = data.get("phone")

    if not name:
        return jsonify({"success": False, "message": "Student name cannot be empty"}), 400
    if not branch:
        return jsonify({"success": False, "message": "Branch cannot be empty"}), 400

    try:
        phone_str = str(phone_val).strip()
        if not phone_str.isdigit():
            raise ValueError()
        phone = int(phone_str)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Phone number must contain only numbers"}), 400

    db = load_db()
    students = db.get("students", [])

    student_index = None
    for idx, s in enumerate(students):
        if s.get("roll") == roll:
            student_index = idx
            break

    if student_index is None:
        return jsonify({"success": False, "message": f"Student with Roll No. {roll} not found"}), 404

    students[student_index]["name"] = name
    students[student_index]["branch"] = branch
    students[student_index]["phone"] = phone

    db["students"] = students
    save_db(db)

    return jsonify({"success": True, "message": "Student updated successfully", "student": students[student_index]})


@app.route("/api/students/<int:roll>", methods=["DELETE"])
def delete_student(roll):
    db = load_db()
    students = db.get("students", [])

    original_len = len(students)
    students = [s for s in students if s.get("roll") != roll]

    if len(students) == original_len:
        return jsonify({"success": False, "message": f"Student with Roll No. {roll} not found"}), 404

    db["students"] = students

    # Cascade deletion to results
    results = db.get("results", {})
    if isinstance(results, dict):
        for subject, marks_dict in results.items():
            if isinstance(marks_dict, dict) and str(roll) in marks_dict:
                del marks_dict[str(roll)]
    elif isinstance(results, list):
        db["results"] = [r for r in results if r.get("roll") != roll]

    # Cascade deletion to attendance
    attendance = db.get("attendance", {})
    if isinstance(attendance, dict):
        for date_str, subjects_dict in attendance.items():
            if isinstance(subjects_dict, dict):
                for subj_or_roll, content in list(subjects_dict.items()):
                    if isinstance(content, dict) and str(roll) in content:
                        del content[str(roll)]
                    elif subj_or_roll == str(roll):
                        del subjects_dict[subj_or_roll]

    save_db(db)
    return jsonify({"success": True, "message": f"Student with Roll No. {roll} deleted successfully"})


@app.route("/api/attendance", methods=["GET"])
def get_attendance():
    db = load_db()
    return jsonify({"success": True, "attendance": db.get("attendance", {})})


@app.route("/api/attendance", methods=["POST"])
def save_attendance():
    data = request.get_json(force=True, silent=True) or {}
    date_str = data.get("date")
    subject = data.get("subject")
    records = data.get("records")  # { "101": "present", "102": "absent" }

    if not date_str or not subject or not isinstance(records, dict):
        return jsonify({"success": False, "message": "Invalid attendance payload"}), 400

    db = load_db()
    attendance = db.get("attendance", {})
    if date_str not in attendance or not isinstance(attendance[date_str], dict):
        attendance[date_str] = {}

    attendance[date_str][subject] = records
    db["attendance"] = attendance
    save_db(db)

    return jsonify({"success": True, "message": f"Attendance saved for {subject} on {date_str}"})


@app.route("/api/results", methods=["GET"])
def get_results():
    db = load_db()
    return jsonify({"success": True, "results": db.get("results", {})})


@app.route("/api/results", methods=["POST"])
def save_results():
    data = request.get_json(force=True, silent=True) or {}
    subject = data.get("subject")
    records = data.get("records")  # { "101": 85, "102": 92 }

    if not subject or not isinstance(records, dict):
        return jsonify({"success": False, "message": "Invalid results payload"}), 400

    db = load_db()
    results = db.get("results", {})
    if not isinstance(results, dict):
        results = {}

    results[subject] = records
    db["results"] = results
    save_db(db)

    return jsonify({"success": True, "message": f"Results saved for {subject}"})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    db = load_db()
    students = db.get("students", [])
    attendance = db.get("attendance", {})
    results = db.get("results", {})

    total_students = len(students)
    unique_branches = len({s.get("branch", "").strip().lower() for s in students if s.get("branch")})

    # Count recorded grades
    total_grades = 0
    if isinstance(results, dict):
        for subject, marks_dict in results.items():
            if isinstance(marks_dict, dict):
                total_grades += len(marks_dict)
    elif isinstance(results, list):
        total_grades = len(results)

    # Attendance rate calculation
    total_attendance_days = 0
    present_count = 0
    if isinstance(attendance, dict):
        for date_str, daily_logs in attendance.items():
            if isinstance(daily_logs, dict):
                for key, val in daily_logs.items():
                    if isinstance(val, dict):
                        for roll_str, status in val.items():
                            total_attendance_days += 1
                            if status == "present":
                                present_count += 1
                    elif val == "present":
                        total_attendance_days += 1
                        present_count += 1
                    else:
                        total_attendance_days += 1

    attendance_rate = (
        round((present_count / total_attendance_days) * 100) if total_attendance_days > 0 else 0
    )

    recent_students = students[-5:] if len(students) >= 5 else students

    return jsonify({
        "success": True,
        "totalStudents": total_students,
        "totalBranches": unique_branches,
        "totalGrades": total_grades,
        "attendanceRate": attendance_rate,
        "recentStudents": recent_students
    })


@app.route("/api/profile", methods=["GET"])
def get_profile():
    db = load_db()
    return jsonify({"success": True, "profile": db.get("adminProfile", {})})


@app.route("/api/profile", methods=["POST"])
def save_profile():
    data = request.get_json(force=True, silent=True) or {}
    db = load_db()
    profile = db.get("adminProfile", {})
    profile.update(data)
    db["adminProfile"] = profile
    save_db(db)
    return jsonify({"success": True, "message": "Profile updated successfully", "profile": profile})


@app.route("/api/reset", methods=["POST"])
def reset_database():
    data = request.get_json(force=True, silent=True) or {}
    reset_type = data.get("type", "factory_reset")

    db = load_db()
    if reset_type == "clear_students":
        db["students"] = []
        db["attendance"] = {}
        db["results"] = {}
    else:
        # Factory reset to default data
        db = json.loads(json.dumps(DEFAULT_DB))

    save_db(db)
    return jsonify({"success": True, "message": "Database reset completed", "database": db})


# -------------------------------------------------------------
# STATIC FILE & PAGE SERVING
# -------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    # If the file directly exists in BASE_DIR (e.g. css/style.css, js/script.js, students.html)
    full_path = os.path.join(BASE_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(BASE_DIR, path)

    # If it's a page without .html extension (e.g. /dashboard)
    html_path = full_path + ".html"
    if os.path.isfile(html_path):
        return send_from_directory(BASE_DIR, path + ".html")

    return send_from_directory(BASE_DIR, "index.html")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   EduPortal - Student Management System Server Running")
    print("=" * 60)
    print(f" Database JSON: {DB_FILE}")
    print(" Web Portal:    http://127.0.0.1:5000")
    print(" API Base:      http://127.0.0.1:5000/api")
    print("=" * 60 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=True)
