import getRandomInt from "./getRandomInt.js";

// Based on https://en.wikipedia.org/wiki/Exponential_backoff#Collision_avoidance
const MAX_ATTEMPTS = 16;
const MAX_SLOT_TIMES = 1023;

const buildDelay = (attempt) => {
  const delayBase = 10;
  const slotTime = Math.min(2 ** attempt - 1, MAX_SLOT_TIMES);
  const delayMultiplier = getRandomInt(0, slotTime);

  return delayBase * delayMultiplier;
};

const exponentialBackoff = (attempts, fn, ...args) => {
  fn(attempts, ...args).then((success) => {
    const nextAttemptNumber = attempts + 1;

    if (!success && nextAttemptNumber <= MAX_ATTEMPTS) {
      setTimeout(
        exponentialBackoff,
        buildDelay(nextAttemptNumber),
        nextAttemptNumber,
        fn,
        ...args
      );
    }
  });
};

export default exponentialBackoff;
