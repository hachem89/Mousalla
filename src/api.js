import { getToken } from './device.js';

// Returns { ok: true, data } or { ok: false, error }.
async function request(path, body) {
  try {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-device-token': getToken(), ...(body && { 'content-type': 'application/json' }) },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout?.(8000), // give up on very slow connections
    });
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data.error || 'error' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export const fetchBoard = (prayer) => request(`/api/board?prayer=${encodeURIComponent(prayer)}`);
export const joinGroup = (section, groupId, state = 'joined', friends = 0) => request('/api/join', { section, groupId, state, friends });
export const leaveGroup = (prayer) => request('/api/cancel', { prayer });
