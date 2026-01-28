import { describe, expect, it, vi } from 'vitest'
import { createFishStore } from './index.js'
import { ClassicStorageFishStore } from './adapters/ClassicStorageFishStore.js'
import { IDBFishStore } from './adapters/IDBFishStore.js'

describe('createFishStore', () => {
  it('returns IDBFishStore when indexedDB is available (browser)', () => {
    if (typeof window === 'undefined') return
    const store = createFishStore('db', 's')
    expect(store).toBeInstanceOf(IDBFishStore)
  })

  it('falls back to memory in Node/SSR (no window)', async () => {
    if (typeof window !== 'undefined') return
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const store = createFishStore('db', 's')
      expect(store).toBeInstanceOf(ClassicStorageFishStore)
      expect((store as any).engine).toBe('memory')
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('uses requested engine when provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const store = createFishStore('db', 's', 123, 'v1', 'memory')
      expect(store).toBeInstanceOf(ClassicStorageFishStore)
      expect((store as any).engine).toBe('memory')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('throws for unsupported engine', () => {
    expect(() =>
      createFishStore('db', 's', 1, 'v1', 'nope' as any)
    ).toThrow(/Unsupported storage engine/i)
  })
})

