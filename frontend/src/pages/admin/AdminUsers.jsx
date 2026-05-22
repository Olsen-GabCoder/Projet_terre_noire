import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminAvatar, AdminLoading, AdminError, AdminEmpty,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtDateLong = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '--';
const fullName = (u) => { const p = [u.first_name, u.last_name].filter(Boolean); return p.length ? p.join(' ') : null; };

const rolePill = (fg, bg) => ({
  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999,
  background: bg, color: fg, fontSize: 11, fontWeight: 700,
});

const AdminUsers = () => {
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = async () => { try { setLoading(true); setError(null); const r = await api.get('/users/'); setUsers(Array.isArray(r.data) ? r.data : (r.data.results || [])); } catch(e){ setError('Impossible de charger les utilisateurs'); } finally { setLoading(false); } };

  const toggleStatus = async (userId, currentActive) => {
    const action = currentActive ? 'Desactiver' : 'Activer';
    const ok = await confirm({
      title: `${action} cet utilisateur ?`,
      message: currentActive ? 'L\'utilisateur ne pourra plus se connecter.' : 'L\'utilisateur retrouvera l\'acces a son compte.',
      confirmLabel: action,
      tone: currentActive ? 'danger' : 'info',
      icon: currentActive ? 'fa-user-slash' : 'fa-user-check',
    });
    if (!ok) return;
    try { await api.patch(`/users/${userId}/`, { is_active: !currentActive }); fetchUsers(); setSel(null); toast.success(`Utilisateur ${currentActive ? 'desactive' : 'active'}`); } catch(e){ toast.error('Erreur lors de la mise a jour'); }
  };

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    staff: users.filter(u => u.is_staff).length,
    superuser: users.filter(u => u.is_superuser).length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (filter === 'active') list = list.filter(u => u.is_active);
    else if (filter === 'inactive') list = list.filter(u => !u.is_active);
    else if (filter === 'staff') list = list.filter(u => u.is_staff);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(u => (u.username||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (fullName(u)||'').toLowerCase().includes(q)); }
    return list;
  }, [users, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminLoading label="Chargement des utilisateurs..." /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={() => window.location.reload()} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Utilisateurs']}
        title="Gestion des utilisateurs"
        subtitle="Consultez et gerez les comptes utilisateurs. Activez ou desactivez les acces."
        actions={<Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>}
      />

      <div className="adm-page-body">
        {/* Stats */}
        <div className="adm-grid-5" style={{ marginBottom: 28 }}>
          <AdminStat icon="fa-users" label="Total" value={counts.all} color="var(--tn-gray-700)" />
          <AdminStat icon="fa-user-check" label="Actifs" value={counts.active} meta={counts.all > 0 ? `${Math.round(counts.active / counts.all * 100)}% du total` : ''} metaTone="good" color="var(--tn-success)" />
          <AdminStat icon="fa-user-slash" label="Inactifs" value={counts.inactive} color="var(--tn-error)" />
          <AdminStat icon="fa-shield-halved" label="Staff" value={counts.staff} color="#1c2a4a" />
          <AdminStat icon="fa-crown" label="Superusers" value={counts.superuser} color="var(--tn-warning)" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <AdminFilterPills active={filter} onChange={setFilter} items={[
            ['all', 'Tous', counts.all], ['active', 'Actifs', counts.active],
            ['inactive', 'Inactifs', counts.inactive], ['staff', 'Staff', counts.staff],
          ]} />
          <AdminSearch placeholder="Rechercher username, email, nom..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-user-slash" title="Aucun utilisateur trouve" subtitle={search ? 'Essayez d\'autres termes.' : 'Aucun utilisateur ne correspond.'} />}

        {/* Table */}
        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Utilisateur' }, { label: 'Email', width: 240 }, { label: 'Inscription', width: 120 },
            { label: 'Statut', width: 110 }, { label: 'Roles', width: 110 }, { label: '', align: 'right', width: 100 },
          ]}>
            {filtered.map((u, i) => (
              <AdminRow key={u.id} last={i === filtered.length - 1}>
                <AdminCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AdminAvatar name={u.username} size={36} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tn-gray-900)', fontFamily: 'var(--tn-mono)' }}>{u.username}</div>
                      {fullName(u) && <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 2 }}>{fullName(u)}</div>}
                      <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, color: 'var(--tn-gray-400)', letterSpacing: '0.08em', marginTop: 2 }}>#{u.id}</div>
                    </div>
                  </div>
                </AdminCell>
                <AdminCell muted>{u.email}</AdminCell>
                <AdminCell muted mono>{fmtDate(u.date_joined)}</AdminCell>
                <AdminCell>
                  {u.is_active
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(46,125,50,0.12)', color: 'var(--tn-success)', fontSize: 11, fontWeight: 700 }}><i className="fas fa-circle-check" style={{ fontSize: 10 }} /> Actif</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(198,40,40,0.12)', color: 'var(--tn-error)', fontSize: 11, fontWeight: 700 }}><i className="fas fa-circle-xmark" style={{ fontSize: 10 }} /> Inactif</span>
                  }
                </AdminCell>
                <AdminCell>
                  {u.is_superuser
                    ? <span style={rolePill('#92400e', '#fef3c7')}><i className="fas fa-crown" style={{ fontSize: 9, marginRight: 4 }} /> Super</span>
                    : u.is_staff
                    ? <span style={rolePill('#1e40af', '#dbeafe')}><i className="fas fa-shield-halved" style={{ fontSize: 9, marginRight: 4 }} /> Staff</span>
                    : <span style={{ color: 'var(--tn-gray-400)' }}>—</span>
                  }
                </AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-eye" tone="orange" title="Details" onClick={() => setSel(u)} />
                    {u.is_active
                      ? <AdminActionBtn icon="fa-user-slash" tone="red" title="Desactiver" onClick={() => toggleStatus(u.id, true)} />
                      : <AdminActionBtn icon="fa-user-check" tone="green" title="Activer" onClick={() => toggleStatus(u.id, false)} />
                    }
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {/* Modal */}
      {sel && (
        <AdminModalOverlay onClose={() => setSel(null)}>
          <AdminModalHeader onClose={() => setSel(null)}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <AdminAvatar name={sel.username} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>Utilisateur #{sel.id}</div>
                <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>{sel.username}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {sel.is_active
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(46,125,50,0.18)', color: '#86efac', fontSize: 11, fontWeight: 700 }}><i className="fas fa-circle-check" style={{ fontSize: 10 }} /> Actif</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(198,40,40,0.18)', color: '#fca5a5', fontSize: 11, fontWeight: 700 }}><i className="fas fa-circle-xmark" style={{ fontSize: 10 }} /> Inactif</span>
                  }
                  {sel.is_superuser && <span style={rolePill('#fde68a', 'rgba(245,158,11,0.2)')}><i className="fas fa-crown" style={{ fontSize: 9, marginRight: 4 }} /> Superuser</span>}
                  {sel.is_staff && !sel.is_superuser && <span style={rolePill('#93c5fd', 'rgba(59,130,246,0.2)')}><i className="fas fa-shield-halved" style={{ fontSize: 9, marginRight: 4 }} /> Staff</span>}
                </div>
              </div>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            <AdminModalSection icon="fa-id-card" title="Informations">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DetailTile label="Username" value={sel.username} />
                <DetailTile label="Nom complet" value={fullName(sel) || '--'} />
                <DetailTile label="E-mail" value={sel.email} />
                <DetailTile label="Inscription" value={fmtDateLong(sel.date_joined)} />
              </div>
            </AdminModalSection>

            <div style={{ borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => toggleStatus(sel.id, sel.is_active)} style={{
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: 'transparent',
                border: `1px solid ${sel.is_active ? 'rgba(198,40,40,0.3)' : 'rgba(46,125,50,0.3)'}`,
                color: sel.is_active ? 'var(--tn-error)' : 'var(--tn-success)',
              }}>
                <i className={`fas ${sel.is_active ? 'fa-user-slash' : 'fa-user-check'}`} style={{ marginRight: 8 }} />
                {sel.is_active ? 'Desactiver cet utilisateur' : 'Activer cet utilisateur'}
              </button>
            </div>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

function DetailTile({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--ds-white)', borderRadius: 10, padding: 14, border: '1px solid var(--tn-gray-200)' }}>
      <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tn-gray-500)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 18, fontWeight: 700, color: 'var(--tn-gray-900)', letterSpacing: '-0.01em', marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default AdminUsers;
