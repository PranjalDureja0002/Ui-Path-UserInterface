// Feed mode: 'demo' replays the scripted scenarios; 'live' binds to a real
// WebSocket stream of CaseEvents from your view-backend.
//   .env →  VITE_FEED_MODE=live   VITE_FEED_WS_URL=wss://your-backend/ws
export const FEED_MODE: 'demo' | 'live' =
  (import.meta.env.VITE_FEED_MODE as 'demo' | 'live') || 'demo'

export const FEED_WS_URL: string =
  (import.meta.env.VITE_FEED_WS_URL as string) || 'ws://localhost:8000/ws'
