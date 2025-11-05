import { API_BASE_URL } from '../config'

const PLAYLIST_HEALTH_BASE_PATHS = ['/api/PlaylistHealth', '/api/playlisthealth', '/api/playlist-health']

async function postJson<T>(endpoint: string, body: object): Promise<T> {
	let lastError: unknown = null
	const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

	for (const base of PLAYLIST_HEALTH_BASE_PATHS) {
		const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
		const url = `${API_BASE_URL}${normalizedBase}${normalizedEndpoint}`

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})

			if (!response.ok) {
				const payload = await response.text()
				throw new Error(payload || `PlaylistHealth request failed (${response.status}) at ${normalizedEndpoint}`)
			}

			const text = await response.text()
			return (text ? (JSON.parse(text) as T) : ({} as T))
		} catch (error) {
			lastError = error
		}
	}

	if (lastError instanceof Error) {
		throw lastError
	}

	throw new Error(`Unable to reach PlaylistHealth endpoint ${endpoint}`)
}

export interface SnapshotRequest {
	playlistId: string
	userId: string
	trackIds: string[]
}

export interface SnapshotResponse {
	snapshotId: string
}

export async function createSnapshot(payload: SnapshotRequest) {
	return postJson<SnapshotResponse>('snapshot', payload)
}

export interface AnalyzeRequest {
	playlistId: string
	snapshotId: string
}

export interface AnalyzeResponse {
	reportId: string
}

export async function analyzeSnapshot(payload: AnalyzeRequest) {
	return postJson<AnalyzeResponse>('analyze', payload)
}

export type PlaylistIssueKind = 'Duplicate' | 'Unavailable' | 'Outlier'

export interface PlaylistFinding {
	idx?: number
	trackId: string
	kind: PlaylistIssueKind
}

export interface GetReportRequest {
	reportId: string
}

export interface GetReportResponse {
	playlistId: string
	snapshotId: string
	findings: PlaylistFinding[]
}

export async function getReport(payload: GetReportRequest) {
	return postJson<GetReportResponse>('getReport', payload)
}
