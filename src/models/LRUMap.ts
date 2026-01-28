/**
 * A simple LRU Map for caching
 */
export class LRUMap<K, V> {
  private cache = new Map<K, V>()

  constructor(public readonly limit: number = 100) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (typeof value !== 'undefined') {
      // Refresh position
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.limit) {
      // Delete oldest (first key)
      const oldestKey = this.cache.keys().next().value
      if (typeof oldestKey !== 'undefined') {
        this.cache.delete(oldestKey)
      }
    }
    this.cache.set(key, value)
  }

  delete(key: K): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
