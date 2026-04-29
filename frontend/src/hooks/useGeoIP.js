/**
 * useGeoIP — Détecte le pays de l'utilisateur via son adresse IP.
 * Utilise ipinfo.io (50k req/mois gratuit, sans clé).
 * Résultat stocké dans localStorage pour éviter les appels répétés.
 */
import { useState, useEffect } from 'react';

const CACHE_KEY = 'frollot_geoip';
const CACHE_DURATION = 7 * 24 * 3600 * 1000; // 7 jours

// Pays francophones (pour auto-détection de la langue)
const FRANCOPHONE_COUNTRIES = [
  'GA', 'CM', 'SN', 'CI', 'CG', 'CD', 'ML', 'BF', 'BJ', 'TG', 'NE',
  'TD', 'GN', 'GQ', 'CF', 'MG', 'KM', 'DJ', 'MR', 'BI', 'RW',
  'FR', 'BE', 'CH', 'LU', 'MC', 'HT', 'CA',
];

export default function useGeoIP() {
  const [geoData, setGeoData] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.ts && Date.now() - parsed.ts < CACHE_DURATION) {
          return parsed.data;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    if (geoData) return; // Déjà en cache

    const fetchGeo = async () => {
      try {
        const resp = await fetch('https://ipinfo.io/json?token=', { timeout: 5000 });
        if (!resp.ok) return;
        const data = await resp.json();

        const result = {
          country: data.country || '',       // Code ISO 2 lettres (ex: "GA")
          countryName: data.country || '',    // Sera mappé côté composant
          city: data.city || '',
          region: data.region || '',
          timezone: data.timezone || '',
          isFrancophone: FRANCOPHONE_COUNTRIES.includes(data.country || ''),
        };

        setGeoData(result);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }));
      } catch {
        // Silencieux — la géolocalisation est optionnelle
      }
    };

    fetchGeo();
  }, [geoData]);

  return geoData;
}

// Map code ISO → nom de pays (pour pré-remplissage)
export const ISO_TO_COUNTRY_NAME = {
  GA: 'Gabon', CM: 'Cameroun', SN: 'Sénégal', CI: "Côte d'Ivoire",
  CG: 'Congo', CD: 'RD Congo', ML: 'Mali', BF: 'Burkina Faso',
  BJ: 'Bénin', TG: 'Togo', NE: 'Niger', TD: 'Tchad',
  GN: 'Guinée', GQ: 'Guinée équatoriale', CF: 'Centrafrique',
  MG: 'Madagascar', KM: 'Comores', DJ: 'Djibouti', MR: 'Mauritanie',
  BI: 'Burundi', RW: 'Rwanda', NG: 'Nigeria', GH: 'Ghana',
  KE: 'Kenya', TZ: 'Tanzanie', ZA: 'Afrique du Sud', ET: 'Éthiopie',
  UG: 'Ouganda', MZ: 'Mozambique', AO: 'Angola',
  MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', EG: 'Égypte',
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada',
  US: 'États-Unis', GB: 'Royaume-Uni', DE: 'Allemagne',
  ES: 'Espagne', IT: 'Italie', PT: 'Portugal', BR: 'Brésil',
  HT: 'Haïti', LB: 'Liban', MU: 'Île Maurice',
};
