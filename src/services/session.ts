const SESSION_TOKEN_KEY = 'sessionToken'
const USER_ID_KEY = 'userId'

export function initializeSession(): void {
	const existing = getSessionToken()
	const existingUserId = getUserId()
	
	// MIGRATION: Clear demo-user sessions to force re-authentication
	if (existing && existingUserId === 'demo-user') {
		console.warn('Found demo-user session, clearing to force re-authentication')
		clearSession()
	}
	
	if (existing && getUserId()) {
		console.log('Session already initialized:', { userId: getUserId(), hasToken: true })
		return
	}

	// Initialize with a temporary session - user must authenticate to get real userId
	const tempUserId = `temp-${Date.now()}`
	const sessionToken = `session:${tempUserId}`
	
	localStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
	localStorage.setItem(USER_ID_KEY, tempUserId)
	
	console.log('Temporary session initialized:', { userId: tempUserId, sessionToken })
	console.log('Please connect your Spotify account to continue')
}

export function getSessionToken(): string | null {
	return localStorage.getItem(SESSION_TOKEN_KEY)
}

export function getUserId(): string | null {
	return localStorage.getItem(USER_ID_KEY)
}

export function getSessionCredentials(): { sessionToken: string; userId: string } {
	const sessionToken = getSessionToken()
	const userId = getUserId()
	
	if (!sessionToken || !userId) {
		throw new Error('Session not initialized. Please refresh the page.')
	}
	
	return { sessionToken, userId }
}

export function clearSession(): void {
	localStorage.removeItem(SESSION_TOKEN_KEY)
	localStorage.removeItem(USER_ID_KEY)
	console.log('Session cleared')
}

export function updateSession(userId: string, sessionToken?: string): void {
	localStorage.setItem(USER_ID_KEY, userId)
	if (sessionToken) {
		localStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
	} else {
		// If no token provided, generate one based on userId
		localStorage.setItem(SESSION_TOKEN_KEY, `session:${userId}`)
	}
	console.log('Session updated:', { userId, sessionToken: sessionToken || `session:${userId}` })
}

export function isAuthError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		return message.includes('unauthorized') || 
		       message.includes('forbidden') ||
		       message.includes('401') ||
		       message.includes('403')
	}
	return false
}

export function handleAuthError(error: unknown): void {
	console.error('Authentication error:', error)
	alert('Session expired or invalid. Please refresh the page.')
}
