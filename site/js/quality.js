// Picture quality: the share of the screen's own pixels that is drawn. On a slow machine it
// steps down. When the frames are fast again it steps back up, carefully, so it does not flicker.
// Plain numbers, no drawing, so the rules can be tested.

// Resolution steps, as a share of the screen's own pixels. Lower is faster and blurrier.
export const QUALITY_STEPS = Object.freeze([1, 0.75, 0.55]);
const SLOW_FRAME_MS = 24;
const FAST_FRAME_MS = 20;
// Two seconds of slow frames in a row steps down.
const SLOW_FRAMES_TO_DROP = 120;
// About three seconds of fast frames in a row steps back up.
const FAST_FRAMES_TO_RISE = 180;
// If a step up turns out too slow, the next try waits twice as long, up to this many frames.
const MAX_FRAMES_TO_RISE = 3600;
// A step up that is undone within this many frames counts as a failed try.
const TRIAL_FRAMES = 600;

// pinned: true keeps the picture at the lowest step for good (the ?low link).
export function createQuality(pinned = false) {
  return {
    level: pinned ? QUALITY_STEPS.length - 1 : 0,
    pinned,
    slowFrames: 0,
    fastFrames: 0,
    framesToRise: FAST_FRAMES_TO_RISE,
    // Frames since the last step up, or null if the last change was a step down.
    sinceRise: null,
  };
}

export const qualityShare = (quality) => QUALITY_STEPS[quality.level];

// Call once per frame with how long the frame took. Returns true if the level changed.
export function watchQuality(quality, frameMs) {
  if (quality.pinned) return false;
  quality.slowFrames = frameMs > SLOW_FRAME_MS ? quality.slowFrames + 1 : 0;
  quality.fastFrames = frameMs < FAST_FRAME_MS ? quality.fastFrames + 1 : 0;
  if (quality.sinceRise !== null) quality.sinceRise += 1;

  if (quality.slowFrames >= SLOW_FRAMES_TO_DROP && quality.level < QUALITY_STEPS.length - 1) {
    // Dropping straight after a step up means this machine cannot hold that step: wait longer
    // before trying again.
    if (quality.sinceRise !== null && quality.sinceRise <= TRIAL_FRAMES) {
      quality.framesToRise = Math.min(MAX_FRAMES_TO_RISE, quality.framesToRise * 2);
    }
    quality.level += 1;
    quality.slowFrames = 0;
    quality.fastFrames = 0;
    quality.sinceRise = null;
    return true;
  }
  if (quality.fastFrames >= quality.framesToRise && quality.level > 0) {
    quality.level -= 1;
    quality.slowFrames = 0;
    quality.fastFrames = 0;
    quality.sinceRise = 0;
    return true;
  }
  return false;
}
