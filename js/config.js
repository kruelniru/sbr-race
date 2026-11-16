// Central configuration. Networking settings live here so they can be changed
// without touching the rest of the code.

// PeerJS is loaded from a CDN at runtime (see js/net/peer-loader.js).
// The version is pinned on purpose: bump it deliberately and retest phones.
export const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js';

// Room codes are short for humans; the PeerJS id is prefixed so we don't
// collide with other apps on the free public PeerJS signaling server.
export const PEER_ID_PREFIX = 'sbr7-race-';
export const ROOM_CODE_LENGTH = 4;
// No I, O, L, 0, 1: easy to read off a stream and type on a phone.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';

// ICE servers used by every WebRTC connection (host and phones).
// STUN finds a direct route; TURN relays traffic when a network blocks that
// (school Wi-Fi, some mobile carriers). Without a working TURN entry those
// players simply can't connect.
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },

  // ===================================================================
  // TURN SLOT: add your own credentials here before a real group game.
  //
  // Metered (free tier, https://www.metered.ca/stun-turn): copy the
  // entries from your dashboard, they look like:
  //   { urls: 'turn:global.relay.metered.ca:80',  username: '...', credential: '...' },
  //   { urls: 'turn:global.relay.metered.ca:443', username: '...', credential: '...' },
  //   { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '...', credential: '...' },
  //
  // Cloudflare Realtime TURN: credentials are short-lived and normally
  // minted by a server. For a static site, generate a long-TTL credential
  // and paste it here:
  //   { urls: ['turn:turn.cloudflare.com:3478?transport=udp',
  //            'turn:turn.cloudflare.com:3478?transport=tcp',
  //            'turns:turn.cloudflare.com:5349?transport=tcp'],
  //     username: '...', credential: '...' },
  //
  // Note: anything in this file is public once deployed to GitHub Pages.
  // Use credentials you're fine sharing, and rotate them if they're abused.
  // ===================================================================

  // Metered free plan (50 GB/month). To rotate: delete this credential in the Metered dashboard, create a new one, paste the new entries here, push.
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: 'dc53a25404cdaab409031edd', credential: '0ls4Wwb9yDp67uBq' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'dc53a25404cdaab409031edd', credential: '0ls4Wwb9yDp67uBq' },
  { urls: 'turn:global.relay.metered.ca:443', username: 'dc53a25404cdaab409031edd', credential: '0ls4Wwb9yDp67uBq' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'dc53a25404cdaab409031edd', credential: '0ls4Wwb9yDp67uBq' },

  // Best-effort fallback: the PeerJS project's own public TURN server.
  // Unofficial, no uptime guarantee. Keep it as a backup, not the plan.
  {
    urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
    username: 'peerjs',
    credential: 'peerjsp',
  },
];

// The secret cheat menu (testing). Only a SHA-256 of the PIN lives here, never
// the PIN. Set it by running:  node tools/set-cheat-pin.js
// An empty value means the cheat menu can never open.
export const CHEAT_PIN_HASH = '585a0e83714e88690dc16461d6dde83a079ef759dd68a6689c2c89e73706a7c3';

// Lobby limits from DESIGN.md: 12–18 players, max 24. The minimum is a host
// setting (in the lobby); this is its default.
export const DEFAULT_MIN_PLAYERS = 12;
export const MAX_PLAYERS = 24;

// Character creation limits.
export const NAME_MAX = 20;
export const GENDER_MAX = 24;
export const PICTURE_SIZE = 256; // px, square
export const PICTURE_MAX_BYTES = 60_000; // length of the data URL string

// Heartbeats: phones ping, the host answers. A phone that goes quiet for
// HOST_TIMEOUT_MS is shown as disconnected (its character plays on personality).
export const PING_INTERVAL_MS = 4000;
export const PONG_TIMEOUT_MS = 10000;
export const HOST_TIMEOUT_MS = 12000;
// A phone that can't reach its room for this long stops trying and goes back
// to code entry (with a "Try again" button). A host reload takes seconds.
export const RECONNECT_GIVE_UP_MS = 2 * 60 * 1000;

// How many feed items a phone keeps and receives on (re)connect.
export const FEED_KEEP = 150; // phones keep several rounds so older ones can be reopened
