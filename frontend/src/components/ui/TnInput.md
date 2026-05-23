# TnInput / TnTextarea / TnSelect

React wrappers for the elevated `.tn-input` CSS classes (Vague 2 P2.3).

## TnInput API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | — | Label text (mono uppercase eyebrow) |
| name | string | — | Input name attribute |
| type | string | `"text"` | Input type |
| size | string | — | `sm` `lg` (default = medium) |
| variant | string | — | `dark` |
| required | boolean | `false` | Shows * after label, sets required attr |
| disabled | boolean | `false` | Disabled state |
| readOnly | boolean | `false` | Read-only state |
| error | string | — | Error message (shows red border + message) |
| helper | string | — | Helper text (hidden when error shown) |
| leftIcon | ReactNode | — | Icon positioned left |
| rightIcon | ReactNode | — | Icon positioned right |
| showToggle | boolean | `false` | Eye toggle for password visibility (type="password" only) |

All other props are spread to the native `<input>`.

## TnTextarea API

Same as TnInput plus `leftIcon` (top-aligned for multi-line) plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rows | number | `4` | Textarea rows |
| autoResize | boolean | `false` | Auto-grow with content |

## TnSelect API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| options | array | `[]` | `[{ value, label }]` |
| placeholder | string | — | First disabled option text |

Same label/error/helper/size/variant/leftIcon props as TnInput.

## Examples

```jsx
<TnInput
  label="Email"
  name="email"
  type="email"
  required
  error={errors.email}
  leftIcon={<i className="fas fa-envelope" />}
/>

// Password with toggle
<TnInput
  label="Mot de passe"
  type="password"
  showToggle
  placeholder="********"
/>

<TnTextarea
  label="Message"
  name="message"
  rows={5}
  autoResize
  required
/>

<TnSelect
  label="Categorie"
  name="category"
  required
  placeholder="Choisir..."
  options={categories.map(c => ({ value: c.id, label: c.name }))}
/>
```
