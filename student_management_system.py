"""
EduPortal - Student Management System (Python CLI & Database Manager)
Connects directly with data/database.json for persistent records and interoperability with the Web Portal.
"""

import os
import sys
import json
import webbrowser

# Locate the database file path relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Check whether we're inside Student-Management-System or root
if os.path.basename(SCRIPT_DIR) == "Student-Management-System":
    DB_FILE = os.path.join(SCRIPT_DIR, "data", "database.json")
    APP_PY = os.path.join(SCRIPT_DIR, "app.py")
else:
    # If run from root c:\EDU_PORTAL
    DB_FILE = os.path.join(SCRIPT_DIR, "Student-Management-System", "data", "database.json")
    APP_PY = os.path.join(SCRIPT_DIR, "Student-Management-System", "app.py")

DEFAULT_DB = {
    "students": [
        {"roll": 101, "name": "Aarav Sharma", "branch": "Computer Science", "phone": 9876543210},
        {"roll": 102, "name": "Diya Patel", "branch": "Information Technology", "phone": 9812345678},
        {"roll": 103, "name": "Rohan Das", "branch": "Electronics", "phone": 9001122334},
        {"roll": 104, "name": "Ananya Iyer", "branch": "Mechanical Engineering", "phone": 9112233445}
    ],
    "attendance": {},
    "results": {},
    "adminProfile": {
        "name": "Administrator",
        "role": "Academic Administrator",
        "department": "Computer Science & Engineering",
        "email": "admin@gmail.com"
    }
}


def load_database():
    """Loads student records and database from the JSON file."""
    if not os.path.exists(DB_FILE):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        save_database(DEFAULT_DB)
        return json.loads(json.dumps(DEFAULT_DB))

    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "students" not in data:
                data["students"] = []
            return data
    except Exception as e:
        print(f"Notice: Error reading database file ({e}). Starting with default structure.")
        return json.loads(json.dumps(DEFAULT_DB))


def save_database(data):
    """Saves the database to the JSON file safely."""
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        temp_file = DB_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, DB_FILE)
    except Exception as e:
        print(f"Error saving to {DB_FILE}: {e}")


def intro():
    print("\n" + "=" * 50)
    print("      EDU PORTAL - STUDENT MANAGEMENT SYSTEM")
    print("=" * 50)
    print("1. Add Student")
    print("2. View All Students")
    print("3. Search Student")
    print("4. Update Student")
    print("5. Delete Student")
    print("6. Launch Web Portal (Browser & Backend)")
    print("7. Exit")
    print("=" * 50)


def add_student():
    print("\n" + "-" * 20 + " Add New Student " + "-" * 20)
    db = load_database()
    students = db.get("students", [])

    # Roll number input with validation and duplicate prevention
    while True:
        roll_input = input("Enter Roll No (or 'c' to cancel): ").strip()
        if roll_input.lower() == "c":
            print("Operation cancelled.")
            return

        if not roll_input.isdigit() or int(roll_input) <= 0:
            print("Invalid roll number! Must be a positive integer.")
            continue

        roll = int(roll_input)
        if any(s.get("roll") == roll for s in students):
            print(f"Roll number {roll} already exists in database! Please enter a unique roll number.")
            continue

        break

    # Name input
    while True:
        name = input("Enter Student Name: ").strip()
        if not name:
            print("Name cannot be blank. Please enter a valid name.")
            continue
        break

    # Branch input
    while True:
        branch = input("Enter Branch/Course: ").strip()
        if not branch:
            print("Branch cannot be blank. Please enter a valid branch.")
            continue
        break

    # Phone input
    while True:
        phone_input = input("Enter Phone Number (10 digits): ").strip()
        if not phone_input.isdigit() or len(phone_input) < 7:
            print("Invalid phone number! Please enter numbers only (min 7 digits).")
            continue
        phone = int(phone_input)
        break

    student = {
        "roll": roll,
        "name": name,
        "branch": branch,
        "phone": phone
    }

    students.append(student)
    db["students"] = students
    save_database(db)
    print(f"\nSUCCESS: Student '{name}' (Roll No: {roll}) saved successfully to database.json!")


def view_students():
    print("\n" + "=" * 70)
    print("                       REGISTERED STUDENTS LIST")
    print("=" * 70)
    db = load_database()
    students = db.get("students", [])

    if not students:
        print("No student records found in database!")
        print("=" * 70)
        return

    print(f"{'Roll No':<10} | {'Name':<24} | {'Branch':<20} | {'Phone':<12}")
    print("-" * 75)
    for s in students:
        roll_str = str(s.get("roll", ""))
        name_str = str(s.get("name", ""))
        branch_str = str(s.get("branch", ""))
        phone_str = str(s.get("phone", ""))
        print(f"{roll_str:<10} | {name_str:<24} | {branch_str:<20} | {phone_str:<12}")

    print("-" * 75)
    print(f"Total Students: {len(students)}")
    print("=" * 70)


def search_student():
    print("\n" + "-" * 20 + " Search Student " + "-" * 20)
    db = load_database()
    students = db.get("students", [])

    query = input("Enter Roll No or Student Name to search: ").strip()
    if not query:
        print("Search query cannot be empty.")
        return

    matches = []
    for s in students:
        if str(s.get("roll", "")) == query or query.lower() in s.get("name", "").lower():
            matches.append(s)

    if not matches:
        print(f"No student found matching '{query}'.")
        return

    print(f"\nFound {len(matches)} matching student(s):")
    print("-" * 60)
    for s in matches:
        print(f"Roll No : {s.get('roll')}")
        print(f"Name    : {s.get('name')}")
        print(f"Branch  : {s.get('branch')}")
        print(f"Phone   : {s.get('phone')}")
        print("-" * 60)


def update_student():
    print("\n" + "-" * 20 + " Update Student Details " + "-" * 20)
    db = load_database()
    students = db.get("students", [])

    roll_input = input("Enter Roll No of student to update: ").strip()
    if not roll_input.isdigit():
        print("Invalid roll number input.")
        return

    roll = int(roll_input)
    student = next((s for s in students if s.get("roll") == roll), None)

    if not student:
        print(f"Student with Roll No {roll} not found in database.")
        return

    print(f"\nCurrent details for Roll No {roll}:")
    print(f"1. Name   : {student.get('name')}")
    print(f"2. Branch : {student.get('branch')}")
    print(f"3. Phone  : {student.get('phone')}")
    print("(Press Enter to keep current value)\n")

    new_name = input(f"Enter new Name [{student.get('name')}]: ").strip()
    new_branch = input(f"Enter new Branch [{student.get('branch')}]: ").strip()
    new_phone = input(f"Enter new Phone [{student.get('phone')}]: ").strip()

    if new_name:
        student["name"] = new_name
    if new_branch:
        student["branch"] = new_branch
    if new_phone:
        if new_phone.isdigit():
            student["phone"] = int(new_phone)
        else:
            print("Invalid phone format entered. Phone number remained unchanged.")

    db["students"] = students
    save_database(db)
    print(f"SUCCESS: Student details for Roll No {roll} updated in database.json!")


def delete_student():
    print("\n" + "-" * 20 + " Delete Student " + "-" * 20)
    db = load_database()
    students = db.get("students", [])

    roll_input = input("Enter Roll No to Delete: ").strip()
    if not roll_input.isdigit():
        print("Invalid input! Please enter a numeric roll number.")
        return

    roll = int(roll_input)
    target = next((s for s in students if s.get("roll") == roll), None)

    if not target:
        print(f"Student with Roll No {roll} not found!")
        return

    confirm = input(f"Are you sure you want to delete '{target.get('name')}' (Roll: {roll})? (y/N): ").strip().lower()
    if confirm != "y":
        print("Deletion cancelled.")
        return

    # Delete student
    db["students"] = [s for s in students if s.get("roll") != roll]

    # Cascade delete from results and attendance if present
    results = db.get("results", {})
    if isinstance(results, dict):
        for subject, marks_dict in results.items():
            if isinstance(marks_dict, dict) and str(roll) in marks_dict:
                del marks_dict[str(roll)]

    attendance = db.get("attendance", {})
    if isinstance(attendance, dict):
        for date_str, daily in attendance.items():
            if isinstance(daily, dict):
                for subj, logs in list(daily.items()):
                    if isinstance(logs, dict) and str(roll) in logs:
                        del logs[str(roll)]
                    elif subj == str(roll):
                        del daily[subj]

    save_database(db)
    print(f"SUCCESS: Student with Roll No {roll} was deleted and database was updated!")


def launch_web_portal():
    print("\n" + "=" * 60)
    print("Launching Web Portal & Backend Server...")
    print("Opening http://127.0.0.1:5000 in your web browser...")
    print("=" * 60)
    try:
        webbrowser.open("http://127.0.0.1:5000")
        if os.path.exists(APP_PY):
            os.system(f'"{sys.executable}" "{APP_PY}"')
        else:
            print(f"Backend app script not found at {APP_PY}")
    except Exception as e:
        print(f"Could not automatically launch server: {e}")
        print("You can manually run: python app.py")


def main():
    print("\nWelcome to EduPortal Student Management System!")
    print(f"Connected to JSON Database: {DB_FILE}")

    while True:
        intro()
        choice_input = input("Enter Your Choice (1 - 7): ").strip()

        if not choice_input.isdigit():
            print("Please enter a valid menu number (1 to 7).")
            continue

        choice = int(choice_input)

        if choice == 1:
            add_student()
        elif choice == 2:
            view_students()
        elif choice == 3:
            search_student()
        elif choice == 4:
            update_student()
        elif choice == 5:
            delete_student()
        elif choice == 6:
            launch_web_portal()
        elif choice == 7:
            print("\nThank you for using EduPortal Student Management System. Goodbye!\n")
            break
        else:
            print("Invalid choice! Please select 1 to 7.")


if __name__ == "__main__":
    main()
