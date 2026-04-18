import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';
import { useTranslation } from 'react-i18next';

const SERVICE_TYPES = [
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'ILLUSTRATION', label: 'Illustration' },
  { value: 'TRANSLATION', label: 'Traduction' },
  { value: 'COVER_DESIGN', label: 'Couverture' },
  { value: 'LAYOUT', label: 'Mise en page' },
  { value: 'PROOFREADING', label: 'Relecture' },
];

const PRICE_TYPES = [
  { value: 'PER_PAGE', label: 'Par page' },
  { value: 'PER_WORD', label: 'Par mot' },
  { value: 'PER_PROJECT', label: 'Par projet' },
  { value: 'HOURLY', label: 'À l\'heure' },
];

const ProListings = () => {
  const [listings, setListings] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ service_type: 'CORRECTION', title: '', description: '', base_price: '', price_type: 'PER_PAGE', turnaround_days: '', languages: '', genres: '' });
  const [saving, setSaving] = useState(false);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await servicesService.getMyListings();
      setListings(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        languages: form.languages ? form.languages.split(',').map(l => l.trim()) : [],
        genres: form.genres ? form.genres.split(',').map(g => g.trim()) : [],
      };
      await servicesService.createListing(data);
      toast.success(t('proListings.listingPublished', 'Offre publiée !'));
      setShowForm(false);
      setForm({ service_type: 'CORRECTION', title: '', description: '', base_price: '', price_type: 'PER_PAGE', turnaround_days: '', languages: '', genres: '' });
      fetchListings();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  const handleToggle = async (listing) => {
    try {
      await servicesService.updateListing(listing.id, { is_active: !listing.is_active });
      toast.success(listing.is_active ? t('proListings.listingDeactivated', 'Offre désactivée.') : t('proListings.listingReactivated', 'Offre réactivée.'));
      fetchListings();
    } catch (err) { toast.error(handleApiError(err)); }
  };

  const fmtPrice = (v) => Math.round(parseFloat(v) || 0).toLocaleString('fr-FR');

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-tags" style={{ color: 'var(--color-secondary)' }} /> {t('proListings.title', 'Mes offres de service')}</h1>
          <p className="author-space__subtitle">{t('proListings.count', '{{count}} offre(s) publiée(s)', { count: listings.length })}</p>
        </div>
        {!showForm && (
          <button className="as-cta" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus" /> {t('proListings.newListing', 'Nouvelle offre')}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="as-card" style={{ marginBottom: '1.25rem' }}>
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-edit" /> {t('proListings.newListing', 'Nouvelle offre')}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('common.close', 'Fermer')}
            </button>
          </div>
          <div className="as-card__body">
            <form onSubmit={handleSubmit}>
              <div className="ob-form__grid">
                <div className="ob-form__field"><label>{t('proListings.serviceType', 'Type de service')} *</label>
                  <select name="service_type" value={form.service_type} onChange={handleChange}>{SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                </div>
                <div className="ob-form__field"><label>{t('proListings.priceType', 'Tarification')} *</label>
                  <select name="price_type" value={form.price_type} onChange={handleChange}>{PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                </div>
                <div className="ob-form__field ob-form__field--full"><label>{t('proListings.offerTitle', "Titre de l'offre")} *</label>
                  <input type="text" name="title" value={form.title} onChange={handleChange} required placeholder={t('proListings.titlePlaceholder', 'Ex: Correction complète de manuscrit')} />
                </div>
                <div className="ob-form__field ob-form__field--full"><label>{t('proListings.description', 'Description')} *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} required placeholder={t('proListings.descPlaceholder', 'Décrivez votre service en détail...')} />
                </div>
                <div className="ob-form__field"><label>{t('proListings.basePrice', 'Prix de base (FCFA)')} *</label>
                  <input type="number" name="base_price" value={form.base_price} onChange={handleChange} min="0" required />
                </div>
                <div className="ob-form__field"><label>{t('proListings.turnaround', 'Délai moyen (jours)')}</label>
                  <input type="number" name="turnaround_days" value={form.turnaround_days} onChange={handleChange} min="1" />
                </div>
                <div className="ob-form__field"><label>{t('proListings.languages', 'Langues')}</label>
                  <input type="text" name="languages" value={form.languages} onChange={handleChange} placeholder={t('proListings.langPlaceholder', 'Français, Anglais...')} />
                </div>
                <div className="ob-form__field"><label>{t('proListings.genres', 'Genres')}</label>
                  <input type="text" name="genres" value={form.genres} onChange={handleChange} placeholder={t('proListings.genrePlaceholder', 'Roman, Essai...')} />
                </div>
              </div>
              <div className="ob-form__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setShowForm(false)}>{t('common.cancel', 'Annuler')}</button>
                <button type="submit" className="as-cta" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-check" /> {t('proListings.publish', 'Publier')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste */}
      {listings.length === 0 && !showForm ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-tags" /></div>
            <h3>{t('proListings.noListings', 'Aucune offre publiée')}</h3>
            <p>{t('proListings.emptyDesc', 'Créez votre première offre de service pour être visible sur la marketplace.')}</p>
            <button className="as-cta" onClick={() => setShowForm(true)} style={{ marginTop: '1rem' }}>
              <i className="fas fa-plus" /> {t('proListings.createListing', 'Créer une offre')}
            </button>
          </div>
        </div>
      ) : !showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {listings.map(listing => (
            <div key={listing.id} className="as-card">
              <div className="as-card__body" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-heading)' }}>{listing.title || listing.service_type_display}</strong>
                    <span className={`ob-badge ${listing.is_active ? 'ob-badge--ok' : 'ob-badge--off'}`}>{listing.is_active ? t('proListings.active', 'Active') : t('proListings.inactive', 'Inactive')}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>
                    {listing.service_type_display} · {fmtPrice(listing.base_price)} F / {listing.price_type_display || listing.price_type}
                    {listing.turnaround_days && ` · ${listing.turnaround_days}j`}
                  </div>
                </div>
                <button className="dashboard-btn" onClick={() => handleToggle(listing)} style={{ fontSize: '0.8rem' }}>
                  <i className={`fas fa-${listing.is_active ? 'eye-slash' : 'eye'}`} /> {listing.is_active ? t('proListings.deactivate', 'Désactiver') : t('proListings.reactivate', 'Réactiver')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProListings;
