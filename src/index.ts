/**
 * FishStore - Fish's memory is only 7 seconds
 * @desc localStorage based Object storage with auto cache time
 *
 * @author Dragon-Fish <dragon-fish@qq.com>
 * @license MIT
 */

import { type Ref, shallowRef, effect } from '@vue/reactivity'

export class FishStore<T extends unknown = {}> {
  readonly #STORAGE_KEY_DATA: string
  readonly #STORAGE_KEY_TIME: string
  readonly #valueRef: Ref<T | null>

  constructor(readonly name: string, readonly maxAge = 7e3) {
    if (!name) throw new Error('FishStore require a name')
    this.#STORAGE_KEY_DATA = `${name}/data`
    this.#STORAGE_KEY_TIME = `${name}/time`

    // Don't delete this temporary variable
    // effect will be triggered once each instance is created
    // We need to reset the cache time
    const _cacheTime = this.cacheTime
    this.#valueRef = shallowRef(this.getItem(true))
    effect(() => {
      this.setItem(this.#valueRef.value!)
    })
    localStorage.setItem(this.#STORAGE_KEY_TIME, '' + _cacheTime)
  }

  // Methods
  getItem(force?: boolean): T | null {
    if (this.isExpired && !force) {
      return null
    }
    const raw = this.rawData
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  setItem(data: T) {
    localStorage.setItem(this.#STORAGE_KEY_DATA, JSON.stringify(data))
    localStorage.setItem(this.#STORAGE_KEY_TIME, '' + Date.now())
    return this
  }
  removeItem() {
    localStorage.removeItem(this.#STORAGE_KEY_DATA)
    localStorage.removeItem(this.#STORAGE_KEY_TIME)
    return this
  }

  // Reactivity sugar
  get value() {
    if (this.isExpired) {
      return null
    }
    return this.#valueRef.value
  }
  set value(data: T | null) {
    this.#valueRef.value = data
  }

  // Getters
  get rawData() {
    return localStorage.getItem(this.#STORAGE_KEY_DATA)
  }
  get cacheTime() {
    const time = +(localStorage.getItem(this.#STORAGE_KEY_TIME) || '0')
    return isNaN(time) ? 0 : time
  }
  get isExpired() {
    return Date.now() >= this.cacheTime + this.maxAge
  }
}

export function createWeel(name: string, maxAge = 7e3) {
  return new FishStore(name, maxAge)
}

export { createWeel as createStore }
