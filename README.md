# Simple Self-Hosted Gantt Tracker

A lightweight, open-source software development tracker built with **Node.js** and **Frappe Gantt**. It features a drag-and-drop interface, local file persistence (no database server required), and task dependency management.

* Credit: https://codesandbox.io/p/sandbox/how-to-build-gantt-charts-in-javascript-forked-5ufedz

## 🚀 Features

* **Drag & Drop Scheduling:** Drag task bars to change start/end dates.
* **Progress Tracking:** Drag the dark progress bar handle to update completion %.
* **Task Assignment:** Filter tasks by specific developers or view all.
* **Dependency Management:** Multi-select dependencies (Ctrl+Click) to link tasks.
* **Auto-Color Coding:** Visual distinction for Frontend (Blue), Backend (Purple), Risk (Red), etc.
* **Rich Task Details:** Edit descriptions, add task URLs (Jira/GitHub), and change types directly from the popup.
* **JSON Persistence:** All changes are saved instantly to a local `data.json` file.

## 🛠️ Prerequisites

* [Node.js](https://nodejs.org/) (Version 14 or higher)

## 📦 Installation

1. **Install dependencies:**

```bash
npm install express body-parser

```

2. **File Structure:**
Ensure your directory looks like this:

```
/my-gantt-tracker
├── package.json
├── server.js           # The Node.js backend
├── data.json           # Stores tasks (Includes sample data)
├── assignees.json      # List of developers
├── task_types.json     # List of task types and hex colors
└── public
    └── index.html      # The frontend logic and UI

```

## 🏃‍♂️ How to Run

1. Start the server:
```bash
node server.js

```


2. Open your browser and navigate to:
```
http://localhost:3000

```



## ⚙️ Configuration

You can customize the tracker without touching the code by editing these files:

### 1. Manage Developers (`assignees.json`)

Add or remove names from this list to update the dropdowns.

```json
[
  "Unassigned",
  "Loveth",
  "Bolu",
  "Stella",
  "Stacy"
]

```

### 2. Manage Colors & Types (`task_types.json`)

Define your task categories and their hex colors here. The app will generate the CSS automatically.

```json
[
  { "name": "Frontend", "color": "#3498db" },
  { "name": "Backend", "color": "#9b59b6" },
  { "name": "Risk", "color": "#e74c3c" }
]

```

## 📝 API Endpoints

The `server.js` provides a REST API to interact with your local files:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | Returns all tasks. |
| `GET` | `/api/assignees` | Returns list of developers. |
| `GET` | `/api/task-types` | Returns task types with colors. |
| `POST` | `/api/add-task` | Creates a new task. |
| `POST` | `/api/update-task` | Updates an existing task. |

## 📄 License

MIT License. Free to use for personal or commercial projects.