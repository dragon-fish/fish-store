import { describe, expect, it } from 'vitest'
import { MemoryStorage, useMemoryStorage } from './MemoryStorage.js'

describe('MemoryStorage', () => {
  it('implements basic storage behavior', () => {
    const s = new MemoryStorage()
    expect(s.length).toBe(0)

    s.setItem('a', '1')
    s.setItem('b', '2')
    expect(s.length).toBe(2)
    expect(s.getItem('a')).toBe('1')
    expect(s.getItem('missing')).toBeNull()

    expect(s.key(0)).toBe('a')
    expect(s.key(1)).toBe('b')
    expect(s.key(999)).toBeNull()

    s.removeItem('a')
    expect(s.getItem('a')).toBeNull()
    expect(s.length).toBe(1)

    s.clear()
    expect(s.length).toBe(0)
  })

  it('useMemoryStorage supports property set/get via Proxy', () => {
    const s = useMemoryStorage() as any
    s.foo = 'bar'
    expect(s.getItem('foo')).toBe('bar')
    expect(s.foo).toBe('bar')
  })
})

