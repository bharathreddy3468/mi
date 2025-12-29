# Here are your Instructions

## Overview

PracticePal is an AI-powered mock interview platform. It consists of:

- **backend**: FastAPI service exposing REST APIs for interview setup, dynamic questions, audio transcription (Groq Whisper), scoring, and PDF reports.
- **frontend**: React (CRACO) single-page app that talks to the backend via REST.

You can run everything locally (recommended for development) or inside a containerized environment (see `SYSTEM_DEPENDENCIES.md` and `startup_checks.sh` for more details).

---

## 1. Prerequisites

- **Operating system**: Linux, macOS, or Windows (WSL recommended for Linux tooling).
- **Python**: 3.10+ (for the backend).
- **Node.js**: 18+ and **Yarn 1.x** (for the frontend; see `package.json` `packageManager`).
- **MongoDB**: running locally or accessible via connection string.
- **FFmpeg**: required for audio processing.

### 1.1. Backend Python dependencies

Located in `backend/requirements.txt`.

Install into a virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # On Windows: .venv\\Scripts\\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 1.2. Frontend dependencies

Located in `frontend/package.json`.

```bash
cd frontend
yarn install
```

### 1.3. System dependencies (FFmpeg, etc.)

- See `SYSTEM_DEPENDENCIES.md` and `startup_checks.sh` for details.
- On Ubuntu/Debian systems you can install FFmpeg with:

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

On Windows, install FFmpeg via official builds and ensure `ffmpeg` is on your `PATH`.

---

## 2. Environment configuration

The backend expects a `.env` file in the `backend` directory. Environment variables are loaded via `dotenv` in `backend/server.py`.

Create `backend/.env`:

```bash
cd backend
cp .env.example .env  # if available, otherwise create .env manually
```

Ensure it contains at least the following variables (adjust values as needed):

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=practicepal
GROQ_API_KEY=your_groq_api_key_here

# Optional: comma-separated list of allowed origins for CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

> **Security**: Never commit real `GROQ_API_KEY` or production database credentials to git. Use environment-specific `.env` files or secret managers.

### 2.1. Frontend environment

The React app reads the backend URL from an environment variable:

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
```

In Create React App/CRACO this is usually set in a `.env` file inside `frontend`:

```bash
cd frontend
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
```

---

## 3. Running the backend (FastAPI)

From the `backend` directory, after activating your virtual environment and setting up `.env`:

```bash
cd backend
source .venv/bin/activate          # Windows: .venv\\Scripts\\activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

This will start the FastAPI app with:

- Root health/info endpoint: `GET /api/` (see `@api_router.get("/")`).
- Interview setup, question flow, audio upload, feedback, and report endpoints under `/api/interview/...`.

You should see logs indicating that the server is running and connected to MongoDB.

### 3.1. Verifying backend locally

- Open: `http://localhost:8000/api/` — should return a JSON message like `{"message": "PracticePal API - AI Mock Interview Platform"}`.
- Open FastAPI docs (if enabled): `http://localhost:8000/docs`.

If you see MongoDB-related errors, confirm `MONGO_URL` and `DB_NAME` are correct and that MongoDB is reachable.

---

## 4. Running the frontend (React)

From the `frontend` directory, after installing dependencies and creating `.env`:

```bash
cd frontend
yarn start
```

By default this should start the development server on `http://localhost:3000`.

Make sure `REACT_APP_BACKEND_URL` points to the backend you started (e.g. `http://localhost:8000`). The frontend uses this value to build `API` URLs in `src/App.js`.

### 4.1. Building for production

```bash
cd frontend
yarn build
```

This produces an optimized production build in `frontend/build` which you can serve via any static file server or integrate into a container image.

---

## 5. Optional: Startup health checks

The script `startup_checks.sh` is designed to run before the application starts in a container or deployment environment. It:

- **Checks and installs FFmpeg** if missing.
- **Verifies Python packages** critical for audio and PDF processing.
- **Checks MongoDB connectivity** using `MONGO_URL`.
- **Validates Groq API key presence** (`GROQ_API_KEY`).
- **Ensures disk space** is sufficient.

You can run it manually on Linux-like systems:

```bash
bash startup_checks.sh
```

This is primarily useful in CI/CD or containerized deployments.

---

## 6. Development workflow and best practices

- **Use virtual environments** for the backend to avoid dependency conflicts.
- **Keep secrets out of git**: store API keys and DB credentials only in `.env` files or secret stores.
- **Run linting and tests** regularly (backend includes tools like `black`, `flake8`, `mypy`, `pytest` in `requirements.txt`). Example:

  ```bash
  cd backend
  pytest
  ```

- **Watch logs** when developing audio features:
  - Backend logs indicate FFmpeg/transcription issues.
  - Ensure `ffmpeg` is installed and on `PATH`.

- **CORS configuration**: in production, set `CORS_ORIGINS` to the actual frontend origins instead of `*`.
- **MongoDB indices & sizing**: as data grows, consider adding indices and monitoring collection size for `interview_setups`, `interview_sessions`, and `interview_feedback`.

---

## 7. Common issues & troubleshooting

- **Backend cannot connect to MongoDB**
  - Check `MONGO_URL` and that MongoDB is running.
  - Verify network/firewall rules if using a remote instance.

- **Audio upload but no transcript / feedback**
  - Ensure FFmpeg is installed (`ffmpeg -version`).
  - Check backend logs for `Audio conversion error` or `Transcription API failed` messages.
  - Confirm `GROQ_API_KEY` is valid and has sufficient quota.

- **Frontend cannot reach backend**
  - Confirm `REACT_APP_BACKEND_URL` matches the backend URL (including port and protocol).
  - Check browser console/network tab for CORS errors and adjust `CORS_ORIGINS` in backend `.env`.

---

## 8. Folder structure (high level)

```text
mi/
  backend/
    server.py          # FastAPI app (main entrypoint)
    requirements.txt   # Python dependencies
    .env               # Backend configuration (not committed)

  frontend/
    src/App.js         # Main React app (interview UI)
    package.json       # Frontend dependencies and scripts
    .env               # Frontend configuration (REACT_APP_BACKEND_URL)

  startup_checks.sh    # Optional startup health checks for deployments
  SYSTEM_DEPENDENCIES.md
  README.md            # This file

---

## 9. Running with Docker (example setup)

> **Note**: No Dockerfile or docker-compose file is currently present in this repo. The commands below show a **recommended pattern** once you add a Docker setup. Adjust image names, ports, and file paths to match your actual configuration.

### 9.1. Single container image

If you create a single Docker image that bundles the backend (FastAPI) and serves the built frontend, a typical `Dockerfile` would:

- Install system dependencies (FFmpeg, etc.).
- Install Python dependencies from `backend/requirements.txt`.
- Install Node/Yarn dependencies, build the React app, and serve static files.
- Copy `startup_checks.sh` and run it in the entrypoint or `CMD` before starting the app.

Example build/run flow (once you have a `Dockerfile` at repo root):

```bash
docker build -t practicepal:latest .

docker run \
  --name practicepal \
  -p 8000:8000 \
  -e MONGO_URL="mongodb://host.docker.internal:27017" \
  -e DB_NAME="practicepal" \
  -e GROQ_API_KEY="your_groq_api_key_here" \
  -e CORS_ORIGINS="http://localhost:3000,http://localhost:8000" \
  practicepal:latest
```

In this setup:

- The backend FastAPI app still listens on port `8000` inside the container.
- The frontend can either be:
  - Served as static files by the same container (e.g. via `uvicorn`+`StaticFiles` or `nginx`), **or**
  - Run separately (see next section).

### 9.2. Docker Compose with separate services

If you prefer separate containers for backend, frontend, and MongoDB, a typical `docker-compose.yml` would define at least:

- `backend`: builds from `backend/` (or root), runs `uvicorn server:app --host 0.0.0.0 --port 8000`.
- `frontend`: builds from `frontend/`, runs `yarn start` or serves a production build.
- `mongo`: official `mongo` image.

Once you have `docker-compose.yml` in place, a common workflow is:

```bash
docker compose build
docker compose up
```

Make sure to:

- Expose backend port `8000` and map it to the host.
- Configure the frontend container with `REACT_APP_BACKEND_URL` pointing to the backend service name (e.g. `http://backend:8000`).
- Pass `MONGO_URL`, `DB_NAME`, `GROQ_API_KEY`, and `CORS_ORIGINS` via `environment` in the compose file.

### 9.3. Using `startup_checks.sh` in Docker

When you have a Docker setup, integrate `startup_checks.sh` into your container entrypoint so that FFmpeg, Mongo connectivity, and Groq key presence are validated at startup.

Example (inside your Dockerfile):

```dockerfile
COPY startup_checks.sh /app/startup_checks.sh
RUN chmod +x /app/startup_checks.sh

ENTRYPOINT ["/bin/bash", "-c", "/app/startup_checks.sh && uvicorn server:app --host 0.0.0.0 --port 8000"]
```

Adjust paths and commands to match how you structure your final Docker image.
