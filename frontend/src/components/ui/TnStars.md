# TnStars

Star rating display + interactive mode (Vague 2.5 P3).
Orange Terre Noire identity. Font Awesome fa-star icons.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | `0` | Rating 0-5 (supports half: 4.5) |
| max | number | `5` | Max stars |
| size | string | `"sm"` | `xs` `sm` `md` `lg` |
| count | number | — | Number of reviews (legacy: shown if provided) |
| showCount | boolean | `false` | Show "N avis" text |
| showValue | boolean | `false` | Show numeric value "4.5" |
| interactive | boolean | `false` | Enable click-to-rate mode |
| onChange | function | — | Called with value (1-5) when interactive |
| variant | string | `"default"` | `default` `compact` |
| label | string | auto | Custom aria-label |

## Examples

```jsx
// Basic read-only
<TnStars value={4.5} />

// With count (legacy compat — count shown automatically)
<TnStars value={4.2} count={38} />

// With explicit showCount + showValue
<TnStars value={4.5} showValue showCount count={38} size="md" />

// Interactive
<TnStars interactive onChange={setRating} size="lg" />

// Compact
<TnStars value={4.5} variant="compact" />
```

## Backward compatibility

BookCard uses `<TnStars value={rating} count={book.rating_count} />`.
This is preserved: when `count` is provided without `showCount`, the
count is shown automatically (legacy behavior).

## Migration

BookDetail inline rating code (read-only + interactive) deferred to Vague 4.
