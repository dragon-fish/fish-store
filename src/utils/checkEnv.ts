export function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

export function canUseIDB() {
  return isBrowser() && 'indexedDB' in window && window.indexedDB !== null
}

export function canUseLocalStorage() {
  return isBrowser() && 'localStorage' in window && window.localStorage !== null
}

export function isNodeJSLike() {
  return (
    typeof process !== 'undefined' && typeof process.versions !== 'undefined'
  )
}
