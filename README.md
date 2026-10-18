# Real-Time Chat Lab: WebSockets vs Short Polling vs Manual HTTP

An educational full-stack laboratory built with **Node.js/Express**, **Native WebSockets (`ws`)**, and **React + Vite + Tailwind CSS** to help developers understand, measure, and decide between web communication protocols.

---

## 🚀 Quick Start

### 1. Install & Run
Run from the root of `/home/ajay/taghash/realtime-chat-lab`:

```bash
# Start both Backend (Port 3001) and Frontend (Port 5173) concurrently
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **WebSocket Gateway**: `ws://localhost:3001`

### 2. Run Automated Protocol & Security Verification Tests
```bash
npm run test:server
```
Runs the full 10-point test suite: OWASP Headers, Memory Diagnostics, Dynamic CAPTCHA, XSS Sanitization, Express 404, Rate Limiting, Forensic Audit Trail, Admin SOC Telemetry & Crypto, Private Room Password Gates, and File & Media Sharing.

### 3. WhatsApp-Style File & Media Sharing
- **Attachments**: Click the `📎` paperclip or drag-and-drop any photo, video, audio note, PDF, or document onto the screen.
- **Media Previews & Lightbox**: Interactive zoom Lightbox for images, built-in HTML5 video and audio players, file size badges, and 1-click download actions.
- **Delivery Sync**: Synchronized WhatsApp delivery ticks (`✓`, `✓✓`, `✓✓ Blue`) for all file transmissions.

---

## 🧪 How to Experience the Protocols (The 2-Tab Test)

1. Open [http://localhost:5173](http://localhost:5173) in **Tab 1** (Enter nickname: **Alice**). Click **Create & Enter**.
2. Copy the room code (or click "Copy Link") and open it in **Tab 2** (Enter nickname: **Bob**).

### Mode 1: Manual Fetch (HTTP Request–Response)
- Switch both tabs to **`[ Manual Fetch ]`**.
- Alice types a message and sends it.
- **Notice:** Bob's screen receives *nothing*. Bob must click **"Fetch Messages"** for the HTTP `GET` request to retrieve the message.
- **Takeaway:** Traditional HTTP is client-pull only; the server cannot push unprompted.

### Mode 2: Short Polling (HTTP Every 2s)
- Switch Bob's tab to **`[ Short Polling (2s) ]`**.
- Notice the 2.0s countdown timer ticking down continuously.
- Alice sends a message: Bob sees it appear automatically within 0–2 seconds.
- Look at Bob's **Network Inspector**: the request counter climbs continuously (`1, 2, 3... 30 requests/minute`) even when nobody is talking!
- **Takeaway:** Polling provides automated delivery, but wastes bandwidth on empty HTTP headers and introduces latency delay.

### Mode 3: WebSockets & WhatsApp "Typing..." (Real-Time Duplex)
- Switch both tabs to **`[ WebSockets ]`**.
- Alice starts typing in the message box.
- **Notice:** Bob immediately sees: `💬 Alice is typing...` with animated bouncing dots in under 15ms!
- Alice stops typing for 2.5 seconds: the indicator disappears.
- Alice presses Enter: The message appears on Bob's screen **instantly** without waiting for any timer.
- Look at the **Network Inspector**: HTTP requests remain **0**, and WebSocket frames use tiny **2–10 byte** headers.

---

## 🧠 Architectural Deep-Dive: How WhatsApp Typing Works

1. **Keystroke Throttling (`useTyping.js`)**:
   - On the first keystroke, the client emits a lightweight frame: `{ type: 'typing', isTyping: true }`.
   - A 2.5-second inactivity timer begins. Subsequent keystrokes reset this timer without spamming redundant network frames.
2. **Auto-Stop**:
   - When the user stops typing for 2.5s (or sends the message), the timer fires `{ type: 'typing', isTyping: false }`.
3. **Transient Server Relay (`wsHandler.js`)**:
   - The server **never** stores typing events in a database. It simply relays the frame to active sockets in the same room.
4. **Client Defensive Timer**:
   - The receiver displays `"Alice is typing..."` and sets a local 3.5s safety timeout to clear it if Alice suddenly loses internet or closes the tab.

---

## 📚 Curated Resources, RFCs, and GitHub Repositories

### Core Specifications & Official Docs
- **[RFC 6455: The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)** — The authoritative IETF standard defining the HTTP 101 Switching Protocols handshake, framing, masking, and opcodes.
- **[MDN WebSockets API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)** — Browser API guide for `WebSocket`, events (`open`, `message`, `error`, `close`), and binary data handling.
- **[MDN Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)** — The browser guide for unidirectional HTTP streaming with `EventSource`.

### High-Impact GitHub Repositories
- **[websockets/ws](https://github.com/websockets/ws)** — The blazing-fast, battle-tested native WebSocket client and server library for Node.js used in this lab.
- **[socketio/socket.io](https://github.com/socketio/socket.io)** — The most popular real-time application framework with fallback transports and room abstractions.
- **[uNetworking/uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)** — High-performance C++ WebSocket server bindings for Node.js (used in high-frequency trading and Discord scale).

### Recommended Reading & Articles
- **[System Design: Designing a Chat Application like WhatsApp / Messenger](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-messenger)** — Excellent breakdown of connection servers, presence tracking, and ephemeral typing state.
- **[The Evolution of Web Communication: HTTP to Polling to SSE to WebSockets](https://ably.com/topic/websockets-vs-sse-vs-polling)** — Clear trade-off analysis between polling, SSE, and WebSockets.
- **[Scaling WebSocket Connections to Millions (Discord Engineering Blog)](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users)** — How Discord handles millions of active socket connections and presence events.
