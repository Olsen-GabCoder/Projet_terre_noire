# TnPrice

Price display component for Terre Noire Editions (Vague 2.5 P2).
Playfair Display serif for values, Inter for FCFA suffix.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| amount | number | — | Price value (0 = "Gratuit") |
| oldAmount | number | — | Legacy alias for originalAmount (promo strike) |
| originalAmount | number | — | Original price before discount |
| size | string | `"md"` | `xs` `sm` `md` `lg` `xl` |
| variant | string | auto | `default` `promo` `free` `range` `muted` (auto-detected) |
| rangeMax | number | — | Max price for range variant |
| layout | string | `"horizontal"` | `horizontal` `vertical` (promo layout) |
| showDiscount | boolean | auto | Show -X% badge (default true for promo) |
| currency | string | `"FCFA"` | Currency suffix |
| locale | string | `"fr-FR"` | Number formatting locale |

## Auto-detection

- `amount === 0` -> variant "free" (renders "Gratuit")
- `rangeMax` provided -> variant "range"
- `originalAmount > amount` -> variant "promo" (strike + discount)
- Otherwise -> variant "default" (orange)

## Examples

```jsx
// Basic price
<TnPrice amount={15000} />

// Promo with discount badge
<TnPrice amount={15000} oldAmount={20000} />

// BookDetail vertical promo
<TnPrice amount={15000} originalAmount={20000} size="lg" layout="vertical" />

// Free
<TnPrice amount={0} />

// Range
<TnPrice amount={15000} rangeMax={25000} />

// Muted (non-promo, gray)
<TnPrice amount={15000} variant="muted" size="xl" />

// Inline in text
Ce livre coute <TnPrice amount={15000} size="xs" />.
```

## Backward compatibility

`oldAmount` and `originalAmount` are aliases. BookCard.jsx uses
`oldAmount`, which is preserved. Migration to `originalAmount`
deferred to Vague 4.
