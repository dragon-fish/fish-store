import { IFishStore } from './types.js'
import { IDBFishStore } from './adapters/IDBFishStore.js'
import { ClassicStorageFishStore } from './adapters/ClassicStorageFishStore.js'
import { canUseIDB, canUseLocalStorage } from './utils/checkEnv.js'

export type FishStoreEngineName =
  | 'indexedDB'
  | 'localStorage'
  | 'sessionStorage'
  | 'memory'

export function createFishStore<T = any>(
  dbName: string,
  storeName: string,
  ttl?: number,
  version?: number | string,
  engine: FishStoreEngineName = 'indexedDB'
): IFishStore<T> {
  if (engine === 'indexedDB' && !canUseIDB()) {
    console.warn(`indexedDB is not supported, falling back to localStorage`)
    engine = 'localStorage'
  }
  if (
    ['localStorage', 'sessionStorage'].includes(engine) &&
    !canUseLocalStorage()
  ) {
    console.warn(
      `${engine} is not supported in this environment, falling back to memory`
    )
    engine = 'memory'
  }
  switch (engine) {
    case 'indexedDB':
      return new IDBFishStore<T>(dbName, storeName, ttl, version)
    case 'localStorage':
    case 'sessionStorage':
    case 'memory':
      return new ClassicStorageFishStore<T>(
        dbName,
        storeName,
        ttl,
        version,
        engine
      )
    default:
      throw new Error(`Unsupported storage engine: ${engine}`)
  }
}

export type * from './types.js'
export * from './adapters/AbstractFishStore.js'
export * from './adapters/IDBFishStore.js'
export * from './adapters/ClassicStorageFishStore.js'
export * from './models/LRUMap.js'
export * from './models/MemoryStorage.js'
export * from './utils/checkEnv.js'
