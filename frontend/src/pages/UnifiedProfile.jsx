import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import socialService from '../services/socialService';
import { authAPI } from '../services/api';
import aiService from '../services/aiService';
import LoadingSpinner from '../components/LoadingSpinner';
import SEO from '../components/SEO';
import CountryFlag from '../components/CountryFlag';
import '../styles/UnifiedProfile.css';

const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const ORG_ICONS = { BIBLIOTHEQUE: 'fa-landmark', LIBRAIRIE: 'fa-store', IMPRIMERIE: 'fa-print', MAISON_EDITION: 'fa-book-open' };

const UnifiedProfile = () => {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [aiBio, setAiBio] = useState(null);
  const [aiBioLoading, setAiBioLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await socialService.getPublicProfile(slug);
        setProfile(data);
        if (isAuthenticated && data.id) {
          socialService.getFollowStatus({ user_id: data.id })
            .then(r => setIsFollowing(r.data?.follows_user || false))
            .catch(() => {});
        }
      } catch {
        setError(t('common.notFound', 'Profil introuvable'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, isAuthenticated]);

  const handleFollow = useCallback(async () => {
    if (!isAuthenticated || !profile) return;
    setFollowLoading(true);
    try {
      await socialService.followUser(profile.id);
      setIsFollowing(prev => !prev);
      setProfile(prev => ({ ...prev, followers_count: prev.followers_count + (isFollowing ? -1 : 1) }));
    } catch { /* best-effort */ }
    finally { setFollowLoading(false); }
  }, [isAuthenticated, profile, isFollowing]);

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !profile) {
    return (
      <div className="profile-page">
        <div className="p-empty" style={{ margin: '80px auto', maxWidth: 500 }}>
          <div className="p-empty-glyph"><i className="fas fa-user-slash" /></div>
          <div className="p-empty-title">{error || t('common.notFound')}</div>
          <div className="p-empty-sub">{t('profile.errorDesc', 'Ce profil n\'existe pas ou a été supprimé.')}</div>
          <Link to="/" className="p-empty-cta"><i className="fas fa-arrow-left" /> {t('common.backHome', 'Retour')}</Link>
        </div>
      </div>
    );
  }

  const isSelf = currentUser && currentUser.id === profile.id;
  const bio = profile.profiles.find(p => p.bio)?.bio;
  const today = DAYS_FR[new Date().getDay()];
  const initials = profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const nameParts = profile.full_name.split(' ');
  const hasContent = profile.author_books.length > 0 || profile.services.length > 0 || profile.organizations.length > 0 || profile.recent_posts.length > 0;

  return (
    <div className="profile-page">
      <SEO title={`${profile.full_name} — Frollot`} />

      {/* ═══════════ HERO ═══════════ */}
      <section className="p-hero">
        <div className="p-hero-grid">
          <div className="p-hero-avatar">
            {profile.profile_image
              ? <img src={profile.profile_image} alt={profile.full_name} />
              : initials}
          </div>
          <div className="p-hero-info">
            <h1 className="p-hero-name">
              {nameParts.map((w, i) => i === nameParts.length - 1 ? <em key={i}>{w}</em> : <span key={i}>{w} </span>)}
            </h1>
            <div className="p-hero-handle">@{profile.slug}</div>
            <div className="p-hero-badges">
              {profile.profiles.map(p => (
                <span key={p.profile_type} className={`p-hero-badge ${p.is_verified ? 'p-hero-badge--verified' : ''}`}>
                  {p.profile_type_display}
                </span>
              ))}
            </div>
            <div className="p-hero-meta">
              {(profile.city || profile.country) && (
                <span><CountryFlag country={profile.country} size={16} /> <i className="fas fa-map-marker-alt" /> {[profile.city, profile.country].filter(Boolean).join(', ')}</span>
              )}
              {profile.city && <span className="p-hero-dot" />}
              <span>{t('profile.memberSince', 'Membre depuis')} {new Date(profile.date_joined).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="p-hero-stats">
              <div className="p-hero-stat">
                <div className="p-hero-stat__num">{profile.followers_count}</div>
                <div className="p-hero-stat__label">{t('profile.followers', 'Abonnés')}</div>
              </div>
              <div className="p-hero-stat">
                <div className="p-hero-stat__num">{profile.following_count}</div>
                <div className="p-hero-stat__label">{t('profile.following', 'Abonnements')}</div>
              </div>
              <div className="p-hero-stat">
                <div className="p-hero-stat__num">{profile.posts_count}</div>
                <div className="p-hero-stat__label">{t('profile.posts', 'Publications')}</div>
              </div>
              {profile.author && (
                <div className="p-hero-stat">
                  <div className="p-hero-stat__num"><em>{profile.author.books_count}</em></div>
                  <div className="p-hero-stat__label">{t('profile.booksLabel', 'Livres')}</div>
                </div>
              )}
              {profile.organizations.length > 0 && (
                <div className="p-hero-stat">
                  <div className="p-hero-stat__num"><em>{profile.organizations.length}</em></div>
                  <div className="p-hero-stat__label">{t('profile.orgsLabel', 'Organisations')}</div>
                </div>
              )}
            </div>
          </div>
          <div className="p-hero-actions">
            {!isSelf && isAuthenticated && (
              <button className={`p-btn-follow ${isFollowing ? 'p-btn-follow--following' : ''}`} onClick={handleFollow} disabled={followLoading}>
                {isFollowing ? t('profile.unfollowLabel', 'Abonné·e') : <><i className="fas fa-plus" style={{ fontSize: 11 }} /> {t('profile.follow', 'Suivre')}</>}
              </button>
            )}
            {isSelf && (
              <Link to="/dashboard/settings" className="p-btn-follow p-btn-follow--following">
                <i className="fas fa-pen" style={{ fontSize: 11 }} /> {t('profile.editProfile', 'Modifier')}
              </Link>
            )}
            <div className="p-hero-icons">
              <button className="p-btn-icon" title={t('profile.message', 'Message')}><i className="fas fa-comment" /></button>
              <button className="p-btn-icon" title={t('profile.share', 'Partager')}><i className="fas fa-share-alt" /></button>
            </div>
          </div>
        </div>
        <div className="p-hero-foot">
          <span>— {t('profile.publicProfile', 'Profil public')} · frollot.africa/u/{profile.slug}</span>
          <span>{t('profile.memberSince', 'Membre depuis')} {new Date(profile.date_joined).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</span>
        </div>
      </section>

      {/* ═══════════ BIO ═══════════ */}
      {(bio || isSelf) && (
        <section className="p-bio">
          {(aiBio ? aiBio : bio) ? (
            <div>
              <div className="p-bio-quote">
                <span className="p-bio-drop">{(aiBio || bio).charAt(0)}</span>
                {(aiBio || bio).slice(1)}
              </div>
              <div className="p-bio-sig">
                <span>— {aiBio ? 'Suggestion IA' : t('profile.personalManifesto', 'Manifeste personnel')}</span>
                <span className="right">{profile.full_name}</span>
              </div>
            </div>
          ) : isSelf && (
            <div className="p-bio-empty">
              <i className="fas fa-feather-pointed" />
              <span>Vous n'avez pas encore de bio.</span>
            </div>
          )}
          {isSelf && (
            <div className="p-bio-ai">
              {!aiBio ? (
                <button className="p-bio-ai__btn" disabled={aiBioLoading} onClick={async () => {
                  setAiBioLoading(true);
                  try {
                    const { bio: generated } = await aiService.generateBio();
                    setAiBio(generated);
                  } catch { toast.error('Impossible de générer la bio'); }
                  finally { setAiBioLoading(false); }
                }}>
                  {aiBioLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-wand-magic-sparkles" />}
                  <span>{bio ? 'Regénérer ma bio avec l\'IA' : 'Générer ma bio avec l\'IA'}</span>
                </button>
              ) : (
                <div className="p-bio-ai__actions">
                  <button className="p-bio-ai__btn p-bio-ai__btn--apply" onClick={async () => {
                    try {
                      await authAPI.updateProfile({ bio: aiBio });
                      setProfile(prev => {
                        const profiles = prev.profiles.map(p => p.bio !== undefined ? { ...p, bio: aiBio } : p);
                        if (!profiles.some(p => p.bio)) profiles[0] = { ...profiles[0], bio: aiBio };
                        return { ...prev, profiles };
                      });
                      setAiBio(null);
                      toast.success('Bio mise à jour');
                    } catch { toast.error('Erreur lors de la sauvegarde'); }
                  }}>
                    <i className="fas fa-check" /> Appliquer
                  </button>
                  <button className="p-bio-ai__btn" onClick={() => setAiBio(null)}>
                    <i className="fas fa-times" /> Annuler
                  </button>
                  <button className="p-bio-ai__btn" disabled={aiBioLoading} onClick={async () => {
                    setAiBioLoading(true);
                    try {
                      const { bio: generated } = await aiService.generateBio();
                      setAiBio(generated);
                    } catch { toast.error('Impossible de regénérer'); }
                    finally { setAiBioLoading(false); }
                  }}>
                    {aiBioLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-rotate" />}
                    <span>Autre suggestion</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ═══════════ PUBLICATIONS ═══════════ */}
      {profile.author_books.length > 0 && (
        <section className="p-section">
          <div className="p-section-head">
            <div className="p-section-head__left">
              <div className="p-section-eyebrow">{t('profile.publications', 'Publications')}</div>
              <h2 className="p-section-title">
                {profile.author_books.length} <em>{profile.author_books.length > 1 ? t('profile.booksLabel', 'livres') : t('profile.bookSingle', 'livre')}</em>{t('profile.published', ', et bientôt davantage.')}
              </h2>
            </div>
            {profile.author && profile.author.books_count > 4 && (
              <Link to={`/authors/${profile.author.id}`} className="p-see-all">
                {t('common.seeAll', 'Tout voir')} ({profile.author.books_count}) →
              </Link>
            )}
          </div>
          <div className="p-pubs">
            {profile.author_books.map(book => (
              <Link key={book.id} to={`/books/${book.id}`} className="p-pub">
                <div className="p-pub-cover">
                  <img src={book.cover_image || '/images/default-book-cover.svg'} alt={book.title} loading="lazy" />
                </div>
                <div className="p-pub-info">
                  {book.category_name && <div className="p-pub-cat">{book.category_name}</div>}
                  <h3 className="p-pub-title">{book.title}</h3>
                  <div className="p-pub-foot">
                    {book.price && <span className="p-pub-price">{parseFloat(book.price).toLocaleString(locale)} {t('common.currency', 'FCFA')}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ SERVICES ═══════════ */}
      {profile.services.length > 0 && (
        <section className="p-section p-section--sunk">
          <div className="p-section-head">
            <div className="p-section-head__left">
              <div className="p-section-eyebrow">{t('profile.professionalServices', 'Services professionnels')}</div>
              <h2 className="p-section-title">{t('profile.whatTheyOffer', 'Ce qu\'il')} <em>{t('profile.offers', 'propose')}</em>.</h2>
              <div className="p-section-sub">{t('profile.pricesInCFA', 'Tarifs en francs CFA. Devis personnalisé sur demande.')}</div>
            </div>
          </div>
          <div className="p-services">
            {profile.services.map(svc => (
              <Link key={svc.id} to={`/services/${svc.slug}`} className="p-service">
                <div className="p-service-icon"><i className="fas fa-pen-nib" /></div>
                <div className="p-service-info">
                  <div className="p-service-title">{svc.title}</div>
                  {svc.description && <div className="p-service-desc">{svc.description}</div>}
                </div>
                {svc.turnaround_days && (
                  <div className="p-service-delay"><i className="fas fa-clock" style={{ marginRight: 4, fontSize: 10 }} /> {svc.turnaround_days} {t('common.days', 'jours')}</div>
                )}
                <div className="p-service-price">
                  {svc.base_price && (
                    <>
                      <div className="p-service-price__num">{parseFloat(svc.base_price).toLocaleString(locale)}</div>
                      <div className="p-service-price__cur">{t('common.currency', 'FCFA')}</div>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ ORGANISATIONS ═══════════ */}
      {profile.organizations.length > 0 && (
        <section className="p-section">
          <div className="p-section-head">
            <div className="p-section-head__left">
              <div className="p-section-eyebrow">{t('profile.organizations', 'Organisations')}</div>
              <h2 className="p-section-title">
                {profile.organizations.length} <em>{profile.organizations.length > 1 ? t('profile.houses', 'maisons') : t('profile.house', 'maison')}</em>, {t('profile.oneVocation', 'une vocation')}.
              </h2>
            </div>
          </div>
          <div className="p-orgs">
            {profile.organizations.map(org => {
              const todaySlot = org.business_hours?.[today];
              const isOpen = todaySlot && todaySlot.open;
              const orgInitials = org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <article key={org.id} className="p-org">
                  <header className="p-org-head">
                    <div className="p-org-logo">
                      {org.logo ? <img src={org.logo} alt="" /> : orgInitials}
                    </div>
                    <div className="p-org-info">
                      <div className="p-org-type">{org.org_type_display}</div>
                      <div className="p-org-name">
                        {org.name}
                        {org.is_verified && <span className="p-org-verif">✓</span>}
                      </div>
                    </div>
                    <Link to={`/organizations/${org.slug}`} className="p-org-go">
                      {t('profile.viewPage', 'Voir la page')} →
                    </Link>
                  </header>
                  <div className="p-org-meta">
                    {org.city && (
                      <div className="p-org-meta-cell">
                        <i className="fas fa-map-marker-alt" />
                        <span className="p-val">{org.city}{org.country ? `, ${org.country}` : ''}</span>
                      </div>
                    )}
                    {todaySlot && (
                      <div className="p-org-meta-cell">
                        <span className={`p-org-dot-status ${!isOpen ? 'p-org-dot-status--closed' : ''}`} />
                        <span className="p-val" style={{ fontStyle: 'italic' }}>
                          {isOpen ? `${t('profile.open', 'Ouvert')} · ${todaySlot.open} — ${todaySlot.close}` : t('profile.closedToday', 'Fermé aujourd\'hui')}
                        </span>
                      </div>
                    )}
                    {org.phone_number && (
                      <div className="p-org-meta-cell">
                        <i className="fas fa-phone" />
                        <span className="p-val p-val--mono">{org.phone_number}</span>
                      </div>
                    )}
                    {org.email && (
                      <div className="p-org-meta-cell">
                        <i className="fas fa-envelope" />
                        <span className="p-val p-val--mono">{org.email}</span>
                      </div>
                    )}
                  </div>
                  {org.short_description && <div className="p-org-desc">« {org.short_description} »</div>}
                  {org.recent_books.length > 0 && (
                    <div className="p-org-catalog">
                      <div className="p-org-catalog-head">
                        <div className="p-org-catalog-label">{t('profile.inCatalog', 'Au catalogue')}</div>
                        <Link to={`/organizations/${org.slug}`} className="p-see-all" style={{ fontSize: 12 }}>
                          {t('profile.viewFullCatalog', 'Voir tout le catalogue')} →
                        </Link>
                      </div>
                      <div className="p-org-catalog-strip">
                        {org.recent_books.map(book => (
                          <Link key={book.id} to={`/books/${book.id}`} className="p-org-mini">
                            <div className="p-org-mini-cover">
                              <img src={book.cover_image || '/images/default-book-cover.svg'} alt={book.title} loading="lazy" />
                            </div>
                            <div>
                              <div className="p-org-mini-title">{book.title}</div>
                              {book.author_name && <div className="p-org-mini-author">{book.author_name}</div>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════ ACTIVITÉ ═══════════ */}
      {profile.recent_posts.length > 0 && (
        <section className="p-section p-section--sunk">
          <div className="p-section-head">
            <div className="p-section-head__left">
              <div className="p-section-eyebrow">{t('profile.recentActivity', 'Activité récente')}</div>
              <h2 className="p-section-title">{t('profile.whatTheyDid', 'Ce qu\'il')} <em>{t('profile.didRecently', 'a fait')}</em> {t('profile.recently', 'ces derniers jours')}.</h2>
            </div>
          </div>
          <div className="p-timeline">
            {profile.recent_posts.map(post => (
              <div key={post.id} className="p-activity">
                <div className="p-activity-icon">
                  <i className={`fas ${post.post_type === 'REVIEW' ? 'fa-star' : post.post_type === 'RECOMMENDATION' ? 'fa-heart' : 'fa-feather'}`} />
                </div>
                <div className="p-activity-head">
                  <div className="p-activity-label">
                    {post.post_type === 'REVIEW' && <>{t('profile.postedReview', 'A publié un avis sur')} </>}
                    {post.post_type === 'RECOMMENDATION' && <>{t('profile.recommends', 'Recommande')} </>}
                    {post.post_type !== 'REVIEW' && post.post_type !== 'RECOMMENDATION' && <>{t('profile.published', 'A publié')} </>}
                    {post.book_title && <em>« {post.book_title} »</em>}
                  </div>
                  <div className="p-activity-date">
                    {new Date(post.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                  </div>
                </div>
                {post.content && (
                  <div className="p-activity-body">{post.content}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ EMPTY STATE ═══════════ */}
      {!hasContent && (
        <section className="p-section">
          <div className="p-empty">
            <div className="p-empty-glyph"><i className="fas fa-seedling" /></div>
            <div className="p-empty-title">« {t('profile.emptyQuote1', 'Une plume, un livre, un club.')} <em>{t('profile.emptyQuote2', 'Tout commence par un premier pas.')}</em> »</div>
            <div className="p-empty-sub">{profile.full_name.split(' ')[0]} {t('profile.emptyDesc', 'n\'a encore rien publié. Suivez son profil pour être au courant dès qu\'il partagera quelque chose.')}</div>
            {!isSelf && isAuthenticated && (
              <button className="p-empty-cta" onClick={handleFollow}>
                <i className="fas fa-plus" /> {t('profile.follow', 'Suivre')} {profile.full_name.split(' ')[0]}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="p-foot">
        <div className="p-foot-top">
          <div className="p-foot-brand">Frollot<em>.</em></div>
          <div className="p-foot-tagline">{t('profile.footerTagline', 'lettres d\'Afrique francophone')}</div>
        </div>
        <div className="p-foot-bot">
          <span>© {new Date().getFullYear()} · Frollot · Libreville</span>
          <span>— {t('profile.footerLinks', 'Mentions · CGU · Confidentialité')}</span>
        </div>
      </footer>
    </div>
  );
};

export default UnifiedProfile;
