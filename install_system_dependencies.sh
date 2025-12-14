#!/bin/bash
# System dependencies installation script for PracticePal
# This script ensures all required system packages are installed

echo "================================"
echo "Installing System Dependencies"
echo "================================"

# Update package list
echo "Updating package lists..."
apt-get update -qq

# Install FFmpeg (required for audio/video processing in mock interviews)
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing FFmpeg..."
    apt-get install -y -qq ffmpeg libavcodec-extra
    echo "✓ FFmpeg installed"
else
    echo "✓ FFmpeg already installed"
fi

# Verify installations
echo ""
echo "Verifying installations:"
echo "------------------------"
ffmpeg -version | head -1
echo ""
echo "✓ All system dependencies installed successfully"
echo "================================"
