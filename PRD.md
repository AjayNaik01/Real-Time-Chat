# Product Requirements Document (PRD)
## Real-Time Chat & Protocol Transparency Lab

**Document Version:** 2.0.0 (Comprehensive Engineering & Design Edition)  
**Status:** Approved / Production-Grade  
**Target Environment:** Hybrid Cloud (Vercel Frontend + Render/Railway Backend)  
**Author:** Core Engineering & Product Architecture Team  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
Modern web engineering relies heavily on real-time capabilities (chat, notifications, collaborative canvases, live feeds). However, engineers frequently integrate high-level SDKs without understanding the underlying transport mechanisms (HTTP Request/Response, Polling, WebSockets, Server-Sent Events). Most production chat applications act as black boxes, concealing connection handshakes, payload overheads, delivery receipts, and state synchronizations.

### 1.2 Product Vision
**Real-Time Chat & Protocol Lab** is an interactive, full-stack, production-grade educational chat application engineered to provide **complete protocol transparency**. It allows engineers to compare **Manual HTTP Fetching**, **Short Polling (2-second interval)**, and **Persistent RFC 6455 WebSockets** in real-time, accompanied by WhatsApp/Google Chat-style message receipt ticks, keystroke typing indicators, network telemetry, and enterprise-grade resilience safeguards (rate limiting, math CAPTCHA, and XSS sanitization).

---

## 2. User Personas & Journey Maps

### 2.1 Target Personas

| Persona | Role | Primary Need |
| :--- | :--- | :--- |
| **Full-Stack Developer** | Mid / Senior SWE | Master bi-directional networking, state machines, and socket event cycles |
| **System Architect** | Staff / Principal SWE | Benchmark network payloads, framing overheads, and connection memory profiles |
| **Tech Candidate** | Interviewee | Prepare for system design interviews focusing on WhatsApp/Slack architecture |
| **End User** | Team Member / Guest | Clean, fast, distraction-free chat with reliable read receipts |

### 2.2 Core User Journey
1. **Lobby Onboarding**: User enters handle, selects **Create Room** or **Join Room** via invite code.
2. **Room Entry**: Client mounts chat view, establishes persistent WebSocket connection, joins room channel, and pushes presence signal.
3. **Real-Time Exchange**: Users exchange messages with sub-15ms delivery, observing typing pulses and live status ticks (`✓` sent, `✓✓` delivered, `✓✓` blue seen).
4. **Transparency Inspection**: User toggles **Dev Mode: ON**, switches transport to **Short Polling** or **Manual HTTP**, and inspects live packet counters and latency metrics in the Network Inspector dock.

---

## 3. High-Level Architecture & Topology

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|  React 18 SPA (Vite) + Tailwind CSS + Lucide Icons + Native Browser WebSocket API |
+----------------------------------------+------------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
           HTTPS REST API (/api/*)                 WSS Protocol (RFC 6455)
                       |                                   |
+----------------------v-----------------------------------v------------------------+
|                                  SERVER TIER                                      |
|  Node.js + Express REST API (Port 3001)   |   `ws` Native WebSocket Server Engine |
|                                           |                                       |
|  - OWASP Security Headers (nosniff, DENY) |   - Bi-directional Broadcast Bus      |
|  - Sliding-Window IP Rate Limiter         |   - Heartbeat Ping/Pong (30s timeout) |
|  - Math CAPTCHA Challenge Engine          |   - Ephemeral Typing Throttler        |
|  - XSS Sanitization & HTML Escaping       |   - Delivery & Read Receipt State     |
+-------------------------------------------+---------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                IN-MEMORY DATA STORE                               |
|  - Bounded Message Ring Buffer (Max 100 messages per room)                        |
|  - Active Room Index (Map<roomId, RoomState>)                                     |
|  - Socket Session Registry (Map<WebSocket, SocketMeta>)                           |
+-----------------------------------------------------------------------------------+
```

---

## 4. Comprehensive Design System & UI/UX Specification

### 4.1 Visual Philosophy: Anti-Wireframe & Subtle Dark Depth
* **No Harsh Wireframes**: Avoid solid opaque grey borders (`#2a2f3a`) or loud card outlines.
* **Subtle Alpha Strokes**: Use soft `border-white/[0.08]` and `border-white/[0.06]` on dark surfaces to achieve depth without visual noise.
* **Centered Column Constraint**: All core content (messages, input dock, mode switcher) is centered inside a strict `max-w-3xl mx-auto w-full` container, preventing horizontal stretching on widescreen monitors.

### 4.2 Design Tokens

#### Color Palette
* **Deep Workspace Background**: `#0b0e14`
* **Card & Elevated Surface**: `rgba(15, 18, 22, 0.7)` to `rgba(22, 25, 31, 0.95)` with backdrop blur
* **Subtle Border Tokens**: `rgba(255, 255, 255, 0.08)` (standard) / `rgba(255, 255, 255, 0.05)` (subtle)
* **Brand Primary (Blue)**: `#1a73e8` (hover: `#1557b0`, soft: `rgba(26, 115, 232, 0.12)`)
* **Success / Live (Emerald)**: `#34a853` (soft: `rgba(52, 168, 83, 0.12)`)
* **Warning / Dev Mode (Amber)**: `#fbbc04` (soft: `rgba(251, 188, 4, 0.12)`)
* **Error / Alert (Red)**: `#ea4335` (soft: `rgba(234, 67, 53, 0.12)`)

#### Typography
* **Primary Font Family**: `"Plus Jakarta Sans"`, system-ui, -apple-system, sans-serif.
* **Monospace Font Family**: `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace (used for room codes, timestamps, and packet metrics).
* **Scale**:
  * Headings: `text-xl` to `text-3xl` (`font-bold`, `tracking-tight`)
  * Body Text: `text-sm` (`leading-relaxed`)
  * Captions & Badges: `text-xs` to `text-[10px]` (`font-medium`)

#### Deterministic Profile Color Hashing
User avatar colors are deterministically generated from user handles using string hashing:
```javascript
const PALETTE = [
  { bg: 'bg-blue-500/15', text: 'text-blue-300', ring: 'ring-blue-500/30' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'ring-emerald-500/30' },
  { bg: 'bg-purple-500/15', text: 'text-purple-300', ring: 'ring-purple-500/30' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', ring: 'ring-amber-500/30' },
  { bg: 'bg-rose-500/15', text: 'text-rose-300', ring: 'ring-rose-500/30' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-300', ring: 'ring-cyan-500/30' },
];

export function getProfileColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
```

### 4.3 Viewport Geometry & Mobile Responsiveness
* **Dynamic Viewport Units**: Main view uses `h-[100dvh]` to account for dynamic browser chrome (URL bar and bottom toolbars).
* **Safe Area Insets**: Input dock implements `pb-[max(0.75rem,env(safe-area-inset-bottom))]` for bezel-less iOS Safari devices.
* **Smooth Scrolling**: Chat message container uses `-webkit-overflow-scrolling: touch` and auto-scrolls smoothly to `bottomRef` on arrival of new messages.

### 4.4 Google Chat Message Clustering Algorithm
Consecutive messages from the same sender within 120,000ms (2 minutes) are grouped under a single sender header:
```javascript
const isSameSenderAsPrev =
  prevMsg &&
  prevMsg.sender?.toLowerCase() === msg.sender?.toLowerCase() &&
  msg.timestamp - prevMsg.timestamp < 120000;
```
* **First of Cluster**: Displays avatar, handle, and timestamp header.
* **Subsequent Messages**: Renders bubble only with compact margin (`mt-1`), reducing visual repetition.

---

## 5. Protocol Specification & Comparison Matrix

| Dimension | Mode 1: Manual HTTP | Mode 2: Short Polling | Mode 3: WebSockets (Default) |
| :--- | :--- | :--- | :--- |
| **Transport Protocol** | HTTP/1.1 POST / GET | HTTP/1.1 recurring GET | RFC 6455 Full-Duplex TCP |
| **Fetch Interval** | Manual click on demand | Every 2,000ms | Immediate Push (< 15ms) |
| **Framing Overhead** | ~600–800 bytes per request | ~600–800 bytes every 2s | 2–6 bytes per frame |
| **Server Concurrency Impact** | Negligible (Idle) | High (O(N) HTTP requests) | Low (~25KB RAM per idle socket) |
| **Typing Indicator Support** | Not Supported | Not Feasible | Real-time keystroke push |
| **Receipt Transparency** | Single tick (`✓`) only | Polling-dependent | Instant Blue Double Ticks (`✓✓`) |
| **Connection Lifespan** | Ephemeral | Ephemeral (Keep-Alive) | Persistent bi-directional socket |

---

## 6. Functional Specifications

### 6.1 Room & Identity Management
1. **Room Generation**: 
   * Server generates human-friendly alphanumeric codes (e.g., `ROOM-482`).
   * Custom room ID validation enforces strict regex `/^[A-Za-z0-9-_]{3,20}$/`.
2. **Deep Linking**: 
   * Room codes and handles persist across reloads via URL query parameters (`/?room=ROOM-482&user=Alice`).
   * One-click "Copy Link" action copies the direct invite URL to the system clipboard.
3. **Presence Tracking**:
   * Automatic tracking of active room participants via WebSocket metadata.
   * Real-time online member count and multi-avatar clustering in header.

### 6.2 Message Lifecycle & Read Receipts
Every message strictly transitions through a three-stage state machine:

```
[ Client Types ]
       |
       v (HTTP / WS Send)
  [ Stage 1: Sent ]  -----> Single Grey Tick (✓)
       |
       v (Recipient socket receives frame)
[ Stage 2: Delivered ] ---> Double Grey Tick (✓✓)
       |
       v (Recipient tab is active & focused)
  [ Stage 3: Read ]  -----> Double Blue Tick (✓✓) + Reader Avatars
```

* **Transparency Popover**: Clicking any message status tick exposes a detailed audit drawer:
  * Server receive timestamp (`HH:MM:SS`).
  * Delivered recipients list with individual delivery timestamps.
  * Read/Seen recipients list with individual read timestamps.

### 6.3 WhatsApp-Style Typing Indicators
* **Throttled Dispatch**: Keystrokes are throttled to send at most one `typing: true` frame every 2,000ms.
* **Auto-Decay**: Typing indicators automatically dismiss 3,000ms after the last recorded keystroke or immediately upon message submission.
* **Clustered Rendering**: Supports multiple concurrent typers ("Alice is typing...", "Alice and Bob are typing...").

### 6.4 Developer Lab Mode
* **Mode Toggle**: Accessible via header pill; defaults to **OFF** for a clean consumer experience.
* **Protocol Switcher**: Allows toggling between Manual, 2s Polling, and WebSockets live.
* **Network Inspector**:
  * Collapsible bottom status bar.
  * Live tracking of: Total HTTP Requests, HTTP Bandwidth (KB), WebSocket Frames, WebSocket Bandwidth (KB), and Round-Trip Latency (ms).

---

## 7. Security, Resilience & Error Boundaries

### 7.1 OWASP Security Headers
The Express backend injects strict security headers on all responses:
* `X-Content-Type-Options: nosniff` (Mitigates MIME confusion attacks).
* `X-Frame-Options: DENY` (Clickjacking prevention).
* `X-XSS-Protection: 1; mode=block`.
* `Content-Security-Policy: default-src 'self' ...`

### 7.2 Sliding-Window Rate Limiter & Anti-DoS
* **General API**: 120 requests/minute per client IP.
* **Message Posting**: 60 messages/minute per client IP.
* **Room Creation**: 8 room creations/minute per client IP.
* **Exhaustion Response**: Returns `HTTP 429 Too Many Requests` with standard `Retry-After` headers and triggers a dynamic CAPTCHA challenge.

### 7.3 Mathematical CAPTCHA Challenge Engine
* When rate limits are tripped or suspicious bot traffic is flagged, server generates an ephemeral math challenge (e.g., `What is 14 + 7?`).
* Challenge token expires in 120 seconds.
* Verification unlocks room creation without service denial.

### 7.4 Client-Side Error Boundaries
* Unhandled runtime exceptions are trapped by a top-level React `ErrorBoundary`.
* Consumer-grade error screen: Friendly copy, no technical noise, with `[ Reload Page ]` and `[ Return to Lobby ]` recovery paths.
* Technical diagnostics (stack trace, component stack) are collapsed into an optional discreet toggle.

### 7.5 Enterprise Audit Logging, Traceability & Legal Compliance
To prevent anonymous malicious misuse and ensure compliance with law enforcement subpoenas, SOC2, and data retention mandates, the backend implements an immutable, structured audit logging pipeline (`server/src/auditLogger.js`):
* **Audited Events**: `ROOM_CREATED`, `ROOM_JOINED`, `MESSAGE_SENT`, `MESSAGE_DELIVERED`, `MESSAGE_READ`, `RATE_LIMIT_TRIPPED`, `CAPTCHA_CHALLENGE`, `CAPTCHA_VERIFIED`, `SOCKET_CONNECTED`, `SOCKET_DISCONNECTED`.
* **Captured Forensic Attributes**:
  * Exact UTC ISO-8601 Timestamp.
  * Unique immutable event ID (`audit-timestamp-hex`).
  * Client IP Address (resolved safely through reverse proxy `x-forwarded-for` and `remoteAddress`).
  * User-Agent & TLS Client Fingerprint.
  * User handle, Room ID, and Message ID.
* **Pluggable Multi-Destination Sinks**:
  1. **STDOUT Drain**: Emits structured JSON (`[AUDIT_LOG] {...}`) automatically captured by Papertrail, Datadog Log Forwarders, AWS CloudWatch, and Render Logs.
  2. **Append-Only Disk File**: Writes to `logs/audit.jsonl` for local forensic storage.
  3. **PostgreSQL Persistence**: Automatically creates and appends to an `audit_logs` table if `DATABASE_URL` is set (e.g., Supabase, Neon, AWS RDS, Render Postgres).
  4. **Direct Webhook / SIEM HTTP Ingestion**: Dispatches non-blocking async POST requests if `AUDIT_WEBHOOK_URL` is configured.

### 7.6 Hidden Admin Command Center & Real-Time SOC Surveillance Portal
To allow platform administrators and security engineers to monitor all platform activity, inspect live conversations, review forensic audit streams, and analyze server vitals without public awareness:
* **Zero UI Footprint**: Normal users have zero visible links, buttons, or navigation items leading to the admin portal.
* **Access Gateways**:
  1. **Secret Hotkey**: `Ctrl + Shift + A` (or `Cmd + Shift + A` on macOS) toggles the admin portal gateway from anywhere in the app.
  2. **URL Parameter / Route**: Access via `?admin=true` query param or direct `/admin` path.
* **Authentication & Session Security**:
  * Authenticated via Master Secret Key (`ADMIN_PASSWORD` env var, default fallback `admin-secret-2026`).
  * Generates high-entropy 48-byte hex session tokens (`adm_<hex>`) with an 8-hour TTL.
  * In-memory background garbage collector purges expired tokens every 15 minutes.
  * All `/api/admin/*` endpoints strictly require `x-admin-token` or Bearer Authorization header. Unauthorized calls return `HTTP 401 Unauthorized` with structured error codes.
* **Command Center Capabilities (Streamlined Architecture)**:
  1. **Forensic Audit Log Feed**: Real-time streaming log reader with instant search filter across all security actions, IP addresses, user handles, and room activities. Includes cryptographic cipher snippets and SHA-256 message checksums.
  2. **Server Vitals & Telemetry**: Live gauges for Node.js RSS memory, Heap Total/Used, active WebSocket socket count, total buffered messages, process uptime, and platform architecture with configurable auto-refresh (3.5s interval).
  * *Note*: The interface intentionally avoids redundant conversation eavesdropping tabs ("Active Rooms") to uphold compliance privacy principles, while preserving all low-level telemetry, security audit trails, and server diagnostic endpoints.

### 7.7 Public vs. Private Room Security & Access Control
The application offers granular room authorization modes tailored for open public discussions vs. confidential peer groups:
* **Public Rooms (Default)**:
  * Zero-friction entry: No password prompt is shown. Anyone with the Room ID can join directly across WebSockets, Short Polling, and HTTP.
* **Private Rooms (Strong Password Guarded)**:
  * **Creation Enforcement**: Creators must toggle Private Room mode and supply a strong password (enforced minimum 6 characters; UI features an interactive strength meter: Weak < 6 chars, Moderate 6-7 chars, Strong 8+ chars with letters, numbers, and symbols).
  * **Server-Side Password Hashing**: Passwords are never stored or transmitted in plaintext. The backend hashes room passwords using Node.js native `crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })` with a cryptographically secure random 16-byte salt (`crypto.randomBytes(16)`).
  * **Timing Attack Mitigation**: Password validation uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
  * **Zero Password Leakage**: `GET /api/rooms/:roomId` and admin room overviews expose only `isPrivate: true/false`, never the password hash or salt.
  * **Multi-Protocol Verification & Access Gates**:
    1. **Pre-Flight Verification**: `POST /api/rooms/:roomId/verify-password` validates credentials before joining and returns `{ success: true, verified: true }`.
    2. **Message Gate (REST & Polling)**: `GET /api/rooms/:roomId/messages` and `POST /api/rooms/:roomId/messages` require the correct password passed in the `x-room-password` header or request body. Unauthorized requests are rejected with `HTTP 401 Unauthorized` (`ERR_ROOM_PASSWORD_REQUIRED`).
    3. **WebSocket Join Frame Gate**: WebSocket join messages (`{ action: 'join', roomId, user, password }`) are verified against the room's scrypt hash. Unauthorized frames are immediately rejected with `{ type: 'error', code: 'ERR_INVALID_ROOM_PASSWORD' }` and logged.
  * **Deep-Link & Invitation Protection**: Opening a private room link (`/?room=ABCDEF`) or refreshing without active session does NOT bypass security. The app halts room mounting and triggers the password unlock modal.
  * **Multi-User & Handle Switching Re-Authentication**: When switching user handles within a private room or logging in as another user, the system mandates entering the new nickname and verifying the room password. Passwords are never shared or cached across different user handles.
  * **Audit Logging**: Failed password attempts log an audit event with severity `SECURITY_WARNING` containing the client IP, handle, and room ID.

---

## 8. Complete API Contracts & WebSocket Message Schemas

### 8.1 REST Endpoints

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms` | Create new public or private room | Body: `{ roomId?, isPrivate?, password?, captchaId?, captchaAnswer? }` -> `{ room: { id, isPrivate, createdAt } }` |
| `GET` | `/api/rooms/:roomId` | Verify room existence & privacy status | `{ success: true, room: { id, isPrivate } }` |
| `POST` | `/api/rooms/:roomId/verify-password` | Authenticate private room password | Body: `{ password }` -> `{ success: true, verified: true }` |
| `GET` | `/api/rooms/:roomId/messages` | Fetch messages (delta supported via `?since=`) | Header: `x-room-password` (if private) -> `{ success: true, messages: Message[] }` |
| `POST` | `/api/rooms/:roomId/messages` | Post message via HTTP | Body: `{ sender, text, source, password? }` / Header: `x-room-password` |
| `POST` | `/api/rooms/:roomId/delivered` | Report delivery acknowledgement | Body: `{ messageId, user }` |
| `POST` | `/api/rooms/:roomId/read` | Report read acknowledgement | Body: `{ messageIds: string[], user }` |
| `GET` | `/api/captcha` | Fetch security math challenge | `{ captchaId, question }` |
| `POST` | `/api/captcha/verify` | Verify CAPTCHA answer | Body: `{ captchaId, answer }` |
| `GET` | `/api/system/health` | Diagnostic metrics & memory | `{ uptimeSeconds, memoryFootprint, activeSockets }` |
| `POST` | `/api/admin/login` | Authenticate admin with master key | Body: `{ password }` -> `{ success, token, expiresAt }` |
| `GET` | `/api/admin/overview` | Fetch live server telemetry & vitals | Header: `x-admin-token` -> `{ telemetry: { uptime, memory, sockets, rooms } }` |
| `GET` | `/api/admin/rooms` | Inspect all active rooms & conversations | Header: `x-admin-token` -> `{ count, rooms: [...] }` |
| `GET` | `/api/admin/audit-logs` | Ingest and query forensic audit records | Header: `x-admin-token`, Query: `?limit=100&search=...` -> `{ count, logs: [...] }` |
| `POST` | `/api/admin/decrypt` | Decrypt message payload with master key | Header: `x-admin-token`, Body: `{ payload }` -> `{ success: true, decryptedText }` |

### 8.2 WebSocket Frame Schema
All WebSocket messages are structured JSON strings:

#### Client-to-Server Frames:
```json
// Join Room (Public or Private)
{ "action": "join", "roomId": "ROOM-482", "user": "Alice", "password": "optionalPassword123" }

// Send Message
{ "action": "message", "text": "Hello world" }

// Typing Indicator
{ "action": "typing", "isTyping": true }

// Delivery Receipt
{ "action": "delivered", "messageId": "msg-17291823901-a8df2" }

// Read Receipt
{ "action": "read", "messageIds": ["msg-17291823901-a8df2"] }
```

#### Server-to-Client Broadcasts:
```json
// Chat Message Broadcast
{ "type": "chat_message", "data": { "id": "...", "text": "...", "status": "sent", ... } }

// Receipt Status Update
{ "type": "msg_status_update", "data": { "id": "...", "status": "read", "readBy": [...] } }

// Typing Signal Broadcast
{ "type": "typing", "user": "Alice", "isTyping": true }

// Presence Broadcast
{ "type": "presence", "members": ["Alice", "Bob"] }

// Rate Limit Warning Frame
{ "type": "warning", "message": "WebSocket rate limit exceeded: frame dropped" }
```

---

## 9. Non-Functional Requirements & Performance SLAs

1. **Latency SLA**: Message delivery under WebSockets must arrive at peer clients in **< 15ms** on local networks and **< 50ms** over broadband.
2. **Memory Footprint**:
   * Idle WebSocket connection: **<= 35 KB RAM**.
   * Bounded message store: Strictly capped at 100 messages per room to guarantee zero memory leaks over long-running sessions.
3. **Viewport Responsiveness**:
   * Dynamic mobile dock supporting `100dvh` (Dynamic Viewport Height) to eliminate virtual keyboard clipping on iOS Safari and Android Chrome.
   * Responsive maximum chat container width (`max-w-3xl`) ensuring optimal reading line length across 4K displays.
4. **Accessibility (a11y)**:
   * Keyboard shortcuts (`Enter` to submit, `Shift+Enter` for multi-line).
   * High-contrast color ratios conforming to WCAG AA guidelines.

---

## 10. Production Deployment & CI/CD Strategy

### 10.1 Recommended Hybrid Hosting Architecture
* **Frontend**: Hosted on **Vercel**
  * Output: Static Single Page Application (SPA).
  * CDN: Global Edge Network.
  * Routing: Configured via `client/vercel.json` rewrite rule (`/(.*) -> /index.html`).
* **Backend**: Hosted on **Render** (or Railway / Fly.io / AWS ECS)
  * Persistent Node.js container with permanent TCP socket support.
  * Autoscaling ready via standard environment bindings (`PORT`, `NODE_ENV`).

### 10.2 Environment Variable Matrix

#### Client (`client/.env.production` or Vercel Dashboard):
```bash
VITE_API_URL=https://<your-backend-service>.onrender.com/api
VITE_WS_URL=wss://<your-backend-service>.onrender.com
```

#### Server (`server/.env.production` or Render Dashboard):
```bash
PORT=3001
NODE_ENV=production
```

---

## 11. Scalability Profile & Future Evolution

### 11.1 Concurrency Limits by Hardware

| Node Tier | Hardware Specs | Concurrent WebSocket Sockets | Active Throughput |
| :--- | :--- | :--- | :--- |
| **Free / Starter** | 512 MB – 1 GB RAM, 1 Shared vCPU | **2,000 – 5,000 users** | **300 – 800 msgs/sec** |
| **Standard Cloud VPS** | 2 GB – 4 GB RAM, 2 vCPUs | **15,000 – 30,000 users** | **2,500 – 4,000 msgs/sec** |
| **High-End Node** | 8 GB – 16 GB RAM, 4–8 vCPUs | **50,000 – 80,000+ users** | **10,000+ msgs/sec** |

### 11.2 Future Roadmap
* [x] **Phase 1.5 — WhatsApp-Style File & Media Sharing**: Images (Lightbox zoom), Videos, Audio, PDFs & Documents with download actions and rate limit safeguards.
* [ ] **Phase 2 — Multi-Node Horizontal Clustering**: Integrate Redis Pub/Sub adapter to allow horizontal scaling of WebSocket servers across multiple container instances.
* [ ] **Phase 3 — Persistent Storage Tier**: Connect PostgreSQL or Supabase for persistent room archives and user authentication.
* [ ] **Phase 4 — End-to-End Encryption (E2EE)**: Implement client-side Web Crypto API (AES-GCM 256) for zero-knowledge private messaging.
* [ ] **Phase 5 — WebRTC Audio/Video**: Leverage existing room presence signaling to support 1-on-1 peer voice and video calls.

---

## 12. File & Media Sharing Architecture

### 12.1 Functional Overview
* **Media Formats**: Images (PNG, JPG, WebP, GIF), playable HTML5 video (MP4, WebM), inline audio players (MP3, WAV, AAC), and downloadable documents (PDF, DOCX, XLSX, ZIP).
* **Delivery & Receipt Sync**: File messages carry identical WhatsApp tick lifecycle (`✓` Sent, `✓✓` Delivered, `✓✓ Blue` Seen) as text messages.
* **Image Lightbox**: High-res click-to-zoom modal with backdrop blur, keyboard ESC dismissal, and direct download CTA.
* **Drag-and-Drop Surface**: Intuitive full-viewport dropzone with animated boundary highlight and file staging tray.

### 12.2 Security & Storage Model
* **Storage Location**: `server/uploads/` on local/container storage.
* **Size Enforcement**: Strict 15 MB limit per file payload via `multer`.
* **Execution Prevention**: Executable extensions blocked (`.exe`, `.bat`, `.sh`, `.bin`, `.msi`, `.apk`).
* **Origin Agnostic**: Handled seamlessly between development (`localhost:3001`) and production deployments (Vercel CDN + Render container).
