import { describe, expect, it } from 'vitest'
import { LRUMap } from './LRUMap.js'

describe('LRUMap', () => {
  it('respects the limit and evicts least recently used', () => {
    const lru = new LRUMap<string, number>(2)

    lru.set('a', 1)
    lru.set('b', 2)
    expect(lru.get('a')).toBe(1) // Mark 'a' as recently used

    lru.set('c', 3) // Evicts 'b'
    expect(lru.get('b')).toBeUndefined()
    expect(lru.get('a')).toBe(1)
    expect(lru.get('c')).toBe(3)
  })

  it('refresh position on get', () => {
    const lru = new LRUMap<string, number>(2)
    lru.set('a', 1)
    lru.set('b', 2)
    lru.get('a') // a is now most recent
    lru.set('c', 3) // should evict b
    expect(lru.get('b')).toBeUndefined()
    expect(lru.get('a')).toBe(1)
  })

  it('deletes correctly', () => {
    const lru = new LRUMap<string, number>(10)
    lru.set('a', 1)
    lru.delete('a')
    expect(lru.get('a')).toBeUndefined()
  })

  it('clears correctly', () => {
    const lru = new LRUMap<string, number>(10)
    lru.set('a', 1)
    lru.set('b', 2)
    lru.clear()
    expect(lru.get('a')).toBeUndefined()
    expect(lru.get('b')).toBeUndefined()
  })
})
