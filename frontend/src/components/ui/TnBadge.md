# TnBadge

React wrapper for the centralized `.tn-badge` CSS classes (Vague 2 P2.4).

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | `"neutral"` | `promo` `new` `success` `warning` `danger` `info` `neutral` `count` |
| size | string | `"sm"` | `xs` `sm` `md` |
| badgeStyle | string | `"solid"` | `solid` `soft` `outline` |
| pill | boolean | `false` | Pill shape (999px radius) instead of rounded (6px) |
| pop | boolean | `false` | Pop-in animation on mount |
| leftIcon | ReactNode | — | Icon before label |
| count | number | — | For variant="count", takes precedence over children |
| className | string | `""` | Additional CSS classes |

All other props are spread to the `<span>`.

## Examples

```jsx
// Promo badge on a book card
<TnBadge variant="promo">-30%</TnBadge>

// Status badge in admin (soft style)
<TnBadge variant="success" badgeStyle="soft"
  leftIcon={<i className="fas fa-check" />}>
  Payee
</TnBadge>

// Cart count (pill shape)
<TnBadge variant="count" count={3} />

// New book with pop animation
<TnBadge variant="new" pop>Nouveau</TnBadge>

// Outline format badge
<TnBadge variant="info" badgeStyle="outline">PDF</TnBadge>
```

## Accessibility

- For count badges used as notifications, add `aria-label`:
  `<TnBadge variant="count" count={3} aria-label="3 articles dans le panier" />`
- The `leftIcon` wrapper has `aria-hidden="true"` (decorative).

## Migration

Existing badge patterns (`.tn-book-card__badge`, `.tn-header__badge`, etc.)
will be migrated to `<TnBadge>` progressively during Vague 4.
