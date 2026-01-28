import { IFishStoreEntry } from '../types.js'
import { isStorageLike } from '../utils/isStorageLike.js'
import { MemoryStorage, useMemoryStorage } from '../models/MemoryStorage.js'
import { AbstractFishStore } from './AbstractFishStore.js'

export type ClassicStorageFishStoreEngine =
  | Storage
  | 'localStorage'
  | 'sessionStorage'
  | 'memory'

export class ClassicStorageFishStore<T = unknown> extends AbstractFishStore<T> {
  static memoryStorage: MemoryStorage = useMemoryStorage()

  private db: Storage
  private prefix: string

  constructor(
    public dbName?: string,
    readonly storeName?: string,
    public ttl: number = Infinity,
    public version?: number | string,
    public engine: ClassicStorageFishStoreEngine = 'localStorage'
  ) {
    super(dbName, storeName, ttl, version)

    // Initialize storage engine
    if (this.engine === 'localStorage') {
      this.db = globalThis.localStorage
    } else if (this.engine === 'sessionStorage') {
      this.db = globalThis.sessionStorage
    } else if (isStorageLike(this.engine)) {
      this.db = this.engine
    } else {
      this.db = ClassicStorageFishStore.memoryStorage
    }

    // Cache prefix
    this.prefix = `${this.dbName ? this.dbName + ':' : ''}${
      this.storeName ? this.storeName + '/' : ''
    }`

    // Start with cache enabled by default for ClassicStorage to mitigate JSON.parse overhead
    this.useCache(100)
  }

  // Key builder
  private makeKey(key: string) {
    return this.prefix + key
  }

  protected loadEntry(key: string): IFishStoreEntry<T> | null {
    const fullKey = this.makeKey(key)
    const raw = this.db.getItem(fullKey)
    if (raw === null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (_) {
      this.db.removeItem(fullKey)
      return null
    }
    const rec = parsed as Partial<IFishStoreEntry<T>>
    // Structural checks
    if (typeof rec.time !== 'number' || !('value' in rec)) {
      this.db.removeItem(fullKey)
      return null
    }
    return rec as IFishStoreEntry<T>
  }

  protected saveEntry(key: string, entry: IFishStoreEntry<T>): void {
    const fullKey = this.makeKey(key)
    try {
      this.db.setItem(fullKey, JSON.stringify(entry))
    } catch (_) {
      // Quota exceeded or write error — silently ignore for now.
    }
  }

  protected removeEntry(key: string): void {
    const fullKey = this.makeKey(key)
    this.db.removeItem(fullKey)
  }

  async clear(): Promise<this> {
    this.cache?.clear()
    // Remove only keys with our prefix
    const prefix = this.prefix
    const toRemove: string[] = []
    for (let i = 0; i < this.db.length; i++) {
      const k = this.db.key(i)
      if (k && k.startsWith(prefix)) toRemove.push(k)
    }
    for (const k of toRemove) this.db.removeItem(k)
    return this
  }

  // Async generators
  async *rawKeys(): AsyncIterable<string> {
    const prefix = this.prefix
    for (let i = 0; i < this.db.length; i++) {
      const k = this.db.key(i)
      if (k && k.startsWith(prefix)) yield k.slice(prefix.length)
    }
  }

  async *rawEntries(): AsyncIterable<[string, IFishStoreEntry<T>]> {
    const prefix = this.prefix
    for (let i = 0; i < this.db.length; i++) {
      const fullKey = this.db.key(i)
      if (fullKey && fullKey.startsWith(prefix)) {
        const key = fullKey.slice(prefix.length)
        const entry = this.loadEntry(key)
        if (entry) {
          yield [key, entry]
        }
      }
    }
  }
}
