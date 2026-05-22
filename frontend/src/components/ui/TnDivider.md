# TnDivider

Visual separator with multiple styles (Vague 2.5 P4).
Default: gold ornament (diamond SVG) for editorial identity.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | `"ornament"` | `default` `thick` `dashed` `gradient` `ornament` `warm` |
| spacing | string | — | `sm` `md` `lg` (margin top/bottom) |
| onDark | boolean | `false` | Dark background mode |
| dark | boolean | `false` | Legacy alias for onDark |
| label | string | — | Center text (renders line—label—line) |
| style | object | — | Inline style override (legacy compat) |

## Examples

```jsx
// Default ornament (gold diamond)
<TnDivider />

// Simple thin line
<TnDivider variant="default" spacing="md" />

// Dashed
<TnDivider variant="dashed" spacing="sm" />

// Gradient fade
<TnDivider variant="gradient" spacing="lg" />

// Warm orange
<TnDivider variant="warm" />

// With label
<TnDivider variant="default" label="OU" spacing="md" />

// On dark background
<TnDivider onDark spacing="md" />
```

## Backward compatibility

`dark` is a legacy alias for `onDark`. Footer.jsx and AuthorDetail.jsx
use `<TnDivider dark />` which continues to work.

The default variant is `"ornament"` (preserves the existing SVG diamond
from the original component). New usages that want a plain line should
specify `variant="default"`.
