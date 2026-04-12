import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const VendorListings = () => {
  const [listings, setListings] = useState([]);
  const { t } = useTranslation();
  const { organizationMemberships } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ book: '', price: '', stock: '', condition: 'NEW', organization_id: '' });
  const [msg, setMsg] = useState('');

  // Organisations vendeuses de l'utilisateur
  const vendorOrgs = organizationMemberships.filter(
    (m) => ['MAISON_EDITION', 'LIBRAIRIE'].includes(m.organization_type)
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'].includes(m.role)
  );

  const fetchListings = async () => {
    try {
      const res = await marketplaceService.getMyListings();
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMsg('');
    try {
      const payload = {
        book: parseInt(form.book),
        price: form.price,
        stock: parseInt(form.stock) || 0,
        condition: form.condition,
      };
      // Envoyer organization_id si plusieurs organisations
      if (form.organization_id) {
        payload.organization_id = parseInt(form.organization_id);
      }
      const res = await marketplaceService.createListing(payload);
      setMsg(res.data.message);
      setShowForm(false);
      setForm({ book: '', price: '', stock: '', condition: 'NEW', organization_id: '' });
      fetchListings();
    } catch (err) {
      setMsg(err.response?.data?.message || handleApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (listing) => {
    try {
      await marketplaceService.updateListing(listing.id, { is_active: !listing.is_active });
      fetchListings();
    } catch (err) {
      setMsg(handleApiError(err));
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="vendor-listings">
      <div className="dashboard-home__header">
        <h1>{t('vendor.listings.title')}</h1>
        <p className="dashboard-home__subtitle">{t('vendor.listings.subtitle')}</p>
      </div>

      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}
      {msg && <div className="dashboard-alert dashboard-alert--success">{msg}</div>}

      {!showForm ? (
        <button className="dashboard-btn dashboard-btn--primary" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          <i className="fas fa-plus" /> {t('vendor.listings.newListing')}
        </button>
      ) : (
        <form className="dashboard-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }} onSubmit={handleCreate}>
          <h2 style={{ marginBottom: '1rem' }}>{t('vendor.listings.newListing')}</h2>
          <div className="my-orgs__form-grid">
            {vendorOrgs.length > 1 && (
              <div className="form-group">
                <label>Organisation *</label>
                <select
                  value={form.organization_id}
                  onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                  required
                >
                  <option value="">— Choisir une organisation —</option>
                  {vendorOrgs.map((m) => (
                    <option key={m.organization_id} value={m.organization_id}>
                      {m.organization_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>{t('vendor.listings.bookId')}</label>
              <input type="number" value={form.book} onChange={(e) => setForm({ ...form, book: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('vendor.listings.priceLabel')}</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('vendor.listings.stockLabel')}</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('vendor.listings.conditionLabel')}</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                <option value="NEW">{t('vendor.listings.conditionNew')}</option>
                <option value="USED_GOOD">{t('vendor.listings.conditionGood')}</option>
                <option value="USED_FAIR">{t('vendor.listings.conditionFair')}</option>
              </select>
            </div>
          </div>
          <div className="my-orgs__form-actions">
            <button type="button" className="dashboard-btn" onClick={() => setShowForm(false)}>{t('vendor.listings.cancel')}</button>
            <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={creating}>
              {creating ? t('vendor.listings.creating') : t('vendor.listings.create')}
            </button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <p className="text-muted">{t('vendor.listings.empty')}</p>
      ) : (
        <div className="dashboard-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colBook')}</th>
                {vendorOrgs.length > 1 && <th style={{ padding: '0.75rem' }}>Organisation</th>}
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colPrice')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colStock')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colCondition')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colStatus')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.listings.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem' }}>{l.book_title}</td>
                  {vendorOrgs.length > 1 && (
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                        {l.vendor_name}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '0.75rem' }}>{parseInt(l.price).toLocaleString()} F</td>
                  <td style={{ padding: '0.75rem' }}>{l.stock}</td>
                  <td style={{ padding: '0.75rem' }}>{l.condition_display}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`my-profiles__badge ${l.is_active ? 'my-profiles__badge--active' : ''}`}>
                      {l.is_active ? t('vendor.listings.active') : t('vendor.listings.inactive')}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="dashboard-btn" onClick={() => toggleActive(l)} style={{ fontSize: '0.75rem' }}>
                      {l.is_active ? t('vendor.listings.deactivate') : t('vendor.listings.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VendorListings;
