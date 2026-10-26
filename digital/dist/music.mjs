export const MUSIC_KEY = 'geodecoder.digital.music.enabled';
export const MUSIC_TRACKS = Object.freeze({
  menu: './assets/audio/menu.mp3',
  map: './assets/audio/map.mp3'
});

/**
 * Background music owns one Audio element, separate from game sound effects.
 * Call unlock() from a user gesture; a failed play waits for another explicit
 * unlock instead of retrying during navigation or visibility changes.
 * Every playback method returns a promise resolving to whether it is playing.
 * tracks can be relative asset paths or data URLs for an offline HTML build.
 */
export function createMusic(options = {}) {
  const tracks = {...MUSIC_TRACKS, ...options.tracks};
  const doc = options.document === undefined ? globalThis.document : options.document;
  let storage = options.storage, audio = null, destroyed = false;
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { storage = null; }
  }
  let enabled = true;
  try { enabled = !['false', '0'].includes(storage?.getItem(MUSIC_KEY)); } catch {}

  let scene = 'welcome', track = 'menu', loadedTrack = null;
  let unlocked = false, playbackBlocked = false, playing = false, error = null;
  let epoch = 0, attempt = null, lastPublished = '';

  const hidden = () => Boolean(doc?.hidden);
  const mayPlay = () => !destroyed && !!audio && enabled && unlocked && !playbackBlocked && !hidden();
  function snapshot() {
    const isPlaying = playing && mayPlay() && audio.paused !== true;
    return Object.freeze({
      enabled, unlocked, playing:isPlaying, blocked:!unlocked || playbackBlocked,
      scene, track, pending:!!attempt, hidden:hidden(), error,
      status:destroyed ? 'destroyed' : !audio ? 'unavailable' : !enabled ? 'off'
        : hidden() ? 'paused' : !unlocked || playbackBlocked ? 'blocked'
        : isPlaying ? 'playing' : attempt ? 'loading' : 'idle'
    });
  }
  function publish() {
    const state = snapshot(), signature = JSON.stringify(state);
    if (signature === lastPublished) return;
    lastPublished = signature;
    try { options.onChange?.(state); } catch {}
  }
  function pause() {
    epoch++;
    attempt = null;
    playing = false;
    try { audio?.pause(); } catch {}
  }
  function fail(reason) {
    playbackBlocked = true;
    error = typeof reason?.name === 'string' ? reason.name : 'PlaybackError';
    pause();
    publish();
    return false;
  }
  function reconcile() {
    if (!mayPlay()) {
      pause();
      publish();
      return Promise.resolve(false);
    }
    if (loadedTrack !== track) {
      pause();
      try {
        audio.src = tracks[track];
        audio.load?.();
        loadedTrack = track;
      } catch (reason) { return Promise.resolve(fail(reason)); }
    }
    if (attempt) { publish(); return attempt.promise; }
    if (playing && audio.paused !== true) { publish(); return Promise.resolve(true); }

    const id = ++epoch;
    const request = {id, promise:null};
    attempt = request;
    playing = false;
    publish();
    let result;
    try { result = audio.play(); }
    catch (reason) { return Promise.resolve(fail(reason)); }
    request.promise = Promise.resolve(result).then(() => {
      if (id !== epoch) {
        // An aborted request can settle after mute/hide/destroy. Do not pause
        // a newer valid request using this same media element.
        if (!mayPlay()) { try { audio.pause(); } catch {} }
        return false;
      }
      attempt = null;
      if (!mayPlay()) { pause(); publish(); return false; }
      playing = audio.paused !== true;
      error = null;
      publish();
      return playing;
    }, reason => {
      if (id !== epoch) return false;
      return fail(reason);
    });
    return request.promise;
  }
  function visibilityChanged() { void reconcile(); }
  function paused() {
    if (audio?.paused) { playing = false; publish(); }
  }
  function mediaError() {
    fail({name:`MediaError${audio?.error?.code ? ':' + audio.error.code : ''}`});
  }
  function changePreference(next) {
    if (enabled === next) return;
    enabled = next;
    try { if(options.persistEnabled!==false)storage?.setItem(MUSIC_KEY, String(enabled)); } catch {}
  }

  try {
    audio = (options.createAudio || (() => new globalThis.Audio()))();
    if (!audio) throw new Error('Audio unavailable');
    audio.loop = true;
    audio.volume = .22;
    audio.preload = 'none';
    audio.addEventListener?.('pause', paused);
    audio.addEventListener?.('error', mediaError);
  } catch {
    audio = null;
    error = 'AudioUnavailable';
  }
  doc?.addEventListener?.('visibilitychange', visibilityChanged);

  const controller = {
    get state() { return snapshot(); },
    unlock() {
      if (destroyed) return Promise.resolve(false);
      unlocked = true;
      // Only this explicit gesture clears a rejected playback request.
      if (playbackBlocked && error?.startsWith('MediaError')) loadedTrack = null;
      playbackBlocked = false;
      error = audio ? null : error;
      return reconcile();
    },
    setScene(next) {
      if (destroyed) return Promise.resolve(false);
      scene = typeof next === 'string' && next ? next : 'welcome';
      track = ['module', 'game', 'map'].includes(scene.toLowerCase()) ? 'map' : 'menu';
      return reconcile();
    },
    setVolume(value) { if(audio)audio.volume=Math.max(0,Math.min(1,Number(value)||0)); },
    setEnabled(value) {
      if (destroyed) return Promise.resolve(false);
      changePreference(Boolean(value));
      return reconcile();
    },
    toggle() {
      if (destroyed) return Promise.resolve(false);
      const next = !enabled;
      changePreference(next);
      // A music-button click can both enable and unlock playback.
      return next ? controller.unlock() : reconcile();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doc?.removeEventListener?.('visibilitychange', visibilityChanged);
      audio?.removeEventListener?.('pause', paused);
      audio?.removeEventListener?.('error', mediaError);
      pause();
      try { audio?.removeAttribute?.('src'); audio?.load?.(); } catch {}
      publish();
    }
  };
  publish();
  return controller;
}
