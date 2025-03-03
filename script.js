document.addEventListener('DOMContentLoaded', function() {
    // Initialize flatpickr date picker
    flatpickr("#dateInput", {
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    // Initialize toastr notifications
    toastr.options = {
        "closeButton": true,
        "progressBar": true,
        "positionClass": "toast-bottom-right",
        "timeOut": "3000"
    };

    // Set up event listeners
    setupEventListeners();
    
    // Load tasks from local storage
    loadTasks();
    
    // Load categories from local storage
    loadCategories();
    
    // Update task count
    updateTaskCount();
    
    // Setup category listeners
    setupCategoryListeners();
});

// Global variables
let tasks = [];
let categories = [
    { name: 'work', color: '#3498db', icon: 'fas fa-briefcase' },
    { name: 'personal', color: '#9b59b6', icon: 'fas fa-user' },
    { name: 'shopping', color: '#e67e22', icon: 'fas fa-shopping-cart' },
    { name: 'health', color: '#2ecc71', icon: 'fas fa-heartbeat' }
];
let currentFilter = 'all';
let currentTaskElement = null;
let contextMenuTarget = null;

// Set up event listeners
function setupEventListeners() {
    // Add task button
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', searchTasks);
    
    // Filter tabs
    const filterItems = document.querySelectorAll('.filter-list li');
    filterItems.forEach(item => {
        item.addEventListener('click', function() {
            filterItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            document.getElementById('currentView').textContent = this.textContent.trim();
            filterTasks(currentFilter);
        });
    });
    
    // View toggle buttons
    document.getElementById('gridViewBtn').addEventListener('click', function() {
        toggleView('grid');
    });
    
    // Add category button
    document.getElementById('addCategoryBtn').addEventListener('click', showCategoryModal);
    
    // Save category button
    document.getElementById('saveCategoryBtn').addEventListener('click', saveNewCategory);
    
    // Close buttons for modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            document.getElementById('taskModal').style.display = 'none';
            document.getElementById('categoryModal').style.display = 'none';
        });
    });
    
    // Context menu items
    document.getElementById('editContextMenu').addEventListener('click', function() {
        if (contextMenuTarget) {
            editTask(contextMenuTarget.querySelector('.edit-btn'));
            hideContextMenu();
        }
    });
    
    document.getElementById('completeContextMenu').addEventListener('click', function() {
        if (contextMenuTarget) {
            completeTask(contextMenuTarget.querySelector('.complete-btn'));
            hideContextMenu();
        }
    });
    
    document.getElementById('deleteContextMenu').addEventListener('click', function() {
        if (contextMenuTarget) {
            deleteTask(contextMenuTarget.querySelector('.delete-btn'));
            hideContextMenu();
        }
    });
    
    document.querySelectorAll('#priorityContextMenu .submenu li').forEach(item => {
        item.addEventListener('click', function() {
            if (contextMenuTarget) {
                changePriority(contextMenuTarget, this.dataset.priority);
                hideContextMenu();
            }
        });
    });
    
    // Close context menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#contextMenu')) {
            hideContextMenu();
        }
    });
    
    // Prevent default context menu
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.task-item')) {
            e.preventDefault();
            showContextMenu(e, e.target.closest('.task-item'));
        }
    });
    
    // Task input - add task on Enter
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
}

// Setup category listeners - this is the fixed function
function setupCategoryListeners() {
    // Remove any existing event listeners first (to prevent duplicates)
    document.querySelectorAll('.category-list li').forEach(item => {
        // Clone the element to remove all event listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
    });
    
    // Add fresh event listeners
    document.querySelectorAll('.category-list li').forEach(item => {
        item.addEventListener('click', function() {
            // Clear any active filters
            document.querySelectorAll('.filter-list li').forEach(i => i.classList.remove('active'));
            
            const category = this.dataset.category;
            
            // Update current view text
            document.getElementById('currentView').textContent = category.charAt(0).toUpperCase() + category.slice(1);
            
            // Filter tasks
            filterTasksByCategory(category);
        });
    });
}

// Task Functions
function addTask() {
    const taskInput = document.getElementById('taskInput');
    const dateInput = document.getElementById('dateInput');
    const priorityInput = document.getElementById('taskPriority');
    const categoryInput = document.getElementById('taskCategory');
    
    if (taskInput.value !== '') {
        const newTask = {
            id: Date.now(),
            text: taskInput.value,
            date: dateInput.value || 'No date',
            priority: priorityInput.value,
            category: categoryInput.value,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        
        taskInput.value = '';
        dateInput.value = '';
        
        toastr.success('Task added successfully!');
    } else {
        toastr.error('Please enter a task description');
    }
}

function editTask(button) {
    const taskItem = button.closest('.task-item');
    const taskId = parseInt(taskItem.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    // Show task modal with editable form
    const taskDetails = document.getElementById('taskDetails');
    taskDetails.innerHTML = `
        <div class="detail-row">
            <label class="detail-label">Task Description</label>
            <input type="text" id="editTaskText" value="${task.text}" class="edit-input">
        </div>
        <div class="detail-row">
            <label class="detail-label">Due Date</label>
            <input type="text" id="editTaskDate" value="${task.date}" class="edit-input">
        </div>
        <div class="detail-row">
            <label class="detail-label">Priority</label>
            <select id="editTaskPriority" class="edit-input">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High Priority</option>
            </select>
        </div>
        <div class="detail-row">
            <label class="detail-label">Category</label>
            <select id="editTaskCategory" class="edit-input">
                ${categories.map(cat => `
                    <option value="${cat.name}" ${task.category === cat.name ? 'selected' : ''}>${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</option>
                `).join('')}
            </select>
        </div>
        <button id="saveTaskBtn" class="save-btn">Save Changes</button>
    `;
    
    // Initialize date picker for edit date field
    flatpickr("#editTaskDate", {
        dateFormat: "Y-m-d",
        minDate: "today"
    });
    
    // Add event listener for save button
    document.getElementById('saveTaskBtn').addEventListener('click', function() {
        task.text = document.getElementById('editTaskText').value;
        task.date = document.getElementById('editTaskDate').value;
        task.priority = document.getElementById('editTaskPriority').value;
        task.category = document.getElementById('editTaskCategory').value;
        
        saveTasks();
        renderTasks();
        document.getElementById('taskModal').style.display = 'none';
        
        toastr.success('Task updated successfully!');
    });
    
    document.getElementById('taskModal').style.display = 'block';
}

function completeTask(button) {
    const taskItem = button.closest('.task-item');
    const taskId = parseInt(taskItem.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        
        if (task.completed) {
            toastr.success('Task completed!');
        }
    }
}

function deleteTask(button) {
    const taskItem = button.closest('.task-item');
    const taskId = parseInt(taskItem.dataset.id);
    
    // Remove from array
    tasks = tasks.filter(task => task.id !== taskId);
    
    // Update storage and UI
    saveTasks();
    
    // Add animation before removing
    taskItem.classList.add('animate__animated', 'animate__fadeOut');
    
    // Remove from DOM after animation completes
    taskItem.addEventListener('animationend', function() {
        renderTasks();
    });
    
    toastr.info('Task deleted');
}

function changePriority(taskItem, priority) {
    const taskId = parseInt(taskItem.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.priority = priority;
        saveTasks();
        renderTasks();
        toastr.info(`Priority changed to ${priority}`);
    }
}

// UI Functions
function renderTasks() {
    const listView = document.getElementById('taskList');
    const gridView = document.getElementById('taskGrid');
    
    // Clear both views
    listView.innerHTML = '';
    gridView.innerHTML = '';
    
    // Render tasks in both views
    tasks.forEach(task => {
        // List view item
        const listItem = createTaskItem(task, 'list');
        listView.appendChild(listItem);
        
        // Grid view item
        const gridItem = createTaskItem(task, 'grid');
        gridView.appendChild(gridItem);
    });
    
    // Update task count
    updateTaskCount();
}

function createTaskItem(task, viewType) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item priority-${task.priority} category-${task.category}`;
    taskItem.dataset.id = task.id;
    taskItem.dataset.category = task.category;
    
    if (task.completed) {
        taskItem.classList.add('completed');
    }
    
    // Add animation class for new items
    taskItem.classList.add('animate__animated', 'animate__fadeIn');
    
    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const categoryLabel = task.category.charAt(0).toUpperCase() + task.category.slice(1);
    
    // Use different icon based on priority
    let priorityIcon = 'fa-flag';
    if (task.priority === 'high') priorityIcon = 'fa-exclamation-circle';
    else if (task.priority === 'medium') priorityIcon = 'fa-exclamation';
    
    // Get category icon
    const categoryObj = categories.find(c => c.name === task.category);
    const categoryIcon = categoryObj ? categoryObj.icon : 'fa-tag';
    
    taskItem.innerHTML = `
        <div class="task-info">
            <div class="task-text">${task.text}</div>
            <div class="task-meta">
                <div class="task-date"><i class="far fa-calendar-alt"></i> ${task.date}</div>
                <div class="task-priority ${task.priority}"><i class="fas ${priorityIcon}"></i> ${priorityLabel}</div>
                <div class="task-category"><i class="${categoryIcon}"></i> ${categoryLabel}</div>
            </div>
        </div>
        <div class="task-actions">
            <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="complete-btn" title="${task.completed ? 'Mark as Incomplete' : 'Mark as Complete'}">
                <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
            </button>
            <button class="delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    
    // Add event listeners
    taskItem.querySelector('.edit-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        editTask(this);
    });
    
    taskItem.querySelector('.complete-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        completeTask(this);
    });
    
    taskItem.querySelector('.delete-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        deleteTask(this);
    });
    
    // Open task details on click
    taskItem.addEventListener('click', function() {
        showTaskDetails(task);
    });
    
    return taskItem;
}

function showTaskDetails(task) {
    const taskDetails = document.getElementById('taskDetails');
    const categoryObj = categories.find(c => c.name === task.category);
    const categoryIcon = categoryObj ? categoryObj.icon : 'fa-tag';
    
    // Format the creation date
    const createdDate = new Date(task.createdAt);
    const formattedDate = createdDate.toLocaleString();
    
    taskDetails.innerHTML = `
        <div class="detail-row">
            <label class="detail-label">Task Description</label>
            <div>${task.text}</div>
        </div>
        <div class="detail-row">
            <label class="detail-label">Due Date</label>
            <div><i class="far fa-calendar-alt"></i> ${task.date}</div>
        </div>
        <div class="detail-row">
            <label class="detail-label">Priority</label>
            <div class="task-priority ${task.priority}"><i class="fas fa-flag"></i> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</div>
        </div>
        <div class="detail-row">
            <label class="detail-label">Category</label>
            <div><i class="${categoryIcon}"></i> ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</div>
        </div>
        <div class="detail-row">
            <label class="detail-label">Status</label>
            <div><i class="fas ${task.completed ? 'fa-check-circle' : 'fa-clock'}"></i> ${task.completed ? 'Completed' : 'Pending'}</div>
        </div>
        <div class="detail-row">
            <label class="detail-label">Created On</label>
            <div><i class="fas fa-calendar-plus"></i> ${formattedDate}</div>
        </div>
        <div class="detail-actions">
            <button id="detailEditBtn" class="edit-btn">Edit Task</button>
            ${task.completed ? 
              '<button id="detailUndoBtn" class="undo-btn">Mark as Pending</button>' : 
              '<button id="detailCompleteBtn" class="complete-btn">Mark as Complete</button>'
            }
        </div>
    `;
    
    // Add event listeners to buttons
    document.getElementById('detailEditBtn').addEventListener('click', function() {
        const taskItem = document.querySelector(`.task-item[data-id="${task.id}"]`);
        editTask(taskItem.querySelector('.edit-btn'));
    });
    
    if (task.completed) {
        document.getElementById('detailUndoBtn').addEventListener('click', function() {
            const taskItem = document.querySelector(`.task-item[data-id="${task.id}"]`);
            completeTask(taskItem.querySelector('.complete-btn'));
            document.getElementById('taskModal').style.display = 'none';
        });
    } else {
        document.getElementById('detailCompleteBtn').addEventListener('click', function() {
            const taskItem = document.querySelector(`.task-item[data-id="${task.id}"]`);
            completeTask(taskItem.querySelector('.complete-btn'));
            document.getElementById('taskModal').style.display = 'none';
        });
    }
    
    document.getElementById('taskModal').style.display = 'block';
}

function searchTasks() {
    const searchInput = document.getElementById('searchInput');
    const filter = searchInput.value.toLowerCase();
    
    if (filter === '') {
        filterTasks(currentFilter);
        return;
    }
    
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        const taskText = item.querySelector('.task-text').textContent.toLowerCase();
        const taskCategory = item.dataset.category.toLowerCase();
        
        if (taskText.includes(filter) || taskCategory.includes(filter)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
    
    updateTaskCount();
}

function filterTasks(filter) {
    const today = new Date().toISOString().split('T')[0];
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        const taskId = parseInt(item.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) return;
        
        // Reset hidden state
        item.classList.remove('hidden');
        
        switch (filter) {
            case 'today':
                if (task.date !== today) {
                    item.classList.add('hidden');
                }
                break;
            case 'upcoming':
                if (task.date === 'No date' || task.date <= today) {
                    item.classList.add('hidden');
                }
                break;
            case 'completed':
                if (!task.completed) {
                    item.classList.add('hidden');
                }
                break;
            case 'all':
            default:
                // Show all tasks
                break;
        }
    });
    
    updateTaskCount();
}

// This is the primary function that filters tasks by category
function filterTasksByCategory(category) {
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        if (item.dataset.category === category) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
    
    updateTaskCount();
}

function toggleView(viewType) {
    const listView = document.getElementById('taskList');
    const gridView = document.getElementById('taskGrid');
    const gridBtn = document.getElementById('gridViewBtn');
    
    if (viewType === 'list') {
        listView.classList.add('active');
        gridView.classList.remove('active');
        gridBtn.classList.remove('active');
    } else {
        gridView.classList.add('active');
        listView.classList.remove('active');
        gridBtn.classList.add('active');
    }
}

function updateTaskCount() {
    // Get visible tasks from either the active list view or grid view
    const activeView = document.querySelector('.list-view.active, .grid-view.active');
    const visibleTasks = activeView.querySelectorAll('.task-item:not(.hidden)').length;
    document.getElementById('taskCount').textContent = `${visibleTasks} task${visibleTasks !== 1 ? 's' : ''}`;
}

// Context Menu Functions
function showContextMenu(e, taskItem) {
    const contextMenu = document.getElementById('contextMenu');
    contextMenuTarget = taskItem;
    
    // Position the menu near the cursor
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    
    // Show the menu
    contextMenu.style.display = 'block';
    
    // Adjust if menu is out of viewport
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${e.pageX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${e.pageY - rect.height}px`;
    }
}

function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    contextMenuTarget = null;
}

// Mobile menu functionality
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const sidebar = document.querySelector('.sidebar');
const closeSidebarBtn = document.querySelector('.close-sidebar-btn');

// Create menu overlay
const menuOverlay = document.createElement('div');
menuOverlay.className = 'menu-overlay';
document.body.appendChild(menuOverlay);

// Toggle menu function
function openMenu() {
    sidebar.classList.add('show');
    menuOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
}

function closeMenu() {
    sidebar.classList.remove('show');
    menuOverlay.classList.remove('show');
    document.body.style.overflow = '';
}

// Event listeners
mobileMenuToggle.addEventListener('click', openMenu);
closeSidebarBtn.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu);

// Close menu when clicking on a menu item on mobile
const menuItems = sidebar.querySelectorAll('.filter-list li, .category-list li');
menuItems.forEach(item => {
    item.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            closeMenu();
        }
    });
});

// Handle resize events
window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar.classList.contains('show')) {
        closeMenu();
    }
});

// Category Functions
function showCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    document.getElementById('categoryNameInput').value = '';
    document.getElementById('categoryColorInput').value = '#3498db';
}

function saveNewCategory() {
    const categoryName = document.getElementById('categoryNameInput').value.trim().toLowerCase();
    const categoryColor = document.getElementById('categoryColorInput').value;
    
    if (categoryName) {
        // Check if category already exists
        if (categories.some(cat => cat.name === categoryName)) {
            toastr.error('Category already exists');
            return;
        }
        
        // Add new category
        const newCategory = {
            name: categoryName,
            color: categoryColor,
            icon: 'fas fa-tag'
        };
        
        categories.push(newCategory);
        saveCategories();
        
        // Add to category list
        const categoryList = document.getElementById('categoryList');
        const li = document.createElement('li');
        li.dataset.category = categoryName;
        li.className = categoryName;
        li.innerHTML = `<i class="fas fa-tag"></i> ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}`;
        
        // Add the event listener to the new category
        li.addEventListener('click', function() {
            filterTasksByCategory(categoryName);
            
            // Update current view text
            document.getElementById('currentView').textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        });
        
        categoryList.appendChild(li);
        
        // Add to task category dropdown
        const taskCategory = document.getElementById('taskCategory');
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        taskCategory.appendChild(option);
        
        // Close modal
        document.getElementById('categoryModal').style.display = 'none';
        
        // Show success message
        toastr.success('New category added');
    } else {
        toastr.error('Please enter a category name');
    }
}

// Data Persistence Functions
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

function loadCategories() {
    const savedCategories = localStorage.getItem('categories');
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
        updateCategoryList();
    }
}

function updateCategoryList() {
    // Update dropdown
    const taskCategory = document.getElementById('taskCategory');
    taskCategory.innerHTML = '';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
        taskCategory.appendChild(option);
    });
}

// Utility Functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}