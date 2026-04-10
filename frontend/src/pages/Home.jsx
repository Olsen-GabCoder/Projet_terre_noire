import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookService from '../services/bookService';
import { useAuth } from '../context/AuthContext';
import { useHomeData } from '../hooks/useHomeData';
import { useReveal } from '../hooks/useReveal';
import BookCard from '../components/BookCard';
import SEO from '../components/SEO';
import '../styles/Home.css';

/* Hook useReveal importé depuis hooks/useReveal.js */

/* ── Compteur animé (une seule fois au scroll) ── */
const CountUp = ({ value, duration = 3000 }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const num = typeof value === 'number' ? value : 0;
    if (!num) return;

    let cancelled = false;

    const animate = () => {
      const start = performance.now();
      const step = (now) => {
        if (cancelled) return;
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * num));
        if (progress < 1) {
          animRef.current = requestAnimationFrame(step);
        }
      };
      animRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        animate();
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [value, duration]);

  if (typeof value !== 'number' || !value) return <span>{value}</span>;
  return <span ref={ref}>{display}</span>;
};

/* ── Section avec animation reveal ── */
const RevealSection = ({ children, className = '', ...props }) => {
  const ref = useReveal();
  return <section ref={ref} className={`reveal-section ${className}`} {...props}>{children}</section>;
};

/* ── Carrousel horizontal réutilisable ── */
const HomeCarousel = ({ children }) => {
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    if (progressRef.current) {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const pct = maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0;
      progressRef.current.style.width = `${pct}%`;
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);

    // Drag-to-scroll handlers
    const onMouseDown = (e) => {
      dragState.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };
    const onMouseUp = () => {
      dragState.current.isDragging = false;
      el.style.cursor = '';
      el.style.userSelect = '';
    };
    const onMouseMove = (e) => {
      if (!dragState.current.isDragging) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - dragState.current.startX) * 1.5;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, [checkScroll, children]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scroll('left'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); scroll('right'); }
  };

  return (
    <div className="home-carousel" role="region" aria-roledescription="carousel" tabIndex={0} onKeyDown={handleKeyDown}>
      {canScrollLeft && (
        <button className="home-carousel__arrow home-carousel__arrow--left" onClick={() => scroll('left')} aria-label="Précédent">
          <i className="fas fa-chevron-left" aria-hidden="true" />
        </button>
      )}
      <div className="home-carousel__track" ref={trackRef}>
        {children}
      </div>
      {canScrollRight && (
        <button className="home-carousel__arrow home-carousel__arrow--right" onClick={() => scroll('right')} aria-label="Suivant">
          <i className="fas fa-chevron-right" aria-hidden="true" />
        </button>
      )}
      <div className="home-carousel__progress" aria-hidden="true">
        <div className="home-carousel__progress-bar" ref={progressRef} />
      </div>
    </div>
  );
};

const ROLE_LABELS = {
  LECTEUR: 'Lecteur', AUTEUR: 'Auteur', EDITEUR: 'Éditeur',
  CORRECTEUR: 'Correcteur', ILLUSTRATEUR: 'Illustrateur',
  TRADUCTEUR: 'Traducteur', LIVREUR: 'Livreur',
};
const ROLE_ICONS = {
  LECTEUR: 'fas fa-book-reader', AUTEUR: 'fas fa-pen-fancy', EDITEUR: 'fas fa-book-open',
  CORRECTEUR: 'fas fa-spell-check', ILLUSTRATEUR: 'fas fa-palette',
  TRADUCTEUR: 'fas fa-language', LIVREUR: 'fas fa-truck',
};

const SERVICES_SHOWCASE = [
  { icon: 'fas fa-spell-check', title: 'Correction', desc: 'Correcteurs professionnels pour vos manuscrits', color: '#6366f1', type: 'CORRECTION' },
  { icon: 'fas fa-palette', title: 'Illustration', desc: 'Couvertures et illustrations sur mesure', color: '#ec4899', type: 'ILLUSTRATION' },
  { icon: 'fas fa-language', title: 'Traduction', desc: 'Traduction littéraire multilingue', color: '#10b981', type: 'TRANSLATION' },
  { icon: 'fas fa-print', title: 'Impression', desc: 'Impression à la demande, petits et grands tirages', color: '#f59e0b', type: 'PRINT' },
  { icon: 'fas fa-truck-fast', title: 'Livraison', desc: 'Livraison partout au Gabon et en Afrique', color: '#3b82f6', type: 'DELIVERY' },
  { icon: 'fas fa-pen-nib', title: 'Édition', desc: 'Accompagnement éditorial complet', color: '#8b5cf6', type: 'LAYOUT' },
];

// Skeleton loaders
const BookCardSkeleton = () => (
  <div className="skeleton-book-card" aria-hidden="true">
    <div className="skeleton-book-card__cover skeleton-pulse" />
    <div className="skeleton-book-card__body">
      <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: 12 }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: '85%', height: 16 }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: 12 }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: '30%', height: 14, marginTop: 'auto' }} />
    </div>
  </div>
);

const AuthorCardSkeleton = () => (
  <div className="skeleton-author-card" aria-hidden="true">
    <div className="skeleton-author-avatar skeleton-pulse" />
    <div className="skeleton-line skeleton-pulse" style={{ width: '70%', height: 14 }} />
    <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: 12 }} />
  </div>
);

const SectionSkeleton = ({ count = 4, type = 'book', label, title }) => (
  <section className={`home-section ${type === 'author' ? '' : ''}`}>
    <div className="home-section__header">
      <div>
        <span className="home-section__label">{label}</span>
        <h2 className="home-section__title">{title}</h2>
      </div>
    </div>
    <div className={type === 'author' ? 'home-authors-grid' : 'home-books-grid'}>
      {Array.from({ length: count }, (_, i) =>
        type === 'author' ? <AuthorCardSkeleton key={i} /> : <BookCardSkeleton key={i} />
      )}
    </div>
  </section>
);

const GENRE_ICONS = {
  'Roman': 'fas fa-book-open',
  'Poésie': 'fas fa-feather',
  'Essai': 'fas fa-lightbulb',
  'Jeunesse': 'fas fa-child',
  'Théâtre': 'fas fa-masks-theater',
  'Conte': 'fas fa-hat-wizard',
  'Nouvelle': 'fas fa-file-lines',
  'Biographie': 'fas fa-user-tie',
  'Histoire': 'fas fa-landmark-dome',
  'Science': 'fas fa-flask',
};

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Données via React Query (cache 5 min, stale-while-revalidate)
  const {
    bestsellers, newReleases, marketplace, authors, organizations, categories,
    topClub, topList, recentPosts, recommendations, testimonials, stats, isLoading: loading,
  } = useHomeData(isAuthenticated);

  const [tagIdx, setTagIdx] = useState(0);
  const [tagPhase, setTagPhase] = useState('in');
  const [tagAnim, setTagAnim] = useState('slide-up');
  const [heroReady, setHeroReady] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ books: [], authors: [] });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [testiModal, setTestiModal] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const heroSearchRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const [suggestionsPos, setSuggestionsPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
    document.body.classList.add('has-sidebar');
    // Mesurer la vraie hauteur du header et l'injecter
    const nav = document.querySelector('.navbar-modern');
    if (nav) {
      const h = nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    }
    return () => {
      document.body.classList.remove('has-sidebar');
      document.documentElement.style.removeProperty('--header-height');
      document.body.style.overflow = '';
    };
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [sidebarOpen]);

  // Autocomplete via endpoint backend dédié (léger, cachable)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!heroSearch.trim() || heroSearch.trim().length < 2) {
      setSuggestions({ books: [], authors: [] });
      setSuggestionsOpen(false);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await bookService.autocomplete(heroSearch.trim());
        setSuggestions({ books: data.books || [], authors: data.authors || [] });
        setSuggestionsOpen((data.books?.length || 0) > 0 || (data.authors?.length || 0) > 0);
      } catch {
        setSuggestionsOpen(false);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [heroSearch]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && !heroSearchRef.current?.contains(e.target)) {
        setSuggestionsOpen(false);
      }
    };
    const handleEscape = (e) => { if (e.key === 'Escape') setSuggestionsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEscape); };
  }, []);

  // Position the fixed dropdown under the search bar (+ repositionne au scroll/resize)
  useEffect(() => {
    if (!suggestionsOpen || !searchWrapperRef.current) return;
    const update = () => {
      const rect = searchWrapperRef.current?.getBoundingClientRect();
      if (rect) setSuggestionsPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [suggestionsOpen]);

  const taglines = t('home.taglines', { returnObjects: true }) || [];
  const tagCount = Array.isArray(taglines) ? taglines.length : 0;

  // Animations variées — jamais la même deux fois de suite
  const ANIMS = ['slide-up', 'slide-down', 'slide-right', 'scale-in', 'blur-in', 'flip', 'typewriter'];
  const lastAnimRef = useRef('');

  const pickAnim = useCallback(() => {
    const available = ANIMS.filter(a => a !== lastAnimRef.current);
    const pick = available[Math.floor(Math.random() * available.length)];
    lastAnimRef.current = pick;
    return pick;
  }, []);

  // Ordre mélangé aléatoirement
  const shuffledRef = useRef([]);
  const posRef = useRef(0);

  const getNextIdx = useCallback(() => {
    if (!tagCount) return 0;
    if (posRef.current >= shuffledRef.current.length) {
      const indices = Array.from({ length: tagCount }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      if (shuffledRef.current.length && indices[0] === shuffledRef.current[shuffledRef.current.length - 1]) {
        const swap = 1 + Math.floor(Math.random() * (indices.length - 1));
        [indices[0], indices[swap]] = [indices[swap], indices[0]];
      }
      shuffledRef.current = indices;
      posRef.current = 0;
    }
    return shuffledRef.current[posRef.current++];
  }, [tagCount]);

  useEffect(() => {
    if (tagCount <= 1) return;
    setTagIdx(getNextIdx());
    setTagAnim(pickAnim());
    const interval = setInterval(() => {
      setTagPhase('out');
      setTimeout(() => {
        setTagIdx(getNextIdx());
        setTagAnim(pickAnim());
        setTagPhase('in');
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [tagCount, getNextIdx, pickAnim]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    setSuggestionsOpen(false);
    if (heroSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  return (
    <div className="home-page">
      <SEO jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Frollot',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        description: 'La plateforme sociale du livre. Romans, essais, poésie : découvrez, partagez et créez ensemble.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }} />

      {/* ── SIDEBAR — portail fixe dans body ── */}
      {createPortal(
        <>
          {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
          <aside className={`home-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
            <div className="sidebar-mobile-header">
              <span className="sidebar-mobile-title"><i className="fas fa-book-open" /> Frollot</span>
              <button className="sidebar-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="home-sidebar__inner">

              {/* Livre du mois */}
              {bestsellers.length > 0 && (() => {
                const featured = bestsellers[0];
                return (
                  <div className="sb-block sb-block--featured">
                    <span className="sb-label"><i className="fas fa-star" /> Livre du mois</span>
                    <Link to={`/books/${featured.id}`} className="sb-featured">
                      <img src={featured.cover_image || '/images/default-book-cover.svg'} alt={featured.title} className="sb-featured__cover" loading="lazy" />
                      <div className="sb-featured__info">
                        <h4 className="sb-featured__title">{featured.title}</h4>
                        <p className="sb-featured__author">{typeof featured.author === 'object' ? featured.author?.full_name : featured.author}</p>
                        <span className="sb-featured__cta">Découvrir <i className="fas fa-arrow-right" aria-hidden="true" /></span>
                      </div>
                    </Link>
                  </div>
                );
              })()}

              <hr className="sb-divider" />

              {/* Promotions — carrousel défilant */}
              {bestsellers.filter(b => b.has_discount).length > 0 && (
                <>
                  <div className="sb-block">
                    <span className="sb-label"><i className="fas fa-tags" /> {t('home.promotions', 'Promotions')} <span className="sb-label__count">{bestsellers.filter(b => b.has_discount).length}</span></span>
                    <div className="sb-promos-carousel">
                      <div className="sb-promos-track">
                        {bestsellers.filter(b => b.has_discount).map(book => (
                          <Link key={book.id} to={`/books/${book.id}`} className="sb-promo-card">
                            <div className="sb-promo-card__badge">-{book.discount_percentage}%</div>
                            <img src={book.cover_image || '/images/default-book-cover.svg'} alt={book.title} loading="lazy" />
                            <div className="sb-promo-card__info">
                              <span className="sb-promo-card__title">{book.title}</span>
                              <span className="sb-promo-card__author">{typeof book.author === 'object' ? book.author?.full_name : book.author}</span>
                              <div className="sb-promo-card__prices">
                                {book.original_price && <span className="sb-promo-card__old">{parseInt(book.original_price).toLocaleString()}</span>}
                                <span className="sb-promo-card__new">{parseInt(book.price).toLocaleString()} F</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  <hr className="sb-divider" />
                </>
              )}

              {/* Club actif */}
              {topClub && (
                <div className="sb-block">
                  <span className="sb-label"><i className="fas fa-book-reader" /> Club actif</span>
                  <Link to={`/clubs/${topClub.slug}`} className="sb-club">
                    <div className="sb-club__cover">
                      {topClub.cover_image
                        ? <img src={topClub.cover_image} alt="" loading="lazy" />
                        : <i className="fas fa-users" />}
                    </div>
                    <div className="sb-club__info">
                      <h4 className="sb-club__name">{topClub.name}</h4>
                      {topClub.current_book && <p className="sb-club__book"><i className="fas fa-book" /> {topClub.current_book.title}</p>}
                      <div className="sb-club__meta">
                        <span><i className="fas fa-user-group" /> {topClub.members_count || 0} membre{(topClub.members_count || 0) > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right sb-nav-arrow" />
                  </Link>
                </div>
              )}

              {/* Liste tendance */}
              {topList && (
                <>
                  <hr className="sb-divider" />
                  <div className="sb-block">
                    <span className="sb-label"><i className="fas fa-list-ul" /> Liste tendance</span>
                    <Link to={`/lists/${topList.slug}`} className="sb-list-card">
                      <div className="sb-list-card__icon"><i className="fas fa-bookmark" /></div>
                      <div className="sb-list-card__info">
                        <h4 className="sb-list-card__name">{topList.title}</h4>
                        <p className="sb-list-card__meta">
                          {topList.items_count || topList.books_count || 0} livre{(topList.items_count || topList.books_count || 0) > 1 ? 's' : ''}
                          {topList.user && <> · par <strong>{topList.user.first_name || topList.user.username}</strong></>}
                        </p>
                      </div>
                      <i className="fas fa-chevron-right sb-nav-arrow" />
                    </Link>
                  </div>
                </>
              )}

              {/* Activité communauté */}
              {recentPosts.length > 0 && (
                <>
                  <hr className="sb-divider" />
                  <div className="sb-block">
                    <span className="sb-label"><i className="fas fa-bolt" /> {t('home.communityActivity', 'Activité communauté')}</span>
                    <div className="sb-activity">
                      {recentPosts.map(post => (
                        <Link key={post.id} to={`/feed`} className="sb-activity__item">
                          <div className="sb-activity__avatar">
                            {post.author?.profile_image
                              ? <img src={post.author.profile_image} alt="" />
                              : <span>{(post.author?.first_name || post.author?.username || '?')[0].toUpperCase()}</span>}
                          </div>
                          <div className="sb-activity__text">
                            <span className="sb-activity__user">{post.author?.first_name || post.author?.username}</span>
                            <span className="sb-activity__action">
                              {post.post_type === 'REVIEW' ? t('home.activityReview', 'a publié un avis') :
                               post.post_type === 'RECOMMENDATION' ? t('home.activityRecommend', 'recommande') :
                               post.post_type === 'READING_UPDATE' ? t('home.activityReading', 'est en train de lire') :
                               t('home.activityPublished', 'a publié')}
                            </span>
                            {post.book && <span className="sb-activity__book">« {post.book.title} »</span>}
                          </div>
                          <time className="sb-activity__time">
                            {(() => {
                              const diff = Math.floor((Date.now() - new Date(post.created_at)) / 60000);
                              if (diff < 1) return t('home.justNow', "à l'instant");
                              if (diff < 60) return `${diff}min`;
                              if (diff < 1440) return `${Math.floor(diff / 60)}h`;
                              return `${Math.floor(diff / 1440)}j`;
                            })()}
                          </time>
                        </Link>
                      ))}
                    </div>
                    <Link to="/feed" className="sb-activity__all">
                      {t('home.viewFeed', 'Voir le fil')} <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              )}

              <hr className="sb-divider" />

              {/* Communauté — liens rapides */}
              <div className="sb-block sb-block--community">
                <span className="sb-label"><i className="fas fa-share-nodes" /> Communauté</span>
                {!topClub && (
                  <Link to="/clubs" className="sb-nav-item">
                    <i className="fas fa-book-reader sb-nav-icon sb-nav-icon--clubs" />
                    <span>Clubs de lecture</span>
                    <i className="fas fa-chevron-right sb-nav-arrow" />
                  </Link>
                )}
                {!topList && (
                  <Link to="/lists" className="sb-nav-item">
                    <i className="fas fa-list-ul sb-nav-icon sb-nav-icon--lists" />
                    <span>Listes partagées</span>
                    <i className="fas fa-chevron-right sb-nav-arrow" />
                  </Link>
                )}
                {recentPosts.length === 0 && (
                  <Link to="/feed" className="sb-nav-item">
                    <i className="fas fa-rss sb-nav-icon sb-nav-icon--feed" />
                    <span>Fil d'actualité</span>
                    <i className="fas fa-chevron-right sb-nav-arrow" />
                  </Link>
                )}
                <div className="sb-community__stats">
                  <span><strong>{stats.books || 0}</strong> livres</span>
                  <span><strong>{stats.authors || 0}</strong> auteurs</span>
                </div>
                {isAuthenticated ? (
                  <Link to="/feed" className="sb-community__cta"><i className="fas fa-rss" /> Voir mon fil</Link>
                ) : (
                  <Link to="/register" className="sb-community__cta"><i className="fas fa-user-plus" /> Créer un compte</Link>
                )}
              </div>

              <hr className="sb-divider" />

              {/* Manuscrit */}
              <div className="sb-block">
                <span className="sb-label"><i className="fas fa-pen-nib" /> Auteurs</span>
                <Link to="/submit-manuscript" className="sb-nav-item">
                  <i className="fas fa-file-upload sb-nav-icon sb-nav-icon--manuscript" />
                  <span>Soumettre un manuscrit</span>
                  <i className="fas fa-chevron-right sb-nav-arrow" />
                </Link>
              </div>

            </div>
          </aside>
        </>,
        document.body
      )}

      <section className="home-hero">
        <div className="home-hero-orb home-hero-orb--1" />
        <div className="home-hero-orb home-hero-orb--2" />
        <div className="home-hero-orb home-hero-orb--3" />
        <div className="home-hero-grid-bg" />
        <img src="/images/hero-books.svg" alt="" className="home-hero-illustration" aria-hidden="true" />

        <div className={`home-hero-inner ${heroReady ? 'is-ready' : ''}`}>
          {isAuthenticated ? (
            <span className="home-hero-pill home-hero-pill--user"><i className="fas fa-hand-wave" /> {t('home.greeting', { name: user?.first_name || user?.username || 'lecteur' })}</span>
          ) : (
            <span className="home-hero-pill"><i className="fas fa-book-open" /> Frollot</span>
          )}
          <h1 className={`home-hero-tagline anim-${tagAnim} phase-${tagPhase}`} aria-live="polite">
            {Array.isArray(taglines) && taglines[tagIdx] ? taglines[tagIdx] : ''}
          </h1>
          <p className="home-hero-sub">
            {isAuthenticated ? t('home.heroSubAuth') : t('home.heroSubAnon')}
          </p>

          {/* ── Barre de recherche hero + autocomplete ── */}
          <div className="home-hero-search">
            <form onSubmit={handleHeroSearch}>
              <div className="home-hero-search__wrapper" ref={searchWrapperRef}>
                <i className="fas fa-search home-hero-search__icon" />
                <input
                  ref={heroSearchRef}
                  type="text"
                  className="home-hero-search__input"
                  placeholder={t('home.searchPlaceholder')}
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  onFocus={() => { if (suggestions.books.length || suggestions.authors.length) setSuggestionsOpen(true); }}
                  aria-label="Rechercher"
                  autoComplete="off"
                />
                {heroSearch && (
                  <button type="button" className="home-hero-search__clear" onClick={() => { setHeroSearch(''); setSuggestionsOpen(false); heroSearchRef.current?.focus(); }} aria-label="Effacer">
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            </form>

            {/* Dropdown suggestions — rendu en portal pour échapper au overflow:hidden du hero */}
            {suggestionsOpen && createPortal(
              <div
                className="search-suggestions"
                ref={suggestionsRef}
                style={{ top: suggestionsPos.top, left: suggestionsPos.left, width: suggestionsPos.width }}
              >
                {suggestionsLoading && (
                  <div className="search-suggestions__loading"><i className="fas fa-spinner fa-spin" /> Recherche...</div>
                )}
                {suggestions.books.length > 0 && (
                  <div className="search-suggestions__group">
                    <span className="search-suggestions__label"><i className="fas fa-book" /> Livres</span>
                    {suggestions.books.map(book => (
                      <Link key={book.id} to={`/books/${book.id}`} className="search-suggestion" onClick={() => setSuggestionsOpen(false)}>
                        <img src={book.cover_image || '/images/default-book-cover.svg'} alt="" className="search-suggestion__img" />
                        <div className="search-suggestion__text">
                          <span className="search-suggestion__title">{book.title}</span>
                          <span className="search-suggestion__sub">{typeof book.author === 'object' ? book.author?.full_name : book.author}</span>
                        </div>
                        {book.price && <span className="search-suggestion__price">{parseFloat(book.price).toLocaleString('fr-FR')} FCFA</span>}
                      </Link>
                    ))}
                  </div>
                )}
                {suggestions.authors.length > 0 && (
                  <div className="search-suggestions__group">
                    <span className="search-suggestions__label"><i className="fas fa-user-pen" /> Auteurs</span>
                    {suggestions.authors.map(author => (
                      <Link key={author.id} to={`/authors/${author.id}`} className="search-suggestion" onClick={() => setSuggestionsOpen(false)}>
                        <div className="search-suggestion__avatar">
                          {author.photo ? <img src={author.photo} alt="" /> : <i className="fas fa-user" />}
                        </div>
                        <div className="search-suggestion__text">
                          <span className="search-suggestion__title">{author.full_name}</span>
                          <span className="search-suggestion__sub">{author.books_count || 0} livre{(author.books_count || 0) > 1 ? 's' : ''}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {!suggestionsLoading && suggestions.books.length === 0 && suggestions.authors.length === 0 && (
                  <div className="search-suggestions__empty"><i className="fas fa-search" /> Aucun résultat pour "{heroSearch}"</div>
                )}
                <Link to={`/search?q=${encodeURIComponent(heroSearch)}`} className="search-suggestions__all" onClick={() => setSuggestionsOpen(false)}>
                  Voir tous les résultats <i className="fas fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>,
              document.body
            )}
          </div>

          {/* ── Pills genres ── */}
          {!suggestionsOpen && categories.length > 0 && (
            <div className="home-hero-genres">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/catalog?category=${cat.id}`}
                  className="home-hero-genre"
                >
                  <i className={GENRE_ICONS[cat.name] || 'fas fa-tag'} aria-hidden="true" />
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* ── CTAs + Stats en ligne ── */}
          <div className={`home-hero-bottom ${suggestionsOpen ? 'is-hidden' : ''}`}>
            <div className="home-hero-actions">
              {isAuthenticated ? (
                <>
                  <Link to="/feed" className="home-hero-cta"><i className="fas fa-rss" /> {t('home.myFeed')}</Link>
                  <Link to="/clubs" className="home-hero-cta home-hero-cta--outline"><i className="fas fa-users" /> {t('home.myClubs')}</Link>
                </>
              ) : (
                <>
                  <Link to="/catalog" className="home-hero-cta"><i className="fas fa-compass" /> {t('home.exploreCatalog')}</Link>
                  <Link to="/register" className="home-hero-cta home-hero-cta--outline"><i className="fas fa-user-plus" /> {t('home.createAccount')}</Link>
                </>
              )}
            </div>
            <div className="home-hero-stats">
              {[
                { value: stats.books || '—', label: t('home.works'), icon: 'fas fa-book' },
                { value: stats.authors || '—', label: t('nav.authors'), icon: 'fas fa-feather-pointed' },
                { value: stats.categories || '—', label: t('home.genres'), icon: 'fas fa-layer-group' },
                { value: stats.organizations || '—', label: t('home.organizations', 'Organisations'), icon: 'fas fa-building' },
              ].map((s, i) => (
                <div className="home-hero-stat" key={s.label} style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
                  <i className={`home-hero-stat__icon ${s.icon}`} />
                  <span className="home-hero-stat__value"><CountUp value={s.value} /></span>
                  <span className="home-hero-stat__label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

          {/* Incontournables */}
          {loading && bestsellers.length === 0 ? (
            <section className="home-section">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.selection')}</span>
                  <h2 className="home-section__title">{t('home.essentials')}</h2>
                </div>
              </div>
              <div className="home-carousel">
                <div className="home-carousel__track">
                  {Array.from({ length: 8 }, (_, i) => <BookCardSkeleton key={i} />)}
                </div>
              </div>
            </section>
          ) : bestsellers.length > 0 && (
            <RevealSection className="home-section">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.selection')}</span>
                  <h2 className="home-section__title">{t('home.essentials')}</h2>
                </div>
                <Link to="/catalog" className="home-section__link">{t('common.seeAll')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <HomeCarousel>
                {bestsellers.map(book => <BookCard key={book.id} book={book} />)}
              </HomeCarousel>
            </RevealSection>
          )}

          {/* Recommandé pour vous (connecté uniquement) */}
          {isAuthenticated && recommendations.length > 0 && (
            <RevealSection className="home-section home-section--alt home-section--reco">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label"><i className="fas fa-sparkles" /> {t('home.forYou')}</span>
                  <h2 className="home-section__title">{t('home.recommendedForYou')}</h2>
                </div>
                <Link to="/catalog" className="home-section__link">{t('common.explore')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <HomeCarousel>
                {recommendations.map(book => <BookCard key={book.id} book={book} />)}
              </HomeCarousel>
            </RevealSection>
          )}

          {/* Nouveautés */}
          {loading && newReleases.length === 0 ? (
            <section className="home-section home-section--alt">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.newReleases')}</span>
                  <h2 className="home-section__title">{t('home.recentlyAdded')}</h2>
                </div>
              </div>
              <div className="home-carousel">
                <div className="home-carousel__track">
                  {Array.from({ length: 8 }, (_, i) => <BookCardSkeleton key={i} />)}
                </div>
              </div>
            </section>
          ) : newReleases.length > 0 && (
            <RevealSection className="home-section home-section--alt">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.newReleases')}</span>
                  <h2 className="home-section__title">{t('home.recentlyAdded')}</h2>
                </div>
                <Link to="/catalog" className="home-section__link">{t('home.allCatalog')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <HomeCarousel>
                {newReleases.map(book => <BookCard key={book.id} book={book} />)}
              </HomeCarousel>
            </RevealSection>
          )}

          {/* Disponible en librairie */}
          {marketplace.length > 0 && (
            <RevealSection className="home-section">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label"><i className="fas fa-store" style={{ marginRight: '.35rem' }} />{t('home.marketplace', 'Marketplace')}</span>
                  <h2 className="home-section__title">{t('home.availableInBookstores', 'Disponible en librairie')}</h2>
                </div>
                <Link to="/catalog?has_listings=true" className="home-section__link">{t('common.seeAll', 'Voir tout')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <HomeCarousel>
                {marketplace.map(book => <BookCard key={book.id} book={book} />)}
              </HomeCarousel>
            </RevealSection>
          )}

          {/* Auteurs */}
          {loading && authors.length === 0 ? (
            <SectionSkeleton count={6} type="author" label="Plumes" title="Nos auteurs" />
          ) : authors.length > 0 && (
            <RevealSection className="home-section">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.pens')}</span>
                  <h2 className="home-section__title">{t('home.ourAuthors')}</h2>
                </div>
                <Link to="/authors" className="home-section__link">{t('home.allAuthors')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <HomeCarousel>
                {authors.map(author => {
                  const name = author.display_name || author.full_name || '?';
                  const photo = author.display_photo || author.photo;
                  const booksCount = author.books_count || 0;
                  return (
                    <Link key={author.id} to={`/authors/${author.id}`} className="home-author-card">
                      <div className="home-author-card__avatar">
                        {photo
                          ? <img src={photo} alt={name} loading="lazy" decoding="async" />
                          : <span>{name[0].toUpperCase()}</span>}
                      </div>
                      {author.is_registered && <span className="home-author-card__badge" aria-label="Inscrit sur Frollot"><i className="fas fa-check-circle" aria-hidden="true" /></span>}
                      <h3 className="home-author-card__name">{name}</h3>
                      <p className="home-author-card__count">
                        {booksCount} livre{booksCount > 1 ? 's' : ''}
                        {author.avg_rating > 0 && <span className="home-author-card__rating"><i className="fas fa-star" aria-hidden="true" /> {parseFloat(author.avg_rating).toFixed(1)}</span>}
                      </p>
                    </Link>
                  );
                })}
              </HomeCarousel>
            </RevealSection>
          )}

          {/* Organisations */}
          {organizations.length > 0 && (
            <RevealSection className="home-section home-section--alt">
              <div className="home-section__header">
                <div>
                  <span className="home-section__label">{t('home.ecosystem')}</span>
                  <h2 className="home-section__title">{t('home.orgTitle')}</h2>
                </div>
                <Link to="/organizations" className="home-section__link">{t('common.discover')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="home-orgs-grid">
                {organizations.map(org => {
                  const typeIcon = org.org_type === 'LIBRAIRIE' ? 'fa-store' : org.org_type === 'BIBLIOTHEQUE' ? 'fa-landmark' : org.org_type === 'IMPRIMERIE' ? 'fa-print' : 'fa-book-open';
                  return (
                    <Link key={org.id} to={`/organizations/${org.slug}`} className="home-org-card">
                      <div className="home-org-card__logo">
                        {org.logo
                          ? <img src={org.logo} alt={org.name} />
                          : <i className={`fas ${typeIcon}`} aria-hidden="true" />
                        }
                      </div>
                      <div className="home-org-card__body">
                        <h3>{org.name} {org.is_verified && <i className="fas fa-check-circle home-org-card__verified" aria-label="Vérifié" />}</h3>
                        <span className="home-org-card__type">{org.org_type_display}</span>
                        {org.city && <span className="home-org-card__city"><i className="fas fa-map-marker-alt" aria-hidden="true" /> {org.city}</span>}
                      </div>
                      <i className="fas fa-chevron-right home-org-card__arrow" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </RevealSection>
          )}

          {/* Services */}
          <RevealSection className="home-section">
            <div className="home-section__header">
              <div>
                <span className="home-section__label">{t('nav.services')}</span>
                <h2 className="home-section__title">{t('home.proServices')}</h2>
              </div>
              <Link to="/services" className="home-section__link">{t('common.discover')} <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
            </div>
            <div className="home-services-grid">
              {SERVICES_SHOWCASE.map(s => (
                <Link key={s.type} to={`/services?type=${s.type}`} className="home-service-card">
                  <div className="home-service-card__icon" style={{ background: s.color }}>
                    <i className={s.icon} aria-hidden="true" />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </Link>
              ))}
            </div>
          </RevealSection>

          {/* Social proof — Ils parlent de Frollot */}
          {(() => {
            const FALLBACK = [
              { id: 'f1', author_name: 'Marie N.', profile_types: ['LECTEUR'], content: t('home.fallbackTestimonials.f1'), rating: 5 },
              { id: 'f2', author_name: 'Jean-Paul K.', profile_types: ['AUTEUR'], content: t('home.fallbackTestimonials.f2'), rating: 5 },
              { id: 'f3', author_name: 'Sylvie A.', profile_types: ['EDITEUR'], content: t('home.fallbackTestimonials.f3'), rating: 5 },
              { id: 'f4', author_name: 'Ibrahim S.', profile_types: ['LECTEUR'], content: t('home.fallbackTestimonials.f4'), rating: 5 },
              { id: 'f5', author_name: 'Fatima N.', profile_types: ['LECTEUR'], content: t('home.fallbackTestimonials.f5'), rating: 5 },
              { id: 'f6', author_name: 'Kwame A.', profile_types: ['CORRECTEUR'], content: t('home.fallbackTestimonials.f6'), rating: 4 },
              { id: 'f7', author_name: 'Amina B.', profile_types: ['CORRECTEUR'], content: t('home.fallbackTestimonials.f7'), rating: 5 },
              { id: 'f8', author_name: 'Paul-Émile O.', profile_types: ['CORRECTEUR'], content: t('home.fallbackTestimonials.f8'), rating: 4 },
            ];
            const items = testimonials.length > 0 ? testimonials : FALLBACK;
            const row1 = [...items, ...items];
            const row2 = [...[...items].reverse(), ...[...items].reverse()];

            const renderCard = (item, i) => {
              const types = (item.profile_types || []).filter(Boolean);
              const roles = types.map(pt => ({ label: ROLE_LABELS[pt] || pt, icon: ROLE_ICONS[pt] || 'fas fa-user' }));
              if (roles.length === 0) roles.push({ label: 'Membre', icon: 'fas fa-user' });
              const initials = (item.author_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              // Pour multi-rôles : choisir un rôle unique basé sur la position dans le marquee
              const singleRole = roles[i % roles.length];
              return (
                <div className="tmc" key={`${item.id}-r${i}`} role="button" tabIndex={0}
                  onClick={() => setTestiModal(item)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTestiModal(item); } }}>
                  <div className="tmc__shine" />
                  <div className="tmc__head">
                    <div className="tmc__avatar">
                      {item.author_image
                        ? <img src={item.author_image} alt={item.author_name} />
                        : <span>{initials}</span>}
                    </div>
                    <div className="tmc__id">
                      <strong>{item.author_name}</strong>
                      <span className="tmc__role"><i className={singleRole.icon} /> {singleRole.label}</span>
                    </div>
                  </div>
                  <p className="tmc__body">{item.content}</p>
                  <div className="tmc__foot">
                    <div className="tmc__stars">
                      {Array.from({ length: 5 }, (_, si) => (
                        <i key={si} className={si < (item.rating || 5) ? 'fas fa-star' : 'far fa-star'} />
                      ))}
                    </div>
                    {(item.likes_count || 0) > 0 && (
                      <span className="tmc__likes"><i className="fas fa-heart" /> {item.likes_count}</span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <section className="testi-section">
                <div className="testi-section__bg">
                  <div className="testi-section__orb testi-section__orb--1" />
                  <div className="testi-section__orb testi-section__orb--2" />
                  <div className="testi-section__orb testi-section__orb--3" />
                </div>
                <div className="testi-section__header">
                  <span className="testi-section__label"><i className="fas fa-quote-left" /> {t('home.community', 'Communauté')}</span>
                  <h2 className="testi-section__title">{t('home.testimonials', 'Ils parlent de Frollot')}</h2>
                  <p className="testi-section__sub">{t('home.trustMessage', 'Des milliers d\'utilisateurs nous font confiance au quotidien.')}</p>
                  <Link to="/feed" className="testi-section__cta">
                    <span>{t('home.leaveReview', 'Donner mon avis')}</span> <i className="fas fa-arrow-right" aria-hidden="true" />
                  </Link>
                </div>
                <div className="testi-marquee">
                  <div className="testi-marquee__row testi-marquee__row--left">
                    <div className="testi-marquee__track">{row1.map(renderCard)}</div>
                  </div>
                  <div className="testi-marquee__row testi-marquee__row--right">
                    <div className="testi-marquee__track">{row2.map(renderCard)}</div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Modal avis complet */}
          {testiModal && (() => {
            const roles = (testiModal.profile_types || []).map(pt => ROLE_LABELS[pt] || pt).filter(Boolean);
            const ini = (testiModal.author_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return createPortal(
              <div className="testi-overlay" onClick={() => setTestiModal(null)}>
                <div className="testi-popup" role="dialog" aria-modal="true" aria-label={t('home.reviewBy', { name: testiModal.author_name })}
                  onClick={e => e.stopPropagation()} ref={el => { if (el) el.querySelector('.testi-popup__close')?.focus(); }}>
                  <button className="testi-popup__close" onClick={() => setTestiModal(null)} aria-label={t('common.close', 'Fermer')}>
                    <i className="fas fa-times" />
                  </button>
                  <div className="testi-popup__head">
                    <div className="testi-popup__avatar">
                      {testiModal.author_image
                        ? <img src={testiModal.author_image} alt={testiModal.author_name} />
                        : <span>{ini}</span>}
                    </div>
                    <div>
                      <strong className="testi-popup__name">{testiModal.author_name}</strong>
                      <div className="testi-popup__roles">
                        {(roles.length > 0 ? roles : ['Membre']).map((r, ri) => (
                          <span key={r} className="testi-popup__badge">{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="testi-popup__stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <i key={i} className={i < (testiModal.rating || 5) ? 'fas fa-star' : 'far fa-star'} />
                    ))}
                    <span>{testiModal.rating || 5}/5</span>
                  </div>
                  <p className="testi-popup__text">{testiModal.content}</p>
                  {testiModal.created_at && (
                    <span className="testi-popup__date">
                      <i className="far fa-clock" /> {new Date(testiModal.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>,
              document.body
            );
          })()}

      <div className="home-footer-fade" />

      {/* Bouton flottant mobile — portail hors du stacking context de .page-transition */}
      {createPortal(
        <button
          className="sidebar-fab"
          onClick={() => setSidebarOpen(true)}
          aria-label="Ouvrir le panneau"
        >
          <i className="fas fa-layer-group" />
        </button>,
        document.body
      )}
    </div>
  );
};

export default Home;
