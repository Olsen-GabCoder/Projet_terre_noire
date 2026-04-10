import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';

const DeliveryRates = () => {
  const { t } = useTranslation();
  const [rates, setRates] = useState([]);
  const [refData, setRefData] = useState({ countries: [], currencies: [], cities_by_country: {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const emptyForm = {
    zone_name: '',
    country: 'GA',
    cities: [],
    price: '',
    currency: 'XAF',
    estimated_days_min: 1,
    estimated_days_max: 3,
  };
  const [form, setForm] = useState(emptyForm);
  const [customCity, setCustomCity] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [ratesRes, refRes] = await Promise.all([
        marketplaceService.getMyDeliveryRates(),
        marketplaceService.getDeliveryReferenceData(),
      ]);
      setRates(Array.isArray(ratesRes.data) ? ratesRes.data : []);
      if (refRes.data) setRefData(refRes.data);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Devise par defaut selon le pays
  const COUNTRY_CURRENCY = {
    GA: 'XAF', CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF',
    SN: 'XOF', CI: 'XOF', BF: 'XOF', ML: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', GN: 'XOF', GW: 'XOF',
    NG: 'NGN', GH: 'GHS', KE: 'KES', TZ: 'TZS', UG: 'UGX', RW: 'RWF',
    ZA: 'ZAR', MA: 'MAD', EG: 'EGP', ET: 'ETB', CD: 'CDF', AO: 'AOA', MZ: 'MZN',
  };

  const handleCountryChange = (code) => {
    const cur = COUNTRY_CURRENCY[code] || 'USD';
    setForm(f => ({ ...f, country: code, currency: cur, cities: [] }));
    setCustomCity('');
  };

  const availableCities = refData.cities_by_country[form.country] || [];

  const toggleCity = (city) => {
    setForm(f => ({
      ...f,
      cities: f.cities.includes(city) ? f.cities.filter(c => c !== city) : [...f.cities, city],
    }));
  };

  const addCustomCity = () => {
    const trimmed = customCity.trim();
    if (trimmed && !form.cities.includes(trimmed)) {
      setForm(f => ({ ...f, cities: [...f.cities, trimmed] }));
    }
    setCustomCity('');
  };

  const removeCity = (city) => {
    setForm(f => ({ ...f, cities: f.cities.filter(c => c !== city) }));
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (rate) => {
    setForm({
      zone_name: rate.zone_name,
      country: rate.country,
      cities: rate.cities || [],
      price: rate.price,
      currency: rate.currency,
      estimated_days_min: rate.estimated_days_min,
      estimated_days_max: rate.estimated_days_max,
    });
    setEditingId(rate.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.zone_name.trim()) return toast.error('Donnez un nom a cette zone.');
    if (form.cities.length === 0) return toast.error('Selectionnez au moins une ville.');
    if (!form.price || parseFloat(form.price) <= 0) return toast.error('Indiquez un tarif valide.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        estimated_days_min: parseInt(form.estimated_days_min) || 1,
        estimated_days_max: parseInt(form.estimated_days_max) || 3,
      };
      if (editingId) {
        await marketplaceService.updateDeliveryRate(editingId, payload);
        toast.success('Tarif mis a jour.');
      } else {
        await marketplaceService.createDeliveryRate(payload);
        toast.success('Tarif cree.');
      }
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce tarif ?')) return;
    setDeletingId(id);
    try {
      await marketplaceService.deleteDeliveryRate(id);
      toast.success('Tarif supprime.');
      await fetchData();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (rate) => {
    try {
      await marketplaceService.updateDeliveryRate(rate.id, { is_active: !rate.is_active });
      toast.success(rate.is_active ? 'Tarif desactive.' : 'Tarif active.');
      await fetchData();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const getCurrencySymbol = (code) => {
    const c = refData.currencies.find(c => c.code === code);
    return c ? c.name : code;
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-tags" style={{ color: '#f59e0b' }} /> {t('dashboard.deliveryRates.title')}</h1>
          <p className="author-space__subtitle">{t('dashboard.deliveryRates.subtitle')}</p>
        </div>
        {!showForm && (
          <button className="as-cta" onClick={openNew}>
            <i className="fas fa-plus" /> {t('dashboard.deliveryRates.newRate')}
          </button>
        )}
      </div>

      {/* Formulaire creation / edition */}
      {showForm && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title">{editingId ? t('dashboard.deliveryRates.editRate') : t('dashboard.deliveryRates.newRate')}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('dashboard.deliveryRates.cancel')}
            </button>
          </div>
          <div className="as-card__body">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Nom de la zone */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.zoneName')} *</label>
                  <input type="text" value={form.zone_name} onChange={e => setForm(f => ({ ...f, zone_name: e.target.value }))} placeholder="Ex: Libreville Centre" />
                </div>

                {/* Pays */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.country')} *</label>
                  <select value={form.country} onChange={e => handleCountryChange(e.target.value)}>
                    {refData.countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tarif */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.deliveryPrice')} *</label>
                  <input type="number" min="0" step="100" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="2000" />
                </div>

                {/* Devise */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.currency')} *</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {refData.currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Delai min */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.minDays')}</label>
                  <input type="number" min="1" value={form.estimated_days_min} onChange={e => setForm(f => ({ ...f, estimated_days_min: e.target.value }))} />
                </div>

                {/* Delai max */}
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryRates.maxDays')}</label>
                  <input type="number" min="1" value={form.estimated_days_max} onChange={e => setForm(f => ({ ...f, estimated_days_max: e.target.value }))} />
                </div>
              </div>

              {/* Villes */}
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: '0.5rem' }}>
                  {t('dashboard.deliveryRates.coveredCities')} * <span style={{ fontWeight: 400, color: 'var(--color-text-muted-ui)' }}>({t('dashboard.deliveryRates.selectedCount', { count: form.cities.length })})</span>
                </label>

                {/* Villes predefinies en chips */}
                {availableCities.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {availableCities.map(city => {
                      const selected = form.cities.includes(city);
                      return (
                        <button
                          key={city} type="button" onClick={() => toggleCity(city)}
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: 6, border: '1.5px solid',
                            borderColor: selected ? 'var(--color-primary)' : 'rgba(15,23,42,0.12)',
                            background: selected ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--color-bg-surface)',
                            color: selected ? 'var(--color-primary)' : 'var(--color-text-body)',
                            fontSize: '0.78rem', fontWeight: selected ? 600 : 400, cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {selected && <i className="fas fa-check" style={{ marginRight: '0.25rem', fontSize: '0.65rem' }} />}
                          {city}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Ajouter une ville manuellement */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text" value={customCity} onChange={e => setCustomCity(e.target.value)}
                    placeholder={t('dashboard.deliveryRates.addCityPlaceholder')}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCity(); } }}
                    style={{ flex: 1, maxWidth: 280 }}
                  />
                  <button type="button" className="dashboard-btn" onClick={addCustomCity} disabled={!customCity.trim()}>
                    <i className="fas fa-plus" /> {t('dashboard.deliveryRates.add')}
                  </button>
                </div>

                {/* Villes selectionnees (celles pas dans la liste predefinie) */}
                {form.cities.filter(c => !availableCities.includes(c)).length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {form.cities.filter(c => !availableCities.includes(c)).map(city => (
                      <span key={city} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.3rem 0.65rem', borderRadius: 6,
                        background: 'rgba(var(--color-primary-rgb), 0.1)',
                        color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {city}
                        <button type="button" onClick={() => removeCity(city)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)',
                          padding: 0, marginLeft: '0.1rem', fontSize: '0.7rem',
                        }}>
                          <i className="fas fa-times" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ob-form__actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => { setShowForm(false); setEditingId(null); }}>{t('dashboard.deliveryRates.cancel')}</button>
                <button type="submit" className="as-cta" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-save" /> {editingId ? t('dashboard.deliveryRates.update') : t('dashboard.deliveryRates.createRate')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des tarifs */}
      {rates.length === 0 && !showForm ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-tags" /></div>
            <h3>{t('dashboard.deliveryRates.noRates')}</h3>
            <p>{t('dashboard.deliveryRates.noRatesDesc')}</p>
            <button className="as-cta" onClick={openNew} style={{ marginTop: '1rem' }}>
              <i className="fas fa-plus" /> {t('dashboard.deliveryRates.createFirstRate')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {rates.map(rate => (
            <div key={rate.id} className="as-card" style={{ opacity: rate.is_active ? 1 : 0.6 }}>
              <div className="as-card__body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                      {rate.zone_name}
                    </h3>
                    {!rate.is_active && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
                        {t('dashboard.deliveryRates.inactive')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', marginBottom: '0.5rem' }}>
                    <i className="fas fa-globe-africa" style={{ marginRight: '0.3rem' }} />
                    {rate.country_display}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {(rate.cities || []).map((city, i) => (
                      <span key={i} style={{
                        display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 4,
                        background: 'rgba(var(--color-primary-rgb), 0.06)',
                        color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 500,
                      }}>
                        {city}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 140 }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {parseFloat(rate.price).toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{rate.currency}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', marginTop: '0.15rem' }}>
                    {getCurrencySymbol(rate.currency)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginTop: '0.35rem' }}>
                    <i className="fas fa-clock" style={{ marginRight: '0.25rem' }} />
                    {rate.estimated_days_min}-{rate.estimated_days_max} {t('dashboard.deliveryRates.days')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <button onClick={() => handleToggleActive(rate)} title={rate.is_active ? 'Desactiver' : 'Activer'} style={{
                    background: 'none', border: '1.5px solid rgba(15,23,42,0.12)', borderRadius: 6, cursor: 'pointer',
                    padding: '0.4rem 0.55rem', color: rate.is_active ? '#059669' : '#dc2626', fontSize: '0.8rem',
                  }}>
                    <i className={`fas ${rate.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                  </button>
                  <button onClick={() => openEdit(rate)} title="Modifier" style={{
                    background: 'none', border: '1.5px solid rgba(15,23,42,0.12)', borderRadius: 6, cursor: 'pointer',
                    padding: '0.4rem 0.55rem', color: 'var(--color-primary)', fontSize: '0.8rem',
                  }}>
                    <i className="fas fa-pen" />
                  </button>
                  <button onClick={() => handleDelete(rate.id)} disabled={deletingId === rate.id} title="Supprimer" style={{
                    background: 'none', border: '1.5px solid rgba(15,23,42,0.12)', borderRadius: 6, cursor: 'pointer',
                    padding: '0.4rem 0.55rem', color: '#dc2626', fontSize: '0.8rem',
                  }}>
                    <i className={`fas ${deletingId === rate.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryRates;
