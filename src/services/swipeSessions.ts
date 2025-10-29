import { API_BASE_URL } from '../config';
import { getDemoLikedTrackIds } from '../data/demoLibraryCache';

export interface StartSessionPayload {
  userId: string;
  queueTracks?: string[];
  size?: number;
}

export type SessionMode = 'offline' | 'shadow';

export interface StartSessionResponse {
  sessionId: string;
  mode?: SessionMode;
}

interface NextTrackPayload {
  sessionId: string;
}

interface NextTrackResponse {
  trackId: string;
  mode?: SessionMode;
}

interface DecisionPayloadBase {
  sessionId: string;
  trackId: string;
}

interface DecideKeepResponse {
  decisionId: string;
  mode?: SessionMode;
}

interface DecideSnoozePayload extends DecisionPayloadBase {
  untilAt: number;
}

interface DecideAddToPlaylistPayload extends DecisionPayloadBase {
  playlistId: string;
}

interface DecideResponse {
  decisionId: string;
  mode?: SessionMode;
}

interface EndSessionPayload {
  sessionId: string;
}

interface EndSessionResponse {
  ended: boolean;
  mode?: SessionMode;
}

const SWIPE_BASE_PATH = '/api/SwipeSessions';

interface OfflineDecision {
  trackId: string;
  action: 'keep' | 'snooze' | 'add-to-playlist';
  note?: string;
}

interface OfflineSessionState {
  queue: string[];
  cursor: number;
  decisions: OfflineDecision[];
  mode: SessionMode;
}

// Cache a lightweight mirror of active sessions so we can keep swiping if the backend drops mid-session.
const offlineSessions = new Map<string, OfflineSessionState>();

function createQueueFromPayload(payload: StartSessionPayload): string[] {
  const provided = (payload.queueTracks ?? []).map((track) => track.trim()).filter(Boolean);

  if (provided.length) {
    return payload.size ? provided.slice(0, payload.size) : provided;
  }

  const demoIds = getDemoLikedTrackIds();
  if (!demoIds.length) {
    return [];
  }

  const requested = payload.size && payload.size > 0 ? Math.min(payload.size, demoIds.length) : demoIds.length;
  return demoIds.slice(0, Math.max(requested, 1));
}

function createOfflineSession(payload: StartSessionPayload, mode: SessionMode): StartSessionResponse {
  const queue = createQueueFromPayload(payload);
  if (!queue.length) {
    throw new Error('No tracks available. Load liked tracks or connect to the backend to start a session.');
  }

  const sessionId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  offlineSessions.set(sessionId, {
    queue,
    cursor: 0,
    decisions: [],
    mode
  });

  return { sessionId, mode };
}

function getSessionState(sessionId: string): OfflineSessionState | undefined {
  return offlineSessions.get(sessionId);
}

function advanceCursor(state: OfflineSessionState, trackId: string) {
  const index = state.queue.indexOf(trackId);
  if (index >= 0) {
    state.cursor = Math.max(state.cursor, index + 1);
  } else {
    // Ensure we do not lose history if backend returns tracks that were not in the original local queue
    state.queue.splice(state.cursor, 0, trackId);
    state.cursor += 1;
  }
}

function nextOfflineTrack(state: OfflineSessionState): NextTrackResponse {
  if (state.cursor >= state.queue.length) {
    return { trackId: '-1' };
  }

  const trackId = state.queue[state.cursor]!;
  state.cursor += 1;
  return { trackId };
}

function recordOfflineDecision(state: OfflineSessionState, decision: OfflineDecision): DecideResponse {
  state.decisions.unshift(decision);
  return { decisionId: `offline-decision-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const base = API_BASE_URL || ''
  const url = `${base}${path}`

  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (networkError) {
    const message =
      networkError instanceof Error && networkError.message
        ? networkError.message
        : 'Confirm the backend is running and reachable.'
    throw new Error(`Unable to reach SwipeSessions API at ${url}. ${message}`)
  }

  if (!response.ok) {
    const message = await response.text();
    let errorMessage = message || `Request failed: ${response.status}`
    try {
      const parsed = JSON.parse(message)
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        errorMessage = String(parsed.error)
      }
    } catch {
      // ignore JSON parse errors and use raw text
    }
    throw new Error(errorMessage);
  }

  const payload = await response.text();
  return (payload ? (JSON.parse(payload) as T) : ({} as T));
}

export async function startSession(payload: StartSessionPayload) {
  try {
    const response = await postJson<StartSessionResponse>(`${SWIPE_BASE_PATH}/start`, payload);
    const queue = createQueueFromPayload(payload);

    if (queue.length) {
      offlineSessions.set(response.sessionId, {
        queue: [...queue],
        cursor: 0,
        decisions: [],
        mode: 'shadow'
      });
    }

    return queue.length ? { ...response, mode: 'shadow' } : response;
  } catch (error) {
    return createOfflineSession(payload, 'offline');
  }
}

export async function fetchNext(payload: NextTrackPayload) {
  const state = getSessionState(payload.sessionId);

  if (state && state.mode === 'offline') {
    return { ...nextOfflineTrack(state), mode: state.mode };
  }

  try {
    const response = await postJson<NextTrackResponse>(`${SWIPE_BASE_PATH}/next`, payload);
    if (state) {
      advanceCursor(state, response.trackId);
    }
    return state ? { ...response, mode: state.mode } : response;
  } catch (error) {
    if (state) {
      state.mode = 'offline';
      return { ...nextOfflineTrack(state), mode: state.mode };
    }
    throw error;
  }
}

export async function decideKeep(payload: DecisionPayloadBase) {
  const state = getSessionState(payload.sessionId);

  if (state && state.mode === 'offline') {
    const offlineDecision = recordOfflineDecision(state, {
      trackId: payload.trackId,
      action: 'keep'
    });
    return { ...offlineDecision, mode: state.mode } as DecideKeepResponse;
  }

  try {
    const response = await postJson<DecideKeepResponse>(`${SWIPE_BASE_PATH}/decideKeep`, payload);
    if (state) {
      recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'keep'
      });
    }
    return state ? { ...response, mode: state.mode } : response;
  } catch (error) {
    if (state) {
      state.mode = 'offline';
      const offlineDecision = recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'keep'
      });
      return { ...offlineDecision, mode: state.mode } as DecideKeepResponse;
    }
    throw error;
  }
}

export async function decideSnooze(payload: DecideSnoozePayload) {
  const state = getSessionState(payload.sessionId);

  if (state && state.mode === 'offline') {
    const offlineDecision = recordOfflineDecision(state, {
      trackId: payload.trackId,
      action: 'snooze',
      note: String(payload.untilAt)
    });
    return { ...offlineDecision, mode: state.mode };
  }

  try {
    const response = await postJson<DecideResponse>(`${SWIPE_BASE_PATH}/decideSnooze`, payload);
    if (state) {
      recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'snooze',
        note: String(payload.untilAt)
      });
    }
    return state ? { ...response, mode: state.mode } : response;
  } catch (error) {
    if (state) {
      state.mode = 'offline';
      const offlineDecision = recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'snooze',
        note: String(payload.untilAt)
      });
      return { ...offlineDecision, mode: state.mode };
    }
    throw error;
  }
}

export async function decideAddToPlaylist(payload: DecideAddToPlaylistPayload) {
  const state = getSessionState(payload.sessionId);

  if (state && state.mode === 'offline') {
    const offlineDecision = recordOfflineDecision(state, {
      trackId: payload.trackId,
      action: 'add-to-playlist',
      note: payload.playlistId
    });
    return { ...offlineDecision, mode: state.mode };
  }

  try {
    const response = await postJson<DecideResponse>(`${SWIPE_BASE_PATH}/decideAddToPlaylist`, payload);
    if (state) {
      recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'add-to-playlist',
        note: payload.playlistId
      });
    }
    return state ? { ...response, mode: state.mode } : response;
  } catch (error) {
    if (state) {
      state.mode = 'offline';
      const offlineDecision = recordOfflineDecision(state, {
        trackId: payload.trackId,
        action: 'add-to-playlist',
        note: payload.playlistId
      });
      return { ...offlineDecision, mode: state.mode };
    }
    throw error;
  }
}

export async function endSession(payload: EndSessionPayload) {
  const state = getSessionState(payload.sessionId);

  if (state && state.mode === 'offline') {
    offlineSessions.delete(payload.sessionId);
    return { ended: true, mode: state.mode };
  }

  try {
    const response = await postJson<EndSessionResponse>(`${SWIPE_BASE_PATH}/end`, payload);
    if (state) {
      offlineSessions.delete(payload.sessionId);
    }
    return state ? { ...response, mode: state?.mode } : response;
  } catch (error) {
    if (state) {
      offlineSessions.delete(payload.sessionId);
      return { ended: true, mode: state.mode };
    }
    throw error;
  }
}
