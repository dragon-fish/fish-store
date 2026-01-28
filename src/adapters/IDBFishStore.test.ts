import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest'
import { IDBFishStore } from './IDBFishStore.js'

async function collectAsync<T>(iter: AsyncIterable<T>) {
  const out: T[] = []
  for await (const v of iter) out.push(v)
  return out
}

// Since IDBFishStore needs a real IndexedDB, these tests should run in a browser environment.
// Vitest browser mode handles this.
describe.runIf(typeof indexedDB !== 'undefined')('IDBFishStore', () => {
  const dbName = 'test-db'
  const storeName = 'test-store'

  it('set/get/has/delete/updatedAt works', async () => {
    const store = new IDBFishStore(dbName, storeName, 60_000, 'v1')

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
  })

  it('ttl expiration with checkTTL option', async () => {
    vi.useFakeTimers()
    const now = 1000000
    vi.setSystemTime(now)

    const store = new IDBFishStore(dbName, 'ttl-test', 1000, 'v1')
    await store.set('k', 'v')

    // 500ms later - not expired
    vi.setSystemTime(now + 500)
    expect(await store.get('k')).toBe('v')
    expect(await collectAsync(store.keys({ checkTTL: true }))).toEqual(['k'])

    // 1500ms later - expired
    vi.setSystemTime(now + 1500)
    expect(await store.get('k')).toBeNull()

    // keys() with checkTTL: false (default) should still return it if not yet purged
    expect(await collectAsync(store.keys())).toEqual(['k'])

    // keys() with checkTTL: true should filter it out and trigger purge
    expect(await collectAsync(store.keys({ checkTTL: true }))).toEqual([])

    vi.useRealTimers()
  })

  it('rawGet and rawEntries do not filter', async () => {
    const store = new IDBFishStore(dbName, 'raw-test', 1000, 'v1')
    await store.set('k', 'v')

    // Manually expire
    vi.useFakeTimers()
    vi.advanceTimersByTime(2000)

    expect(await store.get('k')).toBeNull()
    const raw = await store.rawGet('k')
    expect(raw).not.toBeNull()
    expect(raw?.value).toBe('v')

    const entries = await collectAsync(store.rawEntries())
    expect(entries.length).toBe(1)
    expect(entries[0][0]).toBe('k')

    vi.useRealTimers()
  })

  it('purgeExpiredEntries manually cleans up', async () => {
    const store = new IDBFishStore(dbName, 'purge-test', 1000, 'v1')
    await store.set('k1', 'v1')
    await store.set('k2', 'v2')

    vi.useFakeTimers()
    vi.advanceTimersByTime(2000)

    // Before purge, rawEntries still shows them
    expect((await collectAsync(store.rawEntries())).length).toBe(2)

    await store.purgeExpiredEntries()

    // After purge, rawEntries should be empty
    expect((await collectAsync(store.rawEntries())).length).toBe(0)

    vi.useRealTimers()
  })

  it('version mismatch is handled', async () => {
    const s1 = new IDBFishStore(dbName, 'ver-test', 60_000, 'v1')
    await s1.set('k', 'v')

    const s2 = new IDBFishStore(dbName, 'ver-test', 60_000, 'v2')
    expect(await s2.get('k')).toBeNull()
    // Should have been deleted by s2's get attempt
    expect(await s2.rawGet('k')).toBeNull()
  })

  it('batch set works with custom results', async () => {
    const store = new IDBFishStore(dbName, 'batch-test')
    const results = await store.set({ a: 1, b: 2, c: null })

    expect(results.a).toBeDefined()
    expect(results.b).toBeDefined()
    expect(await store.get('a')).toBe(1)
    expect(await store.get('b')).toBe(2)
    expect(await store.get('c')).toBeNull()
  })
})
