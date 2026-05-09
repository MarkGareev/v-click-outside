# v-click-outside

> Vue 3 directive that fires when a click is registered outside of an element.  
> TypeScript-first · Zero dependencies · Shadow DOM ready · SSR safe

[![npm version](https://img.shields.io/npm/v/vue3-click-outside-directive)](https://www.npmjs.com/package/vue3-click-outside-directive)
[![license](https://img.shields.io/npm/l/vue3-click-outside-directive)](./LICENSE)

---

## Installation

```bash
npm install v-click-outside
# or
pnpm add v-click-outside
# or
yarn add v-click-outside
```

---

## Vue 3

### Global registration

Register the plugin once in `main.ts` — the directive becomes available in every component.

```ts
// main.ts
import { createApp } from "vue";
import { ClickOutsidePlugin } from "v-click-outside";
import App from "./App.vue";

const app = createApp(App);
app.use(ClickOutsidePlugin);
app.mount("#app");
```

```vue
<template>
  <div v-click-outside="onClickOutside">...</div>
</template>

<script setup lang="ts">
function onClickOutside(event: PointerEvent) {
  console.log("clicked outside", event);
}
</script>
```

### Local registration

Import the directive directly in the component — no global setup needed.

```vue
<script setup lang="ts">
import { vClickOutside } from "v-click-outside";

function onClickOutside(event: PointerEvent) {
  console.log("clicked outside", event);
}
</script>

<template>
  <div v-click-outside="onClickOutside">...</div>
</template>
```

### TypeScript — global directive types

When using global registration, add a type declaration so the template gets proper type checking:

```ts
// src/types/directives.d.ts
import type { Directive } from "vue";
import type { ClickOutsideHandler, ClickOutsideOptions } from "v-click-outside";

declare module "vue" {
  interface GlobalDirectives {
    vClickOutside: Directive<
      HTMLElement,
      ClickOutsideHandler | ClickOutsideOptions
    >;
  }
}
```

---

## Nuxt 3 / Nuxt 4

### Plugin

Create a plugin file — Nuxt picks it up automatically, no manual registration needed.

```ts
// plugins/v-click-outside.ts
import { ClickOutsidePlugin } from "v-click-outside";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ClickOutsidePlugin);
});
```

### TypeScript — global directive types

```ts
// types/directives.d.ts
import type { Directive } from "vue";
import type { ClickOutsideHandler, ClickOutsideOptions } from "v-click-outside";

declare module "vue" {
  interface GlobalDirectives {
    vClickOutside: Directive<
      HTMLElement,
      ClickOutsideHandler | ClickOutsideOptions
    >;
  }
}
```

### SSR

The directive is SSR-safe — it registers the `pointerdown` listener only in `mounted`, which runs exclusively on the client.

---

## API

### Simple — pass a handler function

```vue
<div v-click-outside="handler" />
```

```ts
function handler(event: PointerEvent) {
  console.log("clicked outside", event);
}
```

### Advanced — pass an options object

```vue
<div v-click-outside="{ handler, ignore: [triggerEl], disabled: isDisabled }" />
```

| Option     | Type                                      | Default | Description                                            |
| ---------- | ----------------------------------------- | ------- | ------------------------------------------------------ |
| `handler`  | `(e: PointerEvent) => void`               | —       | **Required.** Called when a click outside is detected  |
| `ignore`   | `Array<HTMLElement \| null \| undefined>` | `[]`    | Elements whose clicks are treated as "inside"          |
| `disabled` | `boolean`                                 | `false` | Disable the directive without removing it from the DOM |

---

## Examples

### Dropdown menu

The most common use case. The `ignore` option prevents the trigger button from immediately closing the menu it just opened.

```vue
<script setup lang="ts">
import { ref } from "vue";

const open = ref(false);
const triggerRef = ref<HTMLElement>();

function close() {
  open.value = false;
}
</script>

<template>
  <button ref="triggerRef" @click="open = !open">Menu</button>

  <ul v-if="open" v-click-outside="{ handler: close, ignore: [triggerRef] }">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</template>
```

> **Why `ignore: [triggerRef]`?**  
> Without it, clicking the button fires `@click` (opens the menu) and `v-click-outside` simultaneously (closes it), because the button is outside the `<ul>`. Adding it to `ignore` breaks the cycle.

### Modal / dialog

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <div v-if="modelValue" class="overlay">
    <div
      v-click-outside="() => emit('update:modelValue', false)"
      class="dialog"
    >
      <slot />
    </div>
  </div>
</template>
```

### Conditionally disable

```vue
<template>
  <div
    v-click-outside="{
      handler: onClickOutside,
      disabled: !isEditing,
    }"
  >
    ...
  </div>
</template>
```

---

## How it works

- Listens to `pointerdown` on `document` — fires before `click` and works for touch events
- Uses `event.composedPath()` for correct Shadow DOM support, falls back to `event.target`
- The listener is created once in `mounted` and removed in `unmounted` — no leaks
- On `updated`, options are swapped in-place without recreating the listener
- `null` / `undefined` entries in `ignore` are safely skipped

---

## License

MIT
