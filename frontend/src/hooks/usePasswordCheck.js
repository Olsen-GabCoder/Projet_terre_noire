/**
 * usePasswordCheck — Vérifie si un mot de passe a fuité via Have I Been Pwned.
 * Utilise k-anonymity : seuls les 5 premiers caractères du hash SHA-1 sont envoyés.
 * Le mot de passe complet ne quitte JAMAIS le navigateur.
 */
import { useState, useCallback, useRef } from 'react';

async function sha1(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export default function usePasswordCheck() {
  const [breachCount, setBreachCount] = useState(null); // null = pas vérifié, 0 = safe, >0 = compromis
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef(null);

  const checkPassword = useCallback(async (password) => {
    if (!password || password.length < 6) {
      setBreachCount(null);
      return;
    }

    // Debounce 800ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const hash = await sha1(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          headers: { 'Add-Padding': 'true' },
        });

        if (resp.ok) {
          const text = await resp.text();
          const lines = text.split('\n');
          let found = 0;
          for (const line of lines) {
            const [hashSuffix, count] = line.trim().split(':');
            if (hashSuffix === suffix) {
              found = parseInt(count, 10);
              break;
            }
          }
          setBreachCount(found);
        } else {
          setBreachCount(null); // API indisponible — ne pas bloquer
        }
      } catch {
        setBreachCount(null); // Erreur réseau — ne pas bloquer
      }
      setChecking(false);
    }, 800);
  }, []);

  const reset = useCallback(() => {
    setBreachCount(null);
    setChecking(false);
  }, []);

  return { breachCount, checking, checkPassword, reset };
}
