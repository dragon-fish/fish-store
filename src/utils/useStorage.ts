import { type Ref, effect, ref } from '@vue/reactivity'

export interface RemovableRef<T> extends Ref<T> {
  destroy: () => void
}

export function useStorage<T>(name: string, initialVal?: T): RemovableRef<T> {
  initialVal = initialVal === undefined ? (null as T) : initialVal
  const data = ref() as Ref<T>
  const raw = localStorage.getItem(name)
  if (raw) {
    try {
      data.value = JSON.parse(raw)
    } catch (e) {
      console.error(e)
      data.value = initialVal
    }
  } else {
    data.value = initialVal
  }

  const paused = ref(false)

  effect(() => {
    if (!paused.value) {
      localStorage.setItem(name, JSON.stringify(data.value))
    }
  })

  const listener = (e: StorageEvent) => {
    if (paused.value) return
    if (e.key === name) {
      paused.value = true
      data.value = JSON.parse(e.newValue || 'null')
      paused.value = false
    }
  }
  window.addEventListener('storage', listener)

  Object.defineProperty(data, 'destroy', {
    value: () => {
      window.removeEventListener('storage', listener)
    },
  })

  return data as RemovableRef<T>
}
