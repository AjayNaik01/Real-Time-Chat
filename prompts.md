# Prompts & AI Agent Engineering Playbook
## Real-Time Chat & Protocol Transparency Lab

This document contains the prompt engineering history, structured system prompts, testing scenarios, and AI delegation workflows used to design, implement, harden, and evolve this application.

---

## 1. Overview & How to Use This Playbook

Whether you are pair-programming with Claude, Antigravity, GPT-4, or another coding assistant, these prompts are structured according to production software engineering best practices:
* **Context-first**: Clearly specifies constraints, project structure, and file locations.
* **Non-destructive**: Prioritizes backward compatibility and test-driven validation.
* **Gold-standard quality**: Enforces clean architecture, accessibility, error resilience, and visual polish.

---

## 2. Architecture & Foundation Prompts

### Prompt 2.1: Full-Stack Project Scaffolding
```text
Role: Principal Systems Architect
Task: Scaffold a production-grade educational chat application comparing HTTP, Short Polling, and Native WebSockets.

Requirements:
1. Root monorepo orchestrating two independent sub-projects:
   - client/ (React 18 + Vite + Tailwind CSS + Lucide Icons)
   - server/ (Node.js + Express + native 'ws' library, zero heavyweight socket frameworks like Socket.io)
2. Use npm workspaces or root package.json scripts with 'concurrently' to run both client and server via 'npm run dev'.
3. Implement an in-memory data store in server/src/store.js using a JavaScript Map, bounded at 100 messages per room to guarantee zero memory leaks.
4. Establish clean separation of concerns:
   - REST API for HTTP requests (/api/rooms, /api/messages)
   - WebSocketServer attached to the same HTTP server instance for persistent bi-directional streaming.
```

---

## 3. Protocol Comparison & Real-Time Engine Prompts

### Prompt 3.1: Protocol Switcher & Real-Time Telemetry Inspector
```text
Task: Build an interactive Protocol Switcher and live Network Inspector.

Requirements:
1. Create a custom React hook `useChatMode(roomId, user)` that supports 3 distinct modes:
   - MANUAL: Messages are fetched only on explicit user click.
   - POLLING: Runs a recursive 2,000ms timer fetching message deltas via GET /api/messages?since=:timestamp.
   - WEBSOCKET: Connects via native WebSocket (RFC 6455). Listens for 'chat_message', 'presence', and 'typing' events.
2. Build `NetworkInspector.jsx`:
   - Collapsible bottom dock.
   - Track live cumulative metrics: HTTP Requests, HTTP Bandwidth (KB), WebSocket Frames, WebSocket Bandwidth (KB), and Round-Trip Latency (ms).
   - Display real-time differences in overhead between polling and WebSockets.
```

---

## 4. UI/UX Design & Polish Prompts

### Prompt 4.1: Anti-Wireframe Dark-Mode Redesign
```text
Task: Redesign the chat interface to eliminate harsh wireframe borders and widescreen stretching.

Design Rules:
1. Border Softening:
   - Replace harsh, opaque grey borders (#2a2f3a, border-slate-700) with modern subtle alpha borders: border-white/[0.08] and border-white/[0.06].
   - Use soft backdrop-blur card surfaces (bg-slate-900/60) on deep background (#0b0e14).
2. Layout Constraint:
   - Enforce max-w-3xl mx-auto w-full on message feed, input bar dock, and mode switcher to prevent 1920px horizontal stretching.
3. Message Clustering (Google Chat Pattern):
   - Group consecutive messages from the same sender within 2 minutes (120,000ms) under a single avatar and header.
4. Empty State:
   - Replace empty voids with a welcoming Room Card featuring room badge, instructions, and 3 quick starter chips (👋 Say Hello, ⚡ Test Real-time, ✓✓ Test Ticks).
```

### Prompt 4.2: WhatsApp-Style Status Ticks & Transparency Drawer
```text
Task: Implement WhatsApp-style message delivery receipts with full audit transparency.

State Machine:
1. Sent (✓): Single grey tick when server acknowledges receipt.
2. Delivered (✓✓): Double grey tick when peer socket receives message frame.
3. Read (✓✓ Blue): Double blue tick when recipient tab is active and visible.
4. Reader Breakdown: Render reader mini-avatars adjacent to the double tick.
5. Interactive Popover:
   - Clicking status ticks toggles a Transparency Audit Card.
   - Show exact timestamps for Sent to Server, Delivered to Recipient, and Seen by Recipient.
```

---

## 5. Security & Abuse Prevention Prompts

### Prompt 5.1: Production Hardening, Rate Limiting & CAPTCHA
```text
Task: Harden the Express and WebSocket backend against DoS, brute-force, and XSS attacks.

Specifications:
1. OWASP Headers:
   - Inject X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and X-XSS-Protection.
2. Sliding-Window Rate Limiter (server/src/rateLimiter.js):
   - 120 requests/minute for general API.
   - 60 messages/minute for chat messages.
   - 8 room creations/minute. Return HTTP 429 with standard Retry-After headers when tripped.
3. Math CAPTCHA Challenge (server/src/captcha.js):
   - When room creation rate limit is exceeded, generate dynamic ephemeral math challenge (e.g. "What is 14 + 7?").
   - Store challenge token with 120-second TTL. Unlock room creation upon successful verification.
4. Input Sanitization:
   - Sanitize all message text and nicknames by escaping HTML entities (&, <, >, ", ') to neutralize XSS injection.
```

### Prompt 5.2: Consumer-Grade Error Boundary & 404 Recovery
```text
Task: Refactor ErrorBoundary and NotFound pages to be user-friendly without technical intimidation.

Requirements:
1. Remove developer clutter:
   - Do NOT display red warning banners, "500 APPLICATION ERROR" badges, or exposed code blocks by default.
2. Provide reassuring copy:
   - Header: "Something went wrong"
   - Body: "An unexpected issue occurred while loading this page. Please try reloading or return to the home lobby."
3. Two clear recovery actions:
   - [ Reload Page ] (Primary blue)
   - [ Return to Lobby ] (Subtle secondary)
4. Hide raw stack traces inside a discreet, collapsed text toggle: "Technical details".
```

### Prompt 5.3: Enterprise Forensic Audit Logging & Traceability
```text
Task: Implement an immutable, structured audit logging pipeline for regulatory and security compliance.

Requirements:
1. Create server/src/auditLogger.js with structured JSON schema:
   - Attributes: id, timestamp (UTC ISO), event, ip, userAgent, user, roomId, messageId, metadata.
2. Instrument key system actions:
   - ROOM_CREATED, ROOM_JOINED, MESSAGE_SENT, MESSAGE_DELIVERED, MESSAGE_READ,
   - RATE_LIMIT_TRIPPED, CAPTCHA_CHALLENGE, CAPTCHA_VERIFIED, SECURITY_WARNING.
3. Pluggable Multi-Destination Pipeline:
   - STDOUT drain for container log aggregators (Datadog, Papertrail, Render).
   - Append-only disk file (logs/audit.jsonl).
   - Optional PostgreSQL storage when DATABASE_URL is configured.
   - Optional HTTP Webhook POST when AUDIT_WEBHOOK_URL is configured.
```

### Prompt 5.4: Hidden Admin Command Center & Security Operations Center (SOC)
```text
Task: Build an invisible, password-protected administrative command center and surveillance console.

Requirements:
1. Zero Public UI Footprint:
   - No buttons, links, or navigation clues for regular users.
   - Hidden activation via secret hotkey: Ctrl + Shift + A (or Cmd + Shift + A on macOS) or URL ?admin=true / /admin.
2. Secure Gateway & Token Auth:
   - Backend controller server/src/admin.js authenticated via ADMIN_PASSWORD (default: admin-secret-2026).
   - Issues 48-byte cryptographically secure session token stored in sessionStorage with 8-hour expiry.
   - Background memory GC cleans up expired tokens every 15 minutes.
   - Unauthenticated requests to /api/admin/* rejected with HTTP 401.
3. Command Center Dashboard (client/src/components/AdminPortal.jsx):
   - Live Forensic Audit Log search with real-time query filtering (by IP, handle, or event), cipher snippets, and SHA-256 message checksums.
   - Real-Time Server Vitals: Gauges for RSS memory, heap allocations, active WebSockets, and process uptime with 3.5s auto-refresh and stream pause toggle.
   - One-click exit returning to normal chat without leaving browser history traces.
```

### Prompt 5.5: Public vs. Private Room Security & Password Gates
```text
Task: Implement Public vs. Private room access control with cryptographic password hashing and timing attack resistance.

Requirements:
1. Public Rooms:
   - Frictionless room creation and entry without password fields or prompts.
2. Private Rooms:
   - Creator must specify a password (minimum 6 characters).
   - Client Lobby UI features an interactive password strength indicator (Weak, Moderate, Strong).
   - Peer entry via room code prompts a dark-mode "Password Required" unlock modal.
3. Cryptographic Storage & Verification:
   - Hash passwords on backend using crypto.scryptSync with 16-byte random salt. Never store plaintext.
   - Verify passwords with crypto.timingSafeEqual to eliminate timing side-channel vulnerabilities.
   - Never leak password hashes or salts in GET /api/rooms/:roomId or admin overviews.
4. Multi-Protocol Gates:
   - Pre-flight verification: POST /api/rooms/:roomId/verify-password.
   - Message protection: GET and POST /api/rooms/:roomId/messages require valid x-room-password header (returns 401 ERR_ROOM_PASSWORD_REQUIRED if invalid).
   - WebSocket join protection: Reject frames missing valid password with error frame code 'ERR_INVALID_ROOM_PASSWORD'.
   - Audit logging: Record SECURITY_WARNING events upon failed password attempts.
5. Handle Switching & User Re-Authentication:
   - When switching nicknames or logging in as another user inside a private room, mandate re-entering the room password.
   - Passwords must not be cached, reused, or shared across different user profiles.
```

### Prompt 5.6: Production SOC Refactoring & Decommissioning of Redundant Tabs
```text
Task: Streamline the Security Operations Center (SOC) dashboard by removing the Active Rooms tab.

Requirements:
1. Interface Streamlining:
   - Remove the 'Active Rooms' tab button and panel from AdminPortal.jsx.
   - Keep the SOC focused on two core operational pillars:
     1. Forensic Audit Logs ({count})
     2. Server Vitals
2. Clean Code & Memory Optimization:
   - Remove room state and unnecessary packet inspection buffers from client memory.
   - Prune unused imports and formatting utilities (e.g. formatHexDump, cryptoView toggles).
   - Update fetchData to fetch only /api/admin/overview and /api/admin/audit-logs.
3. Backend Integrity:
   - Retain server-side admin endpoints and audit log recording so integration tests remain 100% green.
```

---

## 6. Testing & Automated Verification Prompts

### Prompt 6.1: Automated Server Test Suite
```text
Task: Create an automated integration test script in server/test/server.test.js.

Requirements:
1. Use native Node.js test runner without third-party test dependencies.
2. Test Cases:
   - Test 1: Verify OWASP security headers (nosniff, DENY) on responses.
   - Test 2: Verify system diagnostics endpoint (/api/system/health) returns valid memory RSS and active socket counts.
   - Test 3: Verify dynamic CAPTCHA challenge generation and expiration.
   - Test 4: Verify XSS sanitization (payload `<script>alert('pwned')</script>` must be escaped).
   - Test 5: Verify 404 structured JSON handler.
   - Test 6: Verify sliding-window rate limiter triggers HTTP 429 after spamming room creation requests.
   - Test 7: Verify persistent audit logging writes structured events into logs/audit.jsonl.
   - Test 8: Verify Admin SOC authentication: 401 on unauthorized calls, 401 on invalid passwords, token issuance on valid login, and authenticated telemetry / audit retrieval.
   - Test 9: Verify Public vs. Private room security: Public room creation without password, rejection of weak passwords (< 6 chars), scrypt verification of strong passwords, 401 message protection, and WebSocket join rejection.
3. Ensure clean teardown and exit code 0 on success.
```

---

## 7. Cloud Deployment Prompts

### Prompt 7.1: Hybrid Hosting (Vercel Frontend + Render Backend)
```text
Task: Prepare the monorepo for production deployment across Vercel (Frontend) and Render (WebSocket Backend).

Requirements:
1. Configure dynamic client environment URLs in client/src/services/api.js, websocket.js, and useChatMode.js:
   - VITE_API_URL: defaults to http://localhost:3001/api, overrides with production HTTPS backend.
   - VITE_WS_URL: defaults to ws://localhost:3001, overrides with production WSS backend.
2. Add client/vercel.json with SPA rewrites (/(.*) -> /index.html) to support deep-linked URLs like `/?room=ROOM-482`.
3. Ensure server dynamically binds to process.env.PORT and process.env.NODE_ENV.
```

---

## 8. Future Roadmap & Scaling Prompts

### Prompt 8.1: Horizontal Redis Clustering (Phase 2)
```text
Task: Add multi-node horizontal scaling support to the WebSocket server using Redis Pub/Sub.

Instructions:
1. Connect 'ioredis' client instances for PUB and SUB.
2. When a WebSocket server instance receives a chat message or status tick frame from a client:
   - Broadcast to local room sockets.
   - Publish JSON payload to Redis channel `room:${roomId}:events`.
3. Remote server instances subscribed to the channel receive the frame and broadcast to their local sockets connected to that room.
```

### Prompt 8.2: End-to-End Encryption (Phase 4)
```text
Task: Implement client-side End-to-End Encryption (E2EE) using Web Crypto API.

Instructions:
1. Generate an ephemeral AES-GCM 256-bit room key derived from a shared secret/passphrase via PBKDF2.
2. Encrypt message text on client before transmission over WebSocket or HTTP.
3. Server receives only ciphertext, nonce, and initialization vector (IV).
4. Peer clients decrypt ciphertext locally; plaintext never touches server memory.
```
