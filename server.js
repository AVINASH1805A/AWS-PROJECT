const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'branchflow-backups-avinash24';

// AWS S3 Initialization with graceful fallback
let s3Client = null;
let PutObjectCommand = null;
let ListObjectsV2Command = null;

try {
  const s3Module = require('@aws-sdk/client-s3');
  s3Client = new s3Module.S3Client({ region: AWS_REGION });
  PutObjectCommand = s3Module.PutObjectCommand;
  ListObjectsV2Command = s3Module.ListObjectsV2Command;
  console.log(`[AWS S3] Initialized client for region: ${AWS_REGION}`);
} catch (err) {
  console.warn('[AWS S3] AWS SDK not loaded or S3 client init skipped. Local mode active.', err.message);
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Local file storage persistence setup
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalTasks() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading local tasks file:', err.message);
    }
  }
  // Default starter sample tasks for new installation
  return [
    {
      id: 1724650000000,
      text: 'Configure Dev EC2 Instance and SSH Keys',
      category: 'DevOps',
      priority: 'High',
      completed: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 1724650100000,
      text: 'Setup AWS S3 Backup Bucket and IAM Role Policy',
      category: 'Cloud Storage',
      priority: 'High',
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 1724650200000,
      text: 'Deploy Production Release via Automated Script',
      category: 'Release Pipeline',
      priority: 'Medium',
      completed: false,
      createdAt: new Date().toISOString()
    }
  ];
}

function saveLocalTasks(tasks) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local tasks file:', err.message);
  }
}

let tasks = loadLocalTasks();

// Automated S3 Cloud Backup Function
async function backupToS3() {
  const timestamp = Date.now();
  const backupKey = `backups/tasks-${timestamp}.json`;
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    host: os.hostname(),
    count: tasks.length,
    tasks: tasks
  }, null, 2);

  saveLocalTasks(tasks);

  if (!s3Client || !PutObjectCommand) {
    console.log(`[Local Backup] Saved ${tasks.length} tasks locally. (S3 backup skipped - SDK uninitialized)`);
    return { success: false, mode: 'local', key: backupKey, message: 'Saved locally. S3 SDK uninitialized.' };
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: backupKey,
    Body: payload,
    ContentType: 'application/json'
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`[AWS S3] Backup successfully uploaded to s3://${BUCKET_NAME}/${backupKey}`);
    return { success: true, mode: 's3', bucket: BUCKET_NAME, key: backupKey, timestamp };
  } catch (err) {
    console.error(`[AWS S3 Backup Warning] S3 upload failed (${err.message}). Local copy preserved.`);
    return { success: false, mode: 'local_fallback', error: err.message, key: backupKey };
  }
}

// REST API Endpoints

// 1. GET /tasks - Fetch all tasks
app.get('/tasks', (req, res) => {
  res.json({
    success: true,
    environment: NODE_ENV,
    hostname: os.hostname(),
    bucket: BUCKET_NAME,
    count: tasks.length,
    tasks: tasks
  });
});

// 2. POST /tasks - Create a new task
app.post('/tasks', async (req, res) => {
  const { text, category, priority } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ success: false, error: 'Task text is required' });
  }

  const newTask = {
    id: Date.now(),
    text: text.trim(),
    category: category || 'General',
    priority: priority || 'Medium',
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  const backupResult = await backupToS3();

  res.status(201).json({
    success: true,
    message: 'Task added successfully',
    task: newTask,
    backup: backupResult,
    tasks: tasks
  });
});

// 3. PUT /tasks/:id - Update or toggle task completion
app.put('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (req.body.completed !== undefined) {
    tasks[taskIndex].completed = Boolean(req.body.completed);
  }
  if (req.body.text !== undefined) {
    tasks[taskIndex].text = req.body.text.trim();
  }
  if (req.body.category !== undefined) {
    tasks[taskIndex].category = req.body.category;
  }
  if (req.body.priority !== undefined) {
    tasks[taskIndex].priority = req.body.priority;
  }

  const backupResult = await backupToS3();

  res.json({
    success: true,
    message: 'Task updated successfully',
    task: tasks[taskIndex],
    backup: backupResult,
    tasks: tasks
  });
});

// 4. DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== taskId);

  if (tasks.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const backupResult = await backupToS3();

  res.json({
    success: true,
    message: 'Task deleted successfully',
    backup: backupResult,
    tasks: tasks
  });
});

// 5. POST /backup - Manual trigger S3 backup
app.post('/backup', async (req, res) => {
  const backupResult = await backupToS3();
  res.json({
    success: true,
    result: backupResult
  });
});

// 6. GET /backups - List S3 backups
app.get('/backups', async (req, res) => {
  if (!s3Client || !ListObjectsV2Command) {
    return res.json({
      success: false,
      message: 'S3 Client not configured on server',
      backups: []
    });
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'backups/'
    });
    const response = await s3Client.send(command);
    const backups = (response.Contents || []).map(obj => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size
    }));

    res.json({
      success: true,
      bucket: BUCKET_NAME,
      count: backups.length,
      backups: backups
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      bucket: BUCKET_NAME,
      backups: []
    });
  }
});

// 7. GET /health - Server health & environment diagnostic endpoint
app.get('/health', (req, res) => {
  const totalMem = (os.totalmem() / (1024 * 1024)).toFixed(2);
  const freeMem = (os.freemem() / (1024 * 1024)).toFixed(2);
  const cpuLoad = os.loadavg();

  res.json({
    status: 'UP',
    app: 'BranchFlow Task Manager',
    environment: NODE_ENV,
    hostname: os.hostname(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        totalMB: `${totalMem} MB`,
        freeMB: `${freeMem} MB`
      },
      loadAvg: cpuLoad
    },
    aws: {
      region: AWS_REGION,
      s3Bucket: BUCKET_NAME,
      s3ClientConfigured: Boolean(s3Client)
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 BranchFlow App running on http://localhost:${PORT}`);
  console.log(`📌 Environment: ${NODE_ENV.toUpperCase()}`);
  console.log(`☁️  AWS Region:  ${AWS_REGION}`);
  console.log(`📦 S3 Bucket:   ${BUCKET_NAME}`);
  console.log(`====================================================`);
});
