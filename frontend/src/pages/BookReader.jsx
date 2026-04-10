import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import api from '../services/api';
import '../styles/BookReader.css';

// PDF.js — worker pour le rendu (évite de bloquer le thread principal)
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ─── Icônes SVG inline ──────────────────────────────────────────────────────

const IconArrowLeft = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IconLock = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconBookOpen = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconFilePdf = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="9" y2="17" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="15" y1="14" x2="15" y2="17" />
  </svg>
);

const IconAlertTriangle = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconFeather = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <line x1="16" y1="8" x2="2" y2="22" />
    <line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
);

const IconLoader = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ─── Composants UI internes ─────────────────────────────────────────────────

const OrnamentalDivider = () => (
  <div className="br-ornament" aria-hidden="true">
    <span className="br-ornament__line" />
    <span className="br-ornament__diamond" />
    <span className="br-ornament__line" />
  </div>
);

const GoldLoader = ({ label, ariaLabel }) => (
  <div className="br-gold-loader" role="status" aria-label={ariaLabel}>
    <div className="br-gold-loader__ring">
      <svg viewBox="0 0 50 50" className="br-gold-loader__svg">
        <circle
          className="br-gold-loader__track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="2"
        />
        <circle
          className="br-gold-loader__arc"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="2"
          strokeDasharray="100 26"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <p className="br-gold-loader__label">{label}</p>
  </div>
);

const PageTurnEffect = () => (
  <div className="br-page-turn" aria-hidden="true">
    <div className="br-page-turn__corner" />
  </div>
);

// ─── Composant principal ────────────────────────────────────────────────────

const BookReader = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const headerHideTimer = useRef(null);

  // ── Charger les infos du livre ──
  useEffect(() => {
    let cancelled = false;
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bookService.getBookById(id);
        if (!cancelled) setBook(data);
      } catch (err) {
        if (!cancelled) setError(t('pages.bookReader.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBook();
    return () => { cancelled = true; };
  }, [id]);

  // ── Charger le catalogue (livres disponibles) pour la barre latérale gauche ──
  useEffect(() => {
    let cancelled = false;
    const fetchCatalog = async () => {
      try {
        setCatalogLoading(true);
        const data = await bookService.getBooks({ page_size: 100 });
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data.results || []);
        setCatalogBooks(list);
      } catch {
        if (!cancelled) setCatalogBooks([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    fetchCatalog();
    return () => { cancelled = true; };
  }, []);

  // ── Charger le PDF en mémoire ──
  useEffect(() => {
    if (!book?.pdf_file || !book?.id) return;
    let cancelled = false;
    const loadPdf = async () => {
      setLoadingPdf(true);
      setPdfError(null);
      try {
        const { data } = await api.get(`/books/${book.id}/read-pdf/`, {
          responseType: 'arraybuffer',
        });
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (err) {
        if (!cancelled) {
          const status = err.response?.status;
          if (status === 401) {
            setPdfError(t('pages.bookReader.loginRequired'));
          } else if (status === 403) {
            setPdfError(
              err.response?.data?.detail ||
              t('pages.bookReader.purchaseRequired')
            );
          } else {
            setPdfError(t('pages.bookReader.pdfLoadError'));
          }
        }
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [book?.id, book?.pdf_file]);

  // ── Filigrane canvas ──
  const drawWatermark = useCallback((ctx, width, height, pageNum) => {
    ctx.save();

    // Filigrane bas de page
    ctx.globalAlpha = 0.12;
    ctx.font = '600 11px "DM Sans", sans-serif';
    ctx.fillStyle = '#5a4a2a';
    ctx.textAlign = 'center';
    ctx.fillText(
      `© Frollot — Page ${pageNum} — Usage personnel strictly reserved`,
      width / 2,
      height - 14
    );

    // Filigrane diagonal central
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = '300 10px "Cormorant Garamond", serif';
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = '#3a2e1a';
    ctx.fillText('FROLLOT', 0, 0);

    ctx.restore();
  }, []);

  // ── Rendu d'une page PDF ──
  const renderPage = useCallback((pageNum, container) => {
    if (!pdfDoc || !container) return;
    pdfDoc.getPage(pageNum).then((page) => {
      const scale = 2.2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.draggable = false;
      canvas.setAttribute('draggable', 'false');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'br-page__canvas';

      container.appendChild(canvas);

      const task = page.render({ canvasContext: ctx, viewport });
      task.promise.then(() => {
        drawWatermark(ctx, canvas.width, canvas.height, pageNum);
        container.classList.add('br-page--rendered');
      });
    });
  }, [pdfDoc, drawWatermark]);

  // ── Afficher toutes les pages ──
  useEffect(() => {
    if (!pdfDoc || !containerRef.current || numPages === 0) return;
    containerRef.current.innerHTML = '';

    for (let i = 1; i <= numPages; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'br-page';
      wrapper.setAttribute('data-page', i);

      // Numéro de page flottant
      const pageLabel = document.createElement('span');
      pageLabel.className = 'br-page__label';
      pageLabel.textContent = i;
      wrapper.appendChild(pageLabel);

      containerRef.current.appendChild(wrapper);
      renderPage(i, wrapper);
    }
  }, [pdfDoc, numPages, renderPage]);

  // ── Miniatures pour la sidebar (petit scale) ──
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    let cancelled = false;
    const gen = async () => {
      const scale = 0.25;
      const urls = [];
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL('image/jpeg', 0.75));
        } catch {
          urls.push('');
        }
      }
      if (!cancelled) setThumbnails(urls);
    };
    gen();
    return () => { cancelled = true; };
  }, [pdfDoc, numPages]);

  const scrollToPage = useCallback((pageNum) => {
    const el = scrollRef.current?.querySelector(`.br-page[data-page="${pageNum}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── IntersectionObserver : suivi page courante + scroll percent ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) return;

    const wrappers = el.querySelectorAll('.br-page');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const page = parseInt(entry.target.getAttribute('data-page'), 10);
          if (!Number.isNaN(page)) setCurrentPage(page);
        });
      },
      { root: el, rootMargin: '-20% 0px', threshold: 0 }
    );
    wrappers.forEach((w) => observer.observe(w));
    return () => observer.disconnect();
  }, [numPages, pdfDoc]);

  // ── Scroll : barre de progression globale + masquer header ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setScrollPercent(total > 0 ? (scrollTop / total) * 100 : 0);

      // Masquer le header quand on scrolle vers le bas
      if (scrollTop > lastScrollY + 10) {
        setHeaderVisible(false);
        clearTimeout(headerHideTimer.current);
      } else if (scrollTop < lastScrollY - 5) {
        setHeaderVisible(true);
      }
      setLastScrollY(scrollTop);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [lastScrollY]);

  // ── Réafficher le header au survol du bord haut ──
  const handleMouseMoveTop = useCallback((e) => {
    if (e.clientY < 80) setHeaderVisible(true);
  }, []);

  // ── Protections globales ──
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
    };
  }, []);

  // ─── États de chargement / erreur ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="br-splash">
        <div className="br-splash__inner">
          <div className="br-splash__logo">
            <IconFeather className="br-splash__logo-icon" />
            <span className="br-splash__logo-text">Frollot</span>
          </div>
          <OrnamentalDivider />
          <p className="br-splash__label">{t('pages.bookReader.opening')}</p>
          <div className="br-splash__dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="br-error-page">
        <div className="br-error-page__bg" aria-hidden="true" />
        <div className="br-error-card">
          <div className="br-error-card__icon-wrap">
            <IconBookOpen className="br-error-card__icon" />
          </div>
          <h1 className="br-error-card__title">{t('pages.bookReader.notFound')}</h1>
          <OrnamentalDivider />
          <p className="br-error-card__desc">
            {error || t('pages.bookReader.notFoundDesc')}
          </p>
          <Link to="/catalog" className="br-cta">
            <IconArrowLeft className="br-cta__icon" />
            <span>{t('pages.bookReader.backToCatalog')}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!book.pdf_file) {
    return (
      <div className="br-error-page">
        <div className="br-error-page__bg" aria-hidden="true" />
        <div className="br-error-card">
          <div className="br-error-card__icon-wrap">
            <IconFilePdf className="br-error-card__icon" />
          </div>
          <h1 className="br-error-card__title">{t('pages.bookReader.readingUnavailable')}</h1>
          <OrnamentalDivider />
          <p className="br-error-card__desc">
            {t('pages.bookReader.noDigitalVersion')}
          </p>
          <Link to={`/books/${id}`} className="br-cta">
            <IconArrowLeft className="br-cta__icon" />
            <span>{t('pages.bookReader.backToBook')}</span>
          </Link>
        </div>
      </div>
    );
  }

  const authorName = book?.author?.full_name || book?.author?.name || '';
  const progressPercent = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  // ─── Interface principale ──────────────────────────────────────────────────

  return (
    <div
      className="br-reader"
      onMouseMove={handleMouseMoveTop}
    >

      {/* ── Barre de progression globale (top edge) ── */}
      <div
        className="br-progress-edge"
        role="progressbar"
        aria-valuenow={Math.round(scrollPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('pages.bookReader.readingProgress')}
      >
        <div
          className="br-progress-edge__fill"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* ── Header ── */}
      <header className={`br-header${headerVisible ? '' : ' br-header--hidden'}`}>
        <div className="br-header__inner">

          {/* Retour : à l'extrême gauche */}
          <Link
            to={`/books/${id}`}
            className="br-header__back"
            aria-label={t('pages.bookReader.backToBook')}
          >
            <IconArrowLeft className="br-header__back-icon" />
            <span className="br-header__back-label">{t('common.back')}</span>
          </Link>

          {/* Séparateur vertical */}
          <div className="br-header__sep" aria-hidden="true" />

          {/* Logo Frollot : entre Retour et infos livre */}
          <div className="br-header__logo" aria-hidden="true">
            <img
              src="/images/logo_frollot.png"
              alt=""
              className="br-header__logo-img"
            />
          </div>

          {/* Méta : Frollot, titre, auteur (poussés à l’extrême gauche du bloc central) */}
          <div className="br-header__meta">
            <p className="br-header__edition">Frollot</p>
            <h1 className="br-header__title" title={book.title}>{book.title}</h1>
            {authorName && (
              <p className="br-header__author">{authorName}</p>
            )}
          </div>

          {/* Spacer pour pousser nav à droite */}
          <div className="br-header__spacer" aria-hidden="true" />

          {/* Progression */}
          {numPages > 0 && (
            <div className="br-header__nav">
              <div className="br-header__page-counter">
                <span className="br-header__page-current">{currentPage}</span>
                <span className="br-header__page-sep">/</span>
                <span className="br-header__page-total">{numPages}</span>
              </div>
              <div
                className="br-header__track"
                role="presentation"
                aria-hidden="true"
              >
                <div
                  className="br-header__fill"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="br-header__thumb"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Bouton afficher / masquer les miniatures */}
          {numPages > 0 && (
            <button
              type="button"
              className="br-header__toggle-pages"
              onClick={() => setSidebarVisible((v) => !v)}
              title={sidebarVisible ? t('pages.bookReader.hideThumbnails') : t('pages.bookReader.showThumbnails')}
              aria-label={sidebarVisible ? t('pages.bookReader.hideThumbnails') : t('pages.bookReader.showThumbnails')}
            >
              {sidebarVisible ? (
                <svg className="br-header__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
              ) : (
                <svg className="br-header__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              )}
              <span className="br-header__toggle-label">{sidebarVisible ? t('pages.bookReader.hidePages') : t('pages.bookReader.pages')}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Zone de lecture : sidebar gauche (livres) + centre (PDF + miniatures) ── */}
      <div className={`br-main ${!sidebarVisible ? 'br-main--sidebar-hidden' : ''}`}>
        {/* Sidebar gauche : liste des livres disponibles */}
        <aside className="br-sidebar-left" aria-label={t('pages.bookReader.availableBooks')}>
          <h3 className="br-sidebar-left__title">{t('pages.bookReader.books')}</h3>
          {catalogLoading ? (
            <div className="br-sidebar-left__loading">{t('common.loading')}</div>
          ) : (
            <ul className="br-sidebar-left__list">
              {catalogBooks.map((b) => {
                const cover = b.cover_image || '/images/default-book-cover.svg';
                const isCurrent = String(b.id) === String(id);
                return (
                  <li key={b.id} className="br-sidebar-left__item">
                    <Link
                      to={`/books/${b.id}/read`}
                      className={`br-sidebar-left__link ${isCurrent ? 'br-sidebar-left__link--current' : ''}`}
                      title={b.title}
                    >
                      <span className="br-sidebar-left__cover">
                        <img src={cover} alt="" />
                      </span>
                      <span className="br-sidebar-left__label">{b.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!catalogLoading && catalogBooks.length === 0 && (
            <p className="br-sidebar-left__empty">{t('pages.bookReader.noBooks')}</p>
          )}
        </aside>

        {/* Centre : viewport PDF + sidebar miniatures à droite */}
        <div className="br-center">
        <div
          ref={scrollRef}
          className="br-viewport"
          onContextMenu={(e) => e.preventDefault()}
        >

          {/* Bandeau protection */}
          <div className="br-shield">
          <IconLock className="br-shield__icon" />
          <span className="br-shield__text">
            {t('pages.bookReader.protectionNotice')}
            <span className="br-shield__copyright"> © Frollot</span>
          </span>
        </div>

        {/* Chargement PDF */}
        {loadingPdf && (
          <div className="br-loading">
            <GoldLoader label={t('pages.bookReader.loadingDocument')} ariaLabel={t('pages.bookReader.loadingDocument')} />
          </div>
        )}

        {/* Erreur PDF */}
        {pdfError && !loadingPdf && (
          <div className="br-pdf-error">
            <IconAlertTriangle className="br-pdf-error__icon" />
            <p className="br-pdf-error__msg">{pdfError}</p>
            <p className="br-pdf-error__hint">
              {t('pages.bookReader.reloadOrContact')}
            </p>
          </div>
        )}

        {/* Livre */}
        {!loadingPdf && !pdfError && pdfDoc && (
          <div className="br-book">

            {/* Décoration haut de livre */}
            <div className="br-book__header" aria-hidden="true">
              <OrnamentalDivider />
            </div>

            {/* Pages */}
            <div ref={containerRef} className="br-pages" />

            {/* Filigrane overlay CSS */}
            <div className="br-book__watermark" aria-hidden="true" />

            {/* Décoration bas de livre */}
            <div className="br-book__footer" aria-hidden="true">
              <OrnamentalDivider />
            </div>
          </div>
        )}
        </div>

        {/* Sidebar : miniatures des pages (affichage selon sidebarVisible) */}
        {!loadingPdf && !pdfError && pdfDoc && numPages > 0 && sidebarVisible && (
          <aside className="br-sidebar" aria-label={t('pages.bookReader.pageNavigation')}>
            <h3 className="br-sidebar__title">{t('pages.bookReader.pages')}</h3>
            <div className="br-sidebar__thumbnails">
              {thumbnails.length > 0 ? (
                thumbnails.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`br-sidebar__thumb ${currentPage === i + 1 ? 'br-sidebar__thumb--current' : ''}`}
                    onClick={() => scrollToPage(i + 1)}
                    title={t('pages.bookReader.goToPage', { page: i + 1 })}
                  >
                    {url ? (
                      <img src={url} alt={`Page ${i + 1}`} />
                    ) : (
                      <span className="br-sidebar__thumb-num">{i + 1}</span>
                    )}
                  </button>
                ))
              ) : (
                Array.from({ length: numPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`br-sidebar__thumb ${currentPage === i + 1 ? 'br-sidebar__thumb--current' : ''}`}
                    onClick={() => scrollToPage(i + 1)}
                    title={t('pages.bookReader.goToPage', { page: i + 1 })}
                  >
                    <span className="br-sidebar__thumb-num">{i + 1}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}
        </div>
      </div>

      {/* ── Footer (aligné sur le header : logo, blanc, pleine largeur) ── */}
      {!loadingPdf && !pdfError && pdfDoc && numPages > 0 && (
        <footer className="br-footer">
          <div className="br-footer__inner">
            <div className="br-footer__brand">
              <div className="br-footer__logo" aria-hidden="true">
                <img src="/images/logo_frollot.png" alt="" className="br-footer__logo-img" />
              </div>
              <span className="br-footer__brand-text">Frollot</span>
            </div>
            <div className="br-footer__page-info">
              {t('pages.bookReader.pageOf', { current: currentPage, total: numPages })}
            </div>
            <div className="br-footer__copy">
              {t('pages.bookReader.allRightsReserved')}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default BookReader;