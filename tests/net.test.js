// The ?debug=1 connection route check (direct vs TURN relay), from WebRTC stats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectionType } from '../js/net/host-net.js';
import { ICE_SERVERS } from '../js/config.js';

const pc = (localType, remoteType, viaTransport = true) => ({
  getStats: async () => new Map([
    ['T', { id: 'T', type: 'transport', ...(viaTransport ? { selectedCandidatePairId: 'P' } : {}) }],
    ['P', { id: 'P', type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'L', remoteCandidateId: 'R' }],
    ['L', { id: 'L', type: 'local-candidate', candidateType: localType, protocol: 'udp', relayProtocol: localType === 'relay' ? 'tcp' : undefined, url: 'turn:global.relay.metered.ca:443' }],
    ['R', { id: 'R', type: 'remote-candidate', candidateType: remoteType }],
  ]),
});

test('connection route: relay when either end is a TURN candidate, otherwise direct', async () => {
  assert.equal((await connectionType(pc('host', 'srflx'))).type, 'direct');
  assert.equal((await connectionType(pc('srflx', 'relay'))).type, 'relay');
  const r = await connectionType(pc('relay', 'host', false)); // Firefox-style: no transport pointer
  assert.equal(r.type, 'relay');
  assert.equal(r.protocol, 'tcp');
  assert.equal(await connectionType(null), null);
});

test('the Metered TURN relay is configured next to the STUN servers', () => {
  const urls = ICE_SERVERS.flatMap((s) => [].concat(s.urls));
  for (const u of ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478', 'stun:stun.relay.metered.ca:80',
    'turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp', 'turn:global.relay.metered.ca:443',
    'turns:global.relay.metered.ca:443?transport=tcp']) assert.ok(urls.includes(u), u);
  for (const s of ICE_SERVERS.filter((x) => [].concat(x.urls).some((u) => u.startsWith('turn')))) assert.ok(s.username && s.credential);
});
