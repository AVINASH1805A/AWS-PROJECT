#!/bin/bash
# ==============================================================================
# BranchFlow Automated Release Deployment Script for AWS EC2 Instances
# Usage: ./deploy.sh [develop|main]
# ==============================================================================

TARGET_BRANCH=${1:-main}
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOG_FILE="${APP_DIR}/deploy.log"

echo "===================================================="
echo "🚀 Starting Automated Deployment Pipeline..."
echo "📅 Timestamp: $(date)"
echo "🌿 Target Branch: ${TARGET_BRANCH}"
echo "📁 Application Directory: ${APP_DIR}"
echo "===================================================="

cd "${APP_DIR}" || { echo "❌ Failed to change directory to ${APP_DIR}"; exit 1; }

# Fetch latest changes from remote
echo "📥 Fetching latest changes from git..."
git fetch origin

# Checkout target branch
echo "🔀 Switching to branch: ${TARGET_BRANCH}"
git checkout "${TARGET_BRANCH}" || git checkout -b "${TARGET_BRANCH}" "origin/${TARGET_BRANCH}"

# Pull latest code
echo "⬇️  Pulling updates..."
git pull origin "${TARGET_BRANCH}"

# Install / update npm dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# Gracefully terminate previous server process if running
echo "🔄 Stopping existing process (if running)..."
pkill -f "node server.js" || true
sleep 1

# Export Environment based on branch
if [ "${TARGET_BRANCH}" = "develop" ]; then
    export NODE_ENV="development"
    export PORT=3000
else
    export NODE_ENV="production"
    export PORT=3000
fi

# Launch app in background
echo "🚀 Launching BranchFlow Node server..."
nohup node server.js > app.log 2>&1 &

# Log deployment timestamp
echo "[$(date)] SUCCESS: Deployed branch '${TARGET_BRANCH}' in ${NODE_ENV} mode." >> "${LOG_FILE}"

echo "===================================================="
echo "✅ Deployment complete! Branch '${TARGET_BRANCH}' is live."
echo "📝 Deployment logged to: ${LOG_FILE}"
echo "===================================================="
