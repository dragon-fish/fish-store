import { describe, expect, it, vi } from 'vitest'
import { ClassicStorageFishStore } from './ClassicStorageFishStore.js'
import { MemoryStorage } from '../models/MemoryStorage.js'

async function collectAsync<T>(iter: AsyncIterable<T>) {
  const out: T[] = []
  for await (const v of iter) out.push(v)
  return out
}

describe('ClassicStorageFishStore', () => {
  it('set/get/has/delete/updatedAt works with custom storage', async () => {
    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore('db', 's', 60_000, 'v1', backing)

    expect(await store.get('k')).toBeNull()
    expect(await store.has('k')).toBe(false)
    expect(await store.updatedAt('k')).toBe(0)

    const rec = await store.set('k', { a: 1 })
    expect(rec.value).toEqual({ a: 1 })
    expect(rec.version).toBe('v1')
    expect(await store.get('k')).toEqual({ a: 1 })
    expect(await store.has('k')).toBe(true)
    expect(await store.updatedAt('k')).toBe(rec.time)

    await store.delete('k')
    expect(await store.get('k')).toBeNull()
    expect(await store.has('k')).toBe(false)
    expect(await store.updatedAt('k')).toBe(0)
  })

  it('LRU cache works as expected', async () => {
    const backing = new MemoryStorage()
    // Spy on backing.getItem
    const getItemSpy = vi.spyOn(backing, 'getItem')

    const store = new ClassicStorageFishStore(
      'db',
      'cache-test',
      60_000,
      'v1',
      backing
    )
    store.useCache(2) // limit to 2

    await store.set('k1', 1)
    await store.set('k2', 2)

    getItemSpy.mockClear()

    // Should come from cache, no getItem call
    expect(await store.get('k1')).toBe(1)
    expect(getItemSpy).not.toHaveBeenCalled()

    // Trigger cache eviction of k1 by adding k2 and k3 without accessing k1 again
    // Currently cache has [k2, k1] (k1 is most recent due to get)
    // To evict k1, we need to make others more recent.
    await store.get('k2') // cache: [k1, k2]
    await store.set('k3', 3) // cache size 2, evicts k1
    getItemSpy.mockClear()

    // k1 should now be evicted, should call getItem
    expect(await store.get('k1')).toBe(1)
    expect(getItemSpy).toHaveBeenCalled()
  })

  it('keys() with checkTTL filters expired items and performs read-repair', async () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore(
      'db',
      'ttl-test',
      1000,
      'v1',
      backing
    )

    await store.set('k1', 'v1')
    vi.setSystemTime(now + 2000) // Expire k1

    // Default keys() doesn't check TTL
    expect(await collectAsync(store.keys())).toEqual(['k1'])

    // keys({ checkTTL: true }) filters it
    const filteredKeys = await collectAsync(store.keys({ checkTTL: true }))
    expect(filteredKeys).toEqual([])

    // Should perform read-repair (delete)
    expect(backing.length).toBe(0)

    vi.useRealTimers()
  })

  it('rawGet and rawEntries ignore TTL and Version', async () => {
    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore(
      'db',
      'raw-test',
      10,
      'v1',
      backing
    )

    await store.set('k', 'v')

    vi.useFakeTimers()
    vi.advanceTimersByTime(100)

    expect(await store.get('k')).toBeNull()
    const raw = await store.rawGet('k')
    expect(raw).not.toBeNull()
    expect(raw?.value).toBe('v')

    const rawEntries = await collectAsync(store.rawEntries())
    expect(rawEntries.length).toBe(1)
    expect(rawEntries[0][1].value).toBe('v')

    vi.useRealTimers()
  })

  it('purgeExpiredEntries cleans up storage', async () => {
    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore(
      'db',
      'purge-test',
      10,
      'v1',
      backing
    )

    await store.set('k1', 1)
    await store.set('k2', 2)

    vi.useFakeTimers()
    vi.advanceTimersByTime(100)

    expect(backing.length).toBe(2)
    await store.purgeExpiredEntries()
    expect(backing.length).toBe(0)

    vi.useRealTimers()
  })
})
