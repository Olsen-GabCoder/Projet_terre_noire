# TnTooltip

Lightweight tooltip component (Vague 4 A.0).
Hover + focus trigger, keyboard Escape dismiss, 4 positions with CSS arrow.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| text | string | (required) | Tooltip content |
| position | string | `"top"` | `top` / `bottom` / `left` / `right` |
| delay | number | `200` | Delay before showing (ms) |
| maxWidth | number | `240` | Max width (px) |
| disabled | boolean | `false` | Disable tooltip |
| children | ReactNode | (required) | Trigger element (single child) |

## Accessibility

- `role="tooltip"` on the tooltip element
- `aria-describedby` injected on the child when visible
- Trigger: hover (mouse) + focus (keyboard)
- Escape key dismisses tooltip
- `prefers-reduced-motion`: transitions disabled

## Examples

```jsx
// Basic (top position)
<TnTooltip text="Fondee en 2025 au coeur de Port-Gentil">
  <button>Logo</button>
</TnTooltip>

// Bottom position
<TnTooltip text="Ajouter a la liste de souhaits" position="bottom">
  <i className="fas fa-heart" />
</TnTooltip>

// Disabled
<TnTooltip text="Won't show" disabled>
  <span>No tooltip</span>
</TnTooltip>
```
