import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { organizationAPI, handleApiError } from '../../services/api';
import bookService from '../../services/bookService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/OrgBooks.css';

const PER_PAGE = 10;

const EMPTY_FORM = {
  title: '', reference: '', description: '', price: '', original_price: '',
  format: 'PAPIER', category: '', author: '', available: true,
  cover_image: null, back_cover_image: null, pdf_file: null,
  stock: '1', condition: 'NEW',
  total_copies: '1', allows_digital_loan: false, max_loan_days: '21',
};

const OrgBooks = () => {
  const { t } = useTranslation();
  const { id: orgId } = useParams();

  const FORMAT_OPTIONS = [
    { value: 'PAPIER', label: t('dashboard.orgBooks.formatPaper') },
    { value: 'EBOOK', label: t('dashboard.orgBooks.formatEbook') },
  ];
  const CONDITION_OPTIONS = [
    { value: 'NEW', label: t('dashboard.orgBooks.conditionNew') },
    { value: 'USED_GOOD', label: t('dashboard.orgBooks.conditionGood') },
    { value: 'USED_FAIR', label: t('dashboard.orgBooks.conditionFair') },
  ];
  const SORT_OPTIONS = [
    { value: 'title', label: t('dashboard.orgBooks.sortTitleAZ') },
    { value: '-title', label: t('dashboard.orgBooks.sortTitleZA') },
    { value: '-price', label: t('dashboard.orgBooks.sortPriceDesc') },
    { value: 'price', label: t('dashboard.orgBooks.sortPriceAsc') },
    { value: '-total_sales', label: t('dashboard.orgBooks.sortSalesDesc') },
  ];
  const { hasOrgRole, organizationMemberships } = useAuth();
  const membership = organizationMemberships.find(m => m.organization_id === Number(orgId));
  const orgType = membership?.organization_type || 'MAISON_EDITION';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('title');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [coverPreview, setCoverPreview] = useState(null);
  const [authorSearch, setAuthorSearch] = useState('');
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [creatingAuthor, setCreatingAuthor] = useState(false);

  const canManage = hasOrgRole(Number(orgId), 'PROPRIETAIRE') || hasOrgRole(Number(orgId), 'ADMINISTRATEUR') || hasOrgRole(Number(orgId), 'EDITEUR');

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await organizationAPI.listBooks(orgId);
      setBooks(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => {
    fetchBooks();
    Promise.allSettled([bookService.getCategories(), bookService.getAuthors()])
      .then(([catRes, authRes]) => {
        if (catRes.status === 'fulfilled') setCategories(catRes.value.results || catRes.value || []);
        if (authRes.status === 'fulfilled') setAuthors(Array.isArray(authRes.value) ? authRes.value : authRes.value.results || []);
      });
  }, [fetchBooks]);

  // Filtrage + tri + pagination
  const filtered = useMemo(() => {
    let list = [...books];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(b =>
        (b.title || '').toLowerCase().includes(s) ||
        (typeof b.author === 'object' ? b.author?.full_name : b.author || '').toLowerCase().includes(s)
      );
    }
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    list.sort((a, b) => {
      let va = a[key] ?? '', vb = b[key] ?? '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      else { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
      return 0;
    });
    return list;
  }, [books, search, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page quand filtre/tri change
  useEffect(() => { setPage(1); }, [search, sort]);

  const totalBooks = books.length;
  const totalAvailable = books.filter(b => b.available).length;
  const totalSales = books.reduce((sum, b) => sum + (b.total_sales || 0), 0);

  // Labels
  const L = {
    title: orgType === 'LIBRAIRIE' ? t('dashboard.orgBooks.titleStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.titleCatalog') : t('dashboard.orgBooks.titlePublished'),
    icon: orgType === 'LIBRAIRIE' ? 'fa-store' : orgType === 'BIBLIOTHEQUE' ? 'fa-landmark' : 'fa-book',
    add: orgType === 'LIBRAIRIE' ? t('dashboard.orgBooks.addStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.addCatalog') : t('dashboard.orgBooks.addBook'),
    submit: orgType === 'LIBRAIRIE' ? t('dashboard.orgBooks.addStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.addCatalog') : t('dashboard.orgBooks.publish'),
    empty: orgType === 'LIBRAIRIE' ? t('dashboard.orgBooks.emptyStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.emptyCatalog') : t('dashboard.orgBooks.emptyBooks'),
    hint: orgType === 'LIBRAIRIE' ? t('dashboard.orgBooks.hintAdd') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.hintAdd') : t('dashboard.orgBooks.hintPublish'),
  };

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      const file = files[0] || null;
      setForm(f => ({ ...f, [name]: file }));
      if (name === 'cover_image' && file) setCoverPreview(URL.createObjectURL(file));
    } else if (type === 'checkbox') setForm(f => ({ ...f, [name]: checked }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  const openCreate = () => { setEditingBook(null); setForm({ ...EMPTY_FORM }); setCoverPreview(null); setShowForm(true); };

  const openEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '', reference: book.reference || '',
      description: book.description || '', price: book.price || '',
      original_price: book.original_price || '', format: book.format || 'PAPIER',
      category: book.category?.id || book.category || '',
      author: book.author?.id || book.author || '',
      available: book.available ?? true, cover_image: null, back_cover_image: null, pdf_file: null,
      stock: book.stock ?? '1', condition: book.condition || 'NEW',
      total_copies: book.total_copies ?? '1', allows_digital_loan: book.allows_digital_loan ?? false,
      max_loan_days: book.max_loan_days ?? '21',
    });
    setCoverPreview(book.cover_image || null);
    setAuthorSearch(typeof book.author === 'object' ? book.author?.full_name || '' : authors.find(a => a.id === book.author)?.full_name || '');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingBook(null); setShowNewAuthor(false); setNewAuthorName(''); setAuthorSearch(''); };

  const handleCreateAuthor = async () => {
    if (!newAuthorName.trim()) return;
    setCreatingAuthor(true);
    try {
      const created = await bookService.createAuthor({ full_name: newAuthorName.trim() });
      setAuthors(prev => [...prev, created].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
      setForm(f => ({ ...f, author: created.id }));
      setShowNewAuthor(false);
      setNewAuthorName('');
      setAuthorSearch('');
      toast.success(`Auteur « ${created.full_name} » créé.`);
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setCreatingAuthor(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'reference', 'description', 'price', 'format', 'category', 'author'].forEach(k => fd.append(k, form[k]));
      fd.append('available', form.available);
      if (form.original_price) fd.append('original_price', form.original_price);
      if (form.cover_image instanceof File) fd.append('cover_image', form.cover_image);
      if (form.back_cover_image instanceof File) fd.append('back_cover_image', form.back_cover_image);
      if (form.pdf_file instanceof File) fd.append('pdf_file', form.pdf_file);
      if (orgType === 'LIBRAIRIE') { fd.append('stock', form.stock); fd.append('condition', form.condition); }
      if (orgType === 'BIBLIOTHEQUE') { fd.append('total_copies', form.total_copies); fd.append('allows_digital_loan', form.allows_digital_loan); fd.append('max_loan_days', form.max_loan_days); }

      if (editingBook) {
        await organizationAPI.updateBook(orgId, editingBook.id, fd);
        toast.success(t('dashboard.orgBooks.bookUpdated'));
      } else {
        await organizationAPI.createBook(orgId, fd);
        toast.success(t('dashboard.orgBooks.bookAdded'));
      }
      closeForm(); fetchBooks();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(t('dashboard.orgBooks.confirmRemove', { title: book.title }))) return;
    try { await organizationAPI.deleteBook(orgId, book.id); toast.success(t('dashboard.orgBooks.removed')); fetchBooks(); }
    catch (err) { toast.error(handleApiError(err)); }
  };

  const handleToggle = async (book) => {
    try {
      const fd = new FormData(); fd.append('available', !book.available);
      await organizationAPI.updateBook(orgId, book.id, fd);
      toast.success(book.available ? t('dashboard.orgBooks.hiddenMsg') : t('dashboard.orgBooks.onlineMsg'));
      fetchBooks();
    } catch (err) { toast.error(handleApiError(err)); }
  };

  // Pagination pages
  const pageNums = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) nums.push(i);
      else if (nums[nums.length - 1] !== '...') nums.push('...');
    }
    return nums;
  }, [page, totalPages]);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="org-books">
      {/* Header */}
      <div className="org-books__header">
        <div>
          <h1 className="org-books__title"><i className={`fas ${L.icon}`} /> {L.title}</h1>
          <p className="org-books__subtitle">
            {t('dashboard.orgBooks.subtitleCount', { titles: totalBooks, online: totalAvailable })}
            {orgType !== 'BIBLIOTHEQUE' && <> · {t('dashboard.orgBooks.salesCount', { count: totalSales })}</>}
          </p>
        </div>
        {canManage && !showForm && (
          <button className="dashboard-btn dashboard-btn--primary" onClick={openCreate}>
            <i className="fas fa-plus" /> {L.add}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="dashboard-card ob-form-card">
          <div className="dashboard-card__header">
            <h2><i className="fas fa-edit" /> {editingBook ? t('dashboard.orgBooks.editBook') : t('dashboard.orgBooks.newBook')}</h2>
            <button className="dashboard-card__link" onClick={closeForm}><i className="fas fa-times" /> {t('common.close')}</button>
          </div>
          <div className="dashboard-card__body">
            <form onSubmit={handleSubmit} className="ob-form">
              <div className="ob-form__grid">
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelTitle')} *</label><input type="text" name="title" value={form.title} onChange={handleChange} required /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelISBN')} *</label><input type="text" name="reference" value={form.reference} onChange={handleChange} required placeholder="978-2-XXX" /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelFormat')}</label>
                  <select name="format" value={form.format} onChange={handleChange}>{FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                </div>
                <div className="ob-form__field ob-form__field--full"><label>{t('dashboard.orgBooks.labelDescription')} *</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} required /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelPrice')} *</label><input type="number" name="price" value={form.price} onChange={handleChange} min="0" required /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelOriginalPrice')}</label><input type="number" name="original_price" value={form.original_price} onChange={handleChange} min="0" placeholder={t('dashboard.orgBooks.promoPlaceholder')} /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelCategory')} *</label>
                  <select name="category" value={form.category} onChange={handleChange} required><option value="">—</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <div className="ob-form__field ob-form__field--full">
                  <label>{t('dashboard.orgBooks.labelAuthor')} *</label>
                  {showNewAuthor ? (
                    <div className="ob-author-create">
                      <input
                        type="text"
                        placeholder={t('dashboard.orgBooks.newAuthorPlaceholder')}
                        value={newAuthorName}
                        onChange={e => setNewAuthorName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="dashboard-btn dashboard-btn--primary" onClick={handleCreateAuthor} disabled={creatingAuthor || !newAuthorName.trim()}>
                        {creatingAuthor ? '...' : t('dashboard.orgBooks.create')}
                      </button>
                      <button type="button" className="dashboard-btn" onClick={() => { setShowNewAuthor(false); setNewAuthorName(''); }}>
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="ob-author-pick">
                      <div className="ob-author-pick__select">
                        <input
                          type="text"
                          placeholder={t('dashboard.orgBooks.searchAuthorPlaceholder')}
                          value={authorSearch}
                          onChange={e => { setAuthorSearch(e.target.value); if (form.author) setForm(f => ({ ...f, author: '' })); }}
                        />
                        {(authorSearch || !form.author) && authors.filter(a =>
                          !authorSearch || a.full_name?.toLowerCase().includes(authorSearch.toLowerCase())
                        ).length > 0 && authorSearch.length > 0 && (
                          <ul className="ob-author-pick__list">
                            {authors
                              .filter(a => a.full_name?.toLowerCase().includes(authorSearch.toLowerCase()))
                              .slice(0, 8)
                              .map(a => (
                                <li key={a.id} onClick={() => { setForm(f => ({ ...f, author: a.id })); setAuthorSearch(a.full_name); }}>
                                  {a.full_name}
                                  {a.is_registered && <span className="ob-author-pick__badge">{t('dashboard.orgBooks.authorSelected')}</span>}
                                </li>
                              ))
                            }
                          </ul>
                        )}
                      </div>
                      <button type="button" className="dashboard-btn" onClick={() => setShowNewAuthor(true)} title={t('dashboard.orgBooks.createNewAuthor')}>
                        <i className="fas fa-plus" /> {t('dashboard.orgBooks.new')}
                      </button>
                      <input type="hidden" name="author" value={form.author} required />
                    </div>
                  )}
                  {form.author && !showNewAuthor && (
                    <span className="ob-author-selected">
                      <i className="fas fa-check-circle" /> {authors.find(a => a.id === Number(form.author))?.full_name || t('dashboard.orgBooks.authorSelected')}
                    </span>
                  )}
                </div>
                {orgType === 'LIBRAIRIE' && <>
                  <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelStock')} *</label><input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" required /></div>
                  <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelCondition')}</label><select name="condition" value={form.condition} onChange={handleChange}>{CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                </>}
                {orgType === 'BIBLIOTHEQUE' && <>
                  <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelCopies')} *</label><input type="number" name="total_copies" value={form.total_copies} onChange={handleChange} min="1" required /></div>
                  <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelLoanDays')}</label><input type="number" name="max_loan_days" value={form.max_loan_days} onChange={handleChange} min="1" /></div>
                </>}
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelCover')}</label>{coverPreview && <img src={coverPreview} alt="" className="ob-form__thumb" />}<input type="file" name="cover_image" accept="image/*" onChange={handleChange} /></div>
                <div className="ob-form__field"><label>{t('dashboard.orgBooks.labelBackCover')}</label><input type="file" name="back_cover_image" accept="image/*" onChange={handleChange} /></div>
                {form.format === 'EBOOK' && <div className="ob-form__field"><label>PDF</label><input type="file" name="pdf_file" accept=".pdf" onChange={handleChange} /></div>}
              </div>
              <div className="ob-form__checks">
                <label><input type="checkbox" name="available" checked={form.available} onChange={handleChange} /> {orgType === 'BIBLIOTHEQUE' ? t('dashboard.orgBooks.availableLoan') : t('dashboard.orgBooks.available')}</label>
                {orgType === 'BIBLIOTHEQUE' && <label><input type="checkbox" name="allows_digital_loan" checked={form.allows_digital_loan} onChange={handleChange} /> {t('dashboard.orgBooks.digitalLoan')}</label>}
              </div>
              <div className="ob-form__actions">
                <button type="button" className="dashboard-btn" onClick={closeForm}>{t('common.cancel')}</button>
                <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <>{editingBook ? t('common.save') : L.submit}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar : recherche + tri */}
      {!showForm && books.length > 0 && (
        <div className="ob-toolbar">
          <div className="ob-toolbar__search">
            <i className="fas fa-search" />
            <input type="text" placeholder={t('common.search') + '...'} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ob-toolbar__sort" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* Liste compacte — cachée quand le formulaire est ouvert */}
      {showForm ? null : filtered.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-card__body ob-empty">
            <i className="fas fa-book-open" />
            <h3>{search ? t('dashboard.orgBooks.noResult') : L.empty}</h3>
            <p>{search ? t('dashboard.orgBooks.tryAnother') : L.hint}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-card ob-table-card">
            <table className="ob-table">
              <thead>
                <tr>
                  <th className="ob-table__th-book">{t('dashboard.orgBooks.colBook')}</th>
                  <th>{t('dashboard.orgBooks.colPrice')}</th>
                  <th className="ob-hide-sm">{t('dashboard.orgBooks.labelFormat')}</th>
                  {orgType !== 'BIBLIOTHEQUE' && <th className="ob-hide-sm">{t('dashboard.orgBooks.colSales')}</th>}
                  <th>{t('dashboard.orgBooks.colStatus')}</th>
                  {canManage && <th className="ob-table__th-actions">{t('dashboard.orgBooks.colActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map(book => {
                  const authorName = typeof book.author === 'object' ? book.author?.full_name : book.author;
                  const price = parseFloat(book.price || 0);
                  const orig = parseFloat(book.original_price || 0);
                  const rating = book.rating ? parseFloat(book.rating) : 0;
                  return (
                    <tr key={book.id} className={!book.available ? 'ob-table__row--muted' : ''}>
                      <td>
                        <div className="ob-table__book">
                          {book.cover_image ? <img src={book.cover_image} alt="" className="ob-table__cover" /> : <div className="ob-table__cover ob-table__cover--empty"><i className="fas fa-book" /></div>}
                          <div className="ob-table__book-info">
                            <Link to={`/books/${book.id}`} className="ob-table__book-title">{book.title}</Link>
                            <span className="ob-table__book-author">{authorName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ob-table__price">{price.toLocaleString('fr-FR')} F</span>
                        {orig > price && <span className="ob-table__price-old">{orig.toLocaleString('fr-FR')}</span>}
                      </td>
                      <td className="ob-hide-sm"><span className="ob-badge">{book.format === 'EBOOK' ? 'Ebook' : 'Papier'}</span></td>
                      {orgType !== 'BIBLIOTHEQUE' && <td className="ob-hide-sm">{book.total_sales || 0}</td>}
                      <td>
                        <span className={`ob-badge ${book.available ? 'ob-badge--ok' : 'ob-badge--off'}`}>
                          {book.available ? t('dashboard.orgBooks.online') : t('dashboard.orgBooks.hidden')}
                        </span>
                        {rating > 0 && <span className="ob-badge ob-badge--star">{rating.toFixed(1)} ★</span>}
                      </td>
                      {canManage && (
                        <td>
                          <div className="ob-table__actions">
                            <button onClick={() => openEdit(book)} title={t('common.edit')}><i className="fas fa-pen" /></button>
                            <button onClick={() => handleToggle(book)} title={book.available ? t('dashboard.orgBooks.hide') : t('dashboard.orgBooks.online')}><i className={`fas fa-${book.available ? 'eye-slash' : 'eye'}`} /></button>
                            <button className="ob-table__actions--danger" onClick={() => handleDelete(book)} title={t('dashboard.orgBooks.remove')}><i className="fas fa-trash" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="ob-pag">
              <button className="ob-pag__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-arrow-left" /> {t('common.previous')}
              </button>
              <div className="ob-pag__pages">
                {pageNums.map((n, i) =>
                  n === '...' ? <span key={`d${i}`} className="ob-pag__dots">...</span> :
                  <button key={n} className={`ob-pag__page ${n === page ? 'is-active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                )}
              </div>
              <button className="ob-pag__btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                {t('common.next')} <i className="fas fa-arrow-right" />
              </button>
              <span className="ob-pag__info">{t('dashboard.orgBooks.bookCount', { count: filtered.length })}</span>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default OrgBooks;
