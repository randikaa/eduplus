<script lang="ts">
import { goto } from '$app/navigation';
let roomId = $state('');

function createRoom() {
  roomId = Math.random().toString(36).slice(2, 9);
  goto(`/meet/${roomId}`);
}

function join() {
  if (!roomId) return;
  goto(`/meet/${roomId}`);
}
</script>

<div style="padding: 2rem; max-width: 640px; margin: 0 auto;">
  <h1>Meet — create or join a room</h1>
  <p>Use the same room ID in multiple tabs/devices to join the same meeting.</p>

  <div style="margin-top:1rem; display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-start;">
    <input
      placeholder="room id"
      style="flex:1; min-width:220px; padding:0.75rem; border-radius:8px; border:1px solid #ccc;"
      bind:value={roomId}
    />
    <button style="padding:0.75rem 1rem; border-radius:8px;" onclick={join}>Join</button>
    <button style="padding:0.75rem 1rem; border-radius:8px;" onclick={createRoom}>Create</button>
  </div>

  {#if roomId}
    <p style="margin-top:1rem;">Room id: <strong>{roomId}</strong></p>
  {/if}
</div>
