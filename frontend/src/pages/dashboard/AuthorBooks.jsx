import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authorDashboardService from '../../services/authorDashboardService';
import bookService from '../../services/bookService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/OrgBooks.css';
import '../../styles/AuthorSpace.css';

const PER_PAGE = 10;
const FORMAT_OPTIONS_KEYS = [
  { value: 'PAPIER', key: 'paper' },
  { value: 'EBOOK', key: 'ebook' },
];
const SORT_OPTIONS_KEYS = [
  { value: '-created_at', key: 'mostRecent' },
  { value: 'title', key: 'titleAZ' },
  { value: '-total_sales', key: 'salesDesc' },
  { value: '-price', key: 'priceDesc' },
];
const EMPTY_FORM = {
  title: '', reference: '', description: '', price: '', original_price: '',
  format: 'PAPIER', category: '', available: true,
  cover_image: null, back_cover_image: null, pdf_file: null,
};

const AuthorBooks = () => {
  const { t } = useTranslation();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [coverPreview, setCoverPreview] = useState(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authorDashboardService.getMyBooks();
      setBooks(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBooks();
    bookService.getCategories().then(data => setCategories(data.results || data || [])).catch(() => {});
  }, [fetchBooks]);

  // Filtrage + tri + pagination
  const filtered = useMemo(() => {
    let list = [...books];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(b => (b.title || '').toLowerCase().includes(s));
    }
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    list.sort((a, b) => {
      let va = a[key] ?? '', vb = b[key] ?? '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      else { va = Number(va) || 0; vb = Number(vb) || 0; }
      return desc ? (va < vb ? 1 : va > vb ? -1 : 0) : (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return list;
  }, [books, search, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, sort]);

  const pageNums = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) nums.push(i);
      else if (nums[nums.length - 1] !== '...') nums.push('...');
    }
    return nums;
  }, [page, totalPages]);

  const totalBooks = books.length;
  const selfPublished = books.filter(b => !b.publisher_name).length;
  const totalSales = books.reduce((s, b) => s + (b.total_sales || 0), 0);

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') { setForm(f => ({ ...f, [name]: files[0] || null })); if (name === 'cover_image' && files[0]) setCoverPreview(URL.createObjectURL(files[0])); }
    else if (type === 'checkbox') setForm(f => ({ ...f, [name]: checked }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  const openCreate = () => { setEditingBook(null); setForm({ ...EMPTY_FORM }); setCoverPreview(null); setShowForm(true); };

  const openEdit = (book) => {
    if (book.publisher_name) { toast.error(t('dashboard.authorBooks.managedByPublisher')); return; }
    setEditingBook(book);
    setForm({
      title: book.title || '', reference: book.reference || '',
      description: book.description || '', price: book.price || '',
      original_price: book.original_price || '', format: book.format || 'PAPIER',
      category: book.category?.id || book.category || '',
      available: book.available ?? true,
      cover_image: null, back_cover_image: null, pdf_file: null,
    });
    setCoverPreview(book.cover_image || null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingBook(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'reference', 'description', 'price', 'format', 'category'].forEach(k => fd.append(k, form[k]));
      fd.append('available', form.available);
      if (form.original_price) fd.append('original_price', form.original_price);
      if (form.cover_image instanceof File) fd.append('cover_image', form.cover_image);
      if (form.back_cover_image instanceof File) fd.append('back_cover_image', form.back_cover_image);
      if (form.pdf_file instanceof File) fd.append('pdf_file', form.pdf_file);

      if (editingBook) {
        await authorDashboardService.updateBook(editingBook.id, fd);
        toast.success(t('dashboard.authorBooks.bookUpdated'));
      } else {
        await authorDashboardService.createBook(fd);
        toast.success(t('dashboard.authorBooks.bookPublished'));
      }
      closeForm(); fetchBooks();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (book) => {
    if (book.publisher_name) { toast.error(t('dashboard.authorBooks.managedByPublisher')); return; }
    if (!window.confirm(t('dashboard.authorBooks.confirmRemove', { title: book.title }))) return;
    try { await authorDashboardService.deleteBook(book.id); toast.success(t('dashboard.authorBooks.removed')); fetchBooks(); }
    catch (err) { toast.error(handleApiError(err)); }
  };

  const handleToggle = async (book) => {
    if (book.publisher_name) return;
    try {
      const fd = new FormData(); fd.append('available', !book.available);
      await authorDashboardService.updateBook(book.id, fd);
      toast.success(book.available ? t('dashboard.authorBooks.hidden') : t('dashboard.authorBooks.backOnline'));
      fetchBooks();
    } catch (err) { toast.error(handleApiError(err)); }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const isOrgBook = (book) => !!book.publisher_name;

  return (
    <div className="org-books">
      {/* Header */}
      <div className="org-books__header">
        <div>
          <h1 className="org-books__title"><i className="fas fa-book" /> {t('dashboard.authorBooks.title')}</h1>
          <p className="org-books__subtitle">
            {t('dashboard.authorBooks.statsLine', { titles: totalBooks, selfPub: selfPublished, sales: totalSales })}
          </p>
        </div>
        {!showForm && (
          <button className="dashboard-btn dashboard-btn--primary" onClick={openCreate}>
            <i className="fas fa-plus" /> {t('dashboard.authorBooks.publishBook')}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="dashboard-card ob-form-card">
          <div className="dashboard-card__header">
            <h2><i className="fas fa-edit" /> {editingBook ? t('dashboard.authorBooks.edit') : t('dashboard.authorBooks.publishNew')}</h2>
            <button className="dashboard-card__link" onClick={closeForm}><i className="fas fa-times" /> {t('dashboard.authorBooks.close')}</button>
          </div>
          <div className="dashboard-card__body">
            <form onSubmit={handleSubmit} className="ob-form">
              <div className="ob-form__grid">
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.titleLabel')} *</label><input type="text" name="title" value={form.title} onChange={handleChange} required /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.isbn')} *</label><input type="text" name="reference" value={form.reference} onChange={handleChange} required placeholder="978-2-XXX" /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.format')}</label>
                  <select name="format" value={form.format} onChange={handleChange}>{FORMAT_OPTIONS_KEYS.map(o => <option key={o.value} value={o.value}>{t(`dashboard.authorBooks.format_${o.key}`)}</option>)}</select>
                </div>
                <div className="ob-form__field ob-form__field--full"><label>{t('dashboard.authorBooks.description')} *</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} required /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.price')} *</label><input type="number" name="price" value={form.price} onChange={handleChange} min="0" required /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.originalPrice')}</label><input type="number" name="original_price" value={form.original_price} onChange={handleChange} min="0" placeholder={t('dashboard.authorBooks.promo')} /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.category')} *</label>
                  <select name="category" value={form.category} onChange={handleChange} required><option value="">—</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.cover')}</label>{coverPreview && <img src={coverPreview} alt="" className="ob-form__thumb" />}<input type="file" name="cover_image" accept="image/*" onChange={handleChange} /></div>
                <div className="ob-form__field"><label>{t('dashboard.authorBooks.backCover')}</label><input type="file" name="back_cover_image" accept="image/*" onChange={handleChange} /></div>
                {form.format === 'EBOOK' && <div className="ob-form__field"><label>{t('dashboard.authorBooks.pdf')}</label><input type="file" name="pdf_file" accept=".pdf" onChange={handleChange} /></div>}
              </div>
              <div className="ob-form__checks">
                <label><input type="checkbox" name="available" checked={form.available} onChange={handleChange} /> {t('dashboard.authorBooks.availableForSale')}</label>
              </div>
              <div className="ob-form__actions">
                <button type="button" className="dashboard-btn" onClick={closeForm}>{t('dashboard.authorBooks.cancel')}</button>
                <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <>{editingBook ? t('dashboard.authorBooks.save') : t('dashboard.authorBooks.publish')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!showForm && books.length > 0 && (
        <div className="ob-toolbar">
          <div className="ob-toolbar__search">
            <i className="fas fa-search" />
            <input type="text" placeholder={t('dashboard.authorBooks.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ob-toolbar__sort" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS_KEYS.map(o => <option key={o.value} value={o.value}>{t(`dashboard.authorBooks.sort_${o.key}`)}</option>)}
          </select>
        </div>
      )}

      {/* Liste */}
      {showForm ? null : filtered.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-card__body ob-empty">
            <i className="fas fa-book-open" />
            <h3>{search ? t('dashboard.authorBooks.noResults') : t('dashboard.authorBooks.noBooks')}</h3>
            <p>{search ? t('dashboard.authorBooks.tryAnother') : t('dashboard.authorBooks.publishFirst')}</p>
            {!search && <button className="as-cta" onClick={openCreate} style={{ marginTop: '1rem' }}><i className="fas fa-plus" /> {t('dashboard.authorBooks.publishBook')}</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-card ob-table-card">
            <table className="ob-table">
              <thead>
                <tr>
                  <th>{t('dashboard.authorBooks.colBook')}</th>
                  <th>{t('dashboard.authorBooks.colPrice')}</th>
                  <th className="ob-hide-sm">{t('dashboard.authorBooks.colFormat')}</th>
                  <th className="ob-hide-sm">{t('dashboard.authorBooks.colSales')}</th>
                  <th>{t('dashboard.authorBooks.colStatus')}</th>
                  <th style={{ width: 90 }}>{t('dashboard.authorBooks.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(book => {
                  const price = parseFloat(book.price || 0);
                  const orig = parseFloat(book.original_price || 0);
                  const rating = book.rating ? parseFloat(book.rating) : 0;
                  const org = isOrgBook(book);
                  return (
                    <tr key={book.id} className={!book.available ? 'ob-table__row--muted' : ''}>
                      <td>
                        <div className="ob-table__book">
                          {book.cover_image ? <img src={book.cover_image} alt="" className="ob-table__cover" /> : <div className="ob-table__cover ob-table__cover--empty"><i className="fas fa-book" /></div>}
                          <div className="ob-table__book-info">
                            <Link to={`/books/${book.id}`} className="ob-table__book-title">{book.title}</Link>
                            <span className="ob-table__book-author">
                              {org ? <><i className="fas fa-building" style={{ fontSize: '0.6rem', marginRight: 3 }} />{book.publisher_name}</> : t('dashboard.authorBooks.selfPublished')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ob-table__price">{price.toLocaleString('fr-FR')} F</span>
                        {orig > price && <span className="ob-table__price-old">{orig.toLocaleString('fr-FR')}</span>}
                      </td>
                      <td className="ob-hide-sm"><span className="ob-badge">{book.format === 'EBOOK' ? t('dashboard.authorBooks.format_ebook') : t('dashboard.authorBooks.format_paper')}</span></td>
                      <td className="ob-hide-sm">{book.total_sales || 0}</td>
                      <td>
                        <span className={`ob-badge ${book.available ? 'ob-badge--ok' : 'ob-badge--off'}`}>{book.available ? t('dashboard.authorBooks.statusOnline') : t('dashboard.authorBooks.statusHidden')}</span>
                        {org && <span className="ob-badge" style={{ marginLeft: 4 }} title="Géré par une organisation"><i className="fas fa-lock" style={{ fontSize: '0.5rem' }} /></span>}
                        {rating > 0 && <span className="ob-badge ob-badge--star">{rating.toFixed(1)} ★</span>}
                      </td>
                      <td>
                        <div className="ob-table__actions">
                          {!org && <>
                            <button onClick={() => openEdit(book)} title="Modifier"><i className="fas fa-pen" /></button>
                            <button onClick={() => handleToggle(book)} title={book.available ? 'Masquer' : 'En ligne'}><i className={`fas fa-${book.available ? 'eye-slash' : 'eye'}`} /></button>
                            <button className="ob-table__actions--danger" onClick={() => handleDelete(book)} title="Retirer"><i className="fas fa-trash" /></button>
                          </>}
                          {org && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted-ui)' }}>{t('dashboard.authorBooks.viaPublisher')}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="ob-pag">
              <button className="ob-pag__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="fas fa-arrow-left" /> {t('dashboard.authorBooks.previous')}</button>
              <div className="ob-pag__pages">
                {pageNums.map((n, i) => n === '...' ? <span key={`d${i}`} className="ob-pag__dots">...</span> : <button key={n} className={`ob-pag__page ${n === page ? 'is-active' : ''}`} onClick={() => setPage(n)}>{n}</button>)}
              </div>
              <button className="ob-pag__btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('dashboard.authorBooks.next')} <i className="fas fa-arrow-right" /></button>
              <span className="ob-pag__info">{t('dashboard.authorBooks.booksCount', { count: filtered.length })}</span>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default AuthorBooks;
