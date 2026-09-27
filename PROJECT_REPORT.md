# Project Technical Report

## Title
**An Agile-Governed Automated Release Pipeline for Dev-to-Production Deployment of a Cloud Web Application on AWS EC2**

* **Author**: Avinash Agarwal
* **Repository**: [https://github.com/AVINASH1805A/AWS-PROJECT](https://github.com/AVINASH1805A/AWS-PROJECT)
* **Domain**: Cloud Computing, DevOps, Software Engineering & Agile Release Governance
* **Primary AWS Services**: Amazon EC2, Amazon S3, AWS IAM, Amazon CloudWatch, Amazon SNS
* **Tech Stack**: Node.js, Express, HTML5, CSS3 (Glassmorphic Theme), JavaScript (ES6+), Git, Shell Scripting

---

## Executive Summary
This project presents an enterprise-grade cloud application and automated release deployment pipeline built on Amazon Web Services (AWS). Titled **BranchFlow**, the system combines a modern full-stack web application with automated cloud backup mechanisms (**Amazon S3**), infrastructure health monitoring (**Amazon CloudWatch** & **Amazon SNS**), keyless security authorization (**AWS IAM**), and strict Agile release governance across isolated **Development** and **Production** cloud environments on **Amazon EC2**.

The release workflow adheres to dual-branch Git governance (`develop` and `main`). Deployments to EC2 servers are fully automated using a custom shell script (`deploy.sh`), eliminating manual configuration errors and establishing zero-downtime release practices.

---

## System Architecture

```
                                    +-----------------------------------------+
                                    |         Agile Developer Workstation     |
                                    | (Feature Branch: feature/s3-backup)     |
                                    +-----------------------------------------+
                                                         |
                                                         v
                                           [ Git Push & Merge to develop ]
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |            GitHub Repository            |
                                    |     Branches:  develop   |   main       |
                                    +-----------------------------------------+
                                          |                         |
               ./deploy.sh develop        v                         v       ./deploy.sh main
                          +-----------------------+   +-----------------------+
                          |   Dev EC2 Instance    |   |  Prod EC2 Instance    |
                          |   (Port 3000 / DEV)   |   |  (Port 3000 / PROD)   |
                          +-----------------------+   +-----------------------+
                                      |                           |
                                      |                           | CloudWatch CPU Alarm (>70%)
                                      v                           v
                          +---------------------------------------------------+
                          |                 AWS Cloud Services                |
                          |   - Amazon S3: Backup Storage (Tasks JSON)        |
                          |   - Amazon CloudWatch: CPU Utilization Metrics    |
                          |   - Amazon SNS: Email Alert Notifications         |
                          +---------------------------------------------------+
```

---

## Key Modules & Implementation Details

### 1. Web Application Core & Cloud Backup Engine (`server.js`)
* **Backend Framework**: Node.js with Express framework.
* **API Endpoints**:
  * `GET /tasks`: Retrieves all active tasks and environment metadata.
  * `POST /tasks`: Adds a new task and triggers automated S3 backup.
  * `PUT /tasks/:id`: Updates task completion status or details and syncs to S3.
  * `DELETE /tasks/:id`: Deletes a task and updates S3 backup.
  * `POST /backup`: Manually triggers an instant S3 backup.
  * `GET /backups`: Lists historical backup objects from S3.
  * `GET /health`: Diagnostic endpoint returning OS memory, CPU load, uptime, and S3 connectivity.
* **AWS S3 Backup Engine**:
  * Utilizes `@aws-sdk/client-s3` v3 library.
  * Asynchronously generates timestamped JSON files under `s3://branchflow-backups-avinash24/backups/tasks-<timestamp>.json` upon every state mutation.
  * Features local disk fallback (`data/tasks.json`) if AWS network access is unconfigured.

### 2. Modern Glassmorphic User Interface (`public/`)
* Built with semantic HTML5, CSS design tokens, HSL color palettes, and glassmorphism backdrop filters.
* Displays live metric counters (Total Tasks, In Progress, Completed, S3 Cloud Engine Status).
* Features an environment indicator badge (`DEV` vs `PROD`) auto-detected from server health diagnostics.
* Includes toast notification alerts confirming S3 cloud backup completion.

### 3. Automated Release Deployment Script (`deploy.sh`)
* Executable shell script residing on EC2 instances (`chmod +x deploy.sh`).
* Parameterized execution (`./deploy.sh develop` for Dev, `./deploy.sh main` for Prod).
* Automates:
  1. Git fetch and checkout of target branch.
  2. Dependency installation (`npm install --production`).
  3. Graceful termination of older node processes (`pkill -f`).
  4. Background daemon startup (`nohup node server.js > app.log 2>&1 &`).
  5. Deployment audit logging (`deploy.log`).

### 4. Cloud Infrastructure & Security Governance
* **Amazon EC2**:
  * `dev-server` (Ubuntu 22.04 LTS, `t2.micro`): Dedicated to testing incoming `develop` releases.
  * `prod-server` (Ubuntu 22.04 LTS, `t2.micro`): Dedicated to serving live `main` releases.
* **AWS IAM Role (`EC2-S3-Access`)**:
  * Grants `AmazonS3FullAccess` to EC2 instances using temporary AWS STS credentials, eliminating hardcoded secret access keys.
* **EC2 Security Groups**:
  * Port 22 (SSH): Restricted terminal access.
  * Port 3000 (Custom TCP): Web application access.

### 5. Observability & Infrastructure Monitoring
* **Amazon CloudWatch Alarm (`prod-server-high-cpu-alarm`)**:
  * Monitors `CPUUtilization` metric on `prod-server`.
  * Threshold: Triggered when CPU utilization exceeds 70% over a 5-minute evaluation period.
* **Amazon SNS (`ec2-high-cpu-alert`)**:
  * Sends automated email alerts to system operators upon alarm state transition.

---

## Agile Sprint 2 User Stories & Governance

| Story ID | User Story | Priority | Points | Status |
| :--- | :--- | :---: | :---: | :---: |
| **STORY-201** | **AWS S3 Backup**: Backup task changes to S3 automatically. | High | 5 | **Done** |
| **STORY-202** | **Release Script**: Automate branch deployment on EC2 with `deploy.sh`. | High | 3 | **Done** |
| **STORY-203** | **CloudWatch Monitoring**: Configure CPU >70% alarm with SNS email alerts. | High | 5 | **Done** |
| **STORY-204** | **Environment Diagnostics**: Display DEV vs PROD badge and health statistics in UI. | Medium | 2 | **Done** |
| **STORY-205** | **Keyless IAM Security**: Attach IAM Role `EC2-S3-Access` to EC2 instances. | High | 3 | **Done** |

---

## Verification & Deployment Validation

1. **Local & Git Repository Verification**:
   * Repository initialized and branches `main` & `develop` created.
   * Remote configured and pushed to [https://github.com/AVINASH1805A/AWS-PROJECT.git](https://github.com/AVINASH1805A/AWS-PROJECT.git).
2. **Server Runtime Verification**:
   * Verified backend health diagnostics returning `status: UP` and system memory/uptime.
3. **S3 Backup Verification**:
   * Verified `backupToS3()` function creating structured JSON payloads under `backups/` prefix.

---

## Conclusion
The **BranchFlow** project successfully fulfills all requirements for an Agile-governed cloud release pipeline. By integrating AWS S3 for data persistence, AWS CloudWatch/SNS for proactive monitoring, AWS IAM for keyless security, and shell script automation for EC2 deployments, the system provides a robust, scalable, and secure cloud web application architecture suitable for production deployment.
