import type { DirectiveBinding, ObjectDirective } from 'vue'
import type { ClickOutsideHandler, ClickOutsideOptions } from './types'

export type { ClickOutsideHandler, ClickOutsideOptions } from './types'

interface ClickOutsideEl extends HTMLElement {
  _clickOutside?: {
    options: Required<ClickOutsideOptions>
    listener: (e: PointerEvent) => void
  }
}

function parseBinding(binding: DirectiveBinding): Required<ClickOutsideOptions> {
  if (typeof binding.value === 'function') {
    return { handler: binding.value, ignore: [], disabled: false }
  }

  if (
    binding.value !== null &&
    typeof binding.value === 'object' &&
    typeof binding.value.handler === 'function'
  ) {
    return {
      handler: binding.value.handler,
      ignore: binding.value.ignore ?? [],
      disabled: binding.value.disabled ?? false,
    }
  }

  throw new TypeError(
    '[v-click-outside] value must be a Function or { handler: Function, ignore?: HTMLElement[], disabled?: boolean }'
  )
}

function getEventTarget(event: PointerEvent): Node | null {
  // composedPath()[0] gives the correct target inside Shadow DOM
  return (event.composedPath()[0] as Node) ?? null
}

// The listener is created once in mounted and lives until unmounted.
// Options are read from el._clickOutside.options on every event so that
// updated() can swap them without recreating the listener.
function buildListener(el: ClickOutsideEl) {
  return (event: PointerEvent): void => {
    const state = el._clickOutside
    if (!state) return
    if (state.options.disabled) return

    const target = getEventTarget(event)
    if (!target) return

    // Click on the element itself or one of its descendants
    if (el === target || el.contains(target)) return

    // Click on an ignored element or one of its descendants
    const hit = state.options.ignore.some(
      (ignoreEl) => ignoreEl != null && (ignoreEl === target || ignoreEl.contains(target))
    )
    if (hit) return

    state.options.handler(event)
  }
}

export const vClickOutside: ObjectDirective<ClickOutsideEl> = {
  mounted(el, binding) {
    const options = parseBinding(binding)
    const listener = buildListener(el)

    el._clickOutside = { options, listener }
    // passive: true — handler cannot call preventDefault() on the pointer event
    document.addEventListener('pointerdown', listener, { passive: true })
  },

  updated(el, binding) {
    if (!el._clickOutside) return
    el._clickOutside.options = parseBinding(binding)
  },

  unmounted(el) {
    if (el._clickOutside) {
      document.removeEventListener('pointerdown', el._clickOutside.listener)
      delete el._clickOutside
    }
  },
}
