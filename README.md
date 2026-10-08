# MusicMix 🎵

A professional, real-time music workstation and central collaborative playlist application. Powered by the **MusicBrainz Web Service API**, with full extraction of Track Name, Artist Name, Duration, Genre, BPM, Song Key (with Camelot Wheel notation), and Release Year.

Features real-time multi-client synchronization across multiple computers via WebSocket, persistent database storage, and a harmonic DJ recommendation engine.

---

## 🚀 Quick Start on Docker Linux Server

MusicMix includes a production-ready `Dockerfile` and `docker-compose.yml`.

### Option 1: Docker Compose (Recommended)

Run the following on your Linux server:

```bash
# 1. Start the container in detached mode
docker compose up -d --build

# 2. Check container logs
docker compose logs -f
```

The app will be running and reachable at:
`http://<YOUR-LINUX-SERVER-IP>:3000`

### Option 2: Docker CLI

```bash
# Build the image
docker build -t musicmix:latest .

# Run container with persistent data volume mounted to host
docker run -d \
  --name musicmix-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  musicmix:latest
```

---

## 👥 Multi-Computer Simultaneous Use & Real-Time Sync

1. Open `http://<YOUR-SERVER-IP>:3000` on **Computer A** (e.g., your laptop).
2. Open `http://<YOUR-SERVER-IP>:3000` on **Computer B** (e.g., another workstation or tablet on your network).
3. Both computers connect to the same server and WebSocket event stream (`/ws`).
4. Whenever any user searches, likes, unlikes, or modifies the central playlist:
   - Changes are saved immediately to `./data/musicmix_db.json`.
   - Updates are instantly broadcast to all connected computers in real time without refreshing!
   - The top banner displays the total number of connected computers and sync status.

---

## 🎛️ Key Features

- **Landing Page**: Atmospheric dark studio aesthetic with an "ENTER THE WEBSITE" button with smooth crossfade into the search console.
- **MusicBrainz Integration**: Search recordings via the MusicBrainz API, extracting:
  - Track Name & Artist Name
  - Duration (formatted `mm:ss`)
  - Genre
  - BPM (Beats Per Minute)
  - Musical Key (Camelot notation e.g., `8A - A Minor`)
  - Release Year
- **Persistent Database**: All searched tracks are automatically recorded into `./data/musicmix_db.json`.
- **Central Playlist Window**: A dedicated view showing all tracks with high information density.
- **Top Right Window**: Clicking any song on the left displays it in the top right sidebar with an animated waveform visualizer, audio specifications, and an in-browser harmonic synthesizer preview.
- **Bottom Right Window (Harmonic Recommendation & Randomizer)**:
  - Filter modes: `[ BPM ]`, `[ KEY ]`, and `[ Genre ]` (multi-selectable checkboxes/toggle buttons).
  - Calculates closest musical distance:
    - **BPM**: Proximity scoring, including half-time and double-time.
    - **KEY**: Harmonic Camelot Wheel compatibility (exact matches, relative majors/minors, adjacent steps, energy boosts).
    - **Genre**: Harmonic family affinities.
  - `[ 🎲 RANDOM ]` button: Performs a true random track selection from the central playlist.
  - "Set as Active Track" button to chain continuous harmonic DJ mixes.

---

## 📁 Persistent Data Storage & Updating Without Data Loss

All songs in the database, central playlist, cover art, and export archives are stored inside `./data`:
- `./data/musicmix_db.json` (Playlist & searched catalog)
- `./data/covers/` (Offline album cover art images)
- `./data/backups/` (Saved database exports)
- `./data/recommendation_history.json` (Harmonic recommendation audit log)

The Docker compose file mounts `./data` as a host volume (`./data:/app/data`), so **all your data persists permanently on your host Linux machine across image rebuilds and container updates**.

### 🔄 How to Update the Website Without Losing Any Data

Whenever you pull code updates or make changes to the app, run these exact commands in your project folder:

```bash
# 1. Stop the current running container (your ./data folder is untouched!)
docker compose down

# 2. Rebuild the Docker image with your latest code changes
docker compose build --no-cache

# 3. Start the updated container in detached mode
docker compose up -d

# 4. Confirm the container is healthy and running
docker compose ps
docker compose logs -f
```

---

## ⚠️ Troubleshooting: "failed to read dockerfile: open Dockerfile: no such file or directory"

If you encounter this error:
`failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory`

This happens when `docker compose` or `docker build` is executed from a directory that does not contain the `Dockerfile`.

**Fix:**
1. Check your current working directory:
   ```bash
   pwd
   ```
2. Verify that `Dockerfile` exists in your current folder:
   ```bash
   ls -la
   ```
   You should see `Dockerfile`, `docker-compose.yml`, `package.json`, and `server.ts`.
3. If you are in a parent folder or user home directory, navigate into the project directory:
   ```bash
   cd /path/to/MusicMix
   ```
4. Then run:
   ```bash
   docker compose up -d --build
   ```
