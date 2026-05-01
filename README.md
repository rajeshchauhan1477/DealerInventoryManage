# OmniAuth Record Management System

This is a full-stack application built with React, Express, and SQLite.

## 🚀 Local Setup Instructions

### 1. Prerequisites
- **Node.js**: Version **20.0.0** or higher (Vite 6 requires modern Node.js).
- **npm**: Version 9 or higher.
- **Build Tools** (Optional but recommended): Some native dependencies like `better-sqlite3` may require C++ build tools on your machine.
  - **Windows**: `npm install --global windows-build-tools` (from an elevated PowerShell) or install Visual Studio with "Desktop development with C++".
  - **macOS**: `xcode-select --install`
  - **Linux**: `sudo apt-get install build-essential`

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example`):
```bash
JWT_SECRET=your_secret_key_here
GEMINI_API_KEY=your_optional_gemini_key
```

### 4. Running the App
The application uses a unified server that handles both the API and the frontend.

#### Development Mode
Runs the server with hot-reloading for the frontend:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Mode
Builds the frontend and runs the server in production mode:
```bash
npm run build
npm start
```

## 🛠️ Troubleshooting

### `better-sqlite3` Installation Fails
If `better-sqlite3` fails to install due to missing build tools, you can try installing it with the `--build-from-source` flag or ensure your Node version matches your architecture (x64 vs ARM).

### Port 3000 is Busy
If port 3000 is already in use, you can change the port in `server.ts` (line 299).

### Login Issues
The default admin credentials are:
- **Username**: `admin`
- **PIN**: `123456`

The database file `system.db` will be created automatically in the root folder on the first run.
