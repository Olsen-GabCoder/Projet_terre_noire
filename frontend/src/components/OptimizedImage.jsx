import { useState } from 'react';

/**
 * Image optimisée avec :
 * - Placeholder shimmer pendant le chargement
 * - Fallback en cas d'erreur
 * - fetchPriority pour les images above-the-fold
 * - Dimensions explicites pour éviter le CLS
 */
const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  fallback = '/images/default-book-cover.svg',
  priority = false,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imgSrc = error ? fallback : (src || fallback);

  return (
    <div
      className={`opt-img ${className} ${loaded ? 'opt-img--loaded' : ''}`}
      style={{ width, height, position: 'relative', overflow: 'hidden' }}
    >
      {!loaded && (
        <div className="opt-img__placeholder" aria-hidden="true" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
