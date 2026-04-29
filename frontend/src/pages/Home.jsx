import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useHomeData } from '../hooks/useHomeData';
import { useReveal } from '../hooks/useReveal';
import SEO from '../components/SEO';
import DailyQuote from '../components/DailyQuote';
import {
  HomeSidebar,
  TestimonialsSection,
  BookCardSkeleton,
  SectionSkeleton,
  CountUp,
  SERVICES_SHOWCASE,
  getAuthorName,
  BookItem,
} from '../components/home';
import '../styles/Home.css';

/* ─── Scroll-reveal wrapper ────────────────────────────────── */
const RevealSection = ({ children, className = '', ...props }) => {
  const ref = useReveal();
  return (
    <section ref={ref} className={`reveal-section ${className}`} {...props}>
      {children}
    </section>
  );
};

/* ─── Locale-aware date formatters ─────────────────────────── */
const formatLocalDate = (lang = 'fr') => {
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR';
  const now = new Date();
  return now.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
};

const getMonthName = (lang = 'fr') => {
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR';
  const now = new Date();
  return now.toLocaleDateString(locale, { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
};

/* ═══════════════════════════════════════════════════════════
   Home — v2 · Direction A · Éditoriale sobre
   ═══════════════════════════════════════════════════════════ */
const Home = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const {
    bestsellers, newReleases, marketplace, authors, organizations, categories,
    topClubs, topList, recentPosts, recommendations, testimonials,
    monthlySelection, monthlyMeta, stats, isLoading: loading,
  } = useHomeData(isAuthenticated, sidebarOpen);

  /* body class + header height */
  useEffect(() => {
    document.body.classList.add('has-sidebar');
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

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
  }, [sidebarOpen]);

  /* SEO structured data */
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const seoJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Frollot',
    url: origin,
    description: 'La plateforme sociale du livre. Romans, essais, poésie : découvrez, partagez et créez ensemble.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/catalog?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }), [origin]);

  /* Taglines — memoized to avoid flicker on re-render */
  const taglines = t('home.taglines', { returnObjects: true });
  const heroTagline = useMemo(() => {
    if (!Array.isArray(taglines) || taglines.length === 0) return null;
    return taglines[Math.floor(Math.random() * taglines.length)];
  }, [taglines]);

  /* Top 3 books for hero triptych — depuis la sélection mensuelle */
  const heroBooks = monthlySelection.length >= 3 ? monthlySelection.slice(0, 3) : bestsellers.slice(0, 3);

  /* Month name */
  const lang = i18n.language?.slice(0, 2) || 'fr';
  const monthName = getMonthName(lang);

  return (
    <div className="home-page">
      <SEO jsonLd={seoJsonLd} />

      {/* ── Sidebar (portal) ── */}
      {createPortal(
        <HomeSidebar
          isAuthenticated={isAuthenticated}
          sidebarOpen={sidebarOpen}
          onClose={closeSidebar}
          bestsellers={bestsellers}
          topClub={topClubs[0] || null}
          topList={topList}
          recentPosts={recentPosts}
          stats={stats}
        />,
        document.body
      )}

      {/* ── Date strip ── */}
      <div className="home-date-strip">
        <div className="home-date-strip__left">
          <span>— {formatLocalDate(lang)}</span>
          <span>{t('home.edition', 'Édition')} {monthName.toLowerCase()} {new Date().getFullYear()}</span>
        </div>
        <div className="home-date-strip__right">
          <span>{t('home.city', 'Libreville')}</span>
          <span>{stats.books ?? '—'} {t('home.works', 'œuvres')} · {stats.authors ?? '—'} {t('nav.authors', 'auteurs')}</span>
        </div>
      </div>

      {/* ── Hero — v2 editorial: text left, triptych right ── */}
      <section className="home-hero">
        <div className="home-hero__text">
          <div className="home-hero__eyebrow">— {t('home.selectionMonth', 'Sélection')} {monthName.toLowerCase()} {new Date().getFullYear()}</div>
          <h1 className="home-hero-tagline">
            {heroTagline || t('home.heroTaglineDefault', 'Les lettres d\u2019Afrique francophone, toutes réunies.')}
          </h1>
          <p className="home-hero__deck">
            {isAuthenticated
              ? t('home.heroSubAuth')
              : t('home.heroSubAnon', 'Quatre mille livres, deux cents auteurs vivants, vingt-quatre clubs de lecture. Frollot est la plateforme sociale du livre francophone africain — de Dakar à Libreville, de Brazzaville à Abidjan.')}
          </p>
          <div className="home-hero__cta">
            <Link to="/catalog" className="home-btn-primary">{t('home.exploreCatalog', 'Explorer le catalogue')} →</Link>
            <Link to="/about" className="home-btn-outline">{t('home.readManifesto', 'Nos manifestes')}</Link>
          </div>
        </div>

        {/* Triptych of book covers */}
        <div>
          {heroBooks.length >= 3 ? (
            <>
              <div className="home-hero__triptych">
                {heroBooks.map((book, i) => (
                  <Link key={book.id} to={`/books/${book.id}`} className="home-hero__triptych-item">
                    <img
                      src={book.cover_image || '/images/default-book-cover.svg'}
                      alt={book.title}
                      loading="eager"
                    />
                  </Link>
                ))}
              </div>
              <div className="home-hero__triptych-meta">
                <span>— {t('home.threeBooks', 'Trois livres du mois')}</span>
                <span>{monthName} {new Date().getFullYear()}</span>
              </div>
            </>
          ) : heroBooks.length > 0 ? (
            <div className="home-hero__triptych">
              {heroBooks.map((book) => (
                <Link key={book.id} to={`/books/${book.id}`} className="home-hero__triptych-item">
                  <img
                    src={book.cover_image || '/images/default-book-cover.svg'}
                    alt={book.title}
                    loading="eager"
                  />
                </Link>
              ))}
            </div>
          ) : loading ? (
            <div className="home-hero__feature--skeleton" />
          ) : null}
        </div>
      </section>

      {/* ── Ticker ── */}
      {newReleases.length > 0 && (
        <div className="home-ticker" aria-label={t('home.news', 'Actualités')}>
          <span className="home-ticker__tag">— {t('home.newsFeed', 'LE FIL')}</span>
          <div className="home-ticker__track">
            {[...newReleases.slice(0, 6), ...newReleases.slice(0, 6)].map((book, idx) => (
              <span key={`${book.id}-${idx}`}>
                « {book.title} » de {getAuthorName(book.author)}
                <span className="home-ticker__sep">·</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Citation du jour ── */}
      <DailyQuote />

      {/* ── Section 01 · La sélection du mois ── */}
      {loading && monthlySelection.length === 0 ? (
        <section className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 01 · {t('home.selection', 'La sélection')}</div>
              <h2 className="home-section__title">{t('home.essentials', 'Les incontournables de')} <em>{monthName.toLowerCase()}</em>.</h2>
            </div>
          </div>
          <div className="home-book-rack">
            {Array.from({ length: 4 }, (_, i) => <BookCardSkeleton key={i} />)}
          </div>
        </section>
      ) : monthlySelection.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 01 · {t('home.selection', 'La sélection')}</div>
              <h2 className="home-section__title">{t('home.essentials', 'Les incontournables de')} <em>{monthName.toLowerCase()}</em>.</h2>
            </div>
            <div className="home-section__tools">
              {categories.slice(0, 5).map((cat, i) => (
                <Link key={cat.id} to={`/catalog?category=${cat.id}`} className={`home-chip${i === 0 ? ' active' : ''}`}>
                  {cat.name}
                </Link>
              ))}
              <Link to="/catalog" className="home-section__link" style={{ marginLeft: 16 }}>
                {t('common.seeAll', 'Tout voir')} →
              </Link>
            </div>
          </div>
          <div className="home-book-rack">
            {monthlySelection.slice(0, 4).map((book) => (
              <BookItem key={book.id} book={book} />
            ))}
          </div>
        </RevealSection>
      )}

      {/* ── Recommandations (connecté uniquement) ── */}
      {isAuthenticated && recommendations.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 02 · {t('home.forYou', 'Pour vous')}</div>
              <h2 className="home-section__title">{t('home.recommendedForYou', 'Recommandé pour')} <em>{user?.first_name || t('home.you', 'vous')}</em>.</h2>
            </div>
            <Link to="/catalog" className="home-section__link">{t('common.explore', 'Explorer')} →</Link>
          </div>
          <div className="home-book-rack">
            {recommendations.slice(0, 4).map((book) => (
              <BookItem key={book.id} book={book} showAiReason />
            ))}
          </div>
        </RevealSection>
      )}

      {/* ── Manifesto — quote + stats ── */}
      <RevealSection className="home-manifesto">
        <div className="home-manifesto__grid">
          <div>
            <div className="home-section__eyebrow">— 03 · {t('home.manifesto', 'Manifeste')}</div>
            <div className="home-manifesto__sig">
              Libreville · {monthName} {new Date().getFullYear()}
            </div>
          </div>
          <div>
            <blockquote className="home-manifesto__quote">
              <span className="home-manifesto__drop">N</span>
              {t('home.manifestoQuote', "ous croyons que la littérature africaine n’a pas besoin d’être expliquée à l’Europe — mais lue, aimée, et transmise à ses propres enfants.")}
              {' '}Frollot existe pour ça. Pour rapprocher <em>les livres</em>, <em>les lecteurs</em> et <em>les auteurs</em>, sans intermédiaire inutile.
            </blockquote>
            <div className="home-stats home-stats--inline">
              <div className="home-stat home-stat--first">
                <div className="home-stat__num"><CountUp value={stats.books ?? '—'} /></div>
                <div className="home-stat__label">{t('home.booksInCatalog', 'livres au catalogue')}</div>
              </div>
              <div className="home-stat">
                <div className="home-stat__num"><CountUp value={stats.authors ?? '—'} /></div>
                <div className="home-stat__label">{t('nav.authors', 'auteurs vivants')}</div>
              </div>
              <div className="home-stat">
                <div className="home-stat__num"><CountUp value={stats.clubs ?? '—'} /></div>
                <div className="home-stat__label">{t('home.activeClubs', 'clubs actifs')}</div>
              </div>
              <div className="home-stat home-stat--last">
                <div className="home-stat__num"><CountUp value={stats.organizations ?? '—'} /></div>
                <div className="home-stat__label">{t('home.orgTitle', 'organisations')}</div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── Clubs section — 02 · Communauté ── */}
      {topClubs.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 04 · {t('home.community', 'Communauté')}</div>
              <h2 className="home-section__title">{t('home.clubsTitle', 'Nos clubs les plus actifs')}.</h2>
            </div>
            <Link to="/clubs" className="home-section__link">{t('home.allClubs', 'Tous les clubs')} →</Link>
          </div>
          <div className="home-clubs-grid">
            {topClubs.map((club) => (
              <Link key={club.id} to={`/clubs/${club.slug || club.id}`} className="home-club-card">
                <div className="home-club-card__body">
                  <div className="home-club-card__cover">
                    {club.cover_image ? (
                      <img src={club.cover_image} alt={club.name} loading="lazy" />
                    ) : (
                      <div className="home-club-card__cover-fallback">
                        <i className="fas fa-users" />
                      </div>
                    )}
                  </div>
                  <div className="home-club-card__info">
                    <div>
                      <div className="home-section__eyebrow" style={{ fontSize: 9 }}>— {club.current_book ? t('home.currentRead', 'Lecture en cours') : t('home.activeClub', 'Club actif')}</div>
                      <div className="home-club-card__name">{club.name}</div>
                      {club.current_book && (
                        <div className="home-club-card__book">
                          <i className="fas fa-book" /> {club.current_book.title}
                        </div>
                      )}
                    </div>
                    <div className="home-club-card__progress-label">
                      <span>{t('home.memberCount', { count: club.members_count || 0, defaultValue: '{{count}} membre(s)' })}</span>
                    </div>
                  </div>
                </div>
                <div className="home-club-card__footer">
                  <span className="home-club-card__members">
                    <i className="fas fa-user-group" style={{ fontSize: 10, marginRight: 4 }} />
                    {club.members_count || 0} {t('home.members', 'membres')}
                  </span>
                  <span className="home-club-card__next">
                    {t('home.joinClub', 'Rejoindre')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </RevealSection>
      )}

      {/* ── Nouveautés section ── */}
      {newReleases.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 05 · {t('home.newReleases', 'Nouveautés')}</div>
              <h2 className="home-section__title">{t('home.recentlyAdded', 'Récemment ajoutés')}</h2>
            </div>
            <Link to="/catalog" className="home-section__link">{t('home.allCatalog', 'Tout le catalogue')} →</Link>
          </div>
          <div className="home-book-rack">
            {newReleases.slice(0, 4).map((book) => (
              <BookItem key={book.id} book={book} />
            ))}
          </div>
        </RevealSection>
      )}

      {/* ── Marketplace — disponible en librairie ── */}
      {marketplace.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 06 · {t('home.marketplace', 'Marketplace')}</div>
              <h2 className="home-section__title">{t('home.availableInBookstores', 'Disponible en')} <em>{t('home.bookstores', 'librairie')}</em>.</h2>
              <div className="home-section__sub">{t('home.marketplaceDesc', 'Ces titres sont proposés par des vendeurs indépendants sur la plateforme.')}</div>
            </div>
            <Link to="/catalog?has_listings=true" className="home-section__link">{t('common.seeAll', 'Voir tout')} →</Link>
          </div>
          <div className="home-book-rack">
            {marketplace.slice(0, 4).map((book) => (
              <BookItem key={book.id} book={book} />
            ))}
          </div>
        </RevealSection>
      )}

      {/* ── Authors section — Plumes ── */}
      {loading && authors.length === 0 ? (
        <SectionSkeleton count={6} type="author" label={t('home.pens', 'Plumes')} title={t('home.ourAuthors', 'Nos auteurs')} />
      ) : authors.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 07 · {t('home.pens', 'Plumes')}</div>
              <h2 className="home-section__title">{t('home.ourAuthors', 'Nos auteurs')}.</h2>
            </div>
            <Link to="/authors" className="home-section__link">{t('home.allAuthors', 'Tous les auteurs')} ({stats.authors ?? ''}) →</Link>
          </div>
          <div className="home-authors">
            {authors.slice(0, 6).map(author => {
              const name = author.display_name || author.full_name || '?';
              const photo = author.display_photo || author.photo;
              const booksCount = author.books_count || 0;
              const bio = author.display_bio || author.biography || '';
              const genre = author.primary_genre || null;
              const followers = author.followers_count || 0;
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const link = author.user_slug ? `/u/${author.user_slug}` : `/authors/${author.id}`;
              return (
                <Link key={author.id} to={link} className="home-author">
                  <div className="home-author__portrait">
                    {photo
                      ? <img src={photo} alt={name} className="home-author__photo" loading="lazy" decoding="async" />
                      : <span className="home-author__initials">{initials}</span>}
                    {booksCount > 0 && (
                      <span className="home-author__books-count">{booksCount} {t('home.booksShort', 'livres')}</span>
                    )}
                    {author.is_registered && (
                      <span className="home-author__verified" aria-label={t('home.registeredOnFrollot', 'Inscrit sur Frollot')}>
                        <i className="fas fa-check-circle" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="home-author__info">
                    <h3 className="home-author__name">{name}</h3>
                    {genre && <div className="home-author__genre">{genre}</div>}
                    {bio && <div className="home-author__bio">{bio.length > 60 ? bio.slice(0, 60) + '...' : bio}</div>}
                    <div className="home-author__meta-row">
                      {followers > 0 && (
                        <span className="home-author__followers"><i className="fas fa-users" /> {followers}</span>
                      )}
                      {author.created_at && (
                        <span className="home-author__since">
                          {t('home.authorSince', 'Depuis')} {new Date(author.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </RevealSection>
      )}

      {/* ── Organisations section ── */}
      {organizations.length > 0 && (
        <RevealSection className="home-section">
          <div className="home-section__head">
            <div>
              <div className="home-section__eyebrow">— 08 · {t('home.ecosystem', 'Écosystème')}</div>
              <h2 className="home-section__title">{t('home.orgTitle', 'Organisations')}</h2>
            </div>
            <Link to="/organizations" className="home-section__link">{t('common.discover', 'Découvrir')} →</Link>
          </div>
          <div className="home-orgs-grid">
            {organizations.map(org => {
              const typeIcon = org.org_type === 'LIBRAIRIE' ? 'fa-store'
                : org.org_type === 'BIBLIOTHEQUE' ? 'fa-landmark'
                : org.org_type === 'IMPRIMERIE' ? 'fa-print' : 'fa-book-open';
              return (
                <Link key={org.id} to={`/organizations/${org.slug}`} className="home-org-card">
                  <div className="home-org-card__logo">
                    {org.logo
                      ? <img src={org.logo} alt={org.name} />
                      : <i className={`fas ${typeIcon}`} aria-hidden="true" />}
                  </div>
                  <div className="home-org-card__body">
                    <h3>{org.name} {org.is_verified && <i className="fas fa-check-circle home-org-card__verified" aria-label={t('common.verified', 'Vérifié')} />}</h3>
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

      {/* ── Services ── */}
      <RevealSection className="home-section">
        <div className="home-section__head">
          <div>
            <div className="home-section__eyebrow">— 09 · {t('nav.services', 'Services')}</div>
            <h2 className="home-section__title">{t('home.proServices', 'Services professionnels')}</h2>
          </div>
          <Link to="/services" className="home-section__link">{t('common.discover', 'Découvrir')} →</Link>
        </div>
        <div className="home-services-grid">
          {SERVICES_SHOWCASE.map(s => (
            <Link key={s.type} to={`/services?type=${s.type}`} className="home-service-card" style={{ '--_svc-color': s.color }}>
              <div className="home-service-card__icon" style={{ background: s.color }}>
                <i className={s.icon} aria-hidden="true" />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </Link>
          ))}
        </div>
      </RevealSection>

      {/* ── Témoignages ── */}
      <TestimonialsSection testimonials={testimonials} />

      {/* ── Footer fade ── */}
      <div className="home-footer-fade" />

      {/* ── FAB mobile ── */}
      {createPortal(
        <button
          className="sidebar-fab"
          onClick={openSidebar}
          aria-label={t('home.openPanel', 'Ouvrir le panneau')}
        >
          <i className="fas fa-layer-group" />
        </button>,
        document.body
      )}
    </div>
  );
};

export default Home;
