/**
 * BranchFlow Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const categorySelect = document.getElementById('categorySelect');
  const prioritySelect = document.getElementById('prioritySelect');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const filterTabs = document.querySelectorAll('.tab-btn');
  const triggerBackupBtn = document.getElementById('triggerBackupBtn');

  // Diagnostic & Header Elements
  const envBadge = document.getElementById('envBadge');
  const envName = document.getElementById('envName');
  const s3Badge = document.getElementById('s3Badge');
  const s3StatusText = document.getElementById('s3StatusText');
  const statTotal = document.getElementById('statTotal');
  const statActive = document.getElementById('statActive');
  const statCompleted = document.getElementById('statCompleted');
  const hostName = document.getElementById('hostName');
  const bucketName = document.getElementById('bucketName');
  const serverUptime = document.getElementById('serverUptime');

  // Application State
  let tasksState = [];
  let activeFilter = 'all';

  // Fetch Tasks from API
  async function fetchTasks() {
    try {
      const res = await fetch('/tasks');
      const data = await res.json();
      if (data.success) {
        tasksState = data.tasks || [];
        updateMetrics();
        renderTasks();
        if (data.environment) {
          updateEnvironmentBadge(data.environment);
        }
        if (data.bucket) {
          bucketName.textContent = data.bucket;
        }
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      showToast('Error connecting to backend server', 'warning');
    }
  }

  // Fetch Health Diagnostics
  async function fetchHealth() {
    try {
      const res = await fetch('/health');
      const data = await res.json();

      if (data.status === 'UP') {
        hostName.textContent = data.hostname || 'localhost';
        bucketName.textContent = data.aws.s3Bucket || 'unassigned';
        serverUptime.textContent = formatUptime(data.uptimeSeconds);
        updateEnvironmentBadge(data.environment);

        if (data.aws.s3ClientConfigured) {
          s3Badge.classList.add('active');
          s3StatusText.textContent = 'S3 Cloud Active';
        } else {
          s3StatusText.textContent = 'Local Sync Mode';
        }

        const dynamoStatusText = document.getElementById('dynamoStatusText');
        const ssmStatusText = document.getElementById('ssmStatusText');
        if (dynamoStatusText) {
          dynamoStatusText.textContent = data.aws.dynamoClientConfigured ? 'DynamoDB Active' : 'DynamoDB Ready';
        }
        if (ssmStatusText) {
          ssmStatusText.textContent = data.aws.ssmClientConfigured ? 'SSM Active' : 'SSM Configured';
        }
      }
    } catch (err) {
      serverUptime.textContent = 'Offline';
    }
  }

  // Format Server Uptime
  function formatUptime(seconds) {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    const h = Math.floor(m / 60);
    const remainingM = m % 60;
    if (h === 0) return `${m}m ${s}s`;
    return `${h}h ${remainingM}m`;
  }

  // Update Environment Badge UI
  function updateEnvironmentBadge(env) {
    envBadge.className = 'badge env-badge';
    const upperEnv = (env || 'DEV').toUpperCase();
    envName.textContent = upperEnv;
    if (upperEnv.includes('PROD')) {
      envBadge.classList.add('prod');
    } else {
      envBadge.classList.add('dev');
    }
  }

  // Update Summary Metrics Counters
  function updateMetrics() {
    const total = tasksState.length;
    const completed = tasksState.filter(t => t.completed).length;
    const active = total - completed;

    statTotal.textContent = total;
    statActive.textContent = active;
    statCompleted.textContent = completed;
  }

  // Render Filtered Task List
  function renderTasks() {
    taskList.innerHTML = '';

    const filtered = tasksState.filter(t => {
      if (activeFilter === 'active') return !t.completed;
      if (activeFilter === 'completed') return t.completed;
      return true;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="task-left">
          <div class="custom-checkbox" onclick="window.toggleTask(${task.id})">
            ${task.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
          <div class="task-details">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
              <span class="pill pill-category">${escapeHtml(task.category || 'General')}</span>
              <span class="pill pill-priority ${task.priority}">${escapeHtml(task.priority || 'Medium')}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" onclick="window.deleteTask(${task.id})" title="Delete Task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }

  // Add Task Handler
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    const category = categorySelect.value;
    const priority = prioritySelect.value;

    try {
      const res = await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, priority })
      });
      const data = await res.json();
      if (data.success) {
        taskInput.value = '';
        tasksState = data.tasks;
        updateMetrics();
        renderTasks();

        if (data.backup && data.backup.success) {
          showToast('Task added & backed up to AWS S3!', 'success');
        } else {
          showToast('Task added (Saved locally)', 'info');
        }
      }
    } catch (err) {
      showToast('Failed to add task', 'warning');
    }
  });

  // Global Function: Toggle Task Completion
  window.toggleTask = async (id) => {
    const task = tasksState.find(t => t.id === id);
    if (!task) return;

    try {
      const res = await fetch(`/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      const data = await res.json();
      if (data.success) {
        tasksState = data.tasks;
        updateMetrics();
        renderTasks();

        if (data.backup && data.backup.success) {
          showToast('Status updated & synced to S3', 'success');
        }
      }
    } catch (err) {
      showToast('Failed to update task', 'warning');
    }
  };

  // Global Function: Delete Task
  window.deleteTask = async (id) => {
    try {
      const res = await fetch(`/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        tasksState = data.tasks;
        updateMetrics();
        renderTasks();

        if (data.backup && data.backup.success) {
          showToast('Task deleted & S3 backup updated', 'info');
        } else {
          showToast('Task deleted', 'info');
        }
      }
    } catch (err) {
      showToast('Failed to delete task', 'warning');
    }
  };

  // Trigger Manual Backup
  triggerBackupBtn.addEventListener('click', async () => {
    triggerBackupBtn.disabled = true;
    triggerBackupBtn.textContent = 'Syncing...';

    try {
      const res = await fetch('/backup', { method: 'POST' });
      const data = await res.json();

      if (data.success && data.result.success) {
        showToast(`S3 Backup Success: ${data.result.key}`, 'success');
      } else {
        showToast(`Backup: ${data.result.message || 'Saved locally'}`, 'warning');
      }
    } catch (err) {
      showToast('Manual backup request failed', 'warning');
    } finally {
      triggerBackupBtn.disabled = false;
      triggerBackupBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        Manual S3 Backup
      `;
    }
  });

  // Filter Tabs Event Listeners
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  // Helper: Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Initialize
  fetchTasks();
  fetchHealth();
  setInterval(fetchHealth, 10000);
});
