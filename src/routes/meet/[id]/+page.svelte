<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import io from 'socket.io-client';
  import Video from '$lib/components/Video.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';

  let localStream: MediaStream | null = $state(null);
  let remoteStreams: Array<{ id: string; stream: MediaStream }> = $state([]);
  let peerIds: string[] = $state([]);
  let socket: any;
  let Peer: any;
  let mediaError = $state('');
  const params = get(page).params;
  const roomId = params.id;

  async function startLocal() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('getUserMedia success');
    } catch (err) {
      console.error('getUserMedia error', err);
      mediaError = err?.name === 'NotAllowedError'
        ? 'Camera and microphone permission was denied. Please allow access and reload.'
        : 'Unable to access camera or microphone.';
    }
  }

  function addRemote(id, stream) {
    remoteStreams = [...remoteStreams.filter(r => r.id !== id), { id, stream }];
    if (!peerIds.includes(id)) {
      peerIds = [...peerIds, id];
    }
  }

  function removeRemote(id) {
    remoteStreams = remoteStreams.filter(r => r.id !== id);
    peerIds = peerIds.filter(pid => pid !== id);
    peers.delete(id);
  }

  const peers = new Map();

  const peerConfig = {
    trickle: true
  };

  function createPeer(userToSignal, callerId, stream) {
    console.log('createPeer', userToSignal, 'stream:', !!stream, 'Peer valid?', typeof Peer === 'function');
    if (typeof Peer !== 'function') {
      console.error('cannot create peer, Peer is not constructor', Peer);
      return;
    }
    const peer = new Peer({ initiator: true, ...peerConfig });
    if (stream) {
      peer.addStream(stream);
    }

    peer.on('signal', (signal) => {
      console.log('sending-signal to', userToSignal);
      socket.emit('sending-signal', { userToSignal, callerId, signal });
    });

    peer.on('stream', (remoteStream) => {
      console.log('received remote stream from', userToSignal);
      addRemote(userToSignal, remoteStream);
    });

    peer.on('error', (err) => {
      console.error('peer error (initiator)', userToSignal, err);
    });

    peers.set(userToSignal, { peer });
  }

  function addPeer(incomingSignal, callerId, stream) {
    console.log('addPeer', callerId, 'stream:', !!stream, 'Peer valid?', typeof Peer === 'function');
    if (typeof Peer !== 'function') {
      console.error('cannot add peer, Peer is not constructor', Peer);
      return;
    }
    const peer = new Peer({ initiator: false, ...peerConfig });
    if (stream) {
      peer.addStream(stream);
    }

    peer.on('signal', (signal) => {
      console.log('returning-signal to', callerId);
      socket.emit('returning-signal', { callerId, signal });
    });

    peer.on('stream', (remoteStream) => {
      console.log('received remote stream from', callerId);
      addRemote(callerId, remoteStream);
    });

    peer.on('error', (err) => {
      console.error('peer error (receiver)', callerId, err);
    });

    peer.signal(incomingSignal);
    peers.set(callerId, { peer });
  }

  onMount(async () => {
    await startLocal();
    let peerModule = await import('simple-peer');
    Peer = peerModule.default ?? peerModule.Peer ?? peerModule;

    if (typeof Peer !== 'function') {
      console.warn('simple-peer default import was not constructor, trying browser bundle');
      const browserPeer = await import('simple-peer/simplepeer.min.js');
      Peer = browserPeer.default ?? browserPeer.Peer ?? browserPeer;
    }

    console.log('simple-peer loaded', typeof Peer, Peer?.name);
    if (typeof Peer !== 'function') {
      throw new Error('simple-peer constructor not found');
    }

    const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : undefined;
    console.log('connecting socket to', socketUrl ?? 'same origin');

    socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('socket connected', socket.id);
      socket.emit('join-room', roomId);
    });

    socket.on('connect_error', (err) => {
      console.error('socket connect error', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', reason);
    });

    socket.on('all-users', (users) => {
      users.forEach((userId) => {
        createPeer(userId, socket.id, localStream);
      });
    });

    socket.on('user-signal', (payload) => {
      addPeer(payload.signal, payload.callerId, localStream);
    });

    socket.on('receiving-returned-signal', (payload) => {
      const item = peers.get(payload.id);
      if (item) {
        item.peer.signal(payload.signal);
      }
    });

    socket.on('user-left', (id) => {
      removeRemote(id);
    });
  });

  onDestroy(() => {
    socket?.disconnect();
    peers.forEach((value) => value.peer.destroy());
    localStream?.getTracks().forEach((track) => track.stop());
  });

  function s(count: number) {
    return count === 1 ? '' : 's';
  }
</script>

<style>
  .room {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    padding: 1rem;
  }

  .status {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 12px;
    background: #f5f7fb;
    color: #111;
  }

  .error {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 12px;
    background: #fee2e2;
    color: #b91c1c;
  }

  .local {
    position: sticky;
    top: 1rem;
    width: 100%;
    height: 220px;
  }
</style>

<div>
  <div class="status">
    <h2>Room {roomId}</h2>
    <p>{peerIds.length + 1} participant{s(peerIds.length + 1)}</p>
    <p>Open the same room URL in another tab or device to join.</p>
  </div>

  {#if mediaError}
    <div class="error">{mediaError}</div>
  {/if}

  <div class="room">
    {#if localStream}
      <div class="local"><Video stream={localStream} muted={true} /></div>
    {/if}

    {#each remoteStreams as r (r.id)}
      <Video stream={r.stream} />
    {/each}
  </div>
</div>
