import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminCard, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty, StatusBadge,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const EMPTY_FORM = { title:'',author:'',description:'',price:'',original_price:'',reference:'',format:'PAPIER',available:true,is_bestseller:false,category:'',cover_image:null,back_cover_image:null,pdf_file:null,page_count:'',isbn:'',language:'FR',dimensions_width_cm:'',dimensions_height_cm:'',weight_g:'',collection:'',excerpt_pdf:null };

const AdminBooks = () => {
  const { toast, confirm } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [collections, setCollections] = useState([]);

  useEffect(() => { fetchBooks(); fetchAuthors(); fetchCategories(); fetchCollections(); }, []);

  const fetchBooks = async () => { try { setLoading(true); setError(null); const r = await api.get('/books/', { params: { page_size: 100 } }); setBooks(r.data.results || r.data); } catch(e){ setError('Impossible de charger les livres'); console.error(e); } finally{setLoading(false);} };
  const fetchAuthors = async () => { try { const r = await api.get('/authors/', { params: { page_size: 100 } }); setAuthors(r.data.results || r.data); } catch(e){console.error(e);} };
  const fetchCategories = async () => { try { const r = await api.get('/categories/', { params: { page_size: 100 } }); setCategories(r.data.results || r.data || []); } catch(e){setCategories([]);} };
  const fetchCollections = async () => { try { const r = await api.get('/collections/', { params: { page_size: 100 } }); setCollections(r.data.results || r.data || []); } catch(e){setCollections([]);} };

  const handleInputChange = (e) => { const { name, value, type, checked } = e.target; setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value })); };
  const handleFileChange = (e) => setFormData(p => ({ ...p, cover_image: e.target.files[0] }));
  const handleBackCoverChange = (e) => setFormData(p => ({ ...p, back_cover_image: e.target.files[0] || null }));
  const handlePdfChange = (e) => setFormData(p => ({ ...p, pdf_file: e.target.files[0] || null }));
  const handleExcerptChange = (e) => setFormData(p => ({ ...p, excerpt_pdf: e.target.files[0] || null }));

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try { const r = await api.post('/categories/', { name }); await fetchCategories(); setFormData(p => ({ ...p, category: String(r.data.id) })); setNewCategoryName(''); }
    catch(e){ toast.error(e.response?.data?.name?.[0] || 'Erreur lors de la création de la catégorie'); }
  };

  const buildFormData = () => {
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      const v = formData[key];
      if (['cover_image','back_cover_image','pdf_file','excerpt_pdf'].includes(key) && v === null) return;
      if (typeof v === 'boolean') data.append(key, v.toString());
      else if (v !== '' && v !== null && v !== undefined) data.append(key, v);
    });
    return data;
  };

  /* ── CREATE ── */
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/books/', buildFormData());
      fetchBooks(); resetCreateForm();
      toast.success('Livre créé avec succès');
    } catch(e){ toast.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message); }
  };

  /* ── EDIT (modal) ── */
  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title||'', author: book.author?.id||book.author||'',
      description: book.description||'', price: book.price||'',
      original_price: book.original_price||'', reference: book.reference||'',
      format: book.format||'PAPIER', available: book.available??true,
      is_bestseller: book.is_bestseller||false,
      category: book.category?.id||book.category||'',
      cover_image: null, back_cover_image: null, pdf_file: null, excerpt_pdf: null,
      page_count: book.page_count||'', isbn: book.isbn||'', language: book.language||'FR',
      dimensions_width_cm: book.dimensions_width_cm||'', dimensions_height_cm: book.dimensions_height_cm||'', weight_g: book.weight_g||'',
      collection: book.collection?.id||book.collection||'',
    });
    setNewCategoryName('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/books/${editingBook.id}/`, buildFormData());
      fetchBooks(); closeEditModal();
      toast.success('Livre mis à jour avec succès');
    } catch(e){ toast.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message); }
  };

  const closeEditModal = useCallback(() => { setEditingBook(null); setFormData({ ...EMPTY_FORM }); setNewCategoryName(''); }, []);

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Supprimer ce livre ?', message: 'Cette action est irréversible. Le livre sera retiré du catalogue.', confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/books/${id}/`); fetchBooks(); toast.success('Livre supprimé'); } catch(e){ toast.error('Échec de la suppression'); }
  };

  const resetCreateForm = useCallback(() => { setShowForm(false); setFormData({ ...EMPTY_FORM }); setNewCategoryName(''); }, []);

  const filtered = React.useMemo(() => {
    let list = books;
    if (filter === 'available') list = list.filter(b => b.available);
    else if (filter === 'promo') list = list.filter(b => b.original_price && Number(b.original_price) > Number(b.price));
    else if (filter === 'bestseller') list = list.filter(b => b.is_bestseller);
    else if (filter === 'ebook') list = list.filter(b => b.format === 'EBOOK');
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(b => (b.title||'').toLowerCase().includes(q) || (b.author?.full_name||'').toLowerCase().includes(q) || (b.reference||'').toLowerCase().includes(q)); }
    return list;
  }, [books, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={6} columns={5} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={() => { setError(null); fetchBooks(); fetchAuthors(); fetchCategories(); }} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Catalogue']}
        title="Gestion des livres"
        subtitle="Créez et modifiez les ouvrages de votre catalogue. Gérez les prix, promotions et disponibilités."
        actions={<>
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>
          <button onClick={() => { if (showForm) resetCreateForm(); else setShowForm(true); }} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} /> {showForm ? 'Fermer' : 'Ajouter un livre'}
          </button>
        </>}
      />

      <div className="adm-page-body">

        {/* ── TOOLBAR ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AdminSearch placeholder="Rechercher titre, auteur, ref..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <AdminFilterPills
            active={filter}
            onChange={setFilter}
            items={[
              ['all', 'Tous', books.length],
              ['available', 'Disponibles', books.filter(b => b.available).length],
              ['promo', 'En promo', books.filter(b => b.original_price && Number(b.original_price) > Number(b.price)).length],
              ['bestseller', 'Best-sellers', books.filter(b => b.is_bestseller).length],
              ['ebook', 'Ebooks', books.filter(b => b.format === 'EBOOK').length],
            ]}
          />
        </div>

        {/* ── EMPTY ── */}
        {filtered.length === 0 && (
          <AdminEmpty icon="fa-book" title="Aucun ouvrage dans le catalogue" subtitle={search ? 'Essayez avec d\'autres termes.' : 'Ajoutez votre premier livre pour d\u00e9marrer le catalogue Terre Noire.'} />
        )}

        {/* ── TABLE ── */}
        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Couverture', width: 80 },
            { label: 'Titre' },
            { label: 'Auteur' },
            { label: 'Catégorie' },
            { label: 'Prix', align: 'right' },
            { label: 'Stock', width: 130 },
            { label: 'Promo', width: 90 },
            { label: '', width: 90, align: 'right' },
          ]}>
            {filtered.map((b, i) => (
              <AdminRow key={b.id} last={i === filtered.length - 1}>
                <AdminCell>
                  {b.cover_image
                    ? <img src={b.cover_image} alt={b.title} style={{ width: 44, height: 60, borderRadius: 4, objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                    : <div style={{ width: 44, height: 60, borderRadius: 4, background: 'var(--tn-cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tn-gray-400)', fontSize: 16 }}><i className="fas fa-book" /></div>
                  }
                </AdminCell>
                <AdminCell>
                  <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 14, fontWeight: 600, color: 'var(--tn-gray-900)' }}>{b.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {b.reference && <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)' }}>{b.reference}</span>}
                    {b.is_bestseller && <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, padding: '2px 6px', background: 'var(--tn-black)', color: 'var(--tn-gold-light)', borderRadius: 3, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>BEST</span>}
                  </div>
                </AdminCell>
                <AdminCell>{b.author?.full_name || 'N/A'}</AdminCell>
                <AdminCell>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--tn-cream-2)', color: 'var(--tn-gray-700)', fontSize: 11, fontWeight: 600 }}>{b.category?.name || 'N/A'}</span>
                </AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, color: b.original_price && Number(b.original_price) > Number(b.price) ? 'var(--tn-orange)' : 'var(--tn-gray-900)', fontSize: 15 }}>
                      {fmtPrice(b.price)} <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, fontWeight: 500, color: 'var(--tn-gray-500)' }}>FCFA</span>
                    </span>
                    {b.original_price && Number(b.original_price) > Number(b.price) && (
                      <span style={{ fontSize: 11, color: 'var(--tn-gray-400)', textDecoration: 'line-through', marginTop: 2 }}>{fmtPrice(b.original_price)}</span>
                    )}
                  </div>
                </AdminCell>
                <AdminCell>
                  <StatusBadge value={b.available ? 'active' : 'inactive'} />
                </AdminCell>
                <AdminCell>
                  {b.original_price && Number(b.original_price) > Number(b.price)
                    ? <span style={{ color: 'var(--tn-success)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--tn-mono)' }}>-{Math.round((1 - b.price / b.original_price) * 100)}%</span>
                    : <span style={{ color: 'var(--tn-gray-400)' }}>—</span>
                  }
                </AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-pen-to-square" tone="orange" title="Modifier" onClick={() => handleEdit(b)} />
                    <AdminActionBtn icon="fa-trash-can" tone="red" title="Supprimer" onClick={() => handleDelete(b.id)} />
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showForm && (
        <AdminModalOverlay onClose={resetCreateForm}>
          <AdminModalHeader onClose={resetCreateForm}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 50, height: 68, borderRadius: 6, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)', fontSize: 18,
              }}>
                <i className="fas fa-plus" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>
                  Nouveau livre
                </div>
                <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>
                  Ajouter au catalogue
                </h2>
              </div>
            </div>
          </AdminModalHeader>
          <AdminModalBody>
            <BookForm
              formData={formData} onInputChange={handleInputChange}
              onFileChange={handleFileChange} onBackCoverChange={handleBackCoverChange} onPdfChange={handlePdfChange} onExcerptChange={handleExcerptChange}
              onSubmit={handleCreateSubmit} onCancel={resetCreateForm}
              authors={authors} categories={categories} collections={collections}
              newCategoryName={newCategoryName} onNewCategoryNameChange={setNewCategoryName} onAddCategory={handleAddCategory}
              submitLabel="Créer le livre" editingBook={null}
            />
          </AdminModalBody>
        </AdminModalOverlay>
      )}

      {/* ── EDIT MODAL ── */}
      {editingBook && (
        <AdminModalOverlay onClose={closeEditModal}>
          <AdminModalHeader onClose={closeEditModal}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Cover thumbnail */}
              <div style={{
                width: 50, height: 68, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                background: editingBook.cover_image ? `url(${editingBook.cover_image}) center/cover` : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)', fontSize: 18,
              }}>
                {!editingBook.cover_image && <i className="fas fa-book" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 4 }}>
                  Modifier · {editingBook.reference || `#${editingBook.id}`}
                </div>
                <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingBook.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'var(--tn-gold-light)', fontSize: 11, fontWeight: 600, border: '1px solid rgba(200,149,108,0.3)' }}>
                    {editingBook.format || 'PAPIER'}
                  </span>
                  <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    {fmtPrice(editingBook.price)} FCFA
                  </span>
                </div>
              </div>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            <BookForm
              formData={formData} onInputChange={handleInputChange}
              onFileChange={handleFileChange} onBackCoverChange={handleBackCoverChange} onPdfChange={handlePdfChange} onExcerptChange={handleExcerptChange}
              onSubmit={handleEditSubmit} onCancel={closeEditModal}
              authors={authors} categories={categories} collections={collections}
              newCategoryName={newCategoryName} onNewCategoryNameChange={setNewCategoryName} onAddCategory={handleAddCategory}
              submitLabel="Mettre à jour" editingBook={editingBook}
            />
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

/* ─────────────────────────────────────────────
   SHARED BOOK FORM (used for create + edit modal)
   ───────────────────────────────────────────── */
const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 };

function BookForm({
  formData, onInputChange, onFileChange, onBackCoverChange, onPdfChange, onExcerptChange,
  onSubmit, onCancel, authors, categories, collections,
  newCategoryName, onNewCategoryNameChange, onAddCategory,
  submitLabel, editingBook,
}) {
  return (
    <form onSubmit={onSubmit}>
      <AdminModalSection icon="fa-pen" title="Informations générales">
        <div style={grid2}>
          <FieldWrap label="Titre" required><input className="tn-input" name="title" value={formData.title} onChange={onInputChange} required /></FieldWrap>
          <FieldWrap label="Auteur" required>
            <select className="tn-input" name="author" value={formData.author} onChange={onInputChange} required style={{ cursor: 'pointer' }}>
              <option value="">Sélectionner</option>
              {authors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </FieldWrap>
          <div>
            <FieldWrap label="Catégorie" required>
              <select className="tn-input" name="category" value={formData.category} onChange={onInputChange} required style={{ cursor: 'pointer' }}>
                <option value="">Sélectionner</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FieldWrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--tn-cream-2)', border: '1px dashed var(--tn-gray-300)' }}>
              <i className="fas fa-plus" style={{ color: 'var(--tn-orange)', fontSize: 11 }} />
              <input type="text" placeholder="Nouvelle catégorie..." value={newCategoryName} onChange={e => onNewCategoryNameChange(e.target.value)} style={{ flex: 1, background: 'var(--ds-white)', padding: '6px 10px', border: '1px solid var(--tn-gray-200)', borderRadius: 6, fontSize: 12, outline: 0 }} />
              <button type="button" onClick={onAddCategory} disabled={!newCategoryName.trim()} style={{ fontSize: 11, fontWeight: 600, color: 'var(--tn-orange)', background: 'none', border: 0, cursor: 'pointer' }}>Ajouter</button>
            </div>
          </div>
          <FieldWrap label="Format">
            <select className="tn-input" name="format" value={formData.format} onChange={onInputChange} style={{ cursor: 'pointer' }}>
              <option value="PAPIER">Papier</option>
              <option value="EBOOK">Ebook</option>
            </select>
          </FieldWrap>
          <FieldWrap label="Prix FCFA" required><input className="tn-input" name="price" type="number" min="0" step="1" value={formData.price} onChange={onInputChange} required /></FieldWrap>
          <FieldWrap label="Reference ISBN"><input className="tn-input" name="reference" value={formData.reference} onChange={onInputChange} placeholder="978-2-1234-5678-9" style={{ fontFamily: 'var(--tn-mono)' }} /></FieldWrap>
        </div>
      </AdminModalSection>

      <AdminModalSection icon="fa-align-left" title="Description">
        <textarea className="tn-input" name="description" value={formData.description} onChange={onInputChange} rows="4" placeholder="Description du livre..." style={{ fontFamily: 'var(--tn-serif)', fontSize: 14, lineHeight: 1.55, minHeight: 100, resize: 'vertical' }} />
      </AdminModalSection>

      <AdminModalSection icon="fa-info-circle" title="Détails techniques">
        <div style={grid2}>
          <FieldWrap label="Collection">
            <select className="tn-input" name="collection" value={formData.collection} onChange={onInputChange} style={{ cursor: 'pointer' }}>
              <option value="">Aucune</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FieldWrap>
          <FieldWrap label="Langue">
            <select className="tn-input" name="language" value={formData.language} onChange={onInputChange} style={{ cursor: 'pointer' }}>
              <option value="FR">Français</option>
              <option value="EN">Anglais</option>
              <option value="AR">Arabe</option>
              <option value="PT">Portugais</option>
              <option value="ES">Espagnol</option>
              <option value="AUTRE">Autre</option>
            </select>
          </FieldWrap>
          <FieldWrap label="ISBN"><input className="tn-input" name="isbn" value={formData.isbn} onChange={onInputChange} placeholder="978-2-1234-5678-9" style={{ fontFamily: 'var(--tn-mono)' }} /></FieldWrap>
          <FieldWrap label="Nombre de pages"><input className="tn-input" name="page_count" type="number" min="1" value={formData.page_count} onChange={onInputChange} placeholder="Ex: 320" /></FieldWrap>
          <FieldWrap label="Largeur (cm)"><input className="tn-input" name="dimensions_width_cm" type="number" min="0" step="0.1" value={formData.dimensions_width_cm} onChange={onInputChange} placeholder="Ex: 14.0" /></FieldWrap>
          <FieldWrap label="Hauteur (cm)"><input className="tn-input" name="dimensions_height_cm" type="number" min="0" step="0.1" value={formData.dimensions_height_cm} onChange={onInputChange} placeholder="Ex: 21.0" /></FieldWrap>
          <FieldWrap label="Poids (g)"><input className="tn-input" name="weight_g" type="number" min="0" value={formData.weight_g} onChange={onInputChange} placeholder="Ex: 350" /></FieldWrap>
        </div>
      </AdminModalSection>

      <AdminModalSection icon="fa-eye" title="Extrait public">
        <FieldWrap label="Extrait PDF">
          <input type="file" accept="application/pdf" onChange={onExcerptChange} style={{ fontSize: 12 }} />
          <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>
            {editingBook?.excerpt_pdf ? <span style={{ color: 'var(--tn-success)' }}><i className="fas fa-check" /> Extrait joint</span> : 'Fichier PDF visible sans achat. Choisissez les pages qui donnent envie d\'acheter.'}
          </div>
        </FieldWrap>
      </AdminModalSection>

      <AdminModalSection icon="fa-tag" title="Promotion & disponibilité">
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--tn-orange-50)', border: '1px solid var(--tn-orange-100)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" name="available" checked={formData.available} onChange={onInputChange} style={{ width: 18, height: 18, accentColor: 'var(--tn-orange)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Disponible</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" name="is_bestseller" checked={formData.is_bestseller} onChange={onInputChange} style={{ width: 18, height: 18, accentColor: 'var(--tn-orange)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Best-seller</span>
            </label>
            <FieldWrap label="Prix original (promo)">
              <input className="tn-input" name="original_price" type="number" min="0" value={formData.original_price} onChange={onInputChange} placeholder="Vide = pas de promo" style={{ fontFamily: 'var(--tn-mono)' }} />
            </FieldWrap>
          </div>
        </div>
      </AdminModalSection>

      <AdminModalSection icon="fa-paperclip" title="Fichiers">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <FieldWrap label="Couverture (recto)">
            <input type="file" accept="image/*" onChange={onFileChange} style={{ fontSize: 12 }} />
            <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>{editingBook ? 'Vide = conserver' : '400x600px'}</div>
          </FieldWrap>
          <FieldWrap label="4e de couverture">
            <input type="file" accept="image/*" onChange={onBackCoverChange} style={{ fontSize: 12 }} />
            {editingBook?.back_cover_image && <div style={{ fontSize: 11, color: 'var(--tn-success)', marginTop: 4 }}><i className="fas fa-check" /> Jointe</div>}
          </FieldWrap>
          <FieldWrap label="PDF ebook">
            <input type="file" accept=".pdf" onChange={onPdfChange} style={{ fontSize: 12 }} />
            {editingBook?.pdf_file && <div style={{ fontSize: 11, color: 'var(--tn-success)', marginTop: 4 }}><i className="fas fa-check" /> Joint</div>}
          </FieldWrap>
        </div>
      </AdminModalSection>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
        <button type="button" onClick={onCancel} className="tn-btn" style={{ background: 'var(--ds-white)', color: 'var(--tn-gray-700)', border: '1.5px solid var(--tn-gray-200)' }}>Annuler</button>
        <button type="submit" className="tn-btn tn-btn--primary"><i className="fas fa-floppy-disk" /> {submitLabel}</button>
      </div>
    </form>
  );
}

function FieldWrap({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
        {label} {required && <span style={{ color: 'var(--tn-orange)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default AdminBooks;
