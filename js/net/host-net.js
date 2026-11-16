// Host side of the network. Owns the PeerJS Peer whose id is the room code,
// accepts phone connections, and hands raw messages to the lobby/game code.
// This layer knows nothing about players: it only deals in connection ids.
import { ICE_SERVERS, PEER_ID_PREFIX } from '../config.js';
import { isMessage } from './protocol.js';
import { loadPeerJS } from './peer-loader.js';

export class HostNet {
  /**
   * @param {object} handlers
   * @param {(connId:number, msg:object) => void} handlers.onMessage
   * @param {(connId:number) => void} handlers.onClose
   * @param {(status:string, detail?:string) => void} [handlers.onStatus]
   */
  constructor({ onMessage, onClose, onStatus = () => {}, onConnType = null }) {
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onStatus = onStatus;
    this.onConnType = onConnType; // (connId, { type: 'direct' | 'relay', local, remote, protocol, server }) for ?debug=1
    this.peer = null;
    this.conns = new Map(); // connId -> DataConnection
    this.nextConnId = 1;
  }

  /**
   * Claim the room code on the signaling server.
   * If `reclaim` is true (host page reloaded mid-game), keep retrying while the
   * server still holds the old session's id. Otherwise an id that is taken
   * rejects with code 'unavailable-id' so the caller can pick another code.
   */
  async start(code, { reclaim = false } = {}) {
    const Peer = await loadPeerJS();
    const deadline = Date.now() + 60_000;
    for (;;) {
      try {
        await this.#open(Peer, code);
        return;
      } catch (err) {
        if (err.type === 'unavailable-id' && reclaim && Date.now() < deadline) {
          this.onStatus('reclaiming', 'Waiting to get room ' + code + ' back…');
          await sleep(2000);
          continue;
        }
        throw err;
      }
    }
  }

  #open(Peer, code) {
    return new Promise((resolve, reject) => {
      const peer = new Peer(PEER_ID_PREFIX + code, {
        config: { iceServers: ICE_SERVERS },
        debug: 1,
      });
      let opened = false;

      peer.on('open', () => {
        opened = true;
        this.peer = peer;
        this.onStatus('online');
        resolve();
      });

      peer.on('error', (err) => {
        if (!opened) {
          peer.destroy();
          reject(err);
          return;
        }
        // After opening, most errors concern a single phone; just log them.
        console.warn('[host-net] peer error:', err.type, err);
        if (err.type === 'network' || err.type === 'server-error') {
          this.onStatus('signaling-lost', 'Lost contact with the matchmaking server, retrying…');
        }
      });

      // The signaling server connection can drop while data channels stay
      // up. Reconnect so new phones (and reconnecting ones) can still find us.
      peer.on('disconnected', () => {
        if (peer.destroyed) return;
        this.onStatus('signaling-lost', 'Lost contact with the matchmaking server, retrying…');
        setTimeout(() => {
          if (!peer.destroyed && peer.disconnected) peer.reconnect();
        }, 2000);
      });

      peer.on('connection', (conn) => this.#accept(conn));
    });
  }

  #accept(conn) {
    const connId = this.nextConnId++;
    this.conns.set(connId, conn);

    conn.on('data', (data) => {
      if (!isMessage(data)) return;
      try {
        this.onMessage(connId, data);
      } catch (err) {
        console.error('[host-net] handler failed for', data.t, err);
      }
    });

    // Which route did WebRTC pick? Checked a few times: ICE can switch routes.
    if (this.onConnType) {
      const check = async () => {
        if (!this.conns.has(connId)) return;
        const info = await connectionType(conn.peerConnection);
        if (info) this.onConnType(connId, info);
      };
      conn.on('open', () => { for (const ms of [1500, 6000, 20000]) setTimeout(check, ms); });
    }

    const closed = () => {
      if (!this.conns.has(connId)) return;
      this.conns.delete(connId);
      this.onClose(connId);
    };
    conn.on('close', closed);
    conn.on('error', (err) => {
      console.warn('[host-net] connection error', connId, err);
      closed();
    });
  }

  send(connId, message) {
    const conn = this.conns.get(connId);
    if (!conn || !conn.open) return false;
    try {
      conn.send(message);
      return true;
    } catch (err) {
      console.warn('[host-net] send failed', connId, err);
      return false;
    }
  }

  /** Close a connection on purpose (replaced by a newer one, or kicked). */
  close(connId) {
    const conn = this.conns.get(connId);
    this.conns.delete(connId);
    if (conn) {
      // Give a final message time to flush before closing.
      setTimeout(() => conn.close(), 300);
    }
  }

  destroy() {
    this.peer?.destroy();
    this.conns.clear();
  }
}

/**
 * The route a WebRTC connection uses, from its stats: 'relay' if either end of
 * the selected candidate pair is a TURN relay candidate, otherwise 'direct'.
 */
export async function connectionType(pc) {
  if (!pc?.getStats) return null;
  try {
    const stats = await pc.getStats();
    const byId = new Map();
    stats.forEach((s) => byId.set(s.id, s));
    let pair = null;
    stats.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = byId.get(s.selectedCandidatePairId);
    });
    if (!pair) stats.forEach((s) => { if (s.type === 'candidate-pair' && s.state === 'succeeded' && (s.nominated || s.selected) && !pair) pair = s; });
    if (!pair) return null;
    const local = byId.get(pair.localCandidateId);
    const remote = byId.get(pair.remoteCandidateId);
    const relay = local?.candidateType === 'relay' || remote?.candidateType === 'relay';
    return {
      type: relay ? 'relay' : 'direct',
      local: local?.candidateType ?? '?', remote: remote?.candidateType ?? '?',
      protocol: local?.relayProtocol ?? local?.protocol ?? '?',
      server: local?.candidateType === 'relay' ? local.url ?? local.address ?? '' : '',
    };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
