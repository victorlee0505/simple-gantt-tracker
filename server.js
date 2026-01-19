const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const ADMIN_PASSWORD = "admin"; // <--- CHANGE THIS PASSWORD

app.use(bodyParser.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');
const ASSIGNEES_FILE = path.join(__dirname, 'assignees.json');
const TYPES_FILE = path.join(__dirname, 'task_types.json'); // <--- NEW FILE

function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        return [];
    }
}

// --- API ENDPOINTS ---

// POST: Login Endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.send({ success: true });
    } else {
        res.status(401).send({ success: false });
    }
});

// GET: Fetch Tasks
app.get('/api/tasks', (req, res) => {
    res.send(readJsonFile(DATA_FILE));
});

// GET: Fetch Assignees
app.get('/api/assignees', (req, res) => {
    let list = readJsonFile(ASSIGNEES_FILE);
    if (list.length === 0) list = ["Unassigned"];
    res.send(list);
});

// GET: Fetch Task Types (NEW)
app.get('/api/task-types', (req, res) => {
    let list = readJsonFile(TYPES_FILE);
    // Default fallback if file is empty
    if (list.length === 0) {
        list = [
            { name: "Frontend", color: "#3498db" },
            { name: "Backend", color: "#9b59b6" }
        ];
    }
    res.send(list);
});

// POST: Add Task (UPDATED)
app.post('/api/add-task', (req, res) => {
    const newTask = req.body;
    let tasks = readJsonFile(DATA_FILE);

    // 1. Validation: Ensure mandatory fields exist
    if (!newTask.name || !newTask.start || !newTask.end) {
        return res.status(400).send({ error: "Missing mandatory fields: name, start, end" });
    }

    // 2. ID Handling: Use provided ID or Auto-generate (Max + 1)
    if (!newTask.id) {
        const maxId = tasks.reduce((max, t) => (parseInt(t.id) > max ? parseInt(t.id) : max), 0);
        newTask.id = maxId + 1;
    } else {
        // Ensure ID is treated as a number/string consistently
        newTask.id = parseInt(newTask.id) || newTask.id; 
    }
    
    // 3. Optional Fields: Use provided value OR fallback to default
    newTask.progress = (newTask.progress !== undefined) ? newTask.progress : 0;
    newTask.dependencies = newTask.dependencies || "";
    newTask.assignee = newTask.assignee || "Unassigned";
    newTask.task_type = newTask.task_type || "Frontend";
    newTask.desc = newTask.desc || "";
    newTask.task_url = newTask.task_url || "";

    tasks.push(newTask);

    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
        res.send({ status: 'success', task: newTask });
    } catch (err) {
        res.status(500).send({ error: "Failed to save data" });
    }
});

// POST: Update Task
app.post('/api/update-task', (req, res) => {
    const updatedTask = req.body;
    let tasks = readJsonFile(DATA_FILE);
    
    const index = tasks.findIndex(t => t.id == updatedTask.id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updatedTask };
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
            res.send({ status: 'success', task: tasks[index] });
        } catch (err) {
            res.status(500).send({ error: "Failed to save data" });
        }
    } else {
        res.status(404).send({ status: 'not found' });
    }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));