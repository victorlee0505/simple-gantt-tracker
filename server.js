const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve frontend files from 'public' folder

const DATA_FILE = path.join(__dirname, 'data.json');

// API: Get all tasks
app.get('/api/tasks', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(JSON.parse(data));
    });
});

// API: Update a specific task
app.post('/api/update-task', (req, res) => {
    const updatedTask = req.body;
    
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        
        let tasks = JSON.parse(data);
        
        // Find task index and update it
        const index = tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updatedTask };
            
            // Write changes back to disk
            fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), (err) => {
                if (err) return res.status(500).send(err);
                res.send({ status: 'success', task: tasks[index] });
            });
        } else {
            res.status(404).send({ status: 'not found' });
        }
    });
});

app.listen(PORT, () => console.log(`Gantt Server running at http://localhost:${PORT}`));