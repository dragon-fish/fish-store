export function useInterval(cb: () => void) {
  let stop = false
  const update = () => {
    if (stop) return
    cb()
    requestAnimationFrame(update)
  }
  update()
  return () => {
    stop = true
  }
}
