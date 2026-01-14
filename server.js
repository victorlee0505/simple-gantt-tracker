const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

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

// POST: Add Task
app.post('/api/add-task', (req, res) => {
    const newTask = req.body;
    let tasks = readJsonFile(DATA_FILE);

    const maxId = tasks.reduce((max, t) => (parseInt(t.id) > max ? parseInt(t.id) : max), 0);
    newTask.id = maxId + 1;
    
    newTask.progress = 0;
    newTask.dependencies = "";
    newTask.assignee = newTask.assignee || "Unassigned";
    // Default to first available type name if possible, else "Frontend"
    newTask.task_type = newTask.task_type || "Frontend";

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