# System Dependencies - PracticePal

## Required System Packages

This application requires the following system-level dependencies:

### FFmpeg
- **Purpose**: Audio/video processing for mock interview recordings
- **Usage**: Converts WebM recordings to WAV format for Whisper transcription
- **Installation**: Automatically installed via `/entrypoint.sh` on container startup

## Installation

### Automatic Installation
The system dependencies are automatically installed when the container starts via the entrypoint script.

### Manual Installation (if needed)
If you need to manually install dependencies, run:
```bash
bash /app/install_system_dependencies.sh
```

Or install FFmpeg directly:
```bash
apt-get update && apt-get install -y ffmpeg
```

## Verification

To verify FFmpeg is installed:
```bash
ffmpeg -version
which ffmpeg
```

## Troubleshooting

### FFmpeg Not Found
If you encounter "ffmpeg not found" errors:

1. **Check if installed**: `which ffmpeg`
2. **Restart backend**: `sudo supervisorctl restart backend`
3. **Manual install**: Run the installation script above
4. **Container restart**: The entrypoint script will auto-install on next restart

### Audio Transcription Issues
If audio is not being transcribed:
- Verify FFmpeg is installed: `ffmpeg -version`
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Look for "Audio conversion error" messages

## Persistence

**Important**: The entrypoint script (`/entrypoint.sh`) now includes FFmpeg installation checks.
This ensures FFmpeg is available on every container restart, making the fix **permanent**.

## Changes Made

1. ✅ Modified `/entrypoint.sh` to check and install FFmpeg on startup
2. ✅ Created `/app/install_system_dependencies.sh` for manual installation
3. ✅ Added this documentation

**Result**: FFmpeg will be automatically available without manual intervention.
