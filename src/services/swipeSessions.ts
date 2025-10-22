import { API_BASE_URL } from '../config';

export interface StartSessionPayload {
  userId: string;
  queueTracks?: string[];
  size?: number;
}

interface StartSessionResponse {
  sessionId: string;
}

interface NextTrackPayload {
  sessionId: string;
}

interface NextTrackResponse {
  trackId: string;
}

interface DecisionPayloadBase {
  sessionId: string;
  trackId: string;
}

interface DecideKeepResponse {
  decisionId: string;
}

interface DecideSnoozePayload extends DecisionPayloadBase {
  untilAt: number;
}

interface DecideAddToPlaylistPayload extends DecisionPayloadBase {
  playlistId: string;
}

interface DecideResponse {
  decisionId: string;
}

interface EndSessionPayload {
  sessionId: string;
}

interface EndSessionResponse {
  ended: boolean;
}

const SWIPE_BASE_PATH = '/api/SwipeSessions'

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
  return postJson<StartSessionResponse>(`${SWIPE_BASE_PATH}/start`, payload);
}

export async function fetchNext(payload: NextTrackPayload) {
  return postJson<NextTrackResponse>(`${SWIPE_BASE_PATH}/next`, payload);
}

export async function decideKeep(payload: DecisionPayloadBase) {
  return postJson<DecideKeepResponse>(`${SWIPE_BASE_PATH}/decideKeep`, payload);
}

export async function decideSnooze(payload: DecideSnoozePayload) {
  return postJson<DecideResponse>(`${SWIPE_BASE_PATH}/decideSnooze`, payload);
}

export async function decideAddToPlaylist(payload: DecideAddToPlaylistPayload) {
  return postJson<DecideResponse>(`${SWIPE_BASE_PATH}/decideAddToPlaylist`, payload);
}

export async function endSession(payload: EndSessionPayload) {
  return postJson<EndSessionResponse>(`${SWIPE_BASE_PATH}/end`, payload);
}
