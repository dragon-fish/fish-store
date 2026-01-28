# Fish Store

Fish's memory is only 7 seconds — a tiny, universal key-value cache for the browser, with **TTL auto-expiration**, **version-based invalidation**, and **multiple storage engines**.

- **Engines**: `indexedDB` (default), `localStorage`, `sessionStorage`, `memory`
- **TTL**: expire per-store or per-read
- **Versioning**: bump `version` to invalidate old cache
- **Convenience**: `get(key, ttl, setter)` = cache-aside helper
- **Batch writes**: `set({ a, b, c })` and `null`/`undefined` means delete
- **Async iteration**: `keys()`, `values()`, `entries()`

> 这是一个偏浏览器侧的存储工具（会用到 `window/indexedDB/localStorage`）。如果你在 SSR/Node 环境使用，请看下方「SSR / Node 使用」。

## Installation

```sh
pnpm add fish-store
# or
yarn add fish-store
# or
npm i fish-store
```

## Development

Browser tests require Playwright browsers to be installed once:

```sh
pnpm run test:browser:install
pnpm run test:browser
```

By default, browser tests run on **chromium + firefox + webkit**. If you want to run a subset:

```sh
pnpm run test:browser:chromium
pnpm run test:browser:firefox
pnpm run test:browser:webkit
```

## Quick Start

```ts
import { createFishStore } from 'fish-store'

type Profile = { id: string; name: string }

// dbName: your app namespace
// storeName: logical store name
// ttl: milliseconds (<= 0 will be treated as Infinity)
// version: invalidate old cache when changed
// engine: 'indexedDB' | 'localStorage' | 'sessionStorage' | 'memory'
const store = createFishStore<Profile>(
  'my-app',
  'profile',
  10 * 60_000,
  'v1',
  'indexedDB'
)

await store.set('me', { id: '1', name: 'Dragon-Fish' })
const me = await store.get('me')
```

## API

### `createFishStore<T>(dbName, storeName, ttl?, version?, engine?)`

- **Default engine**: `indexedDB`
- **Fallback**: if `indexedDB` is not available, it will fall back to `localStorage`

```ts
import { createFishStore } from 'fish-store'

const cache = createFishStore('my-app', 'http-cache', 60_000)
```

### `store.get(key, ttl?, setter?)`

Read value from cache. Returns `null` if missing/expired/version-mismatch.

```ts
const value = await store.get('k1')
const valueWithCustomTTL = await store.get('k1', 5_000)
```

Cache-aside helper (miss → compute → write back):

```ts
type User = { id: string; name: string }

const userStore = createFishStore<User>('my-app', 'users', 60_000)

const me = await userStore.get('me', 60_000, async () => {
  const res = await fetch('/api/me')
  return (await res.json()) as User
})
```

### `store.set(key, value)` / `store.set(record)`

- `set(key, value)` writes and returns the stored entry `{ time, value, version }`
- `set(key, null | undefined)` deletes
- `set(record)` supports batch writes; `null | undefined` entries will be deleted

```ts
await store.set('a', 1)
await store.set('a', null) // delete

await store.set({
  a: 1,
  b: 2,
  c: null, // delete c
})
```

### `store.has(key, ttl?)`

```ts
if (await store.has('me')) {
  // ...
}
```

### `store.delete(key)` / `store.updatedAt(key)` / `store.clear()`

```ts
await store.delete('me')
const t = await store.updatedAt('me') // 0 if missing
await store.clear()
```

### `store.keys()` / `store.values()` / `store.entries()`

All are `AsyncIterable`, so you can use `for await`.

```ts
for await (const key of store.keys()) {
  console.log(key)
}

for await (const [key, entry] of store.entries()) {
  console.log(key, entry.time, entry.value)
}
```

## Engines & Adapters

### Use adapters directly

```ts
import { IDBFishStore, ClassicStorageFishStore } from 'fish-store'

const idb = new IDBFishStore('my-app', 'idb-store', 60_000, 'v1')
const ls = new ClassicStorageFishStore(
  'my-app',
  'ls-store',
  60_000,
  'v1',
  'localStorage'
)
const ss = new ClassicStorageFishStore(
  'my-app',
  'ss-store',
  60_000,
  'v1',
  'sessionStorage'
)
```

### `ClassicStorageFishStore` key format

When using classic storages, the final key is:

- `"{dbName}:{storeName}/{key}"`
- any missing part will be skipped automatically

### Custom storage (Storage-like)

If you have a `Storage`-like implementation (implements `getItem/setItem/removeItem/clear/key/length`), you can pass it as `engine`:

```ts
import { ClassicStorageFishStore } from 'fish-store'

const myStorage: Storage = window.localStorage
const store = new ClassicStorageFishStore(
  'my-app',
  'custom',
  60_000,
  'v1',
  myStorage
)
```

## SSR / Node 使用

`createFishStore()` 会直接读取 `window.indexedDB` 来判断能力，因此**不要在服务端执行**。

如果你只需要内存级缓存（比如 SSR 期间、单元测试、Node 脚本），可以显式使用 `memory` 引擎：

```ts
import { ClassicStorageFishStore } from 'fish-store'

const store = new ClassicStorageFishStore(
  'my-app',
  'ssr',
  60_000,
  'v1',
  'memory'
)
```

> 注意：在纯 Node 的 TypeScript 项目里，若没有启用 `dom` lib，`Storage` 类型可能不存在；你可以在 tsconfig 里加上 `lib: ["ES2022", "DOM"]`，或用你自己的类型/声明来约束。

## License

MIT
