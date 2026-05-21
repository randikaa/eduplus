<script lang="ts">
  const { stream = null, muted = false } = $props<{ stream: MediaStream | null; muted?: boolean }>();
  let videoEl: HTMLVideoElement;

  $effect(() => {
    if (videoEl && stream) {
      try {
        videoEl.srcObject = stream;
      } catch (e) {}
    }
  });
</script>

<video bind:this={videoEl} autoplay playsinline {muted}></video>

<style>
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: black;
    border-radius: 8px;
  }
</style>
