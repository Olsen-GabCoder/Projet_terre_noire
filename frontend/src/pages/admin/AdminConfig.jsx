import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import { AdminLoading, AdminError, AdminModalSection } from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const AdminConfig = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ shipping_free_threshold: '', shipping_cost: '' });

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true); setError(null);
      const r = await api.get('/config/delivery/');
      setConfig({ shipping_free_threshold: r.data.shipping_free_threshold, shipping_cost: r.data.shipping_cost });
    } catch { setError('Impossible de charger la configuration'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/config/delivery/', {
        shipping_free_threshold: Number(config.shipping_free_threshold),
        shipping_cost: Number(config.shipping_cost),
      });
      toast.success('Configuration mise à jour');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="adm-page-body"><AdminLoading label="Chargement..." /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchConfig} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Configuration']}
        title="Configuration du site"
        subtitle="Gérez les paramètres de livraison et autres réglages."
        actions={<Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>}
      />
      <div className="adm-page-body">
        <div style={{ maxWidth: 600 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'var(--ds-white)', borderRadius: 14, border: '1px solid var(--tn-gray-200)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--tn-gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-truck" style={{ color: 'var(--tn-orange)', fontSize: 18 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Frais de livraison</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tn-gray-500)' }}>Configurez les coûts et seuils de livraison</p>
                </div>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Frais de livraison (FCFA)
                  </label>
                  <input className="tn-input" name="shipping_cost" type="number" min="0" step="100" value={config.shipping_cost} onChange={handleChange} required />
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Appliqué si le panier est sous le seuil</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Seuil livraison gratuite (FCFA)
                  </label>
                  <input className="tn-input" name="shipping_free_threshold" type="number" min="0" step="1000" value={config.shipping_free_threshold} onChange={handleChange} required />
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Livraison offerte au-dessus de ce montant</p>
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--tn-gray-100)', background: 'var(--tn-cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tn-gray-600)' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                  Actuellement : {fmtPrice(config.shipping_cost)} FCFA de frais, gratuit dès {fmtPrice(config.shipping_free_threshold)} FCFA
                </span>
                <button type="submit" disabled={saving} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Sauvegarde...</> : <><i className="fas fa-floppy-disk" /> Sauvegarder</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AdminConfig;
