export interface IFishStoreEntry<T = any> {
  /** last update time */
  time: number
  /** stored value */
  value: T
  /** version */
  version?: number | string
}

export interface IFishStore<T = unknown> {
  get(
    key: string,
    ttl?: number,
    setter?: () => Promise<any> | any
  ): Promise<T | null>
  set(key: string, value: null | undefined): Promise<void>
  set(
    record: Record<string, T | null | undefined>
  ): Promise<Record<string, IFishStoreEntry<T> | void>>
  set(key: string, value: T): Promise<IFishStoreEntry<T>>
  has(key: string, ttl?: number): Promise<boolean>
  delete(key: string): Promise<void>
  keys(options?: { checkTTL?: boolean }): AsyncIterable<string>
  values(options?: { checkTTL?: boolean }): AsyncIterable<IFishStoreEntry<T>>
  entries(options?: {
    checkTTL?: boolean
  }): AsyncIterable<[string, IFishStoreEntry<T>]>
  updatedAt(key: string): Promise<number>
  clear(): Promise<this>
  rawGet(key: string): Promise<IFishStoreEntry<T> | null>
  rawEntries(): AsyncIterable<[string, IFishStoreEntry<T>]>
  purgeExpiredEntries(): Promise<void>
}
