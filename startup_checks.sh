#!/bin/bash
# Startup Health Checks and System Dependencies Installation
# This script runs BEFORE the application starts

echo "=========================================="
echo "PracticePal Startup Health Checks"
echo "=========================================="
echo ""

# Function to log with timestamp
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1"
}

# Test 1: Check and Install FFmpeg
log_info "Checking FFmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -1)
    log_success "FFmpeg is installed: $FFMPEG_VERSION"
else
    log_error "FFmpeg NOT found. Installing now..."
    apt-get update -qq > /dev/null 2>&1
    apt-get install -y -qq ffmpeg libavcodec-extra > /dev/null 2>&1
    
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version | head -1)
        log_success "FFmpeg installed successfully: $FFMPEG_VERSION"
    else
        log_error "CRITICAL: Failed to install FFmpeg. Audio processing will fail!"
        exit 1
    fi
fi

# Test 2: Check Python dependencies
log_info "Checking Python dependencies..."
REQUIRED_PACKAGES="PyPDF2 docx groq reportlab pydantic fastapi"
for package in $REQUIRED_PACKAGES; do
    python3 -c "import ${package}" 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "Python package '$package' is available"
    else
        log_error "Python package '$package' is MISSING!"
    fi
done

# Test 3: Check MongoDB connection
log_info "Checking MongoDB connection..."
python3 -c "
from pymongo import MongoClient
import os
try:
    client = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'), serverSelectionTimeoutMS=5000)
    client.server_info()
    print('[SUCCESS] MongoDB connection OK')
except Exception as e:
    print(f'[ERROR] MongoDB connection FAILED: {e}')
" 2>&1 | grep -E "SUCCESS|ERROR" | while read line; do
    if echo "$line" | grep -q "SUCCESS"; then
        log_success "MongoDB is reachable"
    else
        log_error "$line"
    fi
done

# Test 4: Check Groq API Key
log_info "Checking Groq API Key..."
if [ -n "$GROQ_API_KEY" ]; then
    KEY_PREFIX=$(echo "$GROQ_API_KEY" | cut -c1-8)
    log_success "Groq API Key is set (${KEY_PREFIX}...)"
else
    log_error "Groq API Key is NOT set! AI features will fail!"
fi

# Test 5: Check disk space
log_info "Checking disk space..."
DISK_USAGE=$(df -h /app | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    log_success "Disk space OK (${DISK_USAGE}% used)"
else
    log_error "Low disk space: ${DISK_USAGE}% used!"
fi

# Test 6: Create temp directory for audio processing
log_info "Setting up temp directory..."
mkdir -p /tmp/interview_audio
chmod 777 /tmp/interview_audio
log_success "Temp directory ready: /tmp/interview_audio"

echo ""
echo "=========================================="
echo "Startup Health Checks Complete"
echo "=========================================="
echo ""

exit 0
