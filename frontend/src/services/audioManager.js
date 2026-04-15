/**
 * audioManager — singleton that tracks active Audio instances and
 * provides a single stopAll() entry point used during logout to
 * immediately silence all speech synthesis and audio playback.
 *
 * Components with long-running async speech chains (e.g. FluencyTherapy's
 * breathing sequence) register an abort callback here. stopAll() invokes
 * every registered callback so those chains terminate at their next
 * isCancelledRef guard, even if speechSynthesis.cancel() alone would not
 * prevent the next queued utterance from being spoken.
 */
const audioManager = {
  _activeAudio: null,
  // Map of id → abort callback registered by mounted components
  _abortCallbacks: new Map(),

  /**
   * Register an Audio element so it can be stopped on logout.
   * Call this immediately after creating `new Audio(...)`.
   * @param {HTMLAudioElement} audio
   */
  setActiveAudio(audio) {
    this._activeAudio = audio;
  },

  /**
   * Clear the tracked Audio element (call after it finishes naturally).
   */
  clearActiveAudio() {
    this._activeAudio = null;
  },

  /**
   * Register a callback that will be invoked by stopAll() to signal
   * a component's in-flight async speech chain to abort.
   * @param {string} id   Unique key (e.g. component name + instance id)
   * @param {Function} cb Zero-argument function that sets isCancelledRef.current = true
   * @returns {Function}  Unregister function — call it from the component's cleanup
   */
  registerAbortCallback(id, cb) {
    this._abortCallbacks.set(id, cb);
    return () => this._abortCallbacks.delete(id);
  },

  /**
   * Stop all active speech synthesis, tracked Audio playback, and notify
   * every registered component abort callback.
   * Safe to call at any time — no-ops if nothing is playing.
   */
  stopAll() {
    // Notify all mounted speech components to abort their async chains
    this._abortCallbacks.forEach((cb) => {
      try { cb(); } catch (_) { /* ignore */ }
    });

    // Stop Web Speech API synthesis (used by all three therapy components)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop any tracked Audio element (e.g. FluencyTherapy playRecording)
    if (this._activeAudio) {
      try {
        this._activeAudio.pause();
        this._activeAudio.src = '';
      } catch (_) {
        // Ignore errors from already-released audio objects
      }
      this._activeAudio = null;
    }
  },
};

export default audioManager;
