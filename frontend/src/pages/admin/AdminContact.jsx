import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty, StatusBadge,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';

const SUBJECT_COLORS = {
  Commande: { bg: 'var(--tn-orange-50, #FFF5F0)', fg: 'var(--tn-orange)' },
  Manuscrit: { bg: '#F0F5FF', fg: '#3B82F6' },
  Partenariat: { bg: '#F0FFF4', fg: '#16A34A' },
  Autre: { bg: 'var(--tn-cream-2)', fg: 'var(--tn-gray-600)' },
};

const AdminContact = () => {
  const { toast, confirm } = useToast();
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    try { setLoading(true); setError(null); const r = await api.get('/contact/messages/'); setMessages(r.data.results || []); setStats(r.data.stats || {}); }
    catch { setError('Impossible de charger les messages'); }
    finally { setLoading(false); }
  };

  const handleToggleRead = async (msg) => {
    try { await api.patch(`/contact/messages/${msg.id}/`, { is_read: !msg.is_read }); fetchMessages(); }
    catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Supprimer ce message ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/contact/messages/${id}/`); fetchMessages(); setSelected(null); toast.success('Message supprimé'); }
    catch { toast.error('Erreur'); }
  };

  const handleOpen = async (msg) => {
    setSelected(msg);
    if (!msg.is_read) {
      try { await api.patch(`/contact/messages/${msg.id}/`, { is_read: true }); fetchMessages(); } catch {}
    }
  };

  const filtered = useMemo(() => {
    let list = messages;
    if (filter === 'unread') list = list.filter(m => !m.is_read);
    else if (filter === 'read') list = list.filter(m => m.is_read);
    else if (filter !== 'all') list = list.filter(m => m.subject === filter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.message.toLowerCase().includes(q)); }
    return list;
  }, [messages, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={5} columns={5} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchMessages} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Contact']}
        title="Messages de contact"
        subtitle={`${stats.unread} message(s) non lu(s) sur ${stats.total}`}
        actions={<Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>}
      />
      <div className="adm-page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <AdminStat icon="fa-envelope" label="Total" value={stats.total} />
          <AdminStat icon="fa-envelope-open" label="Non lus" value={stats.unread} color="var(--tn-orange)" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AdminSearch placeholder="Rechercher nom, email, message..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <AdminFilterPills active={filter} onChange={setFilter} items={[
            ['all', 'Tous', messages.length],
            ['unread', 'Non lus', stats.unread],
            ['read', 'Lus', messages.length - stats.unread],
            ['Commande', 'Commandes', messages.filter(m => m.subject === 'Commande').length],
            ['Manuscrit', 'Manuscrits', messages.filter(m => m.subject === 'Manuscrit').length],
            ['Partenariat', 'Partenariats', messages.filter(m => m.subject === 'Partenariat').length],
          ]} />
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-envelope" title="Aucun message re\u00e7u" subtitle={search ? 'Aucun resultat.' : 'Les messages envoy\u00e9s via le formulaire de contact appara\u00eetront ici.'} />}

        {filtered.length > 0 && (
          <AdminTable columns={[{ label: '', width: 30 }, { label: 'Expéditeur' }, { label: 'Sujet', width: 120 }, { label: 'Apercu' }, { label: 'Date', width: 150 }, { label: '', width: 90, align: 'right' }]}>
            {filtered.map((m, i) => {
              const sc = SUBJECT_COLORS[m.subject] || SUBJECT_COLORS.Autre;
              return (
                <AdminRow key={m.id} last={i === filtered.length - 1}>
                  <AdminCell>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.is_read ? 'transparent' : 'var(--tn-orange)', display: 'inline-block' }} />
                  </AdminCell>
                  <AdminCell>
                    <div style={{ fontWeight: m.is_read ? 400 : 700, fontSize: 13 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--tn-gray-500)' }}>{m.email}</div>
                  </AdminCell>
                  <AdminCell>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.fg, fontSize: 11, fontWeight: 600 }}>{m.subject}</span>
                  </AdminCell>
                  <AdminCell>
                    <span style={{ fontSize: 12, color: 'var(--tn-gray-600)', fontWeight: m.is_read ? 400 : 600 }}>{m.message.slice(0, 80)}{m.message.length > 80 ? '...' : ''}</span>
                  </AdminCell>
                  <AdminCell><span style={{ fontSize: 11, color: 'var(--tn-gray-500)' }}>{fmtDate(m.created_at)}</span></AdminCell>
                  <AdminCell align="right">
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <AdminActionBtn icon="fa-eye" tone="blue" title="Lire" onClick={() => handleOpen(m)} />
                      <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(m.id)} />
                    </div>
                  </AdminCell>
                </AdminRow>
              );
            })}
          </AdminTable>
        )}
      </div>

      {selected && (
        <AdminModalOverlay onClose={() => setSelected(null)}>
          <AdminModalHeader onClose={() => setSelected(null)}>
            <div>
              <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>{selected.subject}</div>
              <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 20, margin: 0 }}>Message de {selected.name}</h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{selected.email} · {fmtDate(selected.created_at)}</div>
            </div>
          </AdminModalHeader>
          <AdminModalBody>
            <AdminModalSection icon="fa-message" title="Contenu">
              <div style={{ background: 'var(--tn-cream-2)', borderRadius: 10, padding: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--tn-gray-800)', whiteSpace: 'pre-wrap' }}>
                {selected.message}
              </div>
            </AdminModalSection>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
              <button onClick={() => handleToggleRead(selected)} className="tn-btn" style={{ background: 'var(--ds-white)', color: 'var(--tn-gray-700)', border: '1.5px solid var(--tn-gray-200)' }}>
                <i className={`fas ${selected.is_read ? 'fa-envelope' : 'fa-envelope-open'}`} /> {selected.is_read ? 'Marquer non lu' : 'Marquer lu'}
              </button>
              <a href={`mailto:${selected.email}?subject=Re: ${selected.subject}`} className="tn-btn tn-btn--primary">
                <i className="fas fa-reply" /> Répondre par email
              </a>
            </div>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

export default AdminContact;
