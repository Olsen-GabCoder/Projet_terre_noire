/**
 * CurrencyToggle — Petit sélecteur de devise dans le header.
 * Stocke le choix dans localStorage. Les composants de prix lisent ce choix.
 *
 * useCurrency() — hook pour lire la devise et le taux.
 */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const CurrencyContext = createContext({ currency: 'XAF', rate: 1, symbol: 'FCFA' });

const CURRENCIES = {
  XAF: { symbol: 'FCFA', rate: 1 },
  EUR: { symbol: '€', rate: null },
  USD: { symbol: '$', rate: null },
};

const CACHE_KEY = 'frollot_fx_rates';
const PREF_KEY = 'frollot_currency';

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem(PREF_KEY) || 'XAF');
  const [rates, setRates] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.ts && Date.now() - parsed.ts < 6 * 3600 * 1000) return parsed.rates;
      }
    } catch {}
    return { EUR: 0.00152, USD: 0.00166 }; // Fallback approximatif
  });

  // Charger les taux de change
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const resp = await fetch('https://open.er-api.com/v6/latest/XAF');
        if (resp.ok) {
          const data = await resp.json();
          if (data.rates) {
            const newRates = { EUR: data.rates.EUR, USD: data.rates.USD };
            setRates(newRates);
            localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: newRates, ts: Date.now() }));
          }
        }
      } catch {
        // Garder les taux en cache ou fallback
      }
    };
    fetchRates();
  }, []);

  const changeCurrency = useCallback((c) => {
    setCurrency(c);
    localStorage.setItem(PREF_KEY, c);
  }, []);

  const rate = currency === 'XAF' ? 1 : (rates[currency] || 1);
  const symbol = CURRENCIES[currency]?.symbol || 'FCFA';

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, changeCurrency, currencies: Object.keys(CURRENCIES) }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/**
 * Convertit et formate un prix FCFA dans la devise active.
 */
export function formatCurrency(priceFCFA, { currency, rate, symbol }) {
  if (!priceFCFA && priceFCFA !== 0) return '';
  const value = parseFloat(priceFCFA) * rate;
  if (currency === 'XAF') {
    return Math.round(value).toLocaleString('fr-FR') + ' FCFA';
  }
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
}

/**
 * CurrencyToggle — Petit bouton pour changer de devise.
 */
export default function CurrencyToggle() {
  const { currency, changeCurrency, currencies } = useCurrency();

  const next = () => {
    const idx = currencies.indexOf(currency);
    changeCurrency(currencies[(idx + 1) % currencies.length]);
  };

  return (
    <button
      type="button"
      className="currency-toggle"
      onClick={next}
      title={`Devise : ${currency} — Cliquer pour changer`}
    >
      {currency === 'XAF' ? 'FCFA' : currency === 'EUR' ? '€' : '$'}
    </button>
  );
}
