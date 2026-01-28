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

  it('set(record) supports batch writes and null/undefined deletes', async () => {
    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore('db', 's', 60_000, 'v1', backing)

    await store.set('a', 1)
    const res = await store.set({ a: null, b: 2, c: undefined, d: 3 })

    expect(res).toHaveProperty('b')
    expect(res).toHaveProperty('d')
    expect(res).not.toHaveProperty('a')
    expect(res).not.toHaveProperty('c')

    expect(await store.get('a')).toBeNull()
    expect(await store.get('b')).toBe(2)
    expect(await store.get('c')).toBeNull()
    expect(await store.get('d')).toBe(3)
  })

  it('ttl expiration makes get return null and has return false', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))
    try {
      const backing = new MemoryStorage()
      const store = new ClassicStorageFishStore('db', 's', 10, 'v1', backing)
      await store.set('k', 'v')

      vi.setSystemTime(new Date('2020-01-01T00:00:00.009Z'))
      expect(await store.get('k')).toBe('v')
      expect(await store.has('k')).toBe(true)

      vi.setSystemTime(new Date('2020-01-01T00:00:00.011Z'))
      expect(await store.get('k')).toBeNull()
      expect(await store.has('k')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('version mismatch invalidates and deletes stored entry', async () => {
    const backing = new MemoryStorage()
    const s1 = new ClassicStorageFishStore('db', 's', 60_000, 'v1', backing)
    await s1.set('k', 'v')

    const fullKey = 'db:s/k'
    expect(backing.getItem(fullKey)).not.toBeNull()

    const s2 = new ClassicStorageFishStore('db', 's', 60_000, 'v2', backing)
    expect(await s2.get('k')).toBeNull()
    expect(backing.getItem(fullKey)).toBeNull()
  })

  it('bad JSON is treated as missing and deleted', async () => {
    const backing = new MemoryStorage()
    const store = new ClassicStorageFishStore('db', 's', 60_000, 'v1', backing)

    const fullKey = 'db:s/k'
    backing.setItem(fullKey, '{not-json')

    expect(await store.get('k')).toBeNull()
    expect(backing.getItem(fullKey)).toBeNull()
  })

  it('keys/values/entries iterate only store-scoped keys', async () => {
    const backing = new MemoryStorage()
    const a = new ClassicStorageFishStore('db', 'a', 60_000, 'v1', backing)
    const b = new ClassicStorageFishStore('db', 'b', 60_000, 'v1', backing)

    await a.set({ k1: 1, k2: 2 })
    await b.set({ k1: 10 })

    const aKeys = await collectAsync(a.keys())
    expect(new Set(aKeys)).toEqual(new Set(['k1', 'k2']))

    const aVals = await collectAsync(a.values())
    expect(aVals.map((x) => x.value).sort()).toEqual([1, 2])

    const aEntries = await collectAsync(a.entries())
    expect(new Set(aEntries.map(([k]) => k))).toEqual(new Set(['k1', 'k2']))
  })

  it('clear removes only keys with the store prefix', async () => {
    const backing = new MemoryStorage()
    const a = new ClassicStorageFishStore('db', 'a', 60_000, 'v1', backing)
    const b = new ClassicStorageFishStore('db', 'b', 60_000, 'v1', backing)

    await a.set({ k1: 1, k2: 2 })
    await b.set({ k1: 10 })

    await a.clear()

    expect(await collectAsync(a.keys())).toEqual([])
    expect(await collectAsync(b.keys())).toEqual(['k1'])
  })
})

