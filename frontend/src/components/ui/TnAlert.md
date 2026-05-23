# TnAlert

Contextual feedback alert component (Vague 2.5 P6).
4 variants with semantic colors, optional title, close button, and icon override.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'error'` \| `'success'` \| `'warning'` \| `'info'` | `'error'` | Visual variant |
| icon | string \| false | auto per variant | FontAwesome class, or `false` to hide |
| title | ReactNode | — | Bold title above message |
| onClose | function | — | Shows close button, called on click |
| children | ReactNode | — | Alert message content |

## Default icons per variant

| Variant | Icon |
|---------|------|
| error | `fa-circle-exclamation` |
| success | `fa-circle-check` |
| warning | `fa-triangle-exclamation` |
| info | `fa-circle-info` |

## Examples

```jsx
// Simple error
<TnAlert variant="error">Email ou mot de passe incorrect.</TnAlert>

// Success with title
<TnAlert variant="success" title="Inscription reussie">
  Bienvenue sur Terre Noire Editions.
</TnAlert>

// Warning with close button
<TnAlert variant="warning" onClose={() => setShow(false)}>
  Votre session expire dans 5 minutes.
</TnAlert>

// Info without icon
<TnAlert variant="info" icon={false}>
  Un message discret sans icone.
</TnAlert>

// Custom icon
<TnAlert variant="info" icon="fas fa-bell">
  Notification personnalisee.
</TnAlert>
```
