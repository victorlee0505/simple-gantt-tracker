let gantt;
let allTasks = [];
let developers = [];
let taskTypes = [];
let isEditMode = false; // DEFAULT IS READ ONLY

window.onload = async function () {
    try {
        const [tasksRes, devsRes, typesRes] = await Promise.all([
            fetch('/api/tasks'),
            fetch('/api/assignees'),
            fetch('/api/task-types')
        ]);
        allTasks = await tasksRes.json();
        developers = await devsRes.json();
        taskTypes = await typesRes.json();

        generateTypeStyles();
        populateDropdowns();
        redrawChart();
    } catch (err) {
        console.error(err);
    }
};

// --- AUTHENTICATION LOGIC ---
function toggleEditMode() {
    if (isEditMode) {
        // Lock it
        isEditMode = false;
        updateAuthUI();
        redrawChart(); // Re-render to disable dragging
    } else {
        // Open password modal
        document.getElementById('password-modal').style.display = 'flex';
        document.getElementById('admin-pass').value = '';
        document.getElementById('admin-pass').focus();
    }
}

function verifyPassword() {
    const pass = document.getElementById('admin-pass').value;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                isEditMode = true;
                closePassModal();
                updateAuthUI();
                redrawChart(); // Re-render to enable dragging
            } else {
                alert("Incorrect Password");
            }
        });
}

function updateAuthUI() {
    const btn = document.getElementById('auth-btn');
    const addBtn = document.getElementById('add-btn');

    if (isEditMode) {
        btn.innerHTML = "🔓 Lock Editing";
        btn.className = "button btn-lock";
        addBtn.classList.remove('hidden');
    } else {
        btn.innerHTML = "🔒 Unlock Editing";
        btn.className = "button btn-unlock";
        addBtn.classList.add('hidden');
    }
}

function closePassModal() { document.getElementById('password-modal').style.display = 'none'; }

// --- ADD MODAL LOGIC (UPDATED) ---
function openAddModal() {
    // Populate Types
    const typeSelect = document.getElementById('new-type');
    typeSelect.innerHTML = '';
    taskTypes.forEach(t => {
        let opt = document.createElement('option');
        opt.value = t.name;
        opt.text = t.name;
        typeSelect.appendChild(opt);
    });

    // Populate Assignees
    const assignSelect = document.getElementById('new-assignee');
    assignSelect.innerHTML = '';
    developers.forEach(d => {
        let opt = document.createElement('option');
        opt.value = d;
        opt.text = d;
        assignSelect.appendChild(opt);
    });

    document.getElementById('add-modal').style.display = 'flex';
}

function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }

// --- CHART LOGIC ---
function generateTypeStyles() {
    let styleHTML = "";

    taskTypes.forEach(type => {
        const safeName = "type-" + type.name.toLowerCase().replace(/\s+/g, '-');

        // 1. The Bold Color (for Progress and Border)
        const boldColor = type.color;

        // 2. The Washed-out Color (for the empty part of the bar)
        const paleColor = lightenDarkenColor(boldColor, 50);

        styleHTML += `
                    .${safeName} .bar { 
                        fill: ${paleColor} !important; 
                        stroke: ${boldColor} !important;
                        stroke-width: 1px !important;
                    }
                    .${safeName} .bar-progress { 
                        fill: ${boldColor} !important; 
                    }
                `;
    });

    document.getElementById('dynamic-styles').innerHTML = styleHTML;
}

// --- UI TOGGLES ---
function toggleTypeFilter() {
    const el = document.getElementById('type-filter-wrapper');
    el.classList.toggle('visible');
}

// Close checkbox dropdown when clicking outside
document.addEventListener('click', function (event) {
    const el = document.getElementById('type-filter-wrapper');
    const isClickInside = el.contains(event.target);
    if (!isClickInside && el.classList.contains('visible')) {
        el.classList.remove('visible');
    }
});

function populateDropdowns() {
    // 1. Assignee Filter
    const filterSelect = document.getElementById('assignee-filter');
    filterSelect.innerHTML = '<option value="All">All Developers</option>';
    developers.forEach(dev => {
        const option = document.createElement("option");
        option.value = dev;
        option.text = dev;
        filterSelect.appendChild(option);
    });

    // 2. CHECKBOX DROPDOWN (Types)
    const list = document.getElementById('type-filter-items');
    list.innerHTML = ''; 
    
    // --- NEW: Add "All" Option at the top ---
    list.innerHTML += `
        <li style="border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
            <label style="font-weight: bold;">
                <input type="checkbox" id="cb-all-types" checked onchange="toggleAllTypes(this)" /> 
                All
            </label>
        </li>
    `;

    // Add individual items
    taskTypes.forEach(type => {
        // Note: Added 'checkAllState()' call to the onchange
        list.innerHTML += `<li><label><input type="checkbox" class="type-cb" checked value="${type.name}" onchange="checkAllState(); redrawChart()" /> ${type.name}</label></li>`;
    });
}

// Function called when "All" is clicked
function toggleAllTypes(source) {
    const checkboxes = document.querySelectorAll('.type-cb');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
    redrawChart();
}

// Function to keep the "All" checkbox in sync
// (e.g., if you manually uncheck one type, "All" should uncheck)
function checkAllState() {
    const allCb = document.getElementById('cb-all-types');
    const allTypeCbs = document.querySelectorAll('.type-cb');
    const checkedTypeCbs = document.querySelectorAll('.type-cb:checked');

    // If the number of checked boxes equals total boxes, "All" is checked
    allCb.checked = (allTypeCbs.length === checkedTypeCbs.length);
}

function redrawChart() {
    // Sync the "All" checkbox visual state
    checkAllState();

    const selectedDev = document.getElementById('assignee-filter').value;
    
    // Get Checked Types
    const checkboxes = document.querySelectorAll('.type-cb:checked');
    const selectedTypes = Array.from(checkboxes).map(cb => cb.value);

    let filteredRaw = allTasks;

    // Filter by Assignee
    if (selectedDev !== "All") {
        filteredRaw = filteredRaw.filter(t => t.assignee === selectedDev);
    }

    // Filter by Type
    // If NO checkboxes are checked, showing nothing is the correct behavior
    filteredRaw = filteredRaw.filter(t => selectedTypes.includes(t.task_type));
    
    // Safety Check
    const visibleIds = new Set(filteredRaw.map(t => String(t.id)));
    const ganttData = filteredRaw.map(t => formatTaskForGantt(t, visibleIds));

    document.getElementById('gantt').innerHTML = '';
    initGantt(ganttData);
}

function formatTaskForGantt(t, visibleIds) {
    let cssClass = 'type-default';
    if (t.task_type) {
        cssClass = "type-" + t.task_type.toLowerCase().replace(/\s+/g, '-');
    }

    // 1. Process Dependencies
    let depsArray = t.dependencies ? String(t.dependencies).split(',') : [];

    // If visibleIds is provided (we are filtering), remove deps that aren't on screen
    if (visibleIds) {
        depsArray = depsArray.filter(d => visibleIds.has(d.trim()));
    }

    // 2. FIX: Prevent Double Prefixing (task-task-1)
    let fixedDeps = depsArray.map(d => {
        const cleanD = d.trim();
        return cleanD.startsWith("task-") ? cleanD : "task-" + cleanD;
    }).join(', ');

    // 3. FIX: Prevent Double Prefixing on ID
    const rawIdString = String(t.id);
    const finalId = rawIdString.startsWith("task-") ? rawIdString : "task-" + rawIdString;

    return {
        ...t,
        id: finalId,
        dependencies: fixedDeps,
        _originalId: t.id, // Keep the raw ID (e.g. 1) safe here
        custom_class: cssClass
    };
}

function initGantt(tasksToRender) {
    if (tasksToRender.length === 0) return;

    gantt = new Gantt("#gantt", tasksToRender, {
        header_height: 50, column_width: 30, step: 24,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
        bar_height: 25, bar_corner_radius: 3, arrow_curve: 5, padding: 18,
        view_mode: 'Week', date_format: 'YYYY-MM-DD', language: 'en',

        // *** READ ONLY TOGGLE ***
        readonly: !isEditMode,

        on_date_change: function (task, start, end) {
            if (!isEditMode) return;
            const newStart = start.toISOString().split('T')[0];
            const newEnd = end.toISOString().split('T')[0];
            updateServer({ id: task._originalId, start: newStart, end: newEnd });
        },

        on_progress_change: function (task, progress) {
            if (!isEditMode) return;
            updateServer({ id: task._originalId, progress: progress });
        },

        custom_popup_html: function (task) {
            const rawTask = allTasks.find(t => t.id == task._originalId) || task;

            // DISABLE INPUTS IF READ ONLY
            const disabledAttr = isEditMode ? "" : "disabled";

            // Only show link HTML if URL exists
            const linkHtml = rawTask.task_url ? `<a href="${rawTask.task_url}" target="_blank" style="float:right; font-size:11px; margin-top:3px;">🔗 Open</a>` : '';

            // Generate Dropdowns
            let devOptions = developers.map(dev => `<option value="${dev}" ${rawTask.assignee === dev ? 'selected' : ''}>${dev}</option>`).join('');
            let typeOptions = taskTypes.map(type => `<option value="${type.name}" ${rawTask.task_type === type.name ? 'selected' : ''}>${type.name}</option>`).join('');

            let currentDeps = rawTask.dependencies ? String(rawTask.dependencies).split(',').map(d => d.trim()) : [];
            let depOptions = allTasks.filter(t => t.id != rawTask.id).map(t => {
                const isSelected = currentDeps.includes(String(t.id)) ? 'selected' : '';
                return `<option value="${t.id}" ${isSelected}>#${t.id} - ${t.name}</option>`;
            }).join('');

            return `
                      <div class="details-container">
                        ${linkHtml}
                        <h5>#${rawTask.id} - ${rawTask.name}</h5>
                        <p style="margin:0 0 5px 0; font-size:11px; color:#999;">${task._start.toLocaleDateString()} - ${task._end.toLocaleDateString()}</p>
                        
                        <label>Progress (%):</label>
                        <input ${disabledAttr} type="number" min="0" max="100" value="${rawTask.progress || 0}" onchange="updateGeneric(${rawTask.id}, 'progress', Number(this.value))">

                        
                        <label>Task Type:</label>
                        <select ${disabledAttr} onchange="updateGeneric(${rawTask.id}, 'task_type', this.value)">${typeOptions}</select>

                        <label>Assignee:</label>
                        <select ${disabledAttr} onchange="updateGeneric(${rawTask.id}, 'assignee', this.value)">${devOptions}</select>

                        <label>Task URL:</label>
                        <input ${disabledAttr} type="text" value="${rawTask.task_url || ''}" onchange="updateGeneric(${rawTask.id}, 'task_url', this.value)" placeholder="https://...">

                        <label>Dependencies:</label>
                        <select ${disabledAttr} multiple onchange="updateDependencies(${rawTask.id}, this)">
                            <option value="">(None)</option> ${depOptions}
                        </select>

                        <label>Description:</label>
                        <textarea ${disabledAttr} onchange="updateGeneric(${rawTask.id}, 'desc', this.value)">${rawTask.desc || ''}</textarea>
                      </div>
                    `;
        }
    });
}

function changeView(mode, btn) {
    document.querySelectorAll('.button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gantt.change_view_mode(mode);
}

function lightenDarkenColor(col, amt) {
    let usePound = false; if (col[0] == "#") { col = col.slice(1); usePound = true; }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}

function saveNewTask() {
    // Updated to grab all fields
    const id = document.getElementById('new-id').value; // Optional
    const name = document.getElementById('new-name').value;
    const start = document.getElementById('new-start').value;
    const end = document.getElementById('new-end').value;
    const type = document.getElementById('new-type').value;
    const assignee = document.getElementById('new-assignee').value;
    const progress = document.getElementById('new-progress').value;
    const url = document.getElementById('new-url').value;
    const desc = document.getElementById('new-desc').value;

    if (!name || !start || !end) return alert("Missing Mandatory Fields (Name, Start, End)");

    const payload = {
        id,
        name,
        start,
        end,
        task_type: type,
        assignee,
        progress: Number(progress),
        task_url: url,
        desc: desc
    };

    fetch('/api/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                allTasks.push(data.task);
                redrawChart();
                closeAddModal();
                // Clear Inputs
                document.getElementById('new-name').value = '';
                document.getElementById('new-id').value = '';
            }
        });
}

window.updateDependencies = function (id, selectElem) {
    const selectedValues = Array.from(selectElem.selectedOptions).map(opt => opt.value).filter(val => val !== "");
    updateGeneric(id, 'dependencies', selectedValues.join(', '));
}

window.updateGeneric = function (id, field, value) {
    updateServer({ id: id, [field]: value });
    const index = allTasks.findIndex(t => t.id == id);
    if (index > -1) allTasks[index][field] = value;
    redrawChart();
}

function updateServer(data) {
    fetch('/api/update-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(console.error);
}
