import { API_BASE_URL } from '../config';

const PLAYLIST_HEALTH_BASE_PATH = '/api/PlaylistHealth';

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `PlaylistHealth request failed: ${response.status}`);
  }

  const text = await response.text();
  return (text ? (JSON.parse(text) as T) : ({} as T));
}

export interface SnapshotRequest {
  playlistId: string;
  userId: string;
  trackIds: string[];
}

export interface SnapshotResponse {
  snapshotId: string;
}

export async function createSnapshot(payload: SnapshotRequest) {
  return postJson<SnapshotResponse>(`${PLAYLIST_HEALTH_BASE_PATH}/snapshot`, payload);
}

export interface AnalyzeRequest {
  playlistId: string;
  snapshotId: string;
}

export interface AnalyzeResponse {
  reportId: string;
}

export async function analyzeSnapshot(payload: AnalyzeRequest) {
  return postJson<AnalyzeResponse>(`${PLAYLIST_HEALTH_BASE_PATH}/analyze`, payload);
}

export interface GetReportRequest {
  reportId: string;
}

export interface PlaylistFinding {
  idx: number;
  trackId: string;
  kind: 'Duplicate' | 'Unavailable' | 'Outlier';
}

export interface GetReportResponse {
  playlistId: string;
  snapshotId: string;
  findings: PlaylistFinding[];
}

export async function getReport(payload: GetReportRequest) {
  return postJson<GetReportResponse>(`${PLAYLIST_HEALTH_BASE_PATH}/getReport`, payload);
}
