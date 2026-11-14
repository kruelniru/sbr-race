// Phone side of the network. Connects to the host's room code and keeps
// reconnecting forever (with backoff) until stop() is called. Phones switch
// apps, lock, change networks; every one of those just means "reconnect".
import { ICE_SERVERS, PEER_ID_PREFIX, PING_INTERVAL_MS, PONG_TIMEOUT_MS, RECONNECT_GIVE_UP_MS } from '../config.js';
import { isMessage, msg, TO_HOST, TO_PHONE } from './protocol.js';
import { loadPeerJS } from './peer-loader.js';

const CONNECT_TIMEOUT_MS = 12000;
const BACKOFF_MS = [500, 1000, 2000, 3000, 5000, 8000];

export class PhoneNet {
  /**
   * @param {object} handlers
   * @param {() => void} handlers.onOpen       connection is up: send HELLO now
   * @param {(msg:object) => void} handlers.onMessage
   * @param {(status:'connecting'|'connected'|'reconnecting'|'host-missing'|'offline') => void} handlers.onStatus
   * @param {() => void} handlers.onGiveUp  no connection for RECONNECT_GIVE_UP_MS; net has stopped
   */
  constructor({ onOpen, onMessage, onStatus, onGiveUp }) {
    this.onOpen = onOpen;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.onGiveUp = onGiveUp;
    this.lostSince = 0; // when we last had (or started trying for) a connection
    this.code = null;
    this.peer = null;
    this.conn = null;
    this.stopped = true;
    this.attempt = 0;
    this.retryTimer = null;
    this.pingTimer = null;
    this.lastPong = 0;
    this.connected = false;

    document.addEventListener('visibilitychange', () => {
      // Coming back to the tab is the most common moment a phone's
      // connection has quietly died. Check right away instead of waiting.
      if (document.visibilityState === 'visible') this.#checkHealth(true);
    });
    window.addEventListener('online', () => this.#checkHealth(true));
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.#checkHealth(true); // restored from bfcache
    });
  }

  start(code) {
    this.code = code;
    this.stopped = false;
    this.attempt = 0;
    this.lostSince = Date.now();
    this.onStatus('connecting');
    this.#connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    this.#teardown();
  }

  send(message) {
    if (!this.conn || !this.conn.open) return false;
    try {
      this.conn.send(message);
      return true;
    } catch (err) {
      console.warn('[phone-net] send failed', err);
      return false;
    }
  }

  async #connect() {
    if (this.stopped) return;
    this.#teardown();
    let Peer;
    try {
      Peer = await loadPeerJS();
    } catch (err) {
      console.warn(err);
      this.onStatus('offline');
      this.#scheduleReconnect();
      return;
    }
    if (this.stopped) return;

    const peer = new Peer({ config: { iceServers: ICE_SERVERS }, debug: 1 });
    this.peer = peer;
    const giveUp = setTimeout(() => {
      if (this.peer === peer && !this.connected) {
        console.warn('[phone-net] connect timed out');
        this.#scheduleReconnect();
      }
    }, CONNECT_TIMEOUT_MS);

    peer.on('open', () => {
      if (this.peer !== peer) return;
      // 'binary' (BinaryPack) splits big messages into chunks. Don't use
      // 'json': PeerJS refuses JSON messages over ~16 KB, which a profile
      // picture easily exceeds, and that error drops the connection.
      const conn = peer.connect(PEER_ID_PREFIX + this.code, { reliable: true, serialization: 'binary' });
      this.conn = conn;

      conn.on('open', () => {
        if (this.conn !== conn) return;
        clearTimeout(giveUp);
        this.connected = true;
        this.attempt = 0;
        this.lastPong = Date.now();
        this.onStatus('connected');
        this.#startPings();
        this.onOpen();
      });
      conn.on('data', (data) => {
        if (this.conn !== conn || !isMessage(data)) return;
        if (data.t === TO_PHONE.PONG) {
          this.lastPong = Date.now();
          return;
        }
        this.lastPong = Date.now(); // any message proves the host is alive
        this.onMessage(data);
      });
      conn.on('close', () => {
        if (this.conn === conn) this.#scheduleReconnect();
      });
      conn.on('error', (err) => {
        console.warn('[phone-net] conn error', err);
        if (this.conn === conn) this.#scheduleReconnect();
      });
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      clearTimeout(giveUp);
      console.warn('[phone-net] peer error:', err.type);
      // 'peer-unavailable' means no host is holding this room code right now
      // (wrong code, or the host page is reloading).
      this.#scheduleReconnect(err.type === 'peer-unavailable' ? 'host-missing' : 'reconnecting');
    });
  }

  #startPings() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      this.send(msg(TO_HOST.PING));
      this.#checkHealth(false);
    }, PING_INTERVAL_MS);
  }

  #checkHealth(immediate) {
    if (this.stopped) return;
    const dead = !this.conn || !this.conn.open || Date.now() - this.lastPong > PONG_TIMEOUT_MS;
    if (this.connected && dead) {
      this.#scheduleReconnect();
    } else if (!this.connected && immediate) {
      // Waiting in backoff: skip the wait.
      clearTimeout(this.retryTimer);
      this.attempt = 0;
      this.#connect();
    } else if (this.connected && immediate) {
      this.send(msg(TO_HOST.PING));
    }
  }

  #scheduleReconnect(status = 'reconnecting') {
    if (this.stopped) return;
    if (this.connected) this.lostSince = Date.now();
    this.connected = false;
    // Don't try forever: the room may be gone for good.
    if (Date.now() - this.lostSince > RECONNECT_GIVE_UP_MS) {
      this.stop();
      this.onGiveUp();
      return;
    }
    clearInterval(this.pingTimer);
    this.#teardown();
    this.onStatus(status);
    clearTimeout(this.retryTimer);
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
    this.attempt++;
    this.retryTimer = setTimeout(() => this.#connect(), delay);
  }

  #teardown() {
    const { conn, peer } = this;
    this.conn = null;
    this.peer = null;
    try { conn?.close(); } catch { /* already closed */ }
    try { peer?.destroy(); } catch { /* already destroyed */ }
  }
}
