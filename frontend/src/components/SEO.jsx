import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Frollot';
const DEFAULT_DESCRIPTION = 'Frollot — La plateforme sociale du livre. Romans, essais, poésie : découvrez, partagez et créez ensemble.';
const DEFAULT_IMAGE = '/images/logo_frollot.png';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const SEO = ({ title, description, image, type = 'website', noIndex = false, jsonLd }) => {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Plateforme Sociale du Livre`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}${DEFAULT_IMAGE}`;
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
