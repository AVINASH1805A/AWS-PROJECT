# AWS Lambda: Nightly Task Cleanup & EventBridge Trigger

This serverless function automatically purges completed tasks from the Amazon DynamoDB table (`BranchFlowTasks`) every night at midnight.

---

## 1. Quick AWS Console Deployment Guide

### Step 1: Create the Lambda Function
1. In the **AWS Management Console**, navigate to **AWS Lambda**.
2. Make sure your region is **Sydney (`ap-southeast-2`)**.
3. Click **Create function**.
4. Configure:
   - **Function name**: `BranchFlowNightlyCleanup`
   - **Runtime**: `Node.js 20.x` (or `Node.js 18.x`)
   - **Architecture**: `x86_64`
5. Click **Create function**.

### Step 2: Paste the Function Code
1. In the **Code source** editor, open `index.mjs` (or `index.js`).
2. Replace all code with the contents of `lambda/index.js`.
3. Click **Deploy**.

### Step 3: Grant DynamoDB Permissions to the Lambda Execution Role
1. Click on the **Configuration** tab -> **Permissions**.
2. Click on the **Role name** link (opens AWS IAM Console).
3. Click **Add permissions** -> **Attach policies**.
4. Search for and attach:
   - `AmazonDynamoDBFullAccess` (or custom policy with `dynamodb:Scan`, `dynamodb:DeleteItem` on `arn:aws:dynamodb:ap-southeast-2:*:table/BranchFlowTasks`).
   - `CloudWatchLogsFullAccess` (or standard basic execution).

### Step 4: Schedule Nightly Execution with Amazon EventBridge
1. In Lambda console, click **Add trigger**.
2. Select **EventBridge (CloudWatch Events)**.
3. Choose **Create a new rule**.
4. Rule name: `BranchFlowMidnightSchedule`
5. Rule type: **Schedule expression**
6. Schedule expression: `cron(0 0 * * ? *)` (Midnight UTC every day)
7. Click **Add**.

---

## 2. On-Demand Testing
You can test this function anytime:
- From the **AWS Lambda Console** -> click the **Test** tab -> Click **Test**.
- Or directly from the **BranchFlow web UI** using the **"⚡ Trigger Nightly Lambda Cleanup"** action button!
