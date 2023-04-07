# Fish Store

Fish's memory is only 7 seconds - localStorage based Object storage with auto cache time.

## Installation

### Install from npm

You can install FishStore from npm:

```sh
# Via pnpm
pnpm add fish-store
# Using yarn? OK
yarn add fish-store
# Or just using npm
npm install fish-store
```

Then import it to your project

```ts
import { FishStore } from 'fish-store'
const store = new FishStore('wuchang-fish', 7e3)
```

### Browser

You can include the script directly in your HTML file:

```html
<!-- e.g. unpkg -->
<script src="https://unpkg.com/fish-store"></script>
<script>
  const store = FishStore.createStore('bass', 7e3)
</script>
```

Or...why not ESM:

```html
<script>
  import('https://unpkg.com/fish-store/dist/index.mjs').then(
    ({ FishStore }) => {
      // ...
    }
  )
</script>
```

## Example

```ts
import { FishStore } from 'fish-store'

async function lookingMyWeel(): Fish[] {
  const weel = new FishStore<Fish[]>('my-weel', 10 * 60 * 1000) // create a store with 10 minutes cache
  const cache = weel.getItem() // or `const cache = weel.value`
  if (cache) {
    return cache
  }
  const fishes = await fishing()
  weel.setCache(fishes) // or `weel.value = fishes`
  return fishes
}

interface Fish {
  type: string
  kg: number
}
```

## Usage

### `new FishStore<T>(readonly name: string, readonly maxAge?: number)`

Create a store with given `namespace` & `maxAge` (in millisecond, defaults to `7e3`).

**Sugar**

```ts
// also called `createStore`
function createWeel(name: string, maxAge?: number): FishStore
```

### `getItem(): T | null`

Returns the stored data. `null` if expired.

### `setItem(data: T): this`

Set data and refresh the cache time.

### `removeItem(): this`

Remove related data.

### Reactivity sugar `getter/setter value`

- get `value`: same as `getItem`
- set `value`: same as `setItem`

---

> MIT License
>
> Copyright (c) 2023 机智的小鱼君 (A.K.A. Dragon-Fish)
