export const DEFAULT_API_ORIGIN = 'http://localhost:8000';

const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

const fallbackBase = import.meta.env.DEV ? '' : DEFAULT_API_ORIGIN;

export const API_BASE_URL = (configuredBase && configuredBase.length > 0 ? configuredBase : fallbackBase).replace(/\/$/, '');

export const API_SPEC_PATH = '/api-spec.md';
