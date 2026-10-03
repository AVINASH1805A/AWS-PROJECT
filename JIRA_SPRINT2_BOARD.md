# Jira Sprint 2 Board Setup & Agile Release Governance

## Project Title
**An Agile-Governed Automated Release Pipeline for Dev-to-Production Deployment of a Cloud Web Application on AWS EC2**

---

## 🎯 Sprint 2 Objective & Scope
The goal of Sprint 2 is to enhance cloud infrastructure governance by introducing **Automated Cloud Backup Storage (AWS S3)**, **Production Health Monitoring & Alerts (AWS CloudWatch & SNS)**, and an **Automated Zero-Downtime Deployment Pipeline (`deploy.sh`)** for multi-environment release governance (`develop` -> `main`).

---

## 📊 Sprint 2 User Stories & Backlog

| Story ID | User Story Summary | Priority | Points | Status | Environment |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **STORY-201** | *As a Cloud Ops Engineer*, I want automated backups sent to AWS S3 whenever tasks are added or deleted so data persistence is guaranteed in the cloud. | **High** | 5 | **Done** | Dev & Prod |
| **STORY-202** | *As a DevOps Lead*, I want a standardized shell script (`deploy.sh`) to automate branch deployment on EC2 so human deployment errors are eliminated. | **High** | 3 | **Done** | Dev & Prod |
| **STORY-203** | *As a System Administrator*, I want an AWS CloudWatch Alarm tracking EC2 CPU utilization (>70%) with SNS Email alerts so performance bottlenecks are detected proactively. | **High** | 5 | **Done** | Prod EC2 |
| **STORY-204** | *As a Product Owner*, I want an environment indicator (`DEV` vs `PROD`) and system diagnostics UI component so release status is visually transparent to team members. | **Medium** | 2 | **Done** | Frontend |
| **STORY-205** | *As a Security Analyst*, I want EC2 instances to use IAM Roles (`EC2-S3-Access`) instead of hardcoded API access keys for secure AWS resource access. | **High** | 3 | **Done** | AWS IAM |
| **STORY-206** | *As a Database Administrator*, I want real-time task records synchronized to an AWS DynamoDB NoSQL table (`BranchFlowTasks`) for managed cloud persistence. | **High** | 5 | **Done** | AWS DynamoDB |
| **STORY-207** | *As a Cloud Security Engineer*, I want application environment variables loaded from AWS SSM Parameter Store for centralized configuration management. | **Medium** | 3 | **Done** | AWS SSM |
| **STORY-208** | *As a Cloud Ops Engineer*, I want an AWS Lambda serverless function triggered by EventBridge to automatically purge completed tasks nightly from DynamoDB. | **High** | 5 | **Done** | AWS Lambda |

---

## 📑 Detailed Acceptance Criteria (AC)

### STORY-201: AWS S3 Cloud Backup Integration
- **AC 1.1**: The Express backend must invoke `backupToS3()` asynchronously whenever a task is created, updated, or deleted.
- **AC 1.2**: Backup files must be timestamped and stored under the `backups/` prefix (e.g., `s3://branchflow-backups-avinash24/backups/tasks-1724650000000.json`).
- **AC 1.3**: The UI must display toast notifications confirming S3 backup status.
- **AC 1.4**: If AWS credentials/S3 bucket are unavailable, the application must fall back to local disk storage (`data/tasks.json`) without crashing.

### STORY-202: Automated Shell Release Script (`deploy.sh`)
- **AC 2.1**: Script accepts target branch parameter (`develop` or `main`).
- **AC 2.2**: Script executes `git fetch`, `git checkout`, `npm install`, stops existing process via `pkill`, and starts process with `nohup`.
- **AC 2.3**: Every deployment appends a timestamped log line to `deploy.log`.

### STORY-203: AWS CloudWatch CPU Monitoring & Alerts
- **AC 3.1**: CloudWatch Alarm `prod-server-high-cpu` configured for `CPUUtilization > 70%` over 5 minutes.
- **AC 3.2**: SNS Topic `ec2-alert-topic` sends email notification upon Alarm state trigger.

---

## 🔄 Agile Board Workflow Columns

```
+----------------+     +-----------------+     +-----------------+     +-----------------+     +-----------------+
|   1. TO DO     | --> | 2. IN PROGRESS  | --> | 3. CODE REVIEW  | --> |  4. DEV TEST    | --> | 5. PROD RELEASE |
|  (Backlog)     |     | (Active Dev)    |     | (GitHub PR)     |     |  (Dev EC2)      |     |  (Prod EC2)     |
+----------------+     +-----------------+     +-----------------+     +-----------------+     +-----------------+
```

### Definition of Ready (DoR)
1. Story has clear user value statement and story points estimated.
2. Acceptance criteria defined and agreed upon by team.
3. Dependencies (AWS S3 bucket name, IAM role) identified.

### Definition of Done (DoD)
1. Code committed and merged into target branch (`develop` or `main`).
2. Automated deployment executed via `./deploy.sh`.
3. S3 backup verified in AWS Console or via `/backups` endpoint.
4. Server health endpoint `/health` returning status `UP`.
5. Jira story moved to **Done**.
