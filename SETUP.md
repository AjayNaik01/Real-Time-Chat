# Setup & Development Guide
## Real-Time Chat & Protocol Transparency Lab

This guide contains everything required to configure, develop, test, and deploy the Real-Time Chat Lab from scratch.

---

## 1. Prerequisites

Ensure your development environment meets the following baseline requirements:

* **Node.js**: `v20.x` or higher (LTS recommended)
* **npm**: `v10.x` or higher
* **nvm** (Node Version Manager): Recommended for deterministic Node versions.

### Setting Node Version via `nvm`:
From the project root:
```bash
nvm use
# If v20 is not installed yet:
nvm install 20 && nvm use 20
```

---

## 2. Quickstart (Under 60 Seconds)

Clone the repository and run:

```bash
# 1. Install all dependencies across root, client, and server
npm run install:all

# 2. Launch both Backend (port 3001) and Frontend (port 5173) concurrently
npm run dev
```

* **Client UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001) / `ws://localhost:3001`
* **Health Check**: [http://localhost:3001/api/system/health](http://localhost:3001/api/system/health)

---

## 3. Repository Architecture

```
realtime-chat-lab/
├── .nvmrc                   # Pins Node.js v20 LTS
├── .gitignore               # Production-grade git exclusion rules
├── package.json             # Root monorepo orchestration scripts
├── PRD.md                   # Complete Product Requirements & Design Document
├── SETUP.md                 # This setup & development handbook
├── README.md                # Quick product overview & documentation
│
├── client/                  # Frontend Single Page App (React 18 + Vite)
│   ├── public/
│   │   └── favicon.svg      # High-contrast chat badge favicon
│   ├── src/
│   │   ├── components/      # UI Components (Lobby, ChatRoom, AdminPortal, etc.)
│   │   ├── helpers/         # Avatar hash & profile color generators
│   │   ├── hooks/           # useChatMode & useTyping state machines
│   │   ├── services/        # api.js (REST) & websocket.js (Native RFC 6455)
│   │   ├── App.jsx          # Root router, hotkey listener & Error Boundary
│   │   └── index.css        # Tailwind directives & CSS reset
│   ├── vercel.json          # SPA routing rules for Vercel deployment
│   └── package.json
│
└── server/                  # Backend Node.js Server (Express + ws)
    ├── logs/
    │   └── audit.jsonl      # Immutable forensic audit trail
    ├── src/
    │   ├── index.js         # Express app, security middleware & HTTP routes
    │   ├── admin.js         # Admin SOC session manager, telemetry & audit reader
    │   ├── wsHandler.js     # WebSocket connection manager & broadcast bus
    │   ├── store.js         # In-memory bounded ring buffer (100 msgs/room)
    │   ├── auditLogger.js   # Enterprise forensic audit logger (stdout/file/postgres)
    │   ├── rateLimiter.js   # Sliding-window anti-DoS rate limiter
    │   ├── security.js      # OWASP headers & HTML/XSS sanitization
    │   └── captcha.js       # Mathematical CAPTCHA challenge engine
    ├── test/
    │   └── server.test.js   # Automated security, XSS, rate limit & audit suite
    └── package.json
```

---

## 4. Environment Variables

Both client and server come configured with zero-config local defaults (`localhost:3001`).

### Client (`client/.env.local` or Vercel Environment Variables):
```bash
# Production Backend URL (HTTPS)
VITE_API_URL=https://your-backend.onrender.com/api

# Production WebSocket URL (WSS)
VITE_WS_URL=wss://your-backend.onrender.com
```
*(In local development, omit these to default to `http://localhost:3001/api` and `ws://localhost:3001`)*

### Server (`server/.env.local` or Render Environment Variables):
```bash
PORT=3001
NODE_ENV=development

# Hidden Admin Command Center (SOC) Master Password
ADMIN_PASSWORD=admin-secret-2026

# Optional: Persistent Forensic Audit Logging & Compliance
# Option 1: PostgreSQL Persistence (Neon / Supabase / Render Postgres / AWS RDS)
# Automatically creates and populates the `audit_logs` table
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require

# Option 2: Direct SIEM / Datadog / Papertrail Webhook Log Ingestion
AUDIT_WEBHOOK_URL=https://http-intake.logs.datadoghq.com/api/v2/logs?dd-api-key=...
```

---

## 5. Development Workflow & Commands

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `npm run dev` | Project Root | Concurrently runs both backend and client Vite server |
| `npm run install:all` | Project Root | Installs dependencies in both `server/` and `client/` |
| `npm run test:server` | Project Root | Runs the backend automated test suite |
| `npm run build` | `client/` | Compiles Vite client production bundle to `client/dist/` |
| `npm test` | `server/` | Runs standalone backend security & rate limiting tests |

---

## 6. How to Test Two Users Side-by-Side

To experience the real-time protocol comparison and message receipts:

1. Open **Browser Tab 1** at `http://localhost:5173`.
   * Handle: `Alice`
   * Click **Create & Enter Room** (generates a code like `ROOM-482`).
2. Open **Browser Tab 2** (or Incognito Window) at `http://localhost:5173`.
   * Handle: `Bob`
   * Enter room code `ROOM-482` and click **Join Room**.
3. **Observe the WhatsApp-style Receipt Lifecycle**:
   * Type in Alice's tab ➔ Bob sees *"Alice is typing..."*.
   * Alice presses `Enter` ➔ Alice sees single grey tick (`✓` sent).
   * Bob's socket receives message ➔ Alice's tick turns into double grey (`✓✓` delivered).
   * Bob views or focuses the tab ➔ Alice's tick turns into double blue (`✓✓` read) with Bob's avatar!
   * Click the tick on Alice's message to open the **Transparency Audit Drawer**.
4. **Test Developer Lab Mode**:
   * Click **Dev Mode: ON** in the header.
   * Switch Alice to **Short Polling (2s)** or **Manual Fetch**.
   * Watch the **Network Inspector** display live HTTP request counts, bandwidth bytes, and latency.

---

## 7. Testing & Verification

Run the automated verification suite before committing any changes:

```bash
# 1. Run Server Verification Tests
npm run test:server

# Expected output:
# ✅ Test 1 Passed: OWASP Security Headers (nosniff, DENY) verified
# ✅ Test 2 Passed: System Diagnostics & Memory metrics verified
# ✅ Test 3 Passed: Dynamic CAPTCHA challenge generated
# ✅ Test 4 Passed: XSS Sanitization & HTML escaping verified
# ✅ Test 5 Passed: Express 404 handler verified
# ✅ Test 6 Passed: HTTP 429 Too Many Requests rate limiter verified
# ✅ Test 7 Passed: Persistent Audit Logging verified in logs/audit.jsonl
# ✅ Test 8 Passed: Admin SOC authentication, 401 protection, live telemetry, and forensic audit feeds verified
# 🎉 ALL 8 PRODUCTION SECURITY, COMPLIANCE, ADMIN SOC & AUDIT TESTS PASSED!

# 2. Test Client Production Build
cd client && npm run build
# Expected output: ✓ built in ~1.8s with zero TypeScript / lint errors
```

---

## 8. Production Deployment Guide

### Architecture Topology
* **Frontend**: Hosted on **Vercel** (Global Edge CDN, Static SPA).
* **Backend**: Hosted on **Render** (Persistent Node.js container with long-running WebSockets).

### Step 1: Deploy Backend to Render (Free)
1. Sign in to [render.com](https://render.com) using GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your repository.
4. Settings:
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Plan**: `Free`
5. Click **Create Web Service**.
6. Render will assign you a live domain, e.g., `https://realtime-chat-server.onrender.com`.

### Step 2: Deploy Frontend to Vercel
1. Sign in to [vercel.com](https://vercel.com).
2. Click **Add New...** ➔ **Project** and select your repository.
3. Configure settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click *Edit* and select **`client`**
4. Expand **Environment Variables** and add:
   * `VITE_API_URL` = `https://<your-render-app>.onrender.com/api`
   * `VITE_WS_URL` = `wss://<your-render-app>.onrender.com`
5. Click **Deploy**.

---

## 9. Troubleshooting & FAQ

#### Q: WebSocket connection failed: `net::ERR_CONNECTION_REFUSED`
* **Fix**: Ensure the backend server is running on port 3001 (`npm run dev:server`). If using custom ports, verify `VITE_WS_URL` matches your server port.

#### Q: HTTP 429 Too Many Requests (Rate Limit Triggered)
* **Fix**: The server enforces a sliding-window rate limit (120 req/min general, 8 rooms/min). If tripped, solve the on-screen math CAPTCHA puzzle or wait 60 seconds for the window to reset.

#### Q: Messages reset when server restarts
* **Expected Behavior**: To remain lightweight and zero-dependency, the current version uses an in-memory bounded ring buffer (`Map`). Long-term persistence can be enabled via PostgreSQL / Supabase as outlined in `PRD.md` Phase 3.

---

## 10. Hidden Admin Command Center (SOC) & Surveillance Guide

The application includes an invisible, password-protected **Security Operations Center (SOC) & Monitoring Terminal** for developers and platform operators. It is completely concealed from standard users.

### 10.1 How to Access the Admin Portal
You can invoke the command center using either method:
1. **Secret Keyboard Shortcut**: Press `Ctrl + Shift + A` (or `Cmd + Shift + A` on Mac) while on any page.
2. **Hidden URL Parameter**: Append `?admin=true` to your URL (e.g., `http://localhost:5173/?admin=true`) or visit `/admin`.

### 10.2 Default Credentials
* **Master Access Key**: `admin-secret-2026` (configure via `ADMIN_PASSWORD` in `server/.env`).
* Successful authentication generates a cryptographically secure 48-byte hex token stored in browser session storage (`chat_lab_admin_token`) valid for 8 hours.

### 10.3 Monitoring Capabilities
1. **Forensic Audit Log Feed**:
   * Inspect all system actions in reverse chronological order (`ROOM_CREATED`, `MESSAGE_SENT`, `RATE_LIMIT_TRIPPED`, `SECURITY_WARNING`).
   * Search and filter instantly by IP address, user handle, or room ID to trace suspicious or malicious actors.
   * View message ciphertext snippets and SHA-256 integrity checksums directly in log rows.
2. **Server Vitals & Telemetry**:
   * Live resource gauges for Process Uptime, Active WebSockets, RSS Memory, Node.js Heap, and System Platform.
   * Auto-refreshes every 3.5 seconds with pause/resume toggle.
3. **Exit / Return to Chat**:
   * Click **Exit Terminal** (or press `Ctrl + Shift + A` again) to seamlessly return to normal user chat without leaving traces in the history stack.

---

## 11. Public vs. Private Room Security & Password Gates

The application supports both friction-free public rooms and password-locked private rooms.

### 11.1 Features & User Experience
* **Public Room**:
  * Default mode when creating a room.
  * No password field is shown or required.
  * Any user with the Room ID can join directly without prompts.
  * Marked with `🌐 Public Room` badge in the chat header.
* **Private Room**:
  * Creator selects **🔒 Private** toggle under "Option A: Create New Room".
  * Creator must input a strong password (minimum 6 characters).
  * Real-time visual strength meter grades the password:
    * **Too Weak**: < 6 characters (blocks creation with inline warning).
    * **Moderate**: 6-7 characters or basic complexity.
    * **Strong Security**: 8+ characters containing mixed casing, numbers, or symbols.
  * Marked with `🔒 Private Room` badge in the chat header.
* **Joining a Private Room & Deep-Links**:
  * When a peer enters a private room code under "Option B: Join Existing Room" OR opens an invite link (`/?room=ABCDEF`), the client verifies the privacy status with the server.
  * The app prevents direct access and automatically triggers the **Password Required** unlock modal.
  * Users enter their nickname and the room password.
  * Entering the correct password authenticates via `POST /api/rooms/:roomId/verify-password` and unlocks the room.
  * An incorrect password immediately flags an inline warning without exposing room messages or establishing unauthorized socket connections.
* **Logging in as a Different User ("Switch User")**:
  * If a user wishes to switch handles or log in as a different user within a private room, they click the **Switch** action in the header.
  * The Switch User modal requires entering the new nickname and re-verifying the room password.
  * Passwords are never reused or bypassed across different user handles.
  * If a user leaves the room, all password state is cleared from memory, requiring full re-authentication upon re-entry.

### 11.2 Backend Security & Cryptographic Guarantees
* **No Plaintext Storage**: Room passwords are never saved in plaintext.
* **Scrypt Hashing with Random Salt**: The backend generates a 16-byte random salt (`crypto.randomBytes(16)`) and hashes the password using `crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })`.
* **Timing-Safe Verification**: Passwords are compared using `crypto.timingSafeEqual` to neutralize timing side-channel attacks.
* **Cross-Protocol Protection**:
  * **REST Messages**: `GET /api/rooms/:roomId/messages` and `POST /api/rooms/:roomId/messages` require valid `x-room-password` header or body password; unauthenticated requests return `HTTP 401 Unauthorized` (`ERR_ROOM_PASSWORD_REQUIRED`).
  * **WebSocket Connections**: Joining a private room requires `{ action: 'join', roomId, user, password }`. Rejection frame `{ type: 'error', code: 'ERR_INVALID_ROOM_PASSWORD' }` is returned on mismatch.
* **Forensic Audit Logging**: Failed private room unlock attempts are logged as `SECURITY_WARNING` audit events for SOC monitoring.

### 11.3 Automated Verification
Run the 9-part automated security test suite to verify password hashing, access gating, and public room creation:
```bash
npm run test:server
# or
npm test --prefix server
```

