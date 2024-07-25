document.addEventListener('DOMContentLoaded', function() {
    flatpickr("#dateInput", {
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    document.getElementById('searchInput').addEventListener('input', searchTasks);
});

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const dateInput = document.getElementById('dateInput');
    const taskList = document.getElementById('taskList');
    
    if (taskInput.value !== '') {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="task-info">
                <span class="task-text">${taskInput.value}</span>
                <span class="task-date">${dateInput.value || 'No date'}</span>
            </div>
            <div class="task-actions">
                <button onclick="editTask(this)" class="edit-btn">EDIT</button>
                <button onclick="completeTask(this)" class="complete-btn">COMPLETED</button>
                <button onclick="deleteTask(this)" class="delete-btn">DELETE</button>
            </div>
        `;
        taskList.appendChild(li);
        taskInput.value = '';
        dateInput.value = '';
    }
}

function editTask(button) {
    const li = button.closest('li');
    const taskInfo = li.querySelector('.task-info');
    const taskText = taskInfo.querySelector('.task-text');
    const taskDate = taskInfo.querySelector('.task-date');
    const currentText = taskText.textContent;
    const currentDate = taskDate.textContent;

    li.classList.add('editing');
    taskInfo.innerHTML = `
        <input type="text" class="edit-text" value="${currentText}">
        <input type="text" class="edit-date" value="${currentDate}">
    `;
    
    const textInput = taskInfo.querySelector('.edit-text');
    const dateInput = taskInfo.querySelector('.edit-date');
    
    flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    textInput.focus();
    
    function finishEditing() {
        const newText = textInput.value;
        const newDate = dateInput.value;
        if (newText !== '') {
            taskInfo.innerHTML = `
                <span class="task-text">${newText}</span>
                <span class="task-date">${newDate || 'No date'}</span>
            `;
        }
        li.classList.remove('editing');
    }

    textInput.addEventListener('blur', finishEditing);
    dateInput.addEventListener('blur', finishEditing);
    
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            finishEditing();
        }
    });
}

function completeTask(button) {
    const li = button.closest('li');
    li.classList.toggle('completed');
    const taskText = li.querySelector('.task-text');
    taskText.style.textDecoration = taskText.style.textDecoration === 'line-through' ? 'none' : 'line-through';
}

function deleteTask(button) {
    const li = button.closest('li');
    li.remove();
}

function searchTasks() {
    const searchInput = document.getElementById('searchInput');
    const filter = searchInput.value.toLowerCase();
    const tasks = document.getElementById('taskList').getElementsByTagName('li');

    for (let i = 0; i < tasks.length; i++) {
        const taskText = tasks[i].querySelector('.task-text').textContent;
        if (taskText.toLowerCase().indexOf(filter) > -1) {
            tasks[i].classList.remove('hidden');
        } else {
            tasks[i].classList.add('hidden');
        }
    }
}