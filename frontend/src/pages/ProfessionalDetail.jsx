import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/ProfessionalDetail.css';

const StarRating = ({ rating, size = '0.85rem' }) => (
  <span className="pd-stars" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map(n => <i key={n} className={`fa${n <= Math.round(rating) ? 's' : 'r'} fa-star`} />)}
  </span>
);

const ROLE_ICONS = {
  CORRECTEUR: 'fas fa-spell-check',
  ILLUSTRATEUR: 'fas fa-palette',
  TRADUCTEUR: 'fas fa-language',
  AUTEUR: 'fas fa-pen-fancy',
  EDITEUR: 'fas fa-book-open',
  LIVREUR: 'fas fa-truck',
};

const ProfessionalDetail = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [pro, setPro] = useState(null);
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    organizationService.getProfessional(slug)
      .then(res => setPro(res.data))
      .catch(() => setPro(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!pro || activeTab !== 'reviews' || reviews) return;
    organizationService.getProfessionalReviews(slug)
      .then(res => setReviews(res.data))
      .catch(() => setReviews({ results: [], count: 0 }));
  }, [activeTab, pro, slug, reviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await organizationService.createProfessionalReview(slug, { rating: reviewRating, comment: reviewComment });
      toast.success(t('pages.proDetail.reviewSent'));
      setReviewComment('');
      setReviewRating(5);
      const [revRes, proRes] = await Promise.all([
        organizationService.getProfessionalReviews(slug),
        organizationService.getProfessional(slug),
      ]);
      setReviews(revRes.data);
      setPro(proRes.data);
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || t('pages.proDetail.reviewError'));
    }
    setSubmittingReview(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (!pro) return <div className="pd-not-found"><h2>{t('pages.proDetail.notFound')}</h2><Link to="/professionals">{t('pages.proDetail.backToDirectory')}</Link></div>;

  const metadata = pro.metadata || {};
  const roleIcon = ROLE_ICONS[pro.profile_type] || 'fas fa-user';
  const initials = (pro.user_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { key: 'services', label: t('pages.proDetail.tabServices'), icon: 'fas fa-briefcase' },
    { key: 'portfolio', label: t('pages.proDetail.tabPortfolio'), icon: 'fas fa-images' },
    { key: 'reviews', label: t('pages.proDetail.tabReviews'), icon: 'fas fa-star' },
    { key: 'availability', label: t('pages.proDetail.tabAvailability'), icon: 'fas fa-calendar-check' },
  ];

  return (
    <div className="pd">
      <SEO title={`${pro.user_name} — ${pro.profile_type_display}`} description={pro.bio?.slice(0, 160)} />

      {/* ═══ COUVERTURE (style Facebook, comme OrganizationDetail) ═══ */}
      <div className="pd-cover" style={pro.cover_image ? { backgroundImage: `url(${pro.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="pd-cover__gradient" />
      </div>

      {/* ═══ PROFIL HEADER ═══ */}
      <div className="pd-profile">
        <div className="pd-profile__inner">
          {/* Logo/Avatar circulaire chevauchant la couverture */}
          <div className="pd-profile__logo">
            {pro.avatar
              ? <img src={pro.avatar} alt={pro.user_name} />
              : <span className="pd-profile__initials">{initials}</span>
            }
            {pro.is_verified && (
              <div className="pd-profile__badge"><i className="fas fa-check" aria-hidden="true" /></div>
            )}
          </div>

          <div className="pd-profile__info">
            <div className="pd-profile__name-row">
              <h1>{pro.user_name}</h1>
              {pro.is_verified && <span className="pd-profile__verified"><i className="fas fa-circle-check" /></span>}
            </div>
            <div className="pd-profile__meta">
              <span className="pd-profile__type"><i className={roleIcon} /> {pro.profile_type_display}</span>
              {(pro.city || pro.country) && <span><i className="fas fa-map-marker-alt" /> {[pro.city, pro.country].filter(Boolean).join(', ')}</span>}
              {pro.completed_projects > 0 && <span><i className="fas fa-check-double" /> {pro.completed_projects} {t('pages.proDetail.completedProjects')}</span>}
            </div>
            {pro.bio && <p className="pd-profile__tagline">{pro.bio}</p>}
          </div>

          <div className="pd-profile__actions">
            <Link to={`/inquiries/new?profile=${pro.id}`} className="pd-btn pd-btn--primary">
              <i className="fas fa-envelope" /> {t('pages.proDetail.contact')}
            </Link>
            {pro.services?.length > 0 && (
              <Link to={`/services/${pro.services[0].slug || pro.services[0].id}`} className="pd-btn pd-btn--secondary">
                <i className="fas fa-file-invoice" /> {t('pages.proDetail.requestQuote')}
              </Link>
            )}
          </div>
        </div>

        {/* Stats bar premium — même style que OrganizationDetail */}
        <div className="pd-profile__stats">
          <div className="pd-profile__stat">
            <strong>{parseFloat(pro.avg_rating || 0).toFixed(1)}</strong>
            <span><StarRating rating={parseFloat(pro.avg_rating || 0)} size=".7rem" /> ({pro.review_count} {t('pages.proDetail.reviews')})</span>
          </div>
          <div className="pd-profile__stat">
            <strong>{pro.completed_projects || 0}</strong>
            <span><i className="fas fa-check-double" style={{ marginRight: 3 }} /> {t('pages.proDetail.completedProjects')}</span>
          </div>
          {(pro.avg_response_days) && (
            <div className="pd-profile__stat">
              <strong>~{pro.avg_response_days}j</strong>
              <span><i className="fas fa-clock" style={{ marginRight: 3 }} /> {t('pages.proDetail.avgDelay')}</span>
            </div>
          )}
          <div className="pd-profile__stat">
            <strong>{pro.listings_count || pro.services?.length || 0}</strong>
            <span><i className="fas fa-briefcase" style={{ marginRight: 3 }} /> {t('pages.proDetail.tabServices')}</span>
          </div>
        </div>
      </div>

      {/* ═══ TABS — Sticky, pleine largeur (comme OrganizationDetail) ═══ */}
      <div className="pd-tabs">
        <div className="pd-tabs__inner">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`pd-tabs__btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <i className={tab.icon} aria-hidden="true" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ BODY — pleine largeur avec padding ═══ */}
      <div className="pd-body">

        {/* Services */}
        {activeTab === 'services' && (
          (!pro.services || pro.services.length === 0) ? (
            <div className="pd-empty"><i className="fas fa-briefcase" /><p>{t('pages.proDetail.noServices')}</p></div>
          ) : (
            <div className="pd-grid">
              {pro.services.map(s => (
                <Link key={s.id} to={`/services/${s.slug || s.id}`} className="pd-cell pd-sv-card">
                  <div className="pd-sv-card__header">
                    <span className="pd-sv-card__type">{s.service_type_display || s.service_type}</span>
                    {s.languages?.length > 0 && (
                      <div className="pd-sv-card__langs">
                        {s.languages.map((l, i) => <span key={i} className="pd-tag pd-tag--sm">{l}</span>)}
                      </div>
                    )}
                  </div>
                  <h3>{s.title}</h3>
                  <p className="pd-cell__text">{s.description?.slice(0, 140)}{s.description?.length > 140 ? '...' : ''}</p>
                  <div className="pd-sv-card__footer">
                    <span className="pd-sv-card__price">{parseInt(s.base_price).toLocaleString()} FCFA <small>/ {s.price_type_display || s.price_type}</small></span>
                    <span className="pd-sv-card__delay"><i className="fas fa-clock" /> {s.turnaround_days}j</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Portfolio */}
        {activeTab === 'portfolio' && (
          pro.services?.some(s => s.portfolio_samples?.length > 0) ? (
            <div className="pd-portfolio-grid">
              {pro.services.flatMap(s => (s.portfolio_samples || []).map((sample, i) => (
                <div key={`${s.id}-${i}`} className="pd-cell pd-portfolio-item">
                  {typeof sample === 'string' && sample.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={sample} alt={`Portfolio ${i + 1}`} loading="lazy" />
                  ) : (
                    <div className="pd-portfolio-item__text"><i className="fas fa-file-alt" /><p>{typeof sample === 'string' ? sample : JSON.stringify(sample)}</p></div>
                  )}
                </div>
              )))}
            </div>
          ) : (
            <div className="pd-empty"><i className="fas fa-images" /><p>{t('pages.proDetail.noPortfolio')}</p></div>
          )
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <>
            {user && (
              <div className="pd-cell pd-review-form">
                <h2><i className="fas fa-pen" /> {t('pages.proDetail.leaveReview')}</h2>
                <form onSubmit={handleSubmitReview}>
                  <div className="pd-review-form__stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" className={`pd-star-btn ${n <= reviewRating ? 'active' : ''}`} onClick={() => setReviewRating(n)}>
                        <i className="fas fa-star" />
                      </button>
                    ))}
                  </div>
                  <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder={t('pages.proDetail.reviewPlaceholder')} rows={3} />
                  <button type="submit" className="pd-btn pd-btn--primary" disabled={submittingReview}>
                    {submittingReview ? <><i className="fas fa-spinner fa-spin" /> {t('pages.proDetail.sending')}</> : <><i className="fas fa-paper-plane" /> {t('pages.proDetail.send')}</>}
                  </button>
                </form>
              </div>
            )}

            {!reviews ? (
              <div className="dashboard-loading"><div className="admin-spinner" /></div>
            ) : reviews.results?.length === 0 ? (
              <div className="pd-empty"><i className="fas fa-star" /><p>{t('pages.proDetail.noReviews')}</p></div>
            ) : (
              <div className="pd-reviews-list">
                {reviews.results.map(r => (
                  <div key={r.id} className="pd-cell pd-review-card">
                    <div className="pd-review-card__top">
                      <div className="pd-review-card__avatar">{(r.user_name || '?')[0].toUpperCase()}</div>
                      <div className="pd-review-card__info">
                        <strong>{r.user_name}</strong>
                        <StarRating rating={r.rating} size=".75rem" />
                      </div>
                      <time className="pd-review-card__date">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                    </div>
                    {r.comment && <p className="pd-cell__text">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Availability */}
        {activeTab === 'availability' && (
          <div className="pd-grid pd-grid--2">
            <div className="pd-cell">
              <h2><i className="fas fa-signal" /> {t('pages.proDetail.status')}</h2>
              <div className="pd-avail-status">
                <span className="pd-avail-dot" />
                <span>{metadata.availability || t('pages.proDetail.available')}</span>
              </div>
            </div>
            {metadata.languages && (
              <div className="pd-cell">
                <h2><i className="fas fa-language" /> {t('pages.proDetail.languages')}</h2>
                <div className="pd-tags">
                  {(Array.isArray(metadata.languages) ? metadata.languages : [metadata.languages]).map((l, i) => (
                    <span key={i} className="pd-tag">{l}</span>
                  ))}
                </div>
              </div>
            )}
            {metadata.zones && (
              <div className="pd-cell">
                <h2><i className="fas fa-map-marked-alt" /> {t('pages.proDetail.coverageZones')}</h2>
                <div className="pd-tags">
                  {(Array.isArray(metadata.zones) ? metadata.zones : [metadata.zones]).map((z, i) => (
                    <span key={i} className="pd-tag">{z}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalDetail;
