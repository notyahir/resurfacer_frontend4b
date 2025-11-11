# Frontend Updates

## Authentication (4c)

The backend now uses synchronizations and requires authentication for API requests. The frontend handles this automatically.

**What changed:**
- Session auto-initializes on page load with demo user `demo-user`
- All API requests include `sessionToken` and `userId` 
- Session stored in localStorage

**Implementation:**
- `src/services/session.ts` - Session management
- All service files updated to include credentials
- Exception: OAuth callback (`completeAuth`) doesn't need auth

**Status:** ✅ Working - All endpoints authenticated and responding correctly

**Note:** Audio features (tempo, energy, valence) unavailable due to Spotify API deprecation (Nov 2024). Backend handles this gracefully by setting features to `null`.

## Deployment

**Production URLs:**
- Frontend: `https://resurfacer.onrender.com`
- Backend: `https://resurfacer-backend.onrender.com`

**Environment Configuration:**
- OAuth redirect automatically switches between dev and production
- Dev: `http://127.0.0.1:5173/callback`
- Production: `https://resurfacer.onrender.com/callback`

**Render Setup:**
1. Set `VITE_API_BASE_URL=https://resurfacer-backend.onrender.com/api` in frontend environment variables
2. Update Spotify Developer Dashboard with production callback URL
3. Backend environment variables set via `.env` upload

## UI/UX Polish (4b)

**Playlist Health:**
- Redesigned header card (compact metadata + gradient accent)
- Separated report body from header
- Enhanced findings display

**Journey Cards:**
- Added gradient text effects
- Hover animations on borders
- Top border accent colors

**Hero Boxes:**
- Fixed alignment issues with `align-self: stretch`
- Consistent sizing across all stages

**Connect Page:**
- Removed colons after status labels
- Updated AI preview messaging
- Better spacing

**Sidebar:**
- Removed inactive Library section
- Fixed brand animation overflow

## Staleness Calculation Fix

**Problem:** Frontend was confusing `lastPlayedAt` with `addedAt`, causing incorrect staleness scores.

**Fix:** 
- Separated concerns in `timeCapsule.ts`
- Frontend now respects backend's authoritative `score` field
- Removed incorrect fallback to `addedAt`

**To see fix in action:** Sync fresh data from Spotify via the Sync button.

## SwipeSession Enhancements

Added metadata fields to swipe cards:
- Resurfacing score
- Last played (relative time)
- Liked date
- Availability status

Implemented with `formatTimestamp` and `formatRelativeTime` helpers.

## Time Capsule Randomization

- Fetches 500 tracks from backend for variety
- Full randomization using Fisher-Yates shuffle
- Displays requested amount from randomized pool
- Better diversity in track selection

## PlaylistHealth Integration

Complete end-to-end implementation:
- API client with endpoint fallback (`playlistHealth.ts`)
- Reactive state management in `App.vue`
- Auto-triggers on stage/sync changes
- Loading, error, and success states
- Styled findings cards with retry functionality
- Demo fallback for testing

---

**Build Status:** Production ready  
**Backend Integration:** Requires Requesting concept fix for auth
