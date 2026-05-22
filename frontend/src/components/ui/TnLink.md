# TnLink

React wrapper for the `.tn-link` CSS classes (Vague 2.5 P1).

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| to | string | — | Internal route (uses React Router Link) |
| href | string | — | External URL or anchor |
| variant | string | `"default"` | `default` `muted` `strong` `ghost` |
| onDark | boolean | `false` | On dark background variant |
| external | boolean | `false` | Force external marker (auto-detected for http URLs) |
| leftIcon | ReactNode | — | Icon before label |
| rightIcon | ReactNode | — | Icon after label |
| className | string | `""` | Additional CSS classes |

All other props are spread to the rendered element.

## Routing logic

- `to` provided: renders React Router `<Link to={...}>`
- `href` with external URL: renders `<a target="_blank" rel="noopener noreferrer">` + external icon
- `href` internal: renders plain `<a href={...}>`

External URLs are auto-detected when `href` starts with `http(s)://` and
the hostname differs from the current page.

## Examples

```jsx
// Internal navigation
<TnLink to="/catalog">Voir le catalogue</TnLink>

// Muted footer links
<TnLink variant="muted" to="/cgv">CGV</TnLink>

// Strong CTA with arrow
<TnLink variant="strong" to="/authors"
  rightIcon={<i className="fas fa-arrow-right" />}>
  Decouvrir nos auteurs
</TnLink>

// External (auto-detected, adds icon + target=_blank)
<TnLink href="https://instagram.com/terrenoire">Instagram</TnLink>

// On dark background
<TnLink onDark to="/cgv">Conditions de vente</TnLink>

// Download with icon
<TnLink href="/catalog.pdf" leftIcon={<i className="fas fa-download" />}>
  Telecharger le catalogue PDF
</TnLink>
```

## Underline animation

Uses `background-image` + `background-size` transition (0% -> 100%) for
smooth left-to-right underline reveal on hover. On multi-line links, the
animation reveals on the last line only (accepted limitation).
