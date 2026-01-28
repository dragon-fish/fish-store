import { IFishStore } from './types.js'
import { IDBFishStore } from './adapters/IDBFishStore.js'
import { ClassicStorageFishStore } from './adapters/ClassicStorageFishStore.js'

export type FishStoreEngineName =
  | 'indexedDB'
  | 'localStorage'
  | 'sessionStorage'
  | 'memory'

function canUseIDB() {
  return (
    typeof window !== 'undefined' &&
    'indexedDB' in window &&
    window.indexedDB !== null
  )
}
function canUseLocalStorage() {
  return (
    typeof window !== 'undefined' &&
    'localStorage' in window &&
    window.localStorage !== null
  )
}

const warning = (...args: any[]) => {
  ;(globalThis as any)[''.concat('console')]['warn'](...args)
}

export function createFishStore<T = any>(
  dbName: string,
  storeName: string,
  ttl?: number,
  version?: number | string,
  engine: FishStoreEngineName = 'indexedDB'
): IFishStore<T> {
  if (engine === 'indexedDB' && !canUseIDB()) {
    warning(`indexedDB is not supported, falling back to localStorage`)
    engine = 'localStorage'
  }
  if (
    ['localStorage', 'sessionStorage'].includes(engine) &&
    !canUseLocalStorage()
  ) {
    warning(
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
export * from './adapters/IDBFishStore.js'
export * from './adapters/ClassicStorageFishStore.js'
export * from './models/MemoryStorage.js'
