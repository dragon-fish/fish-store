/**
 * FishStore - Fish's memory is only 7 seconds
 * @desc localStorage based Object storage with auto cache time
 *
 * @author Dragon-Fish <dragon-fish@qq.com>
 * @license MIT
 */

import { type ComputedRef, computed, ref } from '@vue/reactivity'
import { useStorage, type RemovableRef } from '@vueuse/core'

export class FishStore<T extends unknown = {}> {
  readonly #STORAGE_KEY_DATA: string
  readonly #STORAGE_KEY_TIME: string
  readonly #dataStore: RemovableRef<T>
  readonly #timeStore: RemovableRef<number>
  #timeNow = ref(Date.now())
  isExpired: ComputedRef<boolean>

  /**
   * @param name Storage name
   * @param maxAge Max cache time in ms, default `Infinity`, that means never expired.
   *               Please note that any false value will be treated as `Infinity`.
   */
  constructor(readonly name: string, readonly maxAge: number = Infinity) {
    if (!name) throw new Error('FishStore require a name')

    this.#STORAGE_KEY_DATA = `${name}/data`
    this.#STORAGE_KEY_TIME = `${name}/time`

    this.#dataStore = useStorage<T>(this.#STORAGE_KEY_DATA, null)
    this.#timeStore = useStorage<number>(this.#STORAGE_KEY_TIME, 0)

    this.isExpired = computed(() => {
      if (!this.maxAge || this.maxAge === Infinity) return false
      return this.#timeNow.value >= this.#timeStore.value + this.maxAge
    })
    setInterval(() => {
      this.#timeNow.value = Date.now()
    }, 100)
  }

  get value() {
    return this.getItem()
  }
  set value(payload: T | null) {
    this.setItem(payload as T)
  }

  // Methods
  getItem(force?: boolean): T | null {
    if (this.isExpired.value && !force) {
      return null
    }
    return this.#dataStore.value
  }
  setItem(data: T) {
    this.#dataStore.value = data
    this.#timeStore.value = Date.now()
    return this
  }
  removeItem() {
    this.#dataStore.value = null
    this.#timeStore.value = 0
    return this
  }

  // Getters
  get rawValue() {
    return this.#dataStore.value
  }
  get updateTime() {
    return this.#timeStore.value
  }
}

export function createWeel(name: string, maxAge = 7e3) {
  return new FishStore(name, maxAge)
}

export { createWeel as createStore }
