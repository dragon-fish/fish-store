import { IFishStore, IFishStoreEntry } from '../types.js'
import { LRUMap } from '../models/LRUMap.js'

/**
 * Abstract base class for FishStore adapters.
 * Handles common logic like TTL, versioning, and method overloads.
 */
export abstract class AbstractFishStore<T = unknown> implements IFishStore<T> {
  public ttl: number = Infinity
  public version?: number | string
  protected cache?: LRUMap<string, IFishStoreEntry<T>>

  constructor(
    public dbName?: string,
    readonly storeName?: string,
    ttl: number = Infinity,
    version?: number | string
  ) {
    this.version = version
    if (typeof ttl !== 'number') {
      this.ttl = Number(ttl)
    } else {
      this.ttl = ttl
    }
    if (isNaN(this.ttl) || this.ttl <= 0) {
      this.ttl = Infinity
    }
  }

  /**
   * Enable in-memory LRU cache
   * @param limit - max number of entries to cache
   */
  public useCache(limit: number = 100): this {
    this.cache = new LRUMap<string, IFishStoreEntry<T>>(limit)
    return this
  }

  protected isExpired(
    entry: IFishStoreEntry<T> | null,
    ttl = this.ttl
  ): boolean {
    if (!entry) return false
    return Date.now() - entry.time > ttl
  }

  protected validateVersion(entry: IFishStoreEntry<T>): boolean {
    if (typeof this.version === 'undefined') return true
    return entry.version === this.version
  }

  async get(
    key: string,
    ttl = this.ttl,
    setter?: () => Promise<T> | T
  ): Promise<T | null> {
    let entry = await this.loadEntryWithCache(key)

    if (entry && !this.validateVersion(entry)) {
      await this.delete(key)
      entry = null
    }

    if (!entry || this.isExpired(entry, ttl)) {
      if (typeof setter === 'function') {
        const newValue = await setter()
        await this.set(key, newValue as T)
        return newValue as T
      }
      return null
    }
    return entry.value
  }

  async set(key: string, value: null | undefined): Promise<void>
  async set(key: string, value: T): Promise<IFishStoreEntry<T>>
  async set(
    record: Record<string, T | null | undefined>
  ): Promise<Record<string, IFishStoreEntry<T> | void>>
  async set(
    keyOrRecord: string | Record<string, T | null | undefined>,
    maybeValue?: T | null | undefined
  ): Promise<
    IFishStoreEntry<T> | void | Record<string, IFishStoreEntry<T> | void>
  > {
    const now = Date.now()

    if (typeof keyOrRecord === 'string') {
      const key = keyOrRecord
      const value = maybeValue as T | null | undefined
      if (value === null || typeof value === 'undefined') {
        await this.delete(key)
        return
      }
      const entry: IFishStoreEntry<T> = {
        time: now,
        value,
        version: this.version,
      }
      await this.saveEntryWithCache(key, entry)
      return entry
    }

    const recordObj = keyOrRecord as Record<string, T | null | undefined>
    const results: Record<string, IFishStoreEntry<T> | void> = {}
    const toSave: [string, IFishStoreEntry<T>][] = []
    const toDelete: string[] = []

    for (const [k, v] of Object.entries(recordObj)) {
      if (v === null || typeof v === 'undefined') {
        toDelete.push(k)
      } else {
        const entry: IFishStoreEntry<T> = {
          time: now,
          value: v as T,
          version: this.version,
        }
        toSave.push([k, entry])
        results[k] = entry
      }
    }

    if (toSave.length > 0) {
      await this.saveEntries(toSave)
      if (this.cache) {
        for (const [k, e] of toSave) this.cache.set(k, e)
      }
    }
    if (toDelete.length > 0) {
      await this.removeEntries(toDelete)
      if (this.cache) {
        for (const k of toDelete) this.cache.delete(k)
      }
    }

    return results
  }

  async has(key: string, ttl = this.ttl): Promise<boolean> {
    const entry = await this.loadEntryWithCache(key)
    if (!entry) return false
    if (!this.validateVersion(entry)) {
      await this.delete(key)
      return false
    }
    return !this.isExpired(entry, ttl)
  }

  async delete(key: string): Promise<void> {
    this.cache?.delete(key)
    await this.removeEntry(key)
  }

  async updatedAt(key: string): Promise<number> {
    const entry = await this.rawGet(key)
    if (entry && this.validateVersion(entry)) {
      return entry.time
    }
    return 0
  }

  async rawGet(key: string): Promise<IFishStoreEntry<T> | null> {
    return await this.loadEntryWithCache(key)
  }

  // Abstract methods to be implemented by adapters
  protected abstract loadEntry(
    key: string
  ): Promise<IFishStoreEntry<T> | null> | IFishStoreEntry<T> | null
  protected abstract saveEntry(
    key: string,
    entry: IFishStoreEntry<T>
  ): Promise<void> | void
  protected abstract removeEntry(key: string): Promise<void> | void

  // Internal cache helpers
  protected async loadEntryWithCache(
    key: string
  ): Promise<IFishStoreEntry<T> | null> {
    if (this.cache) {
      const cached = this.cache.get(key)
      if (cached) return cached
    }
    const entry = await this.loadEntry(key)
    if (entry && this.cache) {
      this.cache.set(key, entry)
    }
    return entry
  }

  protected async saveEntryWithCache(
    key: string,
    entry: IFishStoreEntry<T>
  ): Promise<void> {
    this.cache?.set(key, entry)
    await this.saveEntry(key, entry)
  }

  // Default implementations for batch operations, can be overridden for performance
  protected async saveEntries(
    entries: [string, IFishStoreEntry<T>][]
  ): Promise<void> {
    for (const [key, entry] of entries) {
      await this.saveEntry(key, entry)
    }
  }

  protected async removeEntries(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.removeEntry(key)
    }
  }

  public abstract clear(): Promise<this>

  // Common iterator logic using rawEntries/rawKeys
  async *keys(options?: { checkTTL?: boolean }): AsyncIterable<string> {
    const checkTTL = options?.checkTTL ?? false
    if (!checkTTL) {
      for await (const key of this.rawKeys()) {
        yield key
      }
      return
    }

    const toDelete: string[] = []
    for await (const [key, entry] of this.rawEntries()) {
      if (this.validateVersion(entry) && !this.isExpired(entry)) {
        yield key
      } else {
        toDelete.push(key)
      }
    }
    if (toDelete.length > 0) {
      this.removeEntries(toDelete).catch(() => {})
    }
  }

  async *values(options?: {
    checkTTL?: boolean
  }): AsyncIterable<IFishStoreEntry<T>> {
    const checkTTL = options?.checkTTL ?? false
    const toDelete: string[] = []
    for await (const [key, entry] of this.rawEntries()) {
      if (
        !checkTTL ||
        (this.validateVersion(entry) && !this.isExpired(entry))
      ) {
        yield entry
      } else {
        toDelete.push(key)
      }
    }
    if (toDelete.length > 0) {
      this.removeEntries(toDelete).catch(() => {})
    }
  }

  async *entries(options?: {
    checkTTL?: boolean
  }): AsyncIterable<[string, IFishStoreEntry<T>]> {
    const checkTTL = options?.checkTTL ?? false
    const toDelete: string[] = []
    for await (const [key, entry] of this.rawEntries()) {
      if (
        !checkTTL ||
        (this.validateVersion(entry) && !this.isExpired(entry))
      ) {
        yield [key, entry]
      } else {
        toDelete.push(key)
      }
    }
    if (toDelete.length > 0) {
      this.removeEntries(toDelete).catch(() => {})
    }
  }

  public abstract rawKeys(): AsyncIterable<string>
  public abstract rawEntries(): AsyncIterable<[string, IFishStoreEntry<T>]>

  public async purgeExpiredEntries(): Promise<void> {
    const now = Date.now()
    const toDelete: string[] = []
    for await (const [key, entry] of this.rawEntries()) {
      if (
        (typeof entry.time === 'number' && now - entry.time > this.ttl) ||
        !this.validateVersion(entry)
      ) {
        toDelete.push(key)
      }
    }
    if (toDelete.length > 0) {
      await this.removeEntries(toDelete)
      if (this.cache) {
        for (const k of toDelete) this.cache.delete(k)
      }
    }
  }
}
