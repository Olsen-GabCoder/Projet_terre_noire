# TnCheckbox

Custom checkbox component (Vague 2.5 P5).
18×18px square, orange when checked, SVG checkmark scale-in.

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | ReactNode | — | Checkbox label (supports JSX for links) |
| checked | boolean | — | Controlled checked state |
| onChange | function | — | Called with boolean (checked value) |
| name | string | — | Input name attribute |
| required | boolean | `false` | Shows * after label |
| error | string | — | Error message (red border + message) |
| helper | string | — | Helper text (hidden when error shown) |
| disabled | boolean | `false` | Disabled state |

## Examples

```jsx
// Basic
<TnCheckbox label="S'inscrire a la newsletter"
  checked={newsletter} onChange={setNewsletter} />

// Required with error
<TnCheckbox label="J'accepte les CGV" required
  checked={agreed} onChange={setAgreed}
  error={!agreed ? "Vous devez accepter les CGV" : ""} />

// With helper
<TnCheckbox label="Se souvenir de moi"
  checked={remember} onChange={setRemember}
  helper="Reste connecte pendant 30 jours" />

// With JSX label (link inside)
<TnCheckbox required checked={agreed} onChange={setAgreed}
  label={<>J'accepte les <a href="/cgv">CGV</a></>} />
```
