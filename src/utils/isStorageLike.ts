export function isStorageLike(obj: unknown): obj is Storage {
  return (
    (typeof Storage !== 'undefined' && obj instanceof Storage) ||
    (typeof obj === 'object' &&
      obj !== null &&
      'getItem' in obj &&
      'setItem' in obj &&
      'removeItem' in obj &&
      'clear' in obj &&
      'key' in obj &&
      'length' in obj)
  )
}
