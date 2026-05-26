import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminLoading, AdminError, AdminEmpty, StatusBadge,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const AdminNewsletter = () => {
  const { toast, confirm } = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const [sRes, stRes] = await Promise.all([
        api.get('/newsletter/subscribers/'),
        api.get('/newsletter/stats/'),
      ]);
      setSubscribers(sRes.data.results || []);
      setStats(stRes.data);
    } catch (e) {
      setError('Impossible de charger les données newsletter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    const ok = await confirm({
      title: 'Supprimer cet abonné ?',
      message: `${email} sera définitivement supprimé de la liste.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/newsletter/subscribers/${id}/`);
      fetchData();
      toast.success('Abonné supprimé');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExportCSV = () => {
    const active = subscribers.filter(s => s.is_active && s.confirmed);
    if (!active.length) { toast.error('Aucun abonné actif à exporter'); return; }
    const csv = 'Email,Date inscription,Date confirmation\n' +
      active.map(s => `${s.email},${s.subscribed_at || ''},${s.confirmed_at || ''}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'newsletter_abonnes.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${active.length} abonné(s) exporté(s)`);
  };

  const filtered = useMemo(() => {
    let list = subscribers;
    if (filter === 'active') list = list.filter(s => s.is_active && s.confirmed);
    else if (filter === 'pending') list = list.filter(s => s.is_active && !s.confirmed);
    else if (filter === 'unsubscribed') list = list.filter(s => !s.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.email.toLowerCase().includes(q));
    }
    return list;
  }, [subscribers, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminLoading label="Chargement newsletter..." /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchData} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Newsletter']}
        title="Newsletter"
        subtitle={`${stats?.active || 0} abonné(s) actif(s) sur ${stats?.total || 0} au total.`}
        actions={<>
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>
          <button onClick={handleExportCSV} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className="fas fa-download" /> Exporter CSV
          </button>
        </>}
      />

      <div className="adm-page-body">
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <AdminStat icon="fa-users" label="Total" value={stats.total} />
            <AdminStat icon="fa-check-circle" label="Actifs" value={stats.active} color="var(--tn-success, #16a34a)" />
            <AdminStat icon="fa-clock" label="En attente" value={stats.pending} color="var(--tn-orange, #E8601C)" />
            <AdminStat icon="fa-heart-broken" label="Désinscrits" value={stats.unsubscribed} color="var(--tn-gray-400, #999)" />
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AdminSearch placeholder="Rechercher un email..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <AdminFilterPills
            active={filter}
            onChange={setFilter}
            items={[
              ['all', 'Tous', subscribers.length],
              ['active', 'Actifs', subscribers.filter(s => s.is_active && s.confirmed).length],
              ['pending', 'En attente', subscribers.filter(s => s.is_active && !s.confirmed).length],
              ['unsubscribed', 'Désinscrits', subscribers.filter(s => !s.is_active).length],
            ]}
          />
        </div>

        {/* Empty */}
        {filtered.length === 0 && (
          <AdminEmpty icon="fa-envelope" title="Aucun abonn\u00e9 pour le moment" subtitle={search ? 'Aucun resultat pour cette recherche.' : 'Les inscriptions \u00e0 la newsletter appara\u00eetront ici \u00e0 mesure que les lecteurs s\'inscriront.'} />
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Email' },
            { label: 'Inscription', width: 130 },
            { label: 'Confirmation', width: 130 },
            { label: 'Statut', width: 120 },
            { label: '', width: 60, align: 'right' },
          ]}>
            {filtered.map((s, i) => (
              <AdminRow key={s.id} last={i === filtered.length - 1}>
                <AdminCell>
                  <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 13 }}>{s.email}</span>
                </AdminCell>
                <AdminCell>
                  <span style={{ fontSize: 12, color: 'var(--tn-gray-600)' }}>{fmtDate(s.subscribed_at)}</span>
                </AdminCell>
                <AdminCell>
                  <span style={{ fontSize: 12, color: 'var(--tn-gray-600)' }}>{s.confirmed_at ? fmtDate(s.confirmed_at) : '--'}</span>
                </AdminCell>
                <AdminCell>
                  {!s.is_active ? (
                    <StatusBadge value="inactive" label="Désinscrit" />
                  ) : s.confirmed ? (
                    <StatusBadge value="active" label="Actif" />
                  ) : (
                    <StatusBadge value="pending" label="En attente" />
                  )}
                </AdminCell>
                <AdminCell align="right">
                  <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(s.id, s.email)} />
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>
    </>
  );
};

export default AdminNewsletter;
