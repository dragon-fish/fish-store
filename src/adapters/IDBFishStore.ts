import { IDBPlus } from 'idb-plus'
import { IFishStoreEntry } from '../types.js'
import { AbstractFishStore } from './AbstractFishStore.js'

export class IDBFishStore<T = unknown> extends AbstractFishStore<T> {
  readonly db: IDBPlus<string, IFishStoreEntry<T>>

  constructor(
    readonly dbName: string,
    readonly storeName: string,
    public ttl: number = Infinity,
    public version?: number | string
  ) {
    super(dbName, storeName, ttl, version)
    this.db = new IDBPlus<string, IFishStoreEntry<T>>(dbName, storeName)
  }

  protected async loadEntry(key: string): Promise<IFishStoreEntry<T> | null> {
    const data = await this.db.get(key)
    if (data === void 0) return null
    // Structural checks
    if (typeof data.time !== 'number' || typeof data.value === 'undefined') {
      try {
        await this.removeEntry(key)
      } catch (_) {}
      return null
    }
    return data
  }

  protected async saveEntry(
    key: string,
    entry: IFishStoreEntry<T>
  ): Promise<void> {
    await this.db.set(key, entry)
  }

  protected async removeEntry(key: string): Promise<void> {
    await this.db.delete(key)
  }

  protected async saveEntries(
    entries: [string, IFishStoreEntry<T>][]
  ): Promise<void> {
    await this.db.setMany(entries)
  }

  protected async removeEntries(keys: string[]): Promise<void> {
    await this.db.deleteMany(keys)
  }

  async *rawKeys(): AsyncIterable<string> {
    for await (const key of this.db.keys()) {
      yield key
    }
  }

  async *rawEntries(): AsyncIterable<[string, IFishStoreEntry<T>]> {
    for await (const [key, entry] of this.db.entries()) {
      yield [key, entry]
    }
  }

  async clear(): Promise<this> {
    this.cache?.clear()
    await this.db.clear()
    return this
  }
}
