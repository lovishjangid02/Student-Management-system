# 🎓 EduPortal - Student Management System

A full-featured **Student Management System** with a modern web portal and an interactive Python CLI, powered by a persistent **JSON database** (`data/database.json`) and a Python Flask REST API backend.

---

## ✨ Features

- 🌐 **Modern Web Portal**:
  - **Dashboard**: Live statistics for total students, branches, grades, and attendance percentage.
  - **Students Directory**: Real-time search, course/branch filtering, student registration, editing, and deletion with confirmation.
  - **Attendance Tracker**: Daily subject-wise attendance tracking with bulk "Mark All" options and automated metrics.
  - **Gradebook & Results**: Marks entry (0-100), automated grade badge assignment (`O`, `A+`, `A`, `B+`, `B`, `C`, `F`), and class average statistics.
  - **Admin Profile & Settings**: Custom profile information, password management, and database reset controls.
  - **Dynamic Backend Indicator**: Shows live `🟢 Backend: JSON DB` status when connected to the Python server, with seamless local offline fallback.

- 🐍 **Interactive Python CLI (`student_management_system.py`)**:
  - Connects to the same `data/database.json` shared with the web app.
  - Menu-driven terminal interface: Add, View in aligned tabular format, Search by roll or name, Update, and Delete.
  - Duplicate roll number prevention & phone number validation.
  - One-click launcher for the Web Portal.

- 🗄️ **Persistent JSON Database (`data/database.json`)**:
  - All student records, attendance, exam results, and admin profiles are stored in a human-readable, portable JSON format.
  - Thread-safe and atomic file updates.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.8+ (Python 3.14+ supported)
- Dependencies: `Flask`

To install dependencies:
```bash
pip install flask
```

---

### 2. Run the Web Application & Backend Server

Start the Flask backend and static web server:
```bash
python app.py
```
Then open your browser and navigate to:
```
http://127.0.0.1:5000
```

#### Default Login Credentials:
- **Email**: `admin@gmail.com` (or any valid email format)
- **Password**: `admin123` (or any password >= 6 characters)

---

### 3. Run the Interactive Python CLI

You can manage students directly from your command line:
```bash
python student_management_system.py
```

Any changes made in the CLI are instantly reflected in the web portal, and vice versa!

---

## 📁 Project Structure

```
Student-Management-System/
├── app.py                      # Flask REST API backend & static file server
├── student_management_system.py# Enhanced Python CLI database manager
├── data/
│   └── database.json           # JSON database storing students, attendance, & results
├── js/
│   ├── api.js                  # Frontend API connector & sync engine
│   ├── script.js               # Authentication guard & global controllers
│   ├── students.js             # Student CRUD operations controller
│   ├── dashboard.js            # Dashboard metrics & animation controller
│   ├── attendance.js           # Daily attendance recording controller
│   ├── results.js              # Gradebook & marks controller
│   ├── profile.js              # Profile management & system resets
│   └── validation.js           # Form inputs validator
├── css/
│   ├── style.css               # Global theme & typography styles
│   └── dashboard.css           # Dashboard layout & component styles
├── index.html                  # Landing page
├── login.html                  # Authentication login portal
├── dashboard.html              # Main administrative dashboard
├── students.html               # Student records directory
├── add-student.html            # New student registration form
├── edit-student.html           # Student details update form
├── attendance.html             # Daily attendance sheet
├── results.html                # Examination gradebook
├── profile.html                # Admin profile & settings
└── README.md                   # Documentation
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check & server status |
| `/api/database` | `GET` | Retrieve complete JSON database |
| `/api/students` | `GET` | List students (`?search=` and `?branch=`) |
| `/api/students/<roll>` | `GET` | Retrieve single student by roll number |
| `/api/students` | `POST` | Register a new student |
| `/api/students/<roll>` | `PUT` | Update student information |
| `/api/students/<roll>` | `DELETE`| Remove student & cascade related records |
| `/api/attendance` | `GET` / `POST` | Retrieve / Save attendance records |
| `/api/results` | `GET` / `POST` | Retrieve / Save subject examination marks |
| `/api/stats` | `GET` | Aggregated dashboard statistical metrics |
| `/api/profile` | `GET` / `POST` | Retrieve / Update administrator profile |
| `/api/reset` | `POST` | Database reset (`clear_students` / `factory_reset`) |
