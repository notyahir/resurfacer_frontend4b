const SESSION_TOKEN_KEY = 'sessionToken'
const USER_ID_KEY = 'userId'

export function initializeSession(): void {
	const existing = getSessionToken()
	if (existing) {
		console.log('Session already initialized:', { userId: getUserId(), hasToken: true })
		return
	}

	const userId = 'demo-user'
	const sessionToken = `session:${userId}`
	
	localStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
	localStorage.setItem(USER_ID_KEY, userId)
	
	console.log('Session initialized:', { userId, sessionToken })
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
