import { describe, expect, it } from 'vitest'
import { isStorageLike } from './isStorageLike.js'

describe('isStorageLike', () => {
  it('returns false for non-objects', () => {
    expect(isStorageLike(null)).toBe(false)
    expect(isStorageLike(undefined)).toBe(false)
    expect(isStorageLike(123)).toBe(false)
    expect(isStorageLike('x')).toBe(false)
  })

  it('returns true for storage-like objects (even without global Storage)', () => {
    const storageLike = {
      length: 0,
      clear() {},
      getItem(_k: string) {
        return null
      },
      key(_i: number) {
        return null
      },
      removeItem(_k: string) {},
      setItem(_k: string, _v: string) {},
    }

    expect(isStorageLike(storageLike)).toBe(true)
  })

  it('returns false for missing methods', () => {
    expect(
      isStorageLike({
        length: 0,
        clear() {},
        getItem() {
          return null
        },
      })
    ).toBe(false)
  })
})

