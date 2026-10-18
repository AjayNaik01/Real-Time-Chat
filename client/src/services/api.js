const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Helper to measure roundtrip latency, estimated payload sizes, and status codes
 */
async function measureRequest(fn, payloadSizeEstimate = 0) {
  const start = performance.now();
  let response;
  try {
    response = await fn();
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return {
      data: { success: false, error: err.message || 'Network connection failed' },
      latency,
      bytesSent: 600 + payloadSizeEstimate,
      bytesReceived: 0,
      ok: false,
      status: 0,
    };
  }

  const latency = Math.round(performance.now() - start);

  // Approximate headers (~600 bytes) + body size
  let text = '';
  try {
    const resClone = response.clone();
    text = await resClone.text();
  } catch (e) {
    text = '';
  }

  const bytesReceived = 600 + (text ? new Blob([text]).size : 0);
  const bytesSent = 600 + payloadSizeEstimate;

  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { error: text || response.statusText };
  }

  const retryAfter = response.headers.get('retry-after');

  return {
    data,
    latency,
    bytesSent,
    bytesReceived,
    ok: response.ok,
    status: response.status,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
  };
}

/**
 * Create a new room (Public or Private with password) with optional CAPTCHA verification
 */
export async function createRoomApi(roomId, captcha = null, { isPrivate = false, password = '' } = {}) {
  const body = {
    roomId,
    isPrivate: Boolean(isPrivate),
    password: password ? String(password).trim() : '',
  };
  if (captcha?.captchaId && captcha?.answer) {
    body.captchaId = captcha.captchaId;
    body.captchaAnswer = captcha.answer;
  }

  const payload = JSON.stringify(body);
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Check if a room exists and inspect privacy mode
 */
export async function getRoomApi(roomId) {
  const result = await measureRequest(() => fetch(`${BASE_URL}/rooms/${encodeURIComponent(roomId)}`));
  return result;
}

/**
 * Verify password for a private room
 */
export async function verifyRoomPasswordApi(roomId, password) {
  const payload = JSON.stringify({ password });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/rooms/${encodeURIComponent(roomId)}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Fetch messages for a room (Used by Manual Fetch and Short Polling)
 */
export async function fetchMessagesApi(roomId, since = 0, password = '') {
  const q = new URLSearchParams();
  if (since) q.set('since', String(since));
  if (password) q.set('password', password);
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  const url = `${BASE_URL}/rooms/${encodeURIComponent(roomId)}/messages${queryStr}`;
  const headers = password ? { 'x-room-password': password } : {};

  const result = await measureRequest(() =>
    fetch(url, { headers })
  );
  return result;
}

/**
 * Post a new message via HTTP POST
 */
export async function postMessageApi(roomId, { sender, text, source = 'HTTP', password = '' }) {
  const payload = JSON.stringify({ sender, text, source, password });
  const headers = { 'Content-Type': 'application/json' };
  if (password) headers['x-room-password'] = password;

  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: 'POST',
        headers,
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Report message delivered via HTTP
 */
export async function markDeliveredApi(roomId, messageId, user) {
  const payload = JSON.stringify({ user });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Report messages read via HTTP
 */
export async function markReadApi(roomId, messageIds, user) {
  const payload = JSON.stringify({ messageIds, user });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/rooms/${encodeURIComponent(roomId)}/messages/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Fetch dynamic CAPTCHA challenge
 */
export async function fetchCaptchaApi() {
  const result = await measureRequest(() => fetch(`${BASE_URL}/captcha`));
  return result;
}

/**
 * Verify CAPTCHA challenge answer
 */
export async function verifyCaptchaApi(captchaId, answer) {
  const payload = JSON.stringify({ captchaId, answer });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Fetch system health diagnostics
 */
export async function fetchSystemHealthApi() {
  const result = await measureRequest(() => fetch(`${BASE_URL}/system/health`));
  return result;
}

// -------------------------------------------------------------
// Admin & Security Command Center APIs
// -------------------------------------------------------------

/**
 * Admin Login
 */
export async function adminLoginApi(password) {
  const payload = JSON.stringify({ password });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    payload.length
  );
  return result;
}

/**
 * Fetch Admin Overview & Telemetry
 */
export async function adminGetOverviewApi(token) {
  const result = await measureRequest(() =>
    fetch(`${BASE_URL}/admin/overview`, {
      headers: {
        'x-admin-token': token,
      },
    })
  );
  return result;
}

/**
 * Fetch Admin Room & Conversation Inspector
 */
export async function adminGetRoomsApi(token) {
  const result = await measureRequest(() =>
    fetch(`${BASE_URL}/admin/rooms`, {
      headers: {
        'x-admin-token': token,
      },
    })
  );
  return result;
}

/**
 * Fetch Forensic Audit Logs
 */
export async function adminGetAuditLogsApi(token, search = '', limit = 100) {
  const q = new URLSearchParams({ search, limit: String(limit) });
  const result = await measureRequest(() =>
    fetch(`${BASE_URL}/admin/audit-logs?${q.toString()}`, {
      headers: {
        'x-admin-token': token,
      },
    })
  );
  return result;
}

/**
 * Decrypt a message payload with master key
 */
export async function adminDecryptApi(token, payload) {
  const reqBody = JSON.stringify({ payload });
  const result = await measureRequest(
    () =>
      fetch(`${BASE_URL}/admin/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: reqBody,
      }),
    reqBody.length
  );
  return result;
}

/**
 * Resolves a server-relative file path to the absolute backend URL
 */
export function getFileUrl(urlPath) {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
  const backendOrigin = BASE_URL.replace(/\/api\/?$/, '');
  return `${backendOrigin}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
}

/**
 * Upload a media file or document with upload progress tracking
 */
export function uploadFileApi(roomId, file, password = '', onProgress = null) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${BASE_URL}/rooms/${encodeURIComponent(roomId)}/upload`;

    xhr.open('POST', url, true);
    if (password) {
      xhr.setRequestHeader('x-room-password', password);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = { error: xhr.statusText || 'Upload failed' };
      }

      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        resolve({ ok: true, data, status: xhr.status });
      } else {
        resolve({
          ok: false,
          error: data?.error || 'File upload failed',
          code: data?.code,
          status: xhr.status,
        });
      }
    };

    xhr.onerror = () => {
      resolve({
        ok: false,
        error: 'Network error during upload',
        status: 0,
      });
    };

    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    xhr.send(formData);
  });
}

