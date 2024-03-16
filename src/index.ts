/**
 * FishStore - Fish's memory is only 7 seconds
 * @desc localStorage based Object storage with auto cache time
 *
 * @author Dragon-Fish <dragon-fish@qq.com>
 * @license MIT
 */

import { type ComputedRef, computed, ref } from '@vue/reactivity'
import { useInterval } from './utils/useInterval'
import { useStorage, type RemovableRef } from './utils/useStorage'

export class FishStore<T extends unknown = {}> {
  readonly #STORAGE_KEY_DATA: string
  readonly #STORAGE_KEY_TIME: string
  readonly #dataStore: RemovableRef<T>
  readonly #timeStore: RemovableRef<number>
  readonly #isExpired: ComputedRef<boolean>
  readonly #timeNow = ref(Date.now())
  readonly #stopInterval: () => void

  /**
   * @param name Storage name
   * @param maxAge Max cache time in ms, default `Infinity`, that means never expired.
   *               Please note that any false value will be treated as `Infinity`.
   */
  constructor(readonly name: string, readonly maxAge: number = Infinity) {
    if (!name) throw new Error('FishStore require a name')

    this.#STORAGE_KEY_DATA = `${name}/data`
    this.#STORAGE_KEY_TIME = `${name}/time`

    this.#dataStore = useStorage<T>(this.#STORAGE_KEY_DATA, null as T)
    this.#timeStore = useStorage<number>(this.#STORAGE_KEY_TIME, 0)

    this.#isExpired = computed(() => {
      if (!this.maxAge || this.maxAge === Infinity) return false
      return this.#timeNow.value >= this.#timeStore.value + this.maxAge
    })

    this.#stopInterval = useInterval(() => {
      this.#timeNow.value = Date.now()
    })
  }

  get value() {
    return this.getItem()
  }
  set value(payload: T | null) {
    this.setItem(payload as T)
  }

  // Methods
  /**
   * Get the data from the store
   * @param force Force to get the data from the store, ignore the cache time
   * @returns
   * - `null` if the data is expired and `force` is `false`
   * - `T` if the data is not expired or `force` is `true`
   */
  getItem(force?: boolean): T | null {
    if (this.#isExpired.value && !force) {
      return null
    }
    return this.#dataStore.value
  }
  /**
   * Set the data to the store
   * @param data Data to be stored
   * @returns `this`
   */
  setItem(data: T) {
    this.#dataStore.value = data
    this.#timeStore.value = Date.now()
    return this
  }
  /**
   * Remove the data from the store
   * @returns `this`
   */
  removeItem() {
    this.#dataStore.value = null as T
    this.#timeStore.value = 0
    return this
  }

  /**
   * Destroy the FishStore instance, eliminate side effects
   */
  destroy() {
    this.#dataStore.destroy()
    this.#timeStore.destroy()
    this.#stopInterval()
    const e = () => new Error('FishStore has been destroyed')
    Object.defineProperties(this, {
      getItem: { value: e },
      setItem: { value: e },
      removeItem: { value: e },
      value: { get: e, set: e },
      destroy: { value: e },
    })
  }

  // Getters
  get rawValue() {
    return this.#dataStore.value
  }
  get updateTime() {
    return this.#timeStore.value
  }
  get isExpired() {
    return this.#isExpired.value
  }
}

export function createWeel(name: string, maxAge = 7e3) {
  return new FishStore(name, maxAge)
}

export { createWeel as createStore }
