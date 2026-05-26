import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminCard, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminAvatar, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const AdminAuthors = () => {
  const { toast, confirm } = useToast();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ full_name: '', biography: '', photo: null });
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => { fetchAuthors(); }, []);

  const fetchAuthors = async () => { try { setLoading(true); setError(null); const r = await api.get('/authors/', { params: { page_size: 100 } }); setAuthors(r.data.results || r.data); } catch(e){ setError('Impossible de charger les auteurs'); } finally { setLoading(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { toast.warning('Le nom complet est obligatoire'); return; }
    const data = new FormData();
    if (formData.full_name) data.append('full_name', formData.full_name);
    if (formData.biography) data.append('biography', formData.biography);
    if (formData.photo) data.append('photo', formData.photo);
    try {
      if (editingAuthor) await api.patch(`/authors/${editingAuthor.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/authors/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchAuthors(); resetForm();
      toast.success(editingAuthor ? 'Auteur mis a jour' : 'Auteur cree avec succes');
    } catch(e){ toast.error(e.response?.data?.detail || e.message); }
  };

  const handleEdit = (a) => { setEditingAuthor(a); setFormData({ full_name: a.full_name||'', biography: a.biography||'', photo: null }); setPreviewImage(a.photo||null); setShowForm(true); };
  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Supprimer cet auteur ?', message: 'Cette action est irreversible. Les livres associes ne seront pas supprimes.', confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/authors/${id}/`); fetchAuthors(); toast.success('Auteur supprime'); } catch(e){ toast.error('Echec de la suppression'); }
  };
  const resetForm = useCallback(() => { setShowForm(false); setEditingAuthor(null); setFormData({ full_name:'', biography:'', photo:null }); setPreviewImage(null); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(p => ({ ...p, photo: file }));
    if (file) { const r = new FileReader(); r.onloadend = () => setPreviewImage(r.result); r.readAsDataURL(file); }
    else setPreviewImage(null);
  };

  const totalBooks = useMemo(() => authors.reduce((s, a) => s + (a.books_count || 0), 0), [authors]);
  const avgBooks = useMemo(() => authors.length > 0 ? (totalBooks / authors.length).toFixed(1) : '0', [authors, totalBooks]);

  const filtered = useMemo(() => {
    if (!search.trim()) return authors;
    const q = search.toLowerCase();
    return authors.filter(a => (a.full_name || '').toLowerCase().includes(q));
  }, [authors, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={5} columns={4} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={() => window.location.reload()} /></div>;

  const formInitial = (formData.full_name || '?').charAt(0).toUpperCase();

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Auteurs']}
        title="Gestion des auteurs"
        subtitle="Creez et modifiez les auteurs du catalogue. Chaque auteur peut etre associe a plusieurs ouvrages."
        actions={<>
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>
          <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} /> {showForm ? 'Fermer' : 'Ajouter un auteur'}
          </button>
        </>}
      />

      <div className="adm-page-body">
        {/* Stats */}
        <div className="adm-grid-3" style={{ marginBottom: 28 }}>
          <AdminStat icon="fa-feather" label="Auteurs" value={authors.length} meta={`${authors.filter(a => (a.books_count||0) > 0).length} avec des livres`} color="var(--tn-orange)" />
          <AdminStat icon="fa-book" label="Total livres" value={totalBooks} color="var(--tn-gold-dark)" />
          <AdminStat icon="fa-chart-simple" label="Moy. livres / auteur" value={avgBooks} color="var(--tn-success)" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
          <AdminSearch placeholder="Rechercher un auteur..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tn-gray-500)', whiteSpace: 'nowrap' }}>
            {filtered.length} auteur{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-feather" title="Aucun auteur enregistr\u00e9" subtitle={search ? 'Essayez un autre nom.' : 'Ajoutez les auteurs avant de publier leurs \u0153uvres.'} />}

        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Photo', width: 76 }, { label: 'Auteur' }, { label: 'Biographie' },
            { label: 'Livres', width: 90 }, { label: 'Ajout', width: 110 }, { label: '', align: 'right', width: 90 },
          ]}>
            {filtered.map((a, i) => (
              <AdminRow key={a.id} last={i === filtered.length - 1}>
                <AdminCell><AdminAvatar name={a.full_name} size={48} photo={a.photo} /></AdminCell>
                <AdminCell>
                  <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 15, fontWeight: 600, color: 'var(--tn-gray-900)' }}>{a.full_name}</div>
                  {a.slug && <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', marginTop: 4 }}>{a.slug}</div>}
                </AdminCell>
                <AdminCell muted style={{ maxWidth: 320, overflow: 'hidden' }}>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, fontSize: 12 }}>
                    {a.biography || 'Aucune biographie'}
                  </div>
                </AdminCell>
                <AdminCell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--tn-cream-2)', color: 'var(--tn-gray-700)', fontFamily: 'var(--tn-mono)', fontSize: 12, fontWeight: 700 }}>
                    <i className="fas fa-book" style={{ color: 'var(--tn-orange)', fontSize: 10 }} />{a.books_count || 0}
                  </span>
                </AdminCell>
                <AdminCell muted mono>{fmtDate(a.created_at)}</AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-pen-to-square" tone="orange" title="Modifier" onClick={() => handleEdit(a)} />
                    <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(a.id)} />
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showForm && (
        <AdminModalOverlay onClose={resetForm}>
          <AdminModalHeader onClose={resetForm}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: previewImage ? `url(${previewImage}) center/cover` : 'linear-gradient(135deg, var(--tn-orange), var(--tn-gold-dark))',
                color: 'var(--ds-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22,
                border: '2px solid rgba(255,255,255,0.15)',
              }}>{previewImage ? null : formInitial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>
                  {editingAuthor ? `Modifier · ${editingAuthor.full_name}` : 'Nouvel auteur'}
                </div>
                <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>
                  {editingAuthor ? 'Modifier l\'auteur' : 'Ajouter un auteur'}
                </h2>
              </div>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            <form onSubmit={handleSubmit}>
              <AdminModalSection icon="fa-camera" title="Photo">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    background: previewImage ? `url(${previewImage}) center/cover` : 'linear-gradient(135deg, var(--tn-orange), var(--tn-gold-dark))',
                    color: 'var(--ds-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 32,
                    boxShadow: '0 8px 20px rgba(232,96,28,0.25)',
                  }}>{previewImage ? null : formInitial}</div>
                  <div>
                    <label style={{
                      padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--tn-cream-2)', border: '1.5px dashed var(--tn-gray-300)',
                      color: 'var(--tn-gray-700)', fontWeight: 600, fontSize: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      <i className="fas fa-camera" style={{ color: 'var(--tn-orange)' }} />
                      {editingAuthor ? 'Changer la photo' : 'Ajouter une photo'}
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, color: 'var(--tn-gray-500)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>JPG · PNG · max 5 Mo</div>
                  </div>
                </div>
              </AdminModalSection>

              <AdminModalSection icon="fa-pen" title="Informations">
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Nom complet <span style={{ color: 'var(--tn-orange)' }}>*</span>
                  </label>
                  <input className="tn-input" name="full_name" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Ex : Aicha Mbadinga" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Biographie <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--tn-gray-400)', marginLeft: 6 }}>OPTIONNEL</span>
                  </label>
                  <textarea className="tn-input" value={formData.biography} onChange={e => setFormData(p => ({ ...p, biography: e.target.value }))}
                    placeholder="Quelques lignes sur l'auteur..."
                    style={{ minHeight: 130, fontFamily: 'var(--tn-serif)', fontSize: 14, lineHeight: 1.55, resize: 'vertical' }}
                  />
                </div>
              </AdminModalSection>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
                <button type="button" onClick={resetForm} className="tn-btn" style={{ background: 'var(--ds-white)', color: 'var(--tn-gray-700)', border: '1.5px solid var(--tn-gray-200)' }}>Annuler</button>
                <button type="submit" className="tn-btn tn-btn--primary"><i className="fas fa-floppy-disk" /> {editingAuthor ? 'Mettre a jour' : 'Creer l\'auteur'}</button>
              </div>
            </form>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

export default AdminAuthors;
