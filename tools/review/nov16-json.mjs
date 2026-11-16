// Long display-only strings become arrays of text chunks; numeric telemetry is unchanged.
export function reviewJSON(value) {
  const display = (item) => {
    if (Array.isArray(item)) return item.map(display);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).map(([key, part]) => [key, display(part)]));
    }
    if (typeof item !== 'string' || (!item.includes('\n') && item.length <= 85)) return item;
    return item.split('\n').flatMap((line) => line.match(/.{1,85}/g) ?? ['']);
  };
  return JSON.stringify(display(value), null, 2) + '\n';
}
