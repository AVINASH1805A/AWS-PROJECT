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
        const lambdaStatusText = document.getElementById('lambdaStatusText');
        const cognitoStatusText = document.getElementById('cognitoStatusText');

        if (dynamoStatusText) {
          dynamoStatusText.textContent = data.aws.dynamoClientConfigured ? 'DynamoDB Active' : 'DynamoDB Ready';
        }
        if (ssmStatusText) {
          ssmStatusText.textContent = data.aws.ssmClientConfigured ? 'SSM Active' : 'SSM Configured';
        }
        if (lambdaStatusText) {
          lambdaStatusText.textContent = data.aws.lambdaClientConfigured ? 'Lambda Active' : 'Lambda Ready';
        }
        if (cognitoStatusText) {
          cognitoStatusText.textContent = data.aws.cognitoClientConfigured ? 'Cognito Active' : 'Cognito Ready';
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

  // ==============================================================================
  // Amazon Cognito User Authentication Logic
  // ==============================================================================
  const authModal = document.getElementById('authModal');
  const openAuthModalBtn = document.getElementById('openAuthModalBtn');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const userAuthWidget = document.getElementById('userAuthWidget');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const profileChips = document.querySelectorAll('.profile-chip');

  let currentUser = JSON.parse(localStorage.getItem('cognito_user') || 'null');
  let currentToken = localStorage.getItem('cognito_token') || null;

  function renderAuthWidget() {
    if (!userAuthWidget) return;

    if (currentUser) {
      const initial = (currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase();
      userAuthWidget.innerHTML = `
        <div class="user-profile-pill">
          <div class="user-avatar-small">${initial}</div>
          <div class="user-info-text">
            <span class="user-name">${escapeHtml(currentUser.fullName || currentUser.username)}</span>
            <span class="user-role-badge">${escapeHtml(currentUser.role || 'DevOps Engineer')}</span>
          </div>
          <button class="btn-logout" id="logoutBtn" title="Sign Out from Cognito">Sign Out</button>
        </div>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
      }
    } else {
      userAuthWidget.innerHTML = `
        <button class="btn btn-auth" id="openAuthModalBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Sign In (Cognito)</span>
        </button>
      `;
      const btn = document.getElementById('openAuthModalBtn');
      if (btn) {
        btn.addEventListener('click', () => authModal.classList.remove('hidden'));
      }
    }
  }

  // Open & Close Modal
  if (openAuthModalBtn) {
    openAuthModalBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
  }
  if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
  }

  // Tab switching
  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener('click', () => {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      signInForm.classList.remove('hidden');
      signUpForm.classList.add('hidden');
    });

    tabSignUp.addEventListener('click', () => {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      signUpForm.classList.remove('hidden');
      signInForm.classList.add('hidden');
    });
  }

  // Quick Sign In Profile Chips
  profileChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const username = chip.dataset.user;
      await performLogin(username, 'AwsProject@2026');
    });
  });

  // Handle Sign In Submit
  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('authUsername').value;
      const password = document.getElementById('authPassword').value;
      await performLogin(username, password);
    });
  }

  // Handle Sign Up Submit
  if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('newUsername').value;
      const email = document.getElementById('newEmail').value;
      const role = document.getElementById('newRole').value;
      const password = document.getElementById('newPassword').value;

      try {
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, role, password })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Account registered in Amazon Cognito User Pool!`, 'success');
          await performLogin(username, password);
        } else {
          showToast(data.error || 'Registration failed', 'warning');
        }
      } catch (err) {
        showToast('Cognito sign up service unavailable', 'warning');
      }
    });
  }

  async function performLogin(username, password) {
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        currentToken = data.token;
        localStorage.setItem('cognito_user', JSON.stringify(currentUser));
        localStorage.setItem('cognito_token', currentToken);
        renderAuthWidget();
        authModal.classList.add('hidden');
        showToast(`Authenticated via Amazon Cognito as ${currentUser.fullName} (${currentUser.role})`, 'success');
      } else {
        showToast(data.error || 'Authentication failed', 'warning');
      }
    } catch (err) {
      showToast('Cognito service error during login', 'warning');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
    } catch (_) {}
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('cognito_user');
    localStorage.removeItem('cognito_token');
    renderAuthWidget();
    showToast('Signed out from Amazon Cognito session', 'info');
  }

  // ==============================================================================
  // AWS Lambda Nightly Cleanup Invocation Logic
  // ==============================================================================
  const triggerLambdaBtn = document.getElementById('triggerLambdaBtn');
  const lambdaModal = document.getElementById('lambdaModal');
  const closeLambdaModalBtn = document.getElementById('closeLambdaModalBtn');
  const closeLambdaModalBtn2 = document.getElementById('closeLambdaModalBtn2');
  const lambdaMetricsSummary = document.getElementById('lambdaMetricsSummary');

  if (closeLambdaModalBtn) closeLambdaModalBtn.addEventListener('click', () => lambdaModal.classList.add('hidden'));
  if (closeLambdaModalBtn2) closeLambdaModalBtn2.addEventListener('click', () => lambdaModal.classList.add('hidden'));

  if (triggerLambdaBtn) {
    triggerLambdaBtn.addEventListener('click', async () => {
      triggerLambdaBtn.disabled = true;
      triggerLambdaBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
        </svg>
        Invoking Lambda...
      `;

      try {
        const res = await fetch('/lambda/cleanup', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
          tasksState = data.tasks || [];
          updateMetrics();
          renderTasks();

          // Render Telemetry inside Lambda Modal
          const t = data.telemetry || {};
          lambdaMetricsSummary.innerHTML = `
            <div class="telemetry-item">
              <span class="telemetry-label">Purged Tasks</span>
              <span class="telemetry-val" style="color: #ea580c;">${data.deletedCount} Tasks</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Execution Time</span>
              <span class="telemetry-val">${t.executionDurationMs || 42} ms</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Billed Duration</span>
              <span class="telemetry-val">${t.billedDurationMs || 100} ms</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Memory Allocated</span>
              <span class="telemetry-val">${t.memorySizeMB || 128} MB</span>
            </div>
            <div class="telemetry-item full-width">
              <span class="telemetry-label">Lambda Function ARN</span>
              <span class="telemetry-val">${escapeHtml(t.functionArn || 'arn:aws:lambda:ap-southeast-2:123456789012:function:BranchFlowNightlyCleanup')}</span>
            </div>
            <div class="telemetry-item full-width">
              <span class="telemetry-label">Invocation Request ID</span>
              <span class="telemetry-val">${escapeHtml(t.requestId || 'lambda-request-id')}</span>
            </div>
          `;

          lambdaModal.classList.remove('hidden');
          showToast(`⚡ AWS Lambda executed: ${data.deletedCount} completed tasks purged from DynamoDB & S3`, 'success');
        } else {
          showToast('Lambda invocation failed', 'warning');
        }
      } catch (err) {
        showToast('Error invoking AWS Lambda cleanup endpoint', 'warning');
      } finally {
        triggerLambdaBtn.disabled = false;
        triggerLambdaBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          ⚡ Run Lambda Nightly Cleanup
        `;
      }
    });
  }

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
  renderAuthWidget();
  fetchTasks();
  fetchHealth();
  setInterval(fetchHealth, 10000);
});
