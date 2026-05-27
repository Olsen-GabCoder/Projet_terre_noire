import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminAvatar, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection, StatusBadge,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const AdminCollections = () => {
  const { toast, confirm } = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', cover_image: null, is_active: true });
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => { try { setLoading(true); setError(null); const r = await api.get('/collections/', { params: { page_size: 100 } }); setCollections(r.data.results || r.data); } catch(e){ setError('Impossible de charger les collections'); } finally { setLoading(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.warning('Le nom est obligatoire'); return; }
    const data = new FormData();
    if (formData.name) data.append('name', formData.name);
    if (formData.description) data.append('description', formData.description);
    if (formData.cover_image) data.append('cover_image', formData.cover_image);
    data.append('is_active', formData.is_active.toString());
    try {
      if (editingCollection) await api.patch(`/collections/${editingCollection.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/collections/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchCollections(); resetForm();
      toast.success(editingCollection ? 'Collection mise à jour' : 'Collection créée avec succès');
    } catch(e){ toast.error(e.response?.data?.detail || e.response?.data?.name?.[0] || e.message); }
  };

  const handleEdit = (c) => { setEditingCollection(c); setFormData({ name: c.name||'', description: c.description||'', cover_image: null, is_active: c.is_active??true }); setPreviewImage(c.cover_image||null); setShowForm(true); };
  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Supprimer cette collection ?', message: 'Cette action est irréversible. Les livres associés ne seront pas supprimés.', confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/collections/${id}/`); fetchCollections(); toast.success('Collection supprimée'); } catch(e){ toast.error('Échec de la suppression'); }
  };
  const resetForm = useCallback(() => { setShowForm(false); setEditingCollection(null); setFormData({ name:'', description:'', cover_image:null, is_active:true }); setPreviewImage(null); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(p => ({ ...p, cover_image: file }));
    if (file) { const r = new FileReader(); r.onloadend = () => setPreviewImage(r.result); r.readAsDataURL(file); }
    else setPreviewImage(null);
  };

  const totalBooks = useMemo(() => collections.reduce((s, c) => s + (c.books_count || 0), 0), [collections]);
  const activeCount = useMemo(() => collections.filter(c => c.is_active).length, [collections]);

  const filtered = useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase();
    return collections.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [collections, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={5} columns={4} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={() => window.location.reload()} /></div>;

  const formInitial = (formData.name || '?').charAt(0).toUpperCase();

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Collections']}
        title="Gestion des collections"
        subtitle="Créez et modifiez les collections éditoriales. Chaque collection regroupe des ouvrages autour d'une thématique."
        actions={<>
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>
          <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} /> {showForm ? 'Fermer' : 'Ajouter une collection'}
          </button>
        </>}
      />

      <div className="adm-page-body">
        {/* Stats */}
        <div className="adm-grid-3" style={{ marginBottom: 28 }}>
          <AdminStat icon="fa-layer-group" label="Collections" value={collections.length} color="var(--tn-orange)" />
          <AdminStat icon="fa-circle-check" label="Actives" value={activeCount} color="var(--tn-success)" />
          <AdminStat icon="fa-book" label="Total livres" value={totalBooks} color="var(--tn-gold-dark)" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
          <AdminSearch placeholder="Rechercher une collection..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tn-gray-500)', whiteSpace: 'nowrap' }}>
            {filtered.length} collection{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-layer-group" title="Aucune collection" subtitle={search ? 'Essayez un autre nom.' : 'Créez votre première collection pour regrouper vos ouvrages.'} />}

        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Image', width: 76 }, { label: 'Collection' }, { label: 'Description' },
            { label: 'Livres', width: 90 }, { label: 'Active', width: 90 }, { label: 'Ajout', width: 110 }, { label: '', align: 'right', width: 90 },
          ]}>
            {filtered.map((c, i) => (
              <AdminRow key={c.id} last={i === filtered.length - 1}>
                <AdminCell><AdminAvatar name={c.name} size={48} photo={c.cover_image} /></AdminCell>
                <AdminCell>
                  <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 15, fontWeight: 600, color: 'var(--tn-gray-900)' }}>{c.name}</div>
                  {c.slug && <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', marginTop: 4 }}>{c.slug}</div>}
                </AdminCell>
                <AdminCell muted style={{ maxWidth: 320, overflow: 'hidden' }}>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, fontSize: 12 }}>
                    {c.description || 'Aucune description'}
                  </div>
                </AdminCell>
                <AdminCell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--tn-cream-2)', color: 'var(--tn-gray-700)', fontFamily: 'var(--tn-mono)', fontSize: 12, fontWeight: 700 }}>
                    <i className="fas fa-book" style={{ color: 'var(--tn-orange)', fontSize: 10 }} />{c.books_count || 0}
                  </span>
                </AdminCell>
                <AdminCell><StatusBadge value={c.is_active ? 'active' : 'inactive'} /></AdminCell>
                <AdminCell muted mono>{fmtDate(c.created_at)}</AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-pen-to-square" tone="orange" title="Modifier" onClick={() => handleEdit(c)} />
                    <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(c.id)} />
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {/* -- CREATE / EDIT MODAL -- */}
      {showForm && (
        <AdminModalOverlay onClose={resetForm}>
          <AdminModalHeader onClose={resetForm}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: previewImage ? `url(${previewImage}) center/cover` : 'linear-gradient(135deg, var(--tn-orange), var(--tn-gold-dark))',
                color: 'var(--ds-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22,
                border: '2px solid rgba(255,255,255,0.15)',
              }}>{previewImage ? null : formInitial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>
                  {editingCollection ? `Modifier · ${editingCollection.name}` : 'Nouvelle collection'}
                </div>
                <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>
                  {editingCollection ? 'Modifier la collection' : 'Ajouter une collection'}
                </h2>
              </div>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            <form onSubmit={handleSubmit}>
              <AdminModalSection icon="fa-image" title="Image de la collection">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
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
                      <i className="fas fa-image" style={{ color: 'var(--tn-orange)' }} />
                      {editingCollection ? 'Changer l\'image' : 'Ajouter une image'}
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, color: 'var(--tn-gray-500)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>JPG · PNG · max 5 Mo</div>
                  </div>
                </div>
              </AdminModalSection>

              <AdminModalSection icon="fa-pen" title="Informations">
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Nom <span style={{ color: 'var(--tn-orange)' }}>*</span>
                  </label>
                  <input className="tn-input" name="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Voix d'Afrique" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Description <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--tn-gray-400)', marginLeft: 6 }}>OPTIONNEL</span>
                  </label>
                  <textarea className="tn-input" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Décrivez cette collection..."
                    style={{ minHeight: 130, fontFamily: 'var(--tn-serif)', fontSize: 14, lineHeight: 1.55, resize: 'vertical' }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--tn-orange)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Collection active</span>
                </label>
              </AdminModalSection>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
                <button type="button" onClick={resetForm} className="tn-btn" style={{ background: 'var(--ds-white)', color: 'var(--tn-gray-700)', border: '1.5px solid var(--tn-gray-200)' }}>Annuler</button>
                <button type="submit" className="tn-btn tn-btn--primary"><i className="fas fa-floppy-disk" /> {editingCollection ? 'Mettre à jour' : 'Créer la collection'}</button>
              </div>
            </form>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

export default AdminCollections;
