// Loads the pinned PeerJS build from the CDN once and returns the Peer class.
import { PEERJS_URL } from '../config.js';

let loading = null;

export function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.crossOrigin = 'anonymous';
    s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS loaded but Peer is missing')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load PeerJS from the CDN. Check your connection.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}
