export type ClickOutsideHandler = (event: PointerEvent) => void

export interface ClickOutsideOptions {
  /** Handler called when a click outside the element is detected */
  handler: ClickOutsideHandler
  /**
   * List of extra elements to treat as "inside".
   * Clicks on these elements will NOT trigger the handler.
   */
  ignore?: Array<HTMLElement | null | undefined>
  /**
   * If true, the directive is disabled and won't react to clicks.
   * @default false
   */
  disabled?: boolean
}
