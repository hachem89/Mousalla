import { getToken } from './device.js';

// Returns { ok: true, data } or { ok: false, error }.
async function request(path, body) {
  try {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-device-token': getToken(), ...(body && { 'content-type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data.error || 'error' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export const fetchBoard = (prayer) => request(`/api/board?prayer=${encodeURIComponent(prayer)}`);
export const joinSlot = (section, slotId, state = 'joined', eta) => request('/api/join', { section, slotId, state, eta });
export const cancelSpot = (prayer) => request('/api/cancel', { prayer });
