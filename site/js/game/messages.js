// Short on-screen messages, like "Welded shut."
import { CONFIG } from './config.js';

export function say(world, text, seconds = CONFIG.messageSeconds) {
  world.message = { text, until: world.time + seconds };
  world.events.push({ type: 'message', text });
}

export function currentMessage(world) {
  return world.message && world.time < world.message.until ? world.message.text : null;
}
