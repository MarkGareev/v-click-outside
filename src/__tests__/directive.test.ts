import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { vClickOutside } from '../directive'
import { ClickOutsidePlugin } from '../plugin'
import type { ClickOutsideHandler } from '../directive'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Dispatch a pointerdown event directly on the target element */
function pointerdown(target: Element): PointerEvent {
  const event = new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

/** Mount a component with the directive and return the wrapper */
function makeWrapper(handler: ClickOutsideHandler) {
  return mount(
    defineComponent({
      directives: { clickOutside: vClickOutside },
      setup: () => ({ handler }),
      template: `
        <div>
          <div v-click-outside="handler" data-testid="target">
            inner
            <span data-testid="child">child</span>
          </div>
          <div data-testid="outside">outside</div>
        </div>
      `,
    }),
    { attachTo: document.body }
  )
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('v-click-outside', () => {
  let handler: ReturnType<typeof vi.fn<(event: PointerEvent) => void>>

  beforeEach(() => { handler = vi.fn<(event: PointerEvent) => void>() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── basic behaviour ───────────────────────────────────────────────────────

  it('calls handler when clicking outside the element', () => {
    const wrapper = makeWrapper(handler)
    pointerdown(wrapper.find('[data-testid="outside"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does NOT call handler when clicking the element itself', () => {
    const wrapper = makeWrapper(handler)
    pointerdown(wrapper.find('[data-testid="target"]').element)
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does NOT call handler when clicking a descendant of the element', () => {
    const wrapper = makeWrapper(handler)
    pointerdown(wrapper.find('[data-testid="child"]').element)
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('passes the PointerEvent as the first argument to the handler', () => {
    const wrapper = makeWrapper(handler)
    const outside = wrapper.find('[data-testid="outside"]').element
    const event = pointerdown(outside)
    expect(handler).toHaveBeenCalledWith(event)
    wrapper.unmount()
  })

  // ── object syntax ─────────────────────────────────────────────────────────

  it('supports { handler } object syntax', () => {
    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ binding: { handler } }),
        template: `<div><div v-click-outside="binding" data-testid="t">x</div><div data-testid="out">out</div></div>`,
      }),
      { attachTo: document.body }
    )
    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('ignore: does not call handler when clicking an ignored element', async () => {
    const Comp = defineComponent({
      directives: { clickOutside: vClickOutside },
      setup() {
        const ignoreEl = ref<HTMLElement | null>(null)
        const binding = { handler, get ignore() { return ignoreEl.value ? [ignoreEl.value] : [] } }
        return { binding, ignoreEl }
      },
      template: `
        <div>
          <div v-click-outside="binding" data-testid="target">T</div>
          <div ref="ignoreEl" data-testid="ignored">ignored</div>
          <div data-testid="outside">outside</div>
        </div>
      `,
      mounted() { (this as any).ignoreEl = this.$el.querySelector('[data-testid="ignored"]') },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()

    pointerdown(wrapper.find('[data-testid="ignored"]').element)
    expect(handler).not.toHaveBeenCalled()

    pointerdown(wrapper.find('[data-testid="outside"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('ignore: does not call handler when clicking a descendant of an ignored element', async () => {
    const Comp = defineComponent({
      directives: { clickOutside: vClickOutside },
      setup() {
        const ignoreEl = ref<HTMLElement | null>(null)
        const binding = { handler, get ignore() { return ignoreEl.value ? [ignoreEl.value] : [] } }
        return { binding, ignoreEl }
      },
      template: `
        <div>
          <div v-click-outside="binding" data-testid="target">T</div>
          <div ref="ignoreEl" data-testid="ignored">
            <span data-testid="ignored-child">child</span>
          </div>
          <div data-testid="outside">outside</div>
        </div>
      `,
      mounted() { (this as any).ignoreEl = this.$el.querySelector('[data-testid="ignored"]') },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()

    pointerdown(wrapper.find('[data-testid="ignored-child"]').element)
    expect(handler).not.toHaveBeenCalled()

    pointerdown(wrapper.find('[data-testid="outside"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('ignore: handles null/undefined entries in the array without throwing', () => {
    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ binding: { handler, ignore: [null, undefined] } }),
        template: `<div><div v-click-outside="binding" data-testid="t">x</div><div data-testid="out">out</div></div>`,
      }),
      { attachTo: document.body }
    )
    expect(() => pointerdown(wrapper.find('[data-testid="out"]').element)).not.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('disabled: true — handler is not called', () => {
    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ binding: { handler, disabled: true } }),
        template: `<div><div v-click-outside="binding" data-testid="t">x</div><div data-testid="out">out</div></div>`,
      }),
      { attachTo: document.body }
    )
    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  // ── updated (reactive binding) ────────────────────────────────────────────

  it('uses the new handler after binding is updated', async () => {
    const handler2 = vi.fn()
    const currentHandler = ref<ClickOutsideHandler>(handler)

    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ currentHandler }),
        template: `<div><div v-click-outside="currentHandler" data-testid="t">x</div><div data-testid="out">out</div></div>`,
      }),
      { attachTo: document.body }
    )

    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler2).not.toHaveBeenCalled()

    currentHandler.value = handler2
    await nextTick()

    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).toHaveBeenCalledTimes(1) // old handler no longer called
    expect(handler2).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('resumes calling handler after disabled changes from true to false', async () => {
    const disabled = ref(true)
    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ get binding() { return { handler, disabled: disabled.value } } }),
        template: `<div><div v-click-outside="binding" data-testid="t">x</div><div data-testid="out">out</div></div>`,
      }),
      { attachTo: document.body }
    )

    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).not.toHaveBeenCalled()

    disabled.value = false
    await nextTick()

    pointerdown(wrapper.find('[data-testid="out"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  // ── unmount ───────────────────────────────────────────────────────────────

  it('removes the listener on unmount', () => {
    const wrapper = makeWrapper(handler)
    wrapper.unmount()
    pointerdown(document.body)
    expect(handler).not.toHaveBeenCalled()
  })

  it('deletes _clickOutside from the element on unmount', () => {
    const wrapper = makeWrapper(handler)
    const el = wrapper.find('[data-testid="target"]').element as any
    expect(el._clickOutside).toBeDefined()
    wrapper.unmount()
    expect(el._clickOutside).toBeUndefined()
  })

  // ── edge cases ────────────────────────────────────────────────────────────

  it('throws TypeError when binding.value is invalid', () => {
    expect(() =>
      mount(
        defineComponent({
          directives: { clickOutside: vClickOutside },
          template: `<div v-click-outside="'bad'">x</div>`,
        }),
        { attachTo: document.body }
      )
    ).toThrow(TypeError)
  })

  it('multiple directives on a page work independently', () => {
    const handlerB = vi.fn()
    const wrapper = mount(
      defineComponent({
        directives: { clickOutside: vClickOutside },
        setup: () => ({ handler, handlerB }),
        template: `
          <div>
            <div v-click-outside="handler"  data-testid="a">A</div>
            <div v-click-outside="handlerB" data-testid="b">B</div>
            <div data-testid="outside">out</div>
          </div>
        `,
      }),
      { attachTo: document.body }
    )

    // Click outside — both handlers fire
    pointerdown(wrapper.find('[data-testid="outside"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(1)

    // Click on A: handler A does not fire, handler B does (A is outside B)
    pointerdown(wrapper.find('[data-testid="a"]').element)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  // ── plugin ────────────────────────────────────────────────────────────────

  it('ClickOutsidePlugin registers the directive globally', () => {
    const registered: Record<string, unknown> = {}
    const fakeApp = {
      directive(name: string, def: unknown) { registered[name] = def },
    }
    ClickOutsidePlugin.install(fakeApp as any)
    expect(registered['click-outside']).toBe(vClickOutside)
  })
})
