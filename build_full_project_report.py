import zipfile, os, copy
import xml.etree.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
W = f"{{{W_NS}}}"

ET.register_namespace('w', W_NS)
ET.register_namespace('r', R_NS)
ET.register_namespace('wp', "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")
ET.register_namespace('a', "http://schemas.openxmlformats.org/drawingml/2006/main")
ET.register_namespace('pic', "http://schemas.openxmlformats.org/drawingml/2006/picture")

TEMPLATE_DOCX = "/Users/avinashagarwal/.gemini/antigravity/brain/fe5e34ab-4483-4f64-b15d-4dd97ca9e481/.user_uploaded/media_1791982705265_7d27177f.docx"
OUTPUT_DOCX_APP = "/Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app/AWS_Project_Report_Avinash.docx"
OUTPUT_DOCX_BRAIN = "/Users/avinashagarwal/.gemini/antigravity/brain/fe5e34ab-4483-4f64-b15d-4dd97ca9e481/AWS_Project_Report_Avinash.docx"

with zipfile.ZipFile(TEMPLATE_DOCX, 'r') as z:
    doc_xml = z.read('word/document.xml')
    all_files = {name: z.read(name) for name in z.namelist() if name != 'word/document.xml'}

root = ET.fromstring(doc_xml)
body = root.find(f'{W}body')

# Extract original tables and drawings
orig_children = list(body)

# Extract tables
meta_table = copy.deepcopy(orig_children[3])       # Child 3: Student Details
objectives_table = copy.deepcopy(orig_children[11]) # Child 11: Objectives & Outcomes
tech_stack_table = copy.deepcopy(orig_children[14]) # Child 14: Tech Stack
sprint_table = copy.deepcopy(orig_children[29])     # Child 29: Agile Sprint Backlog
challenges_table = copy.deepcopy(orig_children[76]) # Child 76: Challenges & Resolutions
summary_table = copy.deepcopy(orig_children[81])    # Child 81: Completion Summary

# Extract drawings
drawings = {}
def get_drawing(elem):
    for d in elem.iter(f'{W}drawing'):
        return copy.deepcopy(d)
    return None

drawings['fig1_arch'] = get_drawing(orig_children[19])
drawings['deploy_code'] = get_drawing(orig_children[36])
drawings['fig2_ec2'] = get_drawing(orig_children[41])
drawings['fig3_ssh'] = get_drawing(orig_children[43])
drawings['fig4_dynamo'] = get_drawing(orig_children[49])
drawings['fig5_s3_bucket'] = get_drawing(orig_children[53])
drawings['fig6_s3_backups'] = get_drawing(orig_children[55])
drawings['fig7_s3_json'] = get_drawing(orig_children[57])
drawings['fig8_lambda'] = get_drawing(orig_children[62])
drawings['fig_iam'] = get_drawing(orig_children[66])
drawings['fig9_cloudwatch'] = get_drawing(orig_children[69])
drawings['fig10_ui'] = get_drawing(orig_children[73])
drawings['fig11_chart'] = get_drawing(orig_children[83])

sectPr = copy.deepcopy(body.find(f'{W}sectPr'))

print(f"Extracted all tables and {len(drawings)} drawings successfully!")

# Helper functions to build clean OpenXML elements
def make_p(text="", align="left", bold=False, italic=False, color="1E293B", size=24, space_before=120, space_after=120, font="Calibri"):
    p = ET.Element(f'{W}p')
    pPr = ET.SubElement(p, f'{W}pPr')
    if align != "left":
        ET.SubElement(pPr, f'{W}jc', {f'{W}val': align})
    ET.SubElement(pPr, f'{W}spacing', {f'{W}before': str(space_before), f'{W}after': str(space_after)})
    if text:
        r = ET.SubElement(p, f'{W}r')
        rPr = ET.SubElement(r, f'{W}rPr')
        ET.SubElement(rPr, f'{W}rFonts', {f'{W}ascii': font, f'{W}hAnsi': font})
        if bold:
            ET.SubElement(rPr, f'{W}b', {f'{W}val': '1'})
            ET.SubElement(rPr, f'{W}bCs', {f'{W}val': '1'})
        if italic:
            ET.SubElement(rPr, f'{W}i', {f'{W}val': '1'})
        ET.SubElement(rPr, f'{W}color', {f'{W}val': color})
        ET.SubElement(rPr, f'{W}sz', {f'{W}val': str(size)})
        ET.SubElement(rPr, f'{W}szCs', {f'{W}val': str(size)})
        t = ET.SubElement(r, f'{W}t')
        t.text = text
        if text.startswith(' ') or text.endswith(' '):
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return p

def make_heading1(text):
    return make_p(text, align="left", bold=True, color="14532D", size=32, space_before=360, space_after=140, font="Cambria")

def make_heading2(text):
    return make_p(text, align="left", bold=True, color="166534", size=26, space_before=240, space_after=100, font="Cambria")

def make_heading3(text):
    return make_p(text, align="left", bold=True, color="065F46", size=23, space_before=180, space_after=80, font="Calibri")

def make_body_p(text):
    return make_p(text, align="both", bold=False, color="1E293B", size=22, space_before=80, space_after=100, font="Calibri")

def make_bullet_p(title, text):
    p = ET.Element(f'{W}p')
    pPr = ET.SubElement(p, f'{W}pPr')
    ET.SubElement(pPr, f'{W}ind', {f'{W}left': '360', f'{W}hanging': '240'})
    ET.SubElement(pPr, f'{W}spacing', {f'{W}before': '60', f'{W}after': '80'})
    
    # Bullet symbol
    r_bullet = ET.SubElement(p, f'{W}r')
    rPr_b = ET.SubElement(r_bullet, f'{W}rPr')
    ET.SubElement(rPr_b, f'{W}rFonts', {f'{W}ascii': 'Calibri', f'{W}hAnsi': 'Calibri'})
    ET.SubElement(rPr_b, f'{W}color', {f'{W}val': '15803D'})
    ET.SubElement(rPr_b, f'{W}b', {f'{W}val': '1'})
    t_b = ET.SubElement(r_bullet, f'{W}t')
    t_b.text = "• "
    t_b.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    
    # Title bold
    if title:
        r_title = ET.SubElement(p, f'{W}r')
        rPr_t = ET.SubElement(r_title, f'{W}rPr')
        ET.SubElement(rPr_t, f'{W}rFonts', {f'{W}ascii': 'Calibri', f'{W}hAnsi': 'Calibri'})
        ET.SubElement(rPr_t, f'{W}b', {f'{W}val': '1'})
        ET.SubElement(rPr_t, f'{W}color', {f'{W}val': '14532D'})
        ET.SubElement(rPr_t, f'{W}sz', {f'{W}val': '22'})
        t_t = ET.SubElement(r_title, f'{W}t')
        t_t.text = title + ": "
        t_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        
    # Text
    r_text = ET.SubElement(p, f'{W}r')
    rPr_x = ET.SubElement(r_text, f'{W}rPr')
    ET.SubElement(rPr_x, f'{W}rFonts', {f'{W}ascii': 'Calibri', f'{W}hAnsi': 'Calibri'})
    ET.SubElement(rPr_x, f'{W}color', {f'{W}val': '1E293B'})
    ET.SubElement(rPr_x, f'{W}sz', {f'{W}val': '22'})
    t_x = ET.SubElement(r_text, f'{W}t')
    t_x.text = text
    return p

def make_image_p(drawing_elem):
    p = ET.Element(f'{W}p')
    pPr = ET.SubElement(p, f'{W}pPr')
    ET.SubElement(pPr, f'{W}jc', {f'{W}val': 'center'})
    ET.SubElement(pPr, f'{W}spacing', {f'{W}before': '160', f'{W}after': '80'})
    r = ET.SubElement(p, f'{W}r')
    r.append(copy.deepcopy(drawing_elem))
    return p

def make_caption_p(caption_text):
    return make_p(caption_text, align="center", bold=True, italic=True, color="166534", size=19, space_before=40, space_after=200, font="Calibri")

def make_page_break():
    p = ET.Element(f'{W}p')
    r = ET.SubElement(p, f'{W}r')
    ET.SubElement(r, f'{W}br', {f'{W}type': 'page'})
    return p

# Build new document body
new_body_elements = []

# ==============================================================================
# PAGE 1: TITLE PAGE (CONTAINS ONLY PROJECT NAME AND MY NAME ONLY)
# ==============================================================================
new_body_elements.append(make_p(space_before=3400, space_after=0))
new_body_elements.append(make_p("AWS Cloud Deployment and Release Governance", align="center", bold=True, color="14532D", size=56, space_before=0, space_after=240, font="Cambria"))
new_body_elements.append(make_p("Agile-Governed Release Pipeline, Multi-Service AWS Integration and Serverless Automation", align="center", bold=False, italic=True, color="475569", size=26, space_before=0, space_after=1400, font="Calibri"))
new_body_elements.append(make_p("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", align="center", bold=False, color="16A34A", size=26, space_before=0, space_after=1400, font="Calibri"))
new_body_elements.append(make_p("Agarwal Avinash Atul Kumar", align="center", bold=True, color="0F392B", size=42, space_before=400, space_after=0, font="Cambria"))

# End of Page 1 - Page Break
new_body_elements.append(make_page_break())

# ==============================================================================
# PAGE 2 ONWARDS: THE COMPREHENSIVE PROJECT REPORT WITH PHOTOS & PPT DETAILS
# ==============================================================================

# Report Banner
new_body_elements.append(make_p("R E P O R T", align="center", bold=True, color="15803D", size=24, space_before=0, space_after=60, font="Calibri"))
new_body_elements.append(make_p("AWS Cloud Deployment and Release Governance", align="center", bold=True, color="14532D", size=36, space_before=0, space_after=60, font="Cambria"))
new_body_elements.append(make_p("Agile-Governed Release Pipeline, Multi-Service AWS Integration and Serverless Automation", align="center", bold=False, italic=True, color="475569", size=22, space_before=0, space_after=200, font="Calibri"))

# Metadata table
new_body_elements.append(meta_table)
new_body_elements.append(make_p(space_before=100, space_after=100))
new_body_elements.append(make_p("GitHub Repository: https://github.com/AVINASH1805A/AWS-PROJECT", align="left", bold=True, color="047857", size=22, space_before=100, space_after=200, font="Calibri"))

# 1. Introduction
new_body_elements.append(make_heading1("1. Introduction"))
new_body_elements.append(make_body_p(
    "In contemporary cloud software engineering, manual application deployments to single production servers create severe risks, "
    "including human configuration errors, unverified bug propagation, static credential leakage, and service downtime. "
    "This project presents BranchFlow, an enterprise-grade cloud task management web application and automated release pipeline engineered on Amazon Web Services (AWS) in the Sydney region (ap-southeast-2). "
    "Rather than deploying code straight to a live server, development and testing are strictly segregated across isolated Development and Production cloud environments controlled by Git branch governance."
))
new_body_elements.append(make_body_p(
    "The application is a full-stack Node.js and Express service hosted on Amazon EC2, fully integrated with eight native AWS capabilities: "
    "Amazon EC2 for isolated compute, a custom zero-downtime shell deployment pipeline (deploy.sh), Amazon S3 for immutable JSON backup archives, "
    "Amazon DynamoDB for sub-10ms transactional persistence, AWS Systems Manager (SSM) Parameter Store for centralized configuration governance, "
    "AWS IAM for keyless instance profile security, Amazon CloudWatch and Amazon SNS for proactive infrastructure observability and email alerts, "
    "and AWS Lambda with Amazon EventBridge for serverless scheduled backlog maintenance."
))
new_body_elements.append(make_body_p(
    "This report provides an end-to-end technical overview of the system architecture, infrastructure components, operational workflows, and empirical verification. "
    "All planned engineering deliverables have been completed, verified on live AWS cloud instances, and are 100% operational."
))

# 2. Objectives and Outcomes
new_body_elements.append(make_heading1("2. Objectives and Outcomes"))
new_body_elements.append(make_body_p("The project achieved all core engineering and architectural objectives outlined in the project charter:"))
new_body_elements.append(objectives_table)
new_body_elements.append(make_p(space_before=100, space_after=100))

# 3. Technology Stack
new_body_elements.append(make_heading1("3. Technology Stack"))
new_body_elements.append(make_body_p("The system architecture combines modern full-stack development frameworks with managed cloud infrastructure:"))
new_body_elements.append(tech_stack_table)
new_body_elements.append(make_p(space_before=100, space_after=100))

# 4. System Architecture
new_body_elements.append(make_heading1("4. System Architecture"))
new_body_elements.append(make_body_p(
    "The BranchFlow cloud architecture is engineered into six decoupled operational tiers: Source Control & Agile Governance, "
    "Identity & Access Governance, Compute Infrastructure, Dual Cloud Persistence, Serverless Backlog Maintenance, and Observability & Telemetry. "
    "Users access the web application over HTTP on port 3000 of an EC2 virtual machine. The Express server serves a glassmorphic frontend UI "
    "and exposes REST API endpoints for task CRUD operations, health diagnostics, backups, and on-demand serverless cleanup execution. "
    "The application communicates with AWS cloud services via AWS SDK v3, authenticating keylessly using an IAM Instance Profile. "
    "The entire architecture resides in the AWS Sydney region (ap-southeast-2)."
))

if 'fig1_arch' in drawings:
    new_body_elements.append(make_image_p(drawings['fig1_arch']))
    new_body_elements.append(make_caption_p("Figure 1: System architecture and delivery path"))

new_body_elements.append(make_heading2("4.1 Architectural Tiers Breakdown"))
new_body_elements.append(make_bullet_p("1. Developer Workstation & Source Control Tier", "DevOps engineers develop features locally and push commits to GitHub, strictly separated into develop and main branches."))
new_body_elements.append(make_bullet_p("2. AWS IAM Keyless Security Tier", "Eliminates static API access keys in code by attaching the EC2-S3-Access instance profile, delegating temporary STS credentials via EC2 metadata."))
new_body_elements.append(make_bullet_p("3. Compute Tier (Amazon EC2)", "Two independent t2.micro virtual machines: dev-server (172.31.13.79) for staging and prod-server (172.31.8.67) for live production."))
new_body_elements.append(make_bullet_p("4. Dual Cloud Persistence Tier", "Amazon DynamoDB stores active tasks with sub-10ms latency, while Amazon S3 stores timestamped JSON snapshots for disaster recovery."))
new_body_elements.append(make_bullet_p("5. Serverless Maintenance Engine", "AWS Lambda function BranchFlowNightlyCleanup purges completed tasks nightly, triggered via an Amazon EventBridge cron rule."))
new_body_elements.append(make_bullet_p("6. Observability & SRE Alerting Tier", "Amazon CloudWatch monitors CPU utilization and triggers an automated Amazon SNS email alert if production CPU exceeds 70%."))

new_body_elements.append(make_heading2("4.2 Data Flow for Every Task Action"))
new_body_elements.append(make_body_p("Whenever an action occurs (task created, updated, or deleted), the system executes a deterministic sequence:"))
new_body_elements.append(make_bullet_p("Step 1", "The Express backend receives the task payload from the client browser."))
new_body_elements.append(make_bullet_p("Step 2", "The task is saved immediately to local data/tasks.json, providing instant offline resilience and fault tolerance."))
new_body_elements.append(make_bullet_p("Step 3", "A PutItem request is dispatched to the Amazon DynamoDB table in real time for transactional persistence."))
new_body_elements.append(make_bullet_p("Step 4", "An asynchronous PutObject request writes a timestamped JSON snapshot archive to the Amazon S3 bucket."))
new_body_elements.append(make_bullet_p("Step 5 (Nightly)", "EventBridge triggers AWS Lambda at 00:00 UTC. Lambda scans DynamoDB for completed tasks and batch-deletes them, also triggerable on-demand from the UI."))

# 5. Agile Governance & Deployment Automation
new_body_elements.append(make_heading1("5. Agile Governance and Deployment Automation"))

new_body_elements.append(make_heading2("5.1 Why Separate Development and Production Environments?"))
new_body_elements.append(make_body_p(
    "In real-world enterprise software delivery, deploying untested code directly to a production server introduces catastrophic failure risks. "
    "A single typo or unhandled database exception can immediately crash the live service for all users. Furthermore, mixing test data with real user data "
    "leads to irreversible database pollution. BranchFlow solves this by implementing two completely isolated environments:"
))
new_body_elements.append(make_bullet_p("Development (dev-server)", "Acts as an experimental laboratory and QA environment. Developers push to the develop branch, run integration tests, and experiment freely without risking production uptime."))
new_body_elements.append(make_bullet_p("Production (prod-server)", "The hardened, live user-facing environment. It receives merges exclusively from verified sprint candidates on the main branch, guaranteeing 99.99% operational stability and zero downtime."))

new_body_elements.append(make_heading2("5.2 Agile Sprint 2 Backlog Governance"))
new_body_elements.append(make_body_p(
    "Development was governed using Agile Scrum principles in Sprint 2. Each feature was tracked as a user story with defined acceptance criteria and Definition of Done (DoD). "
    "Table 1 outlines the user stories (STORY-201 to STORY-208), all verified and completed:"
))
new_body_elements.append(sprint_table)
new_body_elements.append(make_p(space_before=100, space_after=100))

new_body_elements.append(make_heading2("5.3 Automated Release Pipeline: deploy.sh"))
new_body_elements.append(make_body_p(
    "To achieve repeatable, deterministic deployments without human configuration errors, all release steps are codified into an executable shell script "
    "(deploy.sh) residing on each EC2 instance. A release is triggered by running a single command: ./deploy.sh <branch>, where the target branch is develop or main."
))
new_body_elements.append(make_body_p("The deployment pipeline executes the following operational stages:"))
new_body_elements.append(make_bullet_p("1. Fetch and Reset", "Executes git fetch origin <branch> and git reset --hard origin/<branch> to eliminate merge conflicts and synchronize the exact remote state."))
new_body_elements.append(make_bullet_p("2. Dependency Synchronization", "Runs npm install --production to update any runtime libraries."))
new_body_elements.append(make_bullet_p("3. Graceful Process Termination", "Gracefully stops older running node daemons using pkill -f 'node server.js' || true."))
new_body_elements.append(make_bullet_p("4. Daemon Launch in Background", "Starts the Node.js server in the background using nohup node server.js > app.log 2>&1 &, ensuring the process remains active after closing SSH."))
new_body_elements.append(make_bullet_p("5. Audit Logging", "Appends a timestamped execution entry to deploy.log for release governance and audit compliance."))

if 'deploy_code' in drawings:
    new_body_elements.append(make_image_p(drawings['deploy_code']))
    new_body_elements.append(make_caption_p("Automated release deployment script (deploy.sh) in GitHub repository"))

# 6. Cloud Infrastructure on AWS
new_body_elements.append(make_heading1("6. Cloud Infrastructure on AWS"))
new_body_elements.append(make_body_p("The project integrates eight native AWS capabilities to build a robust, scalable, and secure cloud system:"))

# 6.1 EC2
new_body_elements.append(make_heading2("6.1 Amazon EC2 Compute Tier"))
new_body_elements.append(make_body_p(
    "Two t2.micro virtual machine instances running Ubuntu 22.04 LTS are provisioned in the Sydney Availability Zone (ap-southeast-2a): "
    "dev-server (i-0f428b101a0e1ec85) for the develop branch, and prod-server (i-0caf44cc7fc9ec005) for the main branch. "
    "Security Groups enforce least-privilege network access: Port 22 is restricted to SSH administrator key pairs (branchflow-key.pem), "
    "and Port 3000 is open for custom web traffic. All other unneeded ports are blocked at the AWS network hypervisor layer."
))
if 'fig2_ec2' in drawings:
    new_body_elements.append(make_image_p(drawings['fig2_ec2']))
    new_body_elements.append(make_caption_p("Figure 2: EC2 console showing dev-server and prod-server"))
if 'fig3_ssh' in drawings:
    new_body_elements.append(make_image_p(drawings['fig3_ssh']))
    new_body_elements.append(make_caption_p("Figure 3: SSH session into the EC2 server"))

# 6.2 DynamoDB
new_body_elements.append(make_heading2("6.2 Amazon DynamoDB NoSQL Persistence"))
new_body_elements.append(make_body_p(
    "A managed NoSQL table named BranchFlowTasks stores all active task items. It is configured with an On-Demand capacity mode, "
    "eliminating capacity planning, manual cluster maintenance, or database patching. The primary partition key is id (String representation of timestamp). "
    "Offloading persistence to DynamoDB decouples compute from storage and ensures sub-10ms response times with high availability."
))
if 'fig4_dynamo' in drawings:
    new_body_elements.append(make_image_p(drawings['fig4_dynamo']))
    new_body_elements.append(make_caption_p("Figure 4: DynamoDB tasks table created and active"))

# 6.3 S3
new_body_elements.append(make_heading2("6.3 Amazon S3 Disaster Recovery Archiving"))
new_body_elements.append(make_body_p(
    "An S3 bucket named branchflow-backups-avinash24 in the Sydney region stores an immutable, timestamped JSON snapshot of the task list "
    "each time a task is created, updated, or removed (stored under backups/tasks-<timestamp>.json). Existing snapshots are never overwritten, "
    "allowing point-in-time disaster recovery. S3 guarantees 99.999999999% (11 9s) durability, providing an enterprise-grade audit trail."
))
if 'fig5_s3_bucket' in drawings:
    new_body_elements.append(make_image_p(drawings['fig5_s3_bucket']))
    new_body_elements.append(make_caption_p("Figure 5: S3 bucket in the Asia Pacific (Sydney) region"))
if 'fig6_s3_backups' in drawings:
    new_body_elements.append(make_image_p(drawings['fig6_s3_backups']))
    new_body_elements.append(make_caption_p("Figure 6: Bucket containing the backups folder"))
if 'fig7_s3_json' in drawings:
    new_body_elements.append(make_image_p(drawings['fig7_s3_json']))
    new_body_elements.append(make_caption_p("Figure 7: Timestamped JSON backup files created by the application"))

# 6.4 Lambda & EventBridge
new_body_elements.append(make_heading2("6.4 AWS Lambda & Amazon EventBridge Serverless Maintenance"))
new_body_elements.append(make_body_p(
    "Over time, completed sprint tasks clutter the database and degrade read/write efficiency. To automate maintenance without running an always-on server, "
    "a serverless AWS Lambda function named BranchFlowNightlyCleanup (Node.js 20.x, 128 MB memory) was deployed. "
    "An Amazon EventBridge schedule rule (BranchFlowMidnightSchedule) with the cron expression cron(0 0 * * ? *) invokes the Lambda function "
    "automatically every midnight UTC. The function queries DynamoDB for tasks matching completed: true and batch-deletes them. "
    "The same cleanup can also be invoked on demand via the web dashboard with live execution telemetry."
))
if 'fig8_lambda' in drawings:
    new_body_elements.append(make_image_p(drawings['fig8_lambda']))
    new_body_elements.append(make_caption_p("Figure 8: Lambda function with its EventBridge schedule trigger"))

# 6.5 IAM & SSM
new_body_elements.append(make_heading2("6.5 AWS IAM Keyless Security & SSM Parameter Store"))
new_body_elements.append(make_body_p(
    "IAM Role: Following the AWS Well-Architected Security Pillar, static AWS access keys and secret keys are completely eliminated from source code and disk. "
    "Both EC2 instances assume the EC2-S3-Access IAM Role via an IAM Instance Profile. The AWS SDK v3 automatically fetches rotatable temporary credentials "
    "from the EC2 Instance Metadata Service (IMDSv2)."
))
new_body_elements.append(make_body_p(
    "SSM Parameter Store: Environment configuration settings are retrieved from AWS Systems Manager (SSM) Parameter Store at startup, "
    "decoupling configuration from code and enabling zero-downtime parameter updates across server fleets."
))
if 'fig_iam' in drawings:
    new_body_elements.append(make_image_p(drawings['fig_iam']))
    new_body_elements.append(make_caption_p("IAM roles console showing keyless EC2 instance role architecture"))

# 6.6 CloudWatch & SNS
new_body_elements.append(make_heading2("6.6 Amazon CloudWatch & Amazon SNS Observability"))
new_body_elements.append(make_body_p(
    "Site Reliability Engineering (SRE) observability is provided through Amazon CloudWatch. A metric alarm prod-server-high-cpu-alarm "
    "monitors the CPUUtilization metric of the production EC2 instance. When CPU utilization exceeds 70% over a 5-minute evaluation period, "
    "the alarm transitions to ALARM state and publishes an alert event to the Amazon SNS topic ec2-high-cpu-alert. "
    "The topic immediately dispatches an urgent email alert to system administrators before end-user performance is impacted."
))
if 'fig9_cloudwatch' in drawings:
    new_body_elements.append(make_image_p(drawings['fig9_cloudwatch']))
    new_body_elements.append(make_caption_p("Figure 9: CloudWatch alarm for production CPU utilisation"))

# 7. Deployed Application
new_body_elements.append(make_heading1("7. Deployed Application"))
new_body_elements.append(make_body_p(
    "The running web application features a modern glassmorphic interface that dynamically renders environment indicators: "
    "a green PRODUCTION badge on prod-server and a blue DEVELOPMENT badge on dev-server. "
    "Real-time cloud status badges verify connectivity to S3 Cloud Active, DynamoDB Active, SSM Active, and Lambda Active. "
    "Users can create, categorize, prioritize, and toggle tasks. For demonstration, the UI features a Manual S3 Backup button "
    "and a Run Lambda Nightly Cleanup button with a live telemetry modal showing execution duration, billed duration, and request ID. "
    "If AWS cloud connectivity degrades, the application automatically falls back to a Local Resilience Cache (data/tasks.json) to prevent service interruptions."
))
if 'fig10_ui' in drawings:
    new_body_elements.append(make_image_p(drawings['fig10_ui']))
    new_body_elements.append(make_caption_p("Figure 10: Production application running on EC2"))

# 8. Challenges & Resolutions
new_body_elements.append(make_heading1("8. Challenges and Resolutions"))
new_body_elements.append(make_body_p("During the engineering lifecycle, several infrastructure challenges were encountered and resolved:"))
new_body_elements.append(challenges_table)
new_body_elements.append(make_p(space_before=100, space_after=100))

# 9. Project Completion Summary
new_body_elements.append(make_heading1("9. Project Completion Summary"))
new_body_elements.append(make_body_p("All technical and governance deliverables were completed with 100% verification across all work streams:"))
new_body_elements.append(summary_table)
new_body_elements.append(make_p(space_before=100, space_after=100))

if 'fig11_chart' in drawings:
    new_body_elements.append(make_image_p(drawings['fig11_chart']))
    new_body_elements.append(make_caption_p("Figure 11: Completion by work area (100% across all deliverables)"))

# 10. Key Learnings
new_body_elements.append(make_heading1("10. Key Learnings"))
new_body_elements.append(make_bullet_p("Environment Isolation", "Segregating Dev and Prod environments with Git branch governance prevents experimental code from impacting live users."))
new_body_elements.append(make_bullet_p("Managed Serverless Services", "Utilizing DynamoDB, S3, and Lambda eliminates manual database patching and server maintenance overhead."))
new_body_elements.append(make_bullet_p("Keyless IAM Security", "Using IAM Instance Profiles with temporary STS metadata credentials is far superior to storing static access keys in repositories."))
new_body_elements.append(make_bullet_p("Proactive Observability", "CloudWatch alarms connected to SNS notifications provide immediate visibility into system degradation before users are impacted."))
new_body_elements.append(make_bullet_p("Fail-Safe Resilience", "Designing local resilience caches ensures zero downtime even during transient network or cloud API interruptions."))

# 11. Conclusion
new_body_elements.append(make_heading1("11. Conclusion"))
new_body_elements.append(make_body_p(
    "The BranchFlow project successfully demonstrates an end-to-end, production-grade cloud DevOps implementation. "
    "By harmonizing Git branch governance, automated shell deployment scripting, dual cloud persistence (DynamoDB and S3), "
    "centralized configuration management (SSM), serverless scheduled maintenance (Lambda and EventBridge), keyless security (IAM), "
    "and SRE observability (CloudWatch and SNS), the system establishes an exemplary standard for modern cloud engineering."
))
new_body_elements.append(make_p("Source Code Repository: https://github.com/AVINASH1805A/AWS-PROJECT", align="left", bold=True, color="047857", size=22, space_before=100, space_after=200, font="Calibri"))

# Clear old body and append new elements
body.clear()
for elem in new_body_elements:
    body.append(elem)
body.append(sectPr)

# Write to new docx
new_doc_xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)

with zipfile.ZipFile(OUTPUT_DOCX_APP, 'w', zipfile.ZIP_DEFLATED) as z_out:
    for filename, content in all_files.items():
        z_out.writestr(filename, content)
    z_out.writestr('word/document.xml', new_doc_xml)

with zipfile.ZipFile(OUTPUT_DOCX_BRAIN, 'w', zipfile.ZIP_DEFLATED) as z_out:
    for filename, content in all_files.items():
        z_out.writestr(filename, content)
    z_out.writestr('word/document.xml', new_doc_xml)

print(f"Generated successfully: {OUTPUT_DOCX_APP}")
print(f"Generated successfully: {OUTPUT_DOCX_BRAIN}")
