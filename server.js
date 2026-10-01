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
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'branchflow-backups-avinash24';
const DYNAMO_TABLE = process.env.DYNAMO_TABLE || 'BranchFlowTasks';

// ==============================================================================
// AWS Clients Initialization (S3, DynamoDB, SSM) with Graceful Local Fallback
// ==============================================================================
let s3Client = null;
let PutObjectCommand = null;
let ListObjectsV2Command = null;

let ddocClient = null;
let PutCommand = null;
let ScanCommand = null;
let DeleteCommand = null;

let ssmClient = null;
let GetParametersCommand = null;
let ssmConfigLoaded = false;

try {
  // 1. AWS S3 Module
  const s3Module = require('@aws-sdk/client-s3');
  s3Client = new s3Module.S3Client({ region: AWS_REGION });
  PutObjectCommand = s3Module.PutObjectCommand;
  ListObjectsV2Command = s3Module.ListObjectsV2Command;
  console.log(`[AWS S3] Initialized client for region: ${AWS_REGION}`);
} catch (err) {
  console.warn('[AWS S3] AWS S3 client init skipped. Local fallback active.', err.message);
}

try {
  // 2. AWS DynamoDB Module
  const ddbModule = require('@aws-sdk/client-dynamodb');
  const ddbLibModule = require('@aws-sdk/lib-dynamodb');
  const ddbRawClient = new ddbModule.DynamoDBClient({ region: AWS_REGION });
  ddocClient = ddbLibModule.DynamoDBDocumentClient.from(ddbRawClient);
  PutCommand = ddbLibModule.PutCommand;
  ScanCommand = ddbLibModule.ScanCommand;
  DeleteCommand = ddbLibModule.DeleteCommand;
  console.log(`[AWS DynamoDB] Initialized client for table: ${DYNAMO_TABLE}`);
} catch (err) {
  console.warn('[AWS DynamoDB] DynamoDB client init skipped. Local fallback active.', err.message);
}

try {
  // 3. AWS SSM Parameter Store Module
  const ssmModule = require('@aws-sdk/client-ssm');
  ssmClient = new ssmModule.SSMClient({ region: AWS_REGION });
  GetParametersCommand = ssmModule.GetParametersCommand;
  console.log(`[AWS SSM] Initialized Parameter Store client`);
} catch (err) {
  console.warn('[AWS SSM] SSM client init skipped.', err.message);
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
      text: 'Setup AWS S3 Backup Bucket, DynamoDB Table & SSM Parameters',
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

// Async Cloud Sync Helper (S3 Backup + DynamoDB Persistence)
async function syncToCloud(taskItem = null, isDelete = false) {
  saveLocalTasks(tasks);

  const results = {
    s3: { success: false, mode: 'local' },
    dynamo: { success: false, mode: 'local' }
  };

  // 1. S3 Backup Upload
  if (s3Client && PutObjectCommand) {
    const timestamp = Date.now();
    const backupKey = `backups/tasks-${timestamp}.json`;
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      host: os.hostname(),
      count: tasks.length,
      tasks: tasks
    }, null, 2);

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: backupKey,
        Body: payload,
        ContentType: 'application/json'
      });
      await s3Client.send(command);
      results.s3 = { success: true, mode: 's3', bucket: BUCKET_NAME, key: backupKey };
    } catch (err) {
      results.s3 = { success: false, mode: 'local_fallback', error: err.message };
    }
  }

  // 2. DynamoDB Sync
  if (ddocClient && PutCommand && taskItem) {
    try {
      if (isDelete && DeleteCommand) {
        await ddocClient.send(new DeleteCommand({
          TableName: DYNAMO_TABLE,
          Key: { id: String(taskItem.id) }
        }));
      } else {
        await ddocClient.send(new PutCommand({
          TableName: DYNAMO_TABLE,
          Item: {
            id: String(taskItem.id),
            text: taskItem.text,
            category: taskItem.category,
            priority: taskItem.priority,
            completed: taskItem.completed,
            createdAt: taskItem.createdAt,
            environment: NODE_ENV
          }
        }));
      }
      results.dynamo = { success: true, mode: 'dynamodb', table: DYNAMO_TABLE };
    } catch (err) {
      results.dynamo = { success: false, mode: 'local_fallback', error: err.message };
    }
  }

  return results;
}

// REST API Endpoints

// 1. GET /tasks - Fetch all tasks
app.get('/tasks', (req, res) => {
  res.json({
    success: true,
    environment: NODE_ENV,
    hostname: os.hostname(),
    bucket: BUCKET_NAME,
    dynamoTable: DYNAMO_TABLE,
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
  const cloudResult = await syncToCloud(newTask, false);

  res.status(201).json({
    success: true,
    message: 'Task added successfully',
    task: newTask,
    cloud: cloudResult,
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

  const cloudResult = await syncToCloud(tasks[taskIndex], false);

  res.json({
    success: true,
    message: 'Task updated successfully',
    task: tasks[taskIndex],
    cloud: cloudResult,
    tasks: tasks
  });
});

// 4. DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const taskToDelete = tasks.find(t => t.id === taskId);

  if (!taskToDelete) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  tasks = tasks.filter(t => t.id !== taskId);
  const cloudResult = await syncToCloud(taskToDelete, true);

  res.json({
    success: true,
    message: 'Task deleted successfully',
    cloud: cloudResult,
    tasks: tasks
  });
});

// 5. POST /backup - Manual trigger S3 backup
app.post('/backup', async (req, res) => {
  const cloudResult = await syncToCloud();
  res.json({
    success: true,
    result: cloudResult
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

// 7. GET /health - Server health & AWS environment diagnostic endpoint
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
      dynamoTable: DYNAMO_TABLE,
      s3ClientConfigured: Boolean(s3Client),
      dynamoClientConfigured: Boolean(ddocClient),
      ssmClientConfigured: Boolean(ssmClient)
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 BranchFlow App running on http://localhost:${PORT}`);
  console.log(`📌 Environment:   ${NODE_ENV.toUpperCase()}`);
  console.log(`☁️  AWS Region:    ${AWS_REGION}`);
  console.log(`📦 S3 Bucket:     ${BUCKET_NAME}`);
  console.log(`⚡ DynamoDB Table: ${DYNAMO_TABLE}`);
  console.log(`🔐 SSM Parameter:  Active`);
  console.log(`====================================================`);
});
