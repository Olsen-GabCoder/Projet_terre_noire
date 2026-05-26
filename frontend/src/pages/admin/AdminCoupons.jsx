import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminLoading, AdminError, AdminEmpty, StatusBadge,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const EMPTY = { code: '', discount_type: 'percent', discount_value: '', valid_from: '', valid_until: '', is_active: true, max_uses: '', recipient_email: '', custom_message: '' };

const AdminCoupons = () => {
  const { toast, confirm } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try { setLoading(true); setError(null); const r = await api.get('/coupons/'); setCoupons(r.data.results || []); }
    catch { setError('Impossible de charger les coupons'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData };
    data.code = data.code.toUpperCase().trim();
    if (!data.discount_value) { toast.error('Indiquez une valeur de réduction'); return; }
    if (!data.valid_from) data.valid_from = null;
    if (!data.valid_until) data.valid_until = null;
    if (!data.max_uses) data.max_uses = null;
    if (!data.recipient_email) data.recipient_email = null;
    if (!data.custom_message) data.custom_message = '';
    try {
      if (editing) { await api.patch(`/coupons/${editing.id}/`, data); toast.success('Coupon modifié'); }
      else { await api.post('/coupons/', data); toast.success('Coupon créé'); }
      fetchCoupons(); resetForm();
    } catch (err) { toast.error(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Erreur'); }
  };

  const handleEdit = (c) => {
    setEditing(c);
    setFormData({
      code: c.code, discount_type: c.discount_type || 'percent', discount_value: c.discount_value || '',
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : '', valid_until: c.valid_until ? c.valid_until.slice(0, 16) : '',
      is_active: c.is_active, max_uses: c.max_uses || '',
      recipient_email: c.recipient_email || '', custom_message: c.custom_message || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, code) => {
    const ok = await confirm({ title: 'Supprimer ce coupon ?', message: `Le code "${code}" sera définitivement supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/coupons/${id}/`); fetchCoupons(); toast.success('Coupon supprimé'); }
    catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleToggle = async (c) => {
    try { await api.patch(`/coupons/${c.id}/`, { is_active: !c.is_active }); fetchCoupons(); toast.success(c.is_active ? 'Coupon désactivé' : 'Coupon activé'); }
    catch { toast.error('Erreur'); }
  };

  const resetForm = useCallback(() => { setShowForm(false); setEditing(null); setFormData({ ...EMPTY }); }, []);

  const now = new Date();
  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter(c => c.is_active).length,
    expired: coupons.filter(c => c.valid_until && new Date(c.valid_until) < now).length,
    used: coupons.reduce((s, c) => s + (c.usage_count || 0), 0),
  }), [coupons]);

  const filtered = useMemo(() => {
    let list = coupons;
    if (filter === 'active') list = list.filter(c => c.is_active);
    else if (filter === 'inactive') list = list.filter(c => !c.is_active);
    else if (filter === 'expired') list = list.filter(c => c.valid_until && new Date(c.valid_until) < now);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(c => c.code.toLowerCase().includes(q)); }
    return list;
  }, [coupons, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminLoading label="Chargement des coupons..." /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchCoupons} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Coupons']}
        title="Codes promo"
        subtitle={`${stats.active} coupon(s) actif(s) · ${stats.used} utilisation(s) au total`}
        actions={<>
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>
          <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} /> {showForm ? 'Fermer' : 'Nouveau coupon'}
          </button>
        </>}
      />
      <div className="adm-page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <AdminStat icon="fa-ticket" label="Total" value={stats.total} />
          <AdminStat icon="fa-check-circle" label="Actifs" value={stats.active} color="var(--tn-success)" />
          <AdminStat icon="fa-clock" label="Expires" value={stats.expired} color="var(--tn-gray-400)" />
          <AdminStat icon="fa-chart-bar" label="Utilisations" value={stats.used} color="var(--tn-orange)" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AdminSearch placeholder="Rechercher un code..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <AdminFilterPills active={filter} onChange={setFilter} items={[['all', 'Tous', coupons.length], ['active', 'Actifs', stats.active], ['inactive', 'Inactifs', coupons.length - stats.active], ['expired', 'Expirés', stats.expired]]} />
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-ticket" title="Aucun coupon cr\u00e9\u00e9" subtitle={search ? 'Aucun resultat.' : 'Cr\u00e9ez votre premier code promotionnel pour r\u00e9compenser vos lecteurs fid\u00e8les.'} />}

        {filtered.length > 0 && (
          <AdminTable columns={[{ label: 'Code' }, { label: 'Réduction' }, { label: 'Destinataire' }, { label: 'Validite' }, { label: 'Utilisations', width: 100 }, { label: 'Statut', width: 90 }, { label: '', width: 90, align: 'right' }]}>
            {filtered.map((c, i) => (
              <AdminRow key={c.id} last={i === filtered.length - 1}>
                <AdminCell><span style={{ fontFamily: 'var(--tn-mono)', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>{c.code}</span></AdminCell>
                <AdminCell>
                  {c.discount_type === 'percent' ? <span style={{ color: 'var(--tn-orange)', fontWeight: 700 }}>-{Number(c.discount_value)}%</span>
                    : <span style={{ color: 'var(--tn-orange)', fontWeight: 700 }}>-{fmtPrice(c.discount_value)} FCFA</span>}
                </AdminCell>
                <AdminCell>
                  {c.recipient_email
                    ? <span style={{ fontSize: 12, color: 'var(--tn-gray-700)' }}><i className="fas fa-user" style={{ color: 'var(--tn-orange)', marginRight: 4, fontSize: 10 }} />{c.recipient_email}</span>
                    : <span style={{ fontSize: 12, color: 'var(--tn-gray-400)' }}>General</span>
                  }
                </AdminCell>
                <AdminCell>
                  <span style={{ fontSize: 12, color: 'var(--tn-gray-600)' }}>
                    {c.valid_from ? fmtDate(c.valid_from) : 'Illimité'} — {c.valid_until ? fmtDate(c.valid_until) : 'Illimité'}
                  </span>
                </AdminCell>
                <AdminCell><span style={{ fontFamily: 'var(--tn-mono)', fontSize: 13 }}>{c.usage_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</span></AdminCell>
                <AdminCell>
                  <button onClick={() => handleToggle(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <StatusBadge value={c.is_active ? 'active' : 'inactive'} />
                  </button>
                </AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-pen-to-square" tone="orange" title="Modifier" onClick={() => handleEdit(c)} />
                    <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(c.id, c.code)} />
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {showForm && (
        <AdminModalOverlay onClose={resetForm}>
          <AdminModalHeader onClose={resetForm}>
            <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0 }}>{editing ? 'Modifier le coupon' : 'Nouveau coupon'}</h2>
          </AdminModalHeader>
          <AdminModalBody>
            <form onSubmit={handleSubmit}>
              <AdminModalSection icon="fa-ticket" title="Informations">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Code <span style={{ color: 'var(--tn-orange)' }}>*</span></label>
                    <input className="tn-input" name="code" value={formData.code} onChange={handleChange} required placeholder="EX: MAISON10" style={{ fontFamily: 'var(--tn-mono)', textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Utilisations max</label>
                    <input className="tn-input" name="max_uses" type="number" min="1" value={formData.max_uses} onChange={handleChange} placeholder="Illimité" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Type de réduction</label>
                    <select className="tn-input" name="discount_type" value={formData.discount_type} onChange={handleChange} style={{ cursor: 'pointer' }}>
                      <option value="percent">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (FCFA)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Valeur {formData.discount_type === 'percent' ? '(%)' : '(FCFA)'}</label>
                    <input className="tn-input" name="discount_value" type="number" min="0" max={formData.discount_type === 'percent' ? 100 : undefined} step="1" value={formData.discount_value} onChange={handleChange} required placeholder={formData.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 5000'} />
                  </div>
                </div>
              </AdminModalSection>
              <AdminModalSection icon="fa-user" title="Destinataire (optionnel)">
                <p style={{ fontSize: 12, color: 'var(--tn-gray-500)', marginBottom: 12 }}>
                  Laissez vide pour un coupon général. Renseignez un email pour envoyer le code directement au destinataire.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email du destinataire</label>
                    <input className="tn-input" name="recipient_email" type="email" value={formData.recipient_email} onChange={handleChange} placeholder="client@email.com" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Message personnalisé</label>
                    <input className="tn-input" name="custom_message" value={formData.custom_message} onChange={handleChange} placeholder="Ex: Merci pour votre fidélité !" />
                  </div>
                </div>
              </AdminModalSection>
              <AdminModalSection icon="fa-calendar" title="Validité">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Début</label>
                    <input className="tn-input" name="valid_from" type="datetime-local" value={formData.valid_from} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Fin</label>
                    <input className="tn-input" name="valid_until" type="datetime-local" value={formData.valid_until} onChange={handleChange} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer' }}>
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: 18, height: 18, accentColor: 'var(--tn-orange)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Coupon actif</span>
                </label>
              </AdminModalSection>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
                <button type="button" onClick={resetForm} className="tn-btn" style={{ background: 'var(--ds-white)', color: 'var(--tn-gray-700)', border: '1.5px solid var(--tn-gray-200)' }}>Annuler</button>
                <button type="submit" className="tn-btn tn-btn--primary"><i className="fas fa-floppy-disk" /> {editing ? 'Mettre à jour' : 'Créer le coupon'}</button>
              </div>
            </form>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

export default AdminCoupons;
