# Resurfacer: Frontend

Resurfacer helps you rediscover forgotten tracks in your Spotify library. This is the frontend portion of the application.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `localhost:8000` (see [Backend Repo](https://github.com/notyahir/resurfacer_4a))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Important Notes

### Backend Connection

The frontend expects the backend to be running on `http://localhost:8000`. If you see errors about "no healthy upstream" or connection issues:

1. Make sure the backend server is running
2. Check that it's accessible at `http://localhost:8000`
3. The frontend will automatically proxy API requests to `/api/*` to the backend

### Development

- The app uses Vue 3 with TypeScript
- Vite for build tooling and development server
- Spotify embeds for track previews

## Table Contents
1. [User Journey](userjourney.md)

2. [Video](ResurfacerFrontendWalkthroughCheckin.mkv)

3. [Video on Youtube](https://youtu.be/rBW69lwbFxo)

4. [Code Src](src/)

5. [API spec](api-spec.md)

## Links

1. [Main Repo](https://github.com/notyahir/61040-portfolio)

2. [Backend Repo](https://github.com/notyahir/resurfacer_4a)

