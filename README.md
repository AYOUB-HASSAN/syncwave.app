# SyncWave

**Synchronized listening and watching, together.**

SyncWave is a real-time, local-network media synchronization application. It allows a group of people to watch a video on a main screen (the "Host") while each person listens to the audio perfectly synchronized on their own personal device (the "Guests") using their own headphones. 

It solves the classic problem of watching a movie together in a noisy environment or late at night without disturbing others.

## ✨ Key Features

*   **🖥️ Standalone Desktop App:** Get the fully packaged SyncWave Windows executable for the easiest hosting experience. No terminal commands required!
*   **🎬 Video on Host, Audio on Guests:** The host device displays the video and plays audio. Guest devices connecting to the room automatically extract and play *only the audio*, perfectly synced with the host's video. 
*   **⚡ Sub-second LAN Sync:** Custom synchronization algorithm designed specifically for Local Area Networks. It intelligently nudges playback speed to keep all devices within milliseconds of the host without jarring skips or relying on out-of-sync system clocks.
*   **📁 Local File Uploads:** No need to host your media on the cloud. The host can upload any local video or audio file (up to 4GB) which is instantly served to all guests over the local network.
*   **📱 Frictionless QR Joining:** Guests can join simply by scanning the host's on-screen QR code. No complicated network configuration required.
*   **💬 In-Room Chat:** Built-in chat allows listeners to communicate without pausing the media.
*   **🎵 Universal Format Support:** Supports any media format your browser can play, including MP4, WebM, MKV, MP3, WAV, and more.

## 🚀 How it Works (The Core Use Case)

1.  **The Host** (e.g., a laptop connected to a TV) launches the SyncWave Desktop App and creates a room. 
2.  The Host selects a video file from their computer using the "Pick File" button.
3.  **The Guests** connect to the same Wi-Fi network and scan the QR code on the TV screen using their phones to instantly join the room.
4.  The Host presses play. The video plays on the TV, and the audio streams directly into the headphones of every guest, perfectly in sync.

## 🛠 Tech Stack

*   **Desktop App:** Electron
*   **Frontend:** React, Vite
*   **Backend:** Node.js, Express
*   **Real-time Communication:** Socket.io
*   **File Handling:** Multer (for local LAN file serving)

## 📦 Setup & Installation (For Developers)

If you want to run SyncWave from source or modify the code:

### 1. Start the Backend
Navigate to the `backend` directory, install dependencies, and start the server:
```bash
cd backend
npm install
npm start
```
*Note: Ensure your firewall allows traffic on port 3001.*

### 2. Start the Frontend
Navigate to the `frontend` directory, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

### 3. Build the Desktop App
Navigate to the `desktop-app` directory to package the Windows executable:
```bash
cd desktop-app
npm install
npm run build
```
The executable will be generated in `desktop-app/release/`.

## 🤝 Contributing
Contributions are always welcome! Please see the `CONTRIBUTING.md` file for more details.

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.
