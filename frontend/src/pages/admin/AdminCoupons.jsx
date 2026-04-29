import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../../services/api';
import aiService from '../../services/aiService';
import toast from 'react-hot-toast';
import '../../styles/AdminCoupons.css';

const FILTERS = ['', 'SENT', 'USED', 'EXPIRED', 'REVOKED', 'PENDING', 'FAILED'];

const SEGMENTS = [
  { key: 'churn', label: 'Risque de départ', icon: 'fa-user-clock', desc: 'Clients ayant acheté mais inactifs récemment' },
  { key: 'high_value', label: 'Meilleurs clients', icon: 'fa-crown', desc: 'Plus gros dépensiers de la plateforme' },
  { key: 'new', label: 'Nouveaux inscrits', icon: 'fa-user-plus', desc: 'Comptes créés depuis moins de 30 jours' },
  { key: 'inactive', label: 'Inactifs', icon: 'fa-moon', desc: 'Plus de 60 jours sans commande' },
];

function SmartTargetingPanel() {
  const [segment, setSegment] = useState('churn');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    if (data && data._segment === segment) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const result = await aiService.smartCouponTargeting(segment);
      result._segment = segment;
      setData(result);
      setOpen(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erreur ciblage IA');
    }
    setLoading(false);
  };

  return (
    <div className="ac-targeting">
      <h3 className="ac-section-title"><i className="fas fa-crosshairs" /> Ciblage intelligent (IA)</h3>
      <div className="ac-targeting__segments">
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            className={`ac-targeting__seg ${segment === s.key ? 'ac-targeting__seg--active' : ''}`}
            onClick={() => setSegment(s.key)}
            title={s.desc}
          >
            <i className={`fas ${s.icon}`} /> {s.label}
          </button>
        ))}
      </div>
      <button className="ac-targeting__btn" onClick={analyze} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> Analyse en cours...</>
          : <><i className="fas fa-robot" /> Identifier les cibles</>
        }
      </button>
      {open && data?.targets?.length > 0 && (
        <div className="ac-targeting__results">
          {data.targets.map((t, i) => (
            <div key={i} className="ac-targeting__card">
              <div className="ac-targeting__card-header">
                <strong>{t.user_id ? `Utilisateur #${t.user_id}` : (t.name || `Cible ${i + 1}`)}</strong>
                {t.suggested_discount && (
                  <span className="ac-targeting__discount">{t.suggested_discount}</span>
                )}
              </div>
              <p className="ac-targeting__reason">{t.reason}</p>
            </div>
          ))}
        </div>
      )}
      {open && data && (!data.targets || data.targets.length === 0) && (
        <p className="ac-targeting__empty"><i className="fas fa-check-circle" /> Aucun utilisateur trouvé pour ce segment.</p>
      )}
    </div>
  );
}

const AdminCoupons = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    couponAPI.adminOverview().then(({ data }) => setOverview(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    couponAPI.adminList(params)
      .then(({ data }) => setCoupons(data.results || []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const discountLabel = (c) => {
    if (c.discount_type === 'PERCENT') return `-${parseFloat(c.discount_value)}%`;
    if (c.discount_type === 'FIXED') return `-${parseInt(c.discount_value)} FCFA`;
    return t('coupons.type.FREE_SHIPPING');
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  const getStatusConfig = (status) => {
    const configs = {
      SENT: { label: t('coupons.status.SENT'), cls: 'ac-badge--sent' },
      USED: { label: t('coupons.status.USED'), cls: 'ac-badge--used' },
      EXPIRED: { label: t('coupons.status.EXPIRED'), cls: 'ac-badge--expired' },
      REVOKED: { label: t('coupons.status.REVOKED'), cls: 'ac-badge--revoked' },
      PENDING: { label: t('coupons.status.PENDING'), cls: 'ac-badge--pending' },
      FAILED: { label: t('coupons.status.FAILED'), cls: 'ac-badge--failed' },
    };
    return configs[status] || { label: status, cls: 'ac-badge--pending' };
  };

  return (
    <div className="ac-page">
      {/* ── Hero ── */}
      <section className="ac-hero">
        <div className="ac-hero__orb ac-hero__orb--1" />
        <div className="ac-hero__orb ac-hero__orb--2" />
        <div className="ac-hero__grid-bg" />
        <div className="ac-hero__inner">
          <div className="ac-hero__line" />
          <h1 className="ac-hero__title">{t('coupons.admin.title')}</h1>
          <p className="ac-hero__sub">Vue globale des coupons en circulation, taux d'activation et supervision par organisation.</p>
          <Link to="/admin-dashboard" className="ac-hero__back">
            <i className="fas fa-arrow-left" /> Retour
          </Link>
        </div>
      </section>

      <div className="ac-hero-fade" />

      <section className="ac-content">
        <div className="ac-inner">
          {/* ── Stats ── */}
          {overview && (
            <div className="ac-stats">
              {[
                { label: t('coupons.admin.totalIssued'), value: overview.total_issued, icon: 'fas fa-ticket-alt' },
                { label: t('coupons.admin.totalUsed'), value: overview.total_used, icon: 'fas fa-check-circle' },
                { label: t('coupons.admin.totalDiscount'), value: `${fmt(overview.total_discount_value)}`, icon: 'fas fa-coins', unit: 'FCFA' },
                { label: t('coupons.admin.activationRate'), value: `${overview.activation_rate}%`, icon: 'fas fa-chart-line', highlight: true },
              ].map((s, i) => (
                <div key={i} className={`ac-stat ${s.highlight ? 'ac-stat--highlight' : ''}`}>
                  <div className="ac-stat__icon"><i className={s.icon} /></div>
                  <span className="ac-stat__value">{s.value} {s.unit && <small>{s.unit}</small>}</span>
                  <span className="ac-stat__label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Top Orgs ── */}
          {overview?.top_organizations?.length > 0 && (
            <div className="ac-top-orgs">
              <h3 className="ac-section-title"><i className="fas fa-building" /> {t('coupons.admin.topOrgs')}</h3>
              <div className="ac-top-orgs__list">
                {overview.top_organizations.map((o, i) => (
                  <span key={i} className="ac-top-orgs__pill">{o.name} <strong>({o.count})</strong></span>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Smart Targeting ── */}
          <SmartTargetingPanel />

          {/* ── Filters ── */}
          <div className="ac-filters">
            {FILTERS.map((s) => (
              <button
                key={s}
                className={`ac-filter ${filter === s ? 'ac-filter--active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s ? t(`coupons.status.${s}`) : t('coupons.received.filter.all')}
              </button>
            ))}
          </div>

          {/* ── Table ── */}
          {loading ? (
            <div className="ac-loading"><div className="admin-spinner" /></div>
          ) : coupons.length === 0 ? (
            <div className="ac-empty">
              <i className="fas fa-ticket-alt" />
              <p>Aucun coupon trouvé avec ce filtre.</p>
            </div>
          ) : (
            <div className="ac-table-card">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Réduction</th>
                    <th>Créé par</th>
                    <th>Organisation</th>
                    <th>Destinataire</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const sc = getStatusConfig(c.status);
                    return (
                      <tr key={c.id}>
                        <td className="ac-table__code" data-label="Code">{c.code}</td>
                        <td data-label="Réduction"><span className="ac-table__discount">{discountLabel(c)}</span></td>
                        <td data-label="Créé par">{c.created_by_name || '—'}</td>
                        <td data-label="Organisation">{c.organization_name || <em className="ac-table__platform">Plateforme</em>}</td>
                        <td className="ac-table__email" data-label="Destinataire">{c.recipient_email || '—'}</td>
                        <td data-label="Statut"><span className={`ac-badge ${sc.cls}`}>{sc.label}</span></td>
                        <td className="ac-table__date" data-label="Date">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminCoupons;
