# BranchFlow | An Agile-Governed Automated Release Pipeline for AWS EC2 & S3

[![AWS Cloud](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20CloudWatch-232F3E?logo=amazon-aws)](https://aws.amazon.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=nodedotjs)](https://nodejs.org/)
[![Agile](https://img.shields.io/badge/Agile-Scrum%20%7C%20Jira-0052CC?logo=jira)](https://www.atlassian.com/software/jira)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Executive Summary
**BranchFlow** is an enterprise-grade cloud application demonstrating an **Agile-Governed Automated Release Pipeline for Dev-to-Production Deployment on AWS EC2**. The project implements cloud data persistence via **Amazon S3**, multi-environment infrastructure monitoring via **Amazon CloudWatch**, and strict Agile release management rules separating Development (`develop`) and Production (`main`) release streams.

---

## 🏗️ Architecture & Release Pipeline Flow

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
                                    |              GitHub Repository          |
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

## 🚀 Quickstart: Running Locally on Mac

### 1. Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

### 2. Installation
```bash
# Clone or navigate to the project directory
cd /Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app

# Install dependencies
npm install

# Start development server
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## ☁️ Step-by-Step AWS Setup & Deployment Guide

### Part 1: Provision EC2 Instances (Dev & Prod)
1. Open **AWS Management Console** → Navigate to **EC2** → Click **Launch Instance**.
2. **Dev Instance**:
   - Name: `dev-server`
   - OS: **Ubuntu 22.04 LTS**
   - Instance Type: **t2.micro** (Free Tier eligible)
   - Key Pair: Create a new key pair named `branchflow-key.pem` and download it.
   - Security Group: Allow **SSH (Port 22)** from your IP, and **Custom TCP (Port 3000)** from Anywhere (`0.0.0.0/0`).
3. **Prod Instance**:
   - Name: `prod-server`
   - Use the exact same AMI, instance type, Security Group, and key pair (`branchflow-key.pem`).
4. **Secure Key Pair on Mac**:
   ```bash
   mv ~/Downloads/branchflow-key.pem ~/.ssh/
   chmod 400 ~/.ssh/branchflow-key.pem
   ```

---

### Part 2: Amazon S3 & IAM Permission Configuration
1. **Create S3 Bucket**:
   - Open AWS Console → **S3** → Click **Create bucket**.
   - Bucket Name: `branchflow-backups-avinash24` (or your unique name).
   - Region: `us-east-1` (or your preferred region).
   - Keep default settings (Block Public Access ON).
2. **Create EC2 IAM Role**:
   - Open AWS Console → **IAM** → **Roles** → **Create Role**.
   - Trusted Entity: **AWS Service** → **EC2**.
   - Attach Policy: `AmazonS3FullAccess`.
   - Role Name: `EC2-S3-Access`.
3. **Attach IAM Role to EC2 Instances**:
   - Go to EC2 Console → Select `dev-server` → **Actions** → **Security** → **Modify IAM Role**.
   - Select `EC2-S3-Access` and click **Update IAM role**.
   - Repeat the exact steps for `prod-server`.

---

### Part 3: Deploy to Dev EC2 Instance
1. **SSH into Dev Server**:
   ```bash
   ssh -i ~/.ssh/branchflow-key.pem ubuntu@<dev-instance-public-ip>
   ```
2. **Install Node.js & Git**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm git
   ```
3. **Clone & Run Initial Deployment**:
   ```bash
   git clone -b develop https://github.com/AVINASH1805A/AWS-PROJECT.git
   cd AWS-PROJECT
   chmod +x deploy.sh
   ./deploy.sh develop
   ```
4. **Verify Dev Deployment**:
   - Visit `http://<dev-instance-public-ip>:3000` in your browser.
   - Add a task in the UI, then check your AWS S3 Bucket to confirm the timestamped backup JSON file was created under `backups/`.

---

### Part 4: Agile Release Promotion (Dev → Prod)
1. **Promote Code locally or on Git remote**:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
2. **SSH into Prod Server & Run Release Script**:
   ```bash
   ssh -i ~/.ssh/branchflow-key.pem ubuntu@<prod-instance-public-ip>
   
   # If cloning for the first time:
   git clone -b main https://github.com/AVINASH1805A/AWS-PROJECT.git
   cd AWS-PROJECT
   chmod +x deploy.sh
   ./deploy.sh main
   ```
3. **Verify Prod Deployment**:
   - Visit `http://<prod-instance-public-ip>:3000` to confirm the production environment badge is `PROD`.

---

### Part 5: Amazon CloudWatch Monitoring & Alerts
1. Open AWS Console → **CloudWatch** → **Alarms** → Click **Create Alarm**.
2. Click **Select Metric** → **EC2** → **Per-Instance Metrics**.
3. Search for `prod-server` and select metric `CPUUtilization`.
4. **Conditions**:
   - Threshold Type: **Static**
   - Whenever CPUUtilization is: **Greater than 70%**
   - Period: **5 minutes**
5. **Notification Action**:
   - Trigger: **In Alarm**
   - Create new SNS Topic: `ec2-high-cpu-alert`
   - Endpoint Email: Enter your email address and click **Create Topic**.
   - Confirm subscription via the email link sent by AWS.
6. Name Alarm: `prod-server-high-cpu-alarm` → Click **Create Alarm**.

---

## 🛠️ REST API Specification

| Method | Endpoint | Description | S3 Action Triggered |
| :--- | :--- | :--- | :---: |
| `GET` | `/tasks` | List all current sprint tasks | None |
| `POST` | `/tasks` | Create a new task item | `PutObjectCommand` |
| `PUT` | `/tasks/:id` | Update task text or toggle status | `PutObjectCommand` |
| `DELETE` | `/tasks/:id` | Delete task by ID | `PutObjectCommand` |
| `POST` | `/backup` | Manually trigger instant S3 backup | `PutObjectCommand` |
| `GET` | `/backups` | List all historical backups in S3 | `ListObjectsV2Command` |
| `GET` | `/health` | Server uptime, memory & environment diagnostic | None |

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
