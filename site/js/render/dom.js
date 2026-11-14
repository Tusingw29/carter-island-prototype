// Small helpers that only touch the page when something actually changed.
// Rewriting text or positions every frame makes the browser redo layout, which is slow on old laptops.

export function setText(element, text) {
  const value = String(text);
  if (element.textContent !== value) element.textContent = value;
}

export function setHidden(element, hidden) {
  if (element.hidden !== hidden) element.hidden = hidden;
}

export function setWidth(element, percent) {
  const value = `${Math.round(percent)}%`;
  if (element.style.width !== value) element.style.width = value;
}

// Moves an element to a spot on screen, in whole pixels.
export function moveTo(element, left, top) {
  const key = `${Math.round(left)},${Math.round(top)}`;
  if (element.dataset.at === key) return;
  element.dataset.at = key;
  element.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) translate(-50%, -100%)`;
}
