import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import marketplaceService from '../../services/marketplaceService';
import bookService from '../../services/bookService';
import aiService from '../../services/aiService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import '../../styles/VendorListings.css';

function VendorTrendsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (data) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const result = await aiService.vendorTrends();
      setData(result);
      setOpen(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erreur analyse IA');
    }
    setLoading(false);
  };

  return (
    <div className="vl__trends">
      <button className="vl__trends-btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> Analyse en cours...</>
          : open
            ? <><i className="fas fa-chevron-up" /> Masquer les insights</>
            : <><i className="fas fa-robot" /> Insights IA de mes ventes</>
        }
      </button>
      {open && data && (
        <div className="vl__trends-panel">
          {data.insights?.length > 0 && (
            <div className="vl__trends-section">
              <strong><i className="fas fa-chart-line" /> Observations</strong>
              <ul>{data.insights.map((ins, i) => <li key={i}>{ins}</li>)}</ul>
            </div>
          )}
          {data.best_performing && (
            <div className="vl__trends-section">
              <strong><i className="fas fa-trophy" /> Meilleure performance</strong>
              <p>{data.best_performing}</p>
            </div>
          )}
          {data.recommendations?.length > 0 && (
            <div className="vl__trends-section">
              <strong><i className="fas fa-lightbulb" /> Recommandations</strong>
              <ul>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {data.forecast && (
            <div className="vl__trends-section">
              <strong><i className="fas fa-crystal-ball" /> Prévision</strong>
              <p>{data.forecast}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CONDITIONS = [
  { value: 'NEW', label: 'Neuf', icon: 'fas fa-star' },
  { value: 'USED_GOOD', label: 'Bon état', icon: 'fas fa-thumbs-up' },
  { value: 'USED_FAIR', label: 'État correct', icon: 'fas fa-hand-peace' },
];

const VendorListings = () => {
  const { t } = useTranslation();
  const { organizationMemberships } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ book: null, price: '', original_price: '', stock: '1', condition: 'NEW', organization_id: '' });
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [bookSearching, setBookSearching] = useState(false);
  const searchTimeout = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ price: '', original_price: '', stock: '', condition: '' });
  const [filter, setFilter] = useState('all');
  const [aiPrice, setAiPrice] = useState(null); // {suggested_price, price_range, reasoning, market_position}
  const [aiPriceLoading, setAiPriceLoading] = useState(false);

  const vendorOrgs = organizationMemberships.filter(
    m => ['MAISON_EDITION', 'LIBRAIRIE'].includes(m.organization_type)
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'].includes(m.role)
  );

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await marketplaceService.getMyListings();
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Book search
  const handleBookSearch = (query) => {
    setBookSearch(query);
    if (form.book) setForm(f => ({ ...f, book: null }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setBookResults([]); return; }
    setBookSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await bookService.searchBooks(query, { page_size: 8 });
        setBookResults(data.results || data || []);
      } catch { setBookResults([]); }
      finally { setBookSearching(false); }
    }, 300);
  };

  // Détecte si l'org vendeuse a déjà une offre pour ce livre
  const getExistingListing = (book) => {
    if (!book?.listings?.length) return null;
    const orgIds = new Set(vendorOrgs.map(m => m.organization_id));
    return book.listings.find(l => orgIds.has(l.vendor_id)) || null;
  };

  const selectBook = (book) => { setForm(f => ({ ...f, book })); setBookSearch(''); setBookResults([]); };
  const clearBook = () => { setForm(f => ({ ...f, book: null })); setBookSearch(''); setAiPrice(null); };

  const openCreate = () => {
    setForm({ book: null, price: '', original_price: '', stock: '1', condition: 'NEW', organization_id: vendorOrgs.length === 1 ? String(vendorOrgs[0].organization_id) : '' });
    setBookSearch(''); setBookResults([]); setShowForm(true);
  };
  const closeCreate = () => { setShowForm(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.book) { toast.error('Veuillez sélectionner un livre.'); return; }
    setCreating(true);
    try {
      const payload = { book: form.book.id, price: form.price, stock: parseInt(form.stock) || 0, condition: form.condition };
      if (form.original_price) payload.original_price = form.original_price;
      if (form.organization_id) payload.organization_id = parseInt(form.organization_id);
      await marketplaceService.createListing(payload);
      toast.success(`Offre créée pour « ${form.book.title} »`);
      closeCreate();
      fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || err.response?.data?.non_field_errors?.[0] || handleApiError(err));
    } finally { setCreating(false); }
  };

  const toggleActive = async (l) => {
    try { await marketplaceService.updateListing(l.id, { is_active: !l.is_active }); toast.success(l.is_active ? 'Offre désactivée' : 'Offre réactivée'); fetchListings(); }
    catch (err) { toast.error(handleApiError(err)); }
  };
  const startEdit = (l) => { setEditingId(l.id); setEditForm({ price: l.price, original_price: l.original_price || '', stock: l.stock, condition: l.condition }); };
  const handleSaveEdit = async (id) => {
    try {
      const data = { price: editForm.price, stock: parseInt(editForm.stock) || 0, condition: editForm.condition };
      data.original_price = editForm.original_price || null;
      await marketplaceService.updateListing(id, data);
      toast.success('Offre mise à jour'); setEditingId(null); fetchListings();
    } catch (err) { toast.error(handleApiError(err)); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette offre ?')) return;
    try { await marketplaceService.deleteListing(id); toast.success('Offre supprimée'); fetchListings(); }
    catch (err) { toast.error(handleApiError(err)); }
  };

  const filtered = listings.filter(l => filter === 'active' ? l.is_active : filter === 'inactive' ? !l.is_active : true);
  const activeCount = listings.filter(l => l.is_active).length;
  const condLabel = (v) => CONDITIONS.find(o => o.value === v)?.label || v;
  const condIcon = (v) => CONDITIONS.find(o => o.value === v)?.icon || 'fas fa-tag';

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  // Non-vendeur : message clair
  if (vendorOrgs.length === 0) {
    return (
      <div className="vl">
        <div className="vl__blocked">
          <div className="vl__blocked__icon"><i className="fas fa-store-slash" /></div>
          <h2>Espace réservé aux vendeurs</h2>
          <p>Cette page est réservée aux <strong>librairies</strong> et <strong>maisons d'édition</strong>.<br />Pour proposer des livres à la vente sur Frollot, créez ou rejoignez une organisation vendeuse.</p>
          <Link to="/dashboard/organizations" className="vl__btn vl__btn--primary">
            <i className="fas fa-building" /> Mes organisations
          </Link>
        </div>
      </div>
    );
  }

  const hasListings = listings.length > 0;

  return (
    <div className="vl">
      {/* ── Header ── */}
      <div className="vl__header">
        <div>
          <h1 className="vl__title"><i className="fas fa-store" /> Mes offres marketplace</h1>
          {hasListings && <p className="vl__subtitle">{listings.length} offre{listings.length !== 1 ? 's' : ''} · {activeCount} active{activeCount !== 1 ? 's' : ''}</p>}
        </div>
        {hasListings && !showForm && (
          <button className="vl__btn vl__btn--primary" onClick={openCreate}><i className="fas fa-plus" /> Nouvelle offre</button>
        )}
      </div>

      {error && <div className="vl__alert vl__alert--error">{error}</div>}

      {/* ── État vide ── */}
      {!hasListings && !showForm && (
        <div className="vl__empty-state">
          <div className="vl__empty-state__icon"><i className="fas fa-tag" /></div>
          <h3>Vous n'avez pas encore d'offre</h3>
          <p>Proposez vos livres à la vente sur la marketplace Frollot.<br />Choisissez un livre existant, fixez votre prix et votre stock.</p>
          <button className="vl__btn vl__btn--primary" onClick={openCreate}><i className="fas fa-plus" /> Créer ma première offre</button>
        </div>
      )}

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="vl__form-card">
          <div className="vl__form-header">
            <h2><i className="fas fa-tag" /> {hasListings ? 'Nouvelle offre' : 'Créer ma première offre'}</h2>
            <button className="vl__form-close" onClick={closeCreate}><i className="fas fa-times" /></button>
          </div>

          <form onSubmit={handleCreate} className="vl__form">
            {/* Étape 1 : choisir le livre */}
            <div className="vl__step">
              <div className="vl__step-num">1</div>
              <div className="vl__step-content">
                <div className="vl__step-label">Quel livre souhaitez-vous vendre ?</div>

                {vendorOrgs.length > 1 && (
                  <div className="vl__field" style={{ marginBottom: '0.75rem' }}>
                    <label>Organisation *</label>
                    <select value={form.organization_id} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))} required>
                      <option value="">— Choisir —</option>
                      {vendorOrgs.map(m => <option key={m.organization_id} value={m.organization_id}>{m.organization_name}</option>)}
                    </select>
                  </div>
                )}

                {form.book ? (<>
                  <div className="vl__book-selected">
                    <div className="vl__book-selected__cover">
                      {form.book.cover_image
                        ? <img src={form.book.cover_image} alt="" />
                        : <div className="vl__book-selected__cover--empty"><i className="fas fa-book" /></div>}
                    </div>
                    <div className="vl__book-selected__info">
                      <div className="vl__book-selected__title">{form.book.title}</div>
                      <div className="vl__book-selected__author">{typeof form.book.author === 'object' ? form.book.author?.full_name : form.book.author || '—'}</div>
                      <div className="vl__book-selected__meta">
                        <span><i className={`fas fa-${form.book.format === 'EBOOK' ? 'tablet-alt' : 'book-open'}`} /> {form.book.format === 'EBOOK' ? 'Ebook' : 'Papier'}</span>
                        {form.book.category && <span><i className="fas fa-folder" /> {typeof form.book.category === 'object' ? form.book.category.name : form.book.category}</span>}
                        {form.book.price && <span className="vl__book-selected__ref-price"><i className="fas fa-tag" /> Prix catalogue : {parseFloat(form.book.price).toLocaleString('fr-FR')} FCFA</span>}
                      </div>
                      {/* Vendeurs existants */}
                      {(form.book.listings?.length > 0 || form.book.publisher_name) && (
                        <div className="vl__book-selected__vendors">
                          <div className="vl__book-selected__vendors-label">
                            <i className="fas fa-store" /> Déjà en vente chez :
                          </div>
                          {form.book.publisher_name && (
                            <div className="vl__book-selected__vendor">
                              <span className="vl__book-selected__vendor-name">{form.book.publisher_name}</span>
                              <span className="vl__book-selected__vendor-tag">Éditeur</span>
                              {form.book.price && <span className="vl__book-selected__vendor-price">{parseFloat(form.book.price).toLocaleString('fr-FR')} F</span>}
                            </div>
                          )}
                          {form.book.listings?.map(listing => (
                            <div key={listing.id} className="vl__book-selected__vendor">
                              <span className="vl__book-selected__vendor-name">
                                {listing.vendor_name}
                                {listing.vendor_is_verified && <i className="fas fa-check-circle vl__book-selected__vendor-verified" />}
                              </span>
                              <span className="vl__book-selected__vendor-tag">{listing.condition_display} · {listing.stock} ex.</span>
                              <span className="vl__book-selected__vendor-price">{parseInt(listing.price).toLocaleString('fr-FR')} F</span>
                            </div>
                          ))}
                          {!form.book.listings?.length && !form.book.publisher_name && (
                            <div className="vl__book-selected__vendor-none">Aucun autre vendeur</div>
                          )}
                        </div>
                      )}
                      {/* Bibliothèques */}
                      {form.book.library_availability?.length > 0 && (
                        <div className="vl__book-selected__vendors" style={{ borderTop: form.book.listings?.length || form.book.publisher_name ? 'none' : undefined }}>
                          <div className="vl__book-selected__vendors-label">
                            <i className="fas fa-landmark" /> Disponible en bibliothèque :
                          </div>
                          {form.book.library_availability.map(lib => (
                            <div key={lib.id} className="vl__book-selected__vendor">
                              <span className="vl__book-selected__vendor-name">
                                {lib.library_name}
                                {lib.library_is_verified && <i className="fas fa-check-circle vl__book-selected__vendor-verified" />}
                              </span>
                              <span className="vl__book-selected__vendor-tag">
                                {lib.in_stock ? `${lib.available_copies}/${lib.total_copies} dispo.` : 'Indisponible'}
                              </span>
                              <span className="vl__book-selected__vendor-price vl__book-selected__vendor-price--free">Gratuit</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" className="vl__book-selected__clear" onClick={clearBook} title="Changer de livre"><i className="fas fa-times" /></button>
                  </div>
                  {getExistingListing(form.book) && (
                    <div className="vl__already-exists">
                      <i className="fas fa-exclamation-triangle" />
                      <div>
                        <strong>Vous vendez déjà ce livre</strong> via {getExistingListing(form.book).vendor_name} à {parseInt(getExistingListing(form.book).price).toLocaleString('fr-FR')} FCFA ({getExistingListing(form.book).condition_display}, {getExistingListing(form.book).stock} en stock).
                        <br />
                        <button type="button" className="vl__already-exists__link" onClick={() => { const ex = getExistingListing(form.book); closeCreate(); startEdit(listings.find(l => l.id === ex.id) || { id: ex.id, book_title: form.book.title, price: ex.price, original_price: ex.original_price, stock: ex.stock, condition: ex.condition }); }}>
                          <i className="fas fa-pen" /> Modifier mon offre existante
                        </button>
                      </div>
                    </div>
                  )}
                </>) : (
                  <div className="vl__book-search">
                    <div className="vl__book-search__input-wrap">
                      <i className="fas fa-search" />
                      <input type="text" placeholder="Tapez le titre, l'auteur ou l'ISBN du livre..." value={bookSearch} onChange={e => handleBookSearch(e.target.value)} autoFocus />
                      {bookSearching && <i className="fas fa-spinner fa-spin vl__book-search__spinner" />}
                    </div>
                    {bookResults.length > 0 && (
                      <ul className="vl__book-search__results">
                        {bookResults.map(book => (
                          <li key={book.id} onClick={() => selectBook(book)} className="vl__book-search__item">
                            <div className="vl__book-search__item-cover">
                              {book.cover_image ? <img src={book.cover_image} alt="" /> : <i className="fas fa-book" />}
                            </div>
                            <div className="vl__book-search__item-info">
                              <div className="vl__book-search__item-title">{book.title}</div>
                              <div className="vl__book-search__item-author">
                                {typeof book.author === 'object' ? book.author?.full_name : book.author || '—'}
                                {book.price && <> · <strong>{parseFloat(book.price).toLocaleString('fr-FR')} FCFA</strong></>}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {bookSearch.length >= 2 && !bookSearching && bookResults.length === 0 && (
                      <div className="vl__book-search__empty"><i className="fas fa-search" /> Aucun livre trouvé pour « {bookSearch} »</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Étape 2 : fixer le prix et le stock */}
            <div className={`vl__step ${!form.book ? 'vl__step--disabled' : ''}`}>
              <div className="vl__step-num">2</div>
              <div className="vl__step-content">
                <div className="vl__step-label">Fixez votre prix et votre stock</div>
                <div className="vl__step-grid">
                  <div className="vl__field">
                    <label>Prix de vente (FCFA) *</label>
                    <input type="number" min="1" step="1" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setAiPrice(null); }} required disabled={!form.book} placeholder="Ex: 8 500" />
                    {form.book && (
                      <button type="button" className="vl__ai-suggest-btn" disabled={aiPriceLoading} onClick={async () => {
                        setAiPriceLoading(true);
                        try {
                          const data = await aiService.suggestPrice(form.book.id);
                          setAiPrice(data);
                        } catch { toast.error('Impossible d\'obtenir une suggestion de prix'); }
                        finally { setAiPriceLoading(false); }
                      }}>
                        {aiPriceLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-wand-magic-sparkles" />}
                        <span>Suggestion IA</span>
                      </button>
                    )}
                    {aiPrice && (
                      <div className="vl__ai-price">
                        <div className="vl__ai-price__suggestion">
                          <span className="vl__ai-price__value">{parseInt(aiPrice.suggested_price).toLocaleString('fr-FR')} FCFA</span>
                          <button type="button" className="vl__ai-price__apply" onClick={() => { setForm(f => ({ ...f, price: String(aiPrice.suggested_price) })); toast.success('Prix appliqué'); }}>
                            Appliquer
                          </button>
                        </div>
                        {aiPrice.price_range && <div className="vl__ai-price__range">Fourchette : {parseInt(aiPrice.price_range.min).toLocaleString('fr-FR')} — {parseInt(aiPrice.price_range.max).toLocaleString('fr-FR')} FCFA</div>}
                        {aiPrice.reasoning && <div className="vl__ai-price__reason">{aiPrice.reasoning}</div>}
                        {aiPrice.market_position && <span className="vl__ai-price__position">{aiPrice.market_position}</span>}
                      </div>
                    )}
                  </div>
                  <div className="vl__field">
                    <label>Ancien prix <span className="vl__field-hint">promo barrée</span></label>
                    <input type="number" min="0" step="1" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} disabled={!form.book} placeholder="Optionnel" />
                  </div>
                  <div className="vl__field">
                    <label>Quantité en stock *</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required disabled={!form.book} />
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 3 : état du livre */}
            <div className={`vl__step ${!form.book ? 'vl__step--disabled' : ''}`}>
              <div className="vl__step-num">3</div>
              <div className="vl__step-content">
                <div className="vl__step-label">Dans quel état est le livre ?</div>
                <div className="vl__condition-pills">
                  {CONDITIONS.map(opt => (
                    <button key={opt.value} type="button" disabled={!form.book}
                      className={`vl__condition-pill ${form.condition === opt.value ? 'vl__condition-pill--active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, condition: opt.value }))}>
                      <i className={opt.icon} /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="vl__form-actions">
              <button type="button" className="vl__btn" onClick={closeCreate}>Annuler</button>
              <button type="submit" className="vl__btn vl__btn--primary" disabled={creating || !form.book || !form.price || !!getExistingListing(form.book)}>
                {creating ? <><i className="fas fa-spinner fa-spin" /> Création...</> : <><i className="fas fa-check" /> Publier l'offre</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste ── */}
      {hasListings && !showForm && (
        <>
          <div className="vl__filters">
            {[
              { key: 'all', label: `Toutes (${listings.length})` },
              { key: 'active', label: `Actives (${activeCount})` },
              { key: 'inactive', label: `Inactives (${listings.length - activeCount})` },
            ].map(f => (
              <button key={f.key} className={`vl__filter ${filter === f.key ? 'vl__filter--active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>

          <VendorTrendsPanel />

          {filtered.length === 0 ? (
            <p className="vl__empty">Aucune offre dans cette catégorie.</p>
          ) : (
            <div className="vl__list">
              {filtered.map(l => (
                <div key={l.id} className={`vl__card ${!l.is_active ? 'vl__card--inactive' : ''} ${editingId === l.id ? 'vl__card--editing' : ''}`}>
                  {editingId === l.id ? (
                    <div className="vl__card-edit">
                      <div className="vl__card-edit__title"><i className="fas fa-pen" /> Modifier « {l.book_title} »</div>
                      <div className="vl__card-edit__fields">
                        <div className="vl__field"><label>Prix (FCFA)</label><input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
                        <div className="vl__field"><label>Ancien prix</label><input type="number" value={editForm.original_price} onChange={e => setEditForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Optionnel" /></div>
                        <div className="vl__field"><label>Stock</label><input type="number" value={editForm.stock} onChange={e => setEditForm(f => ({ ...f, stock: e.target.value }))} /></div>
                        <div className="vl__field"><label>État</label><select value={editForm.condition} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value }))}>{CONDITIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                      </div>
                      <div className="vl__card-edit__actions">
                        <button className="vl__btn vl__btn--primary vl__btn--sm" onClick={() => handleSaveEdit(l.id)}><i className="fas fa-save" /> Sauver</button>
                        <button className="vl__btn vl__btn--sm" onClick={() => setEditingId(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="vl__card-row">
                      <div className="vl__card-book">
                        <Link to={`/books/${l.book}`} className="vl__card-book__title">{l.book_title}</Link>
                        {vendorOrgs.length > 1 && <span className="vl__card-book__org">{l.vendor_name}</span>}
                      </div>
                      <div className="vl__card-info">
                        <div className="vl__card-info__price">
                          {parseInt(l.price).toLocaleString('fr-FR')} <small>FCFA</small>
                          {l.has_discount && l.original_price && <span className="vl__card-info__old">{parseInt(l.original_price).toLocaleString('fr-FR')}</span>}
                          {l.has_discount && <span className="vl__card-info__discount">-{l.discount_percentage}%</span>}
                        </div>
                        <div className="vl__card-info__tags">
                          <span className={`vl__tag ${l.in_stock ? 'vl__tag--ok' : 'vl__tag--out'}`}>
                            <i className="fas fa-box" /> {l.stock}
                          </span>
                          <span className="vl__tag"><i className={condIcon(l.condition)} /> {l.condition_display || condLabel(l.condition)}</span>
                          <span className={`vl__tag ${l.is_active ? 'vl__tag--ok' : 'vl__tag--out'}`}>
                            {l.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="vl__card-actions">
                        <button className="vl__act" onClick={() => startEdit(l)} title="Modifier"><i className="fas fa-pen" /></button>
                        <button className="vl__act" onClick={() => toggleActive(l)} title={l.is_active ? 'Désactiver' : 'Réactiver'}><i className={`fas fa-${l.is_active ? 'eye-slash' : 'eye'}`} /></button>
                        <button className="vl__act vl__act--danger" onClick={() => handleDelete(l.id)} title="Supprimer"><i className="fas fa-trash" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorListings;
