/**
 * UnsplashPicker — Sélecteur d'images Unsplash réutilisable
 * Props:
 *   onSelect(imageUrl) — callback quand une image est choisie
 *   defaultQuery — recherche par défaut
 *   buttonLabel — texte du bouton d'ouverture
 */
import { useState, useCallback } from 'react';
import api from '../services/api';

const UnsplashPicker = ({ onSelect, defaultQuery = '', buttonLabel = 'Chercher une image' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q) => {
    if (!q?.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get('/books/unsplash-search/', { params: { q: q.trim() } });
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  const handleSelect = async (photo) => {
    // Télécharger l'image et la convertir en File pour le formulaire
    try {
      const resp = await fetch(photo.small);
      const blob = await resp.blob();
      const file = new File([blob], `unsplash-${photo.id}.jpg`, { type: 'image/jpeg' });
      onSelect(file, photo.small);
    } catch {
      // Fallback : passer l'URL directement
      onSelect(null, photo.small);
    }
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="unsplash-trigger" onClick={() => { setOpen(true); if (defaultQuery && !searched) search(defaultQuery); }}>
        <i className="fas fa-images" /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="unsplash-picker">
      <div className="unsplash-picker__header">
        <div className="unsplash-picker__search">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(query); } }}
            placeholder="Chercher une image..."
            autoFocus
          />
          <button type="button" onClick={() => search(query)} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-search" />}
          </button>
        </div>
        <button type="button" className="unsplash-picker__close" onClick={() => setOpen(false)}>
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="unsplash-picker__grid">
        {results.map(photo => (
          <button key={photo.id} type="button" className="unsplash-picker__item" onClick={() => handleSelect(photo)}>
            <img src={photo.thumb} alt={photo.alt || ''} loading="lazy" />
            <span className="unsplash-picker__credit">
              {photo.author}
            </span>
          </button>
        ))}
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="unsplash-picker__empty">Aucune image trouvée.</p>
      )}

      <p className="unsplash-picker__attr">
        Photos par <a href="https://unsplash.com/?utm_source=frollot&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>
      </p>
    </div>
  );
};

export default UnsplashPicker;
