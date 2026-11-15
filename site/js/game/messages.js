// Short on-screen messages, like "Welded shut."
import { CONFIG } from './config.js';

export function say(world, text, seconds = CONFIG.messageSeconds) {
  world.message = { text, until: world.time + seconds };
  world.events.push({ type: 'message', text });
}

// A message to show once the one on screen has had its time.
export function sayAfter(world, text, seconds = CONFIG.messageSeconds) {
  world.messageQueue.push({ text, seconds });
}

// Called every step: brings up the next waiting message when the screen is free.
export function updateMessages(world) {
  if (world.messageQueue.length === 0) return;
  if (world.message && world.time < world.message.until) return;
  const next = world.messageQueue.shift();
  say(world, next.text, next.seconds);
}

export function currentMessage(world) {
  return world.message && world.time < world.message.until ? world.message.text : null;
}
