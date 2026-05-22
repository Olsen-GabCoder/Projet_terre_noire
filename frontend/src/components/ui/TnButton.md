# TnButton

React wrapper for the elevated `.tn-btn` CSS classes (Vague 2 P2.1).

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | `"primary"` | `primary` `secondary` `dark` `outline` `outline-light` `ghost` `danger` |
| size | string | `"md"` | `sm` `md` `lg` |
| type | string | `"button"` | `button` `submit` `reset` |
| block | boolean | `false` | Full width |
| loading | boolean | `false` | Shows spinner, disables click |
| disabled | boolean | `false` | Native disabled attribute |
| leftIcon | ReactNode | — | Icon before label |
| rightIcon | ReactNode | — | Icon after label |
| onClick | function | — | Click handler (blocked when loading/disabled) |
| className | string | `""` | Additional CSS classes |

All other props are spread to the native `<button>`.

## Examples

```jsx
import TnButton from '../components/ui/TnButton';

// Basic
<TnButton onClick={handleSave}>Enregistrer</TnButton>

// With icon
<TnButton variant="danger" leftIcon={<i className="fas fa-trash" />}>
  Supprimer
</TnButton>

// Loading
<TnButton variant="primary" size="lg" loading={saving}>
  Envoi en cours...
</TnButton>

// Full width submit
<TnButton variant="primary" type="submit" block size="lg">
  Finaliser la commande
</TnButton>
```

## Migration

Existing `<button className="tn-btn tn-btn--primary">` usages will be
migrated to `<TnButton>` progressively during Vague 4 (page by page).
Both patterns coexist — they use the same CSS classes.
