import type { App } from 'vue'
import { vClickOutside } from './directive'

export const ClickOutsidePlugin = {
  install(app: App) {
    app.directive('click-outside', vClickOutside)
  },
}
