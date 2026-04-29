import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import manuscriptService from '../services/manuscriptService';
import organizationService from '../services/organizationService';
import AFRICAN_COUNTRIES, { matchCountryName, getDialCodeByCountry } from '../constants/africanCountries';
import '../styles/SubmitManuscript.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import CountryFlag from '../components/CountryFlag';
import useGeoIP, { ISO_TO_COUNTRY_NAME } from '../hooks/useGeoIP';

const GENRE_OPTIONS = [
  { value: 'ROMAN', label: 'Roman' },
  { value: 'NOUVELLE', label: 'Nouvelle / Recueil de nouvelles' },
  { value: 'POESIE', label: 'Poésie' },
  { value: 'ESSAI', label: 'Essai' },
  { value: 'THEATRE', label: 'Théâtre' },
  { value: 'JEUNESSE', label: 'Littérature jeunesse' },
  { value: 'BD', label: 'Bande dessinée' },
  { value: 'AUTRE', label: 'Autre' },
];

const LANGUAGE_OPTIONS = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'Anglais' },
  { value: 'AR', label: 'Arabe' },
  { value: 'PT', label: 'Portugais' },
  { value: 'ES', label: 'Espagnol' },
  { value: 'AUTRE', label: 'Autre' },
];

const SubmitManuscript = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthor = user?.profile_types?.includes('AUTEUR');

  const preselectedOrg = searchParams.get('org');
  const [step, setStep] = useState(preselectedOrg ? 'form' : 'choose');
  const [submissionMode, setSubmissionMode] = useState(preselectedOrg ? 'specific' : null);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Recherche éditeurs
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [previewOrg, setPreviewOrg] = useState(null);

  const [formData, setFormData] = useState({
    title: '', author_name: '', pen_name: '', email: '', phone_local: '',
    dial_code: '', country: '', genre: 'ROMAN', language: 'FR', page_count: '',
    description: '', terms_accepted: false,
  });
  const [dialCodeManual, setDialCodeManual] = useState(false);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  // Pré-remplir les champs depuis le compte utilisateur
  useEffect(() => {
    if (!user) return;
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const matched = matchCountryName(user.country);
    const dialCode = matched?.dialCode || '';
    let phoneLocal = user.phone_number || '';
    if (dialCode && phoneLocal.startsWith(dialCode)) {
      phoneLocal = phoneLocal.slice(dialCode.length);
    }
    setFormData(prev => ({
      ...prev,
      author_name: fullName,
      email: user.email || '',
      country: matched?.name || '',
      dial_code: dialCode,
      phone_local: phoneLocal.replace(/\D/g, ''),
    }));
  }, [user]);

  // Fallback géolocalisation IP si pays non renseigné
  const geoIP = useGeoIP();
  useEffect(() => {
    if (geoIP && !formData.country) {
      const countryName = ISO_TO_COUNTRY_NAME[geoIP.country] || '';
      if (countryName) {
        const matched = matchCountryName(countryName);
        if (matched) {
          setFormData(prev => ({
            ...prev,
            country: matched.name,
            dial_code: prev.dial_code || matched.dialCode || '',
          }));
        }
      }
    }
  }, [geoIP, formData.country]);

  // Charger la maison présélectionnée depuis l'URL
  useEffect(() => {
    if (preselectedOrg) {
      organizationService.getStorefront(preselectedOrg)
        .then(res => setSelectedOrg(res.data))
        .catch(() => {});
    }
  }, [preselectedOrg]);

  // Un seul appel : annuaire des maisons d'édition qui acceptent les manuscrits
  const fetchOrgs = useCallback(() => {
    if (step !== 'select-org') return;
    setLoadingOrgs(true);
    const params = { type: 'MAISON_EDITION', accepting_manuscripts: 'true', ordering: 'rating' };
    if (searchQuery) params.search = searchQuery;
    if (searchCity) params.city = searchCity;
    organizationService.getDirectory(params)
      .then(res => setOrgs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrgs([]))
      .finally(() => setLoadingOrgs(false));
  }, [step, searchQuery, searchCity]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  // Debounce recherche
  const [searchTimer, setSearchTimer] = useState(null);
  const handleSearchChange = (value, setter) => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setter(value), 400);
    setSearchTimer(timer);
  };

  // Identifier les orgs recommandées (genre match)
  const isRecommended = (org) =>
    org.accepted_genres && org.accepted_genres.includes(formData.genre);

  // Trier : recommandées d'abord
  const sortedOrgs = [...orgs].sort((a, b) => {
    const aRec = isRecommended(a) ? 1 : 0;
    const bRec = isRecommended(b) ? 1 : 0;
    return bRec - aRec;
  });

  // Preview détail éditeur
  const openPreview = (org) => {
    setPreviewOrg(org);
    organizationService.getStorefront(org.slug)
      .then(res => setPreviewOrg(res.data))
      .catch(() => {});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'phone_local') {
      const digits = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, phone_local: digits }));
      if (fieldErrors.phone_number) setFieldErrors(p => ({ ...p, phone_number: null }));
      return;
    }
    if (name === 'country') {
      const newDial = getDialCodeByCountry(value);
      setFormData(prev => ({
        ...prev,
        country: value,
        ...((!dialCodeManual && newDial) ? { dial_code: newDial } : {}),
      }));
      if (fieldErrors.country) setFieldErrors(p => ({ ...p, country: null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: null }));
  };

  const validatePhone = (local) => local.replace(/\D/g, '').length >= 6;
  const descWordCount = formData.description.trim() ? formData.description.trim().split(/\s+/).length : 0;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setError(t('pages.submitManuscript.invalidFormat'));
      setFile(null); setFileName(''); return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(t('pages.submitManuscript.fileTooLarge'));
      setFile(null); setFileName(''); return;
    }
    setFile(selectedFile); setFileName(selectedFile.name); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setFieldErrors({}); setIsSubmitting(true);

    if (!file) { setError(t('pages.submitManuscript.fileRequired')); setIsSubmitting(false); return; }
    if (!formData.country) { setFieldErrors(p => ({ ...p, country: 'Veuillez sélectionner votre pays.' })); setIsSubmitting(false); return; }
    if (!formData.dial_code) { setFieldErrors(p => ({ ...p, phone_number: 'Veuillez sélectionner un indicatif.' })); setIsSubmitting(false); return; }
    if (!validatePhone(formData.phone_local)) { setFieldErrors(p => ({ ...p, phone_number: 'Le numéro doit contenir au moins 6 chiffres.' })); setIsSubmitting(false); return; }
    if (!formData.pen_name.trim()) { setFieldErrors(p => ({ ...p, pen_name: 'Le nom de plume est obligatoire.' })); setIsSubmitting(false); return; }
    if (!formData.page_count) { setFieldErrors(p => ({ ...p, page_count: 'Le nombre de pages est obligatoire.' })); setIsSubmitting(false); return; }
    if (formData.description.trim().length < 50) { setFieldErrors(p => ({ ...p, description: t('pages.submitManuscript.descMinChars') })); setIsSubmitting(false); return; }
    if (!formData.terms_accepted) { setError(t('pages.submitManuscript.termsRequired')); setIsSubmitting(false); return; }

    const phoneNumber = formData.dial_code + formData.phone_local;

    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('author_name', formData.author_name);
      fd.append('pen_name', formData.pen_name);
      fd.append('email', formData.email);
      fd.append('phone_number', phoneNumber);
      fd.append('country', formData.country);
      fd.append('genre', formData.genre);
      fd.append('language', formData.language);
      if (formData.page_count) fd.append('page_count', formData.page_count);
      fd.append('description', formData.description);
      fd.append('terms_accepted', formData.terms_accepted);
      fd.append('file', file);
      if (submissionMode === 'specific' && selectedOrg) fd.append('target_organization', selectedOrg.id);
      if (submissionMode === 'open') fd.append('is_open_market', 'true');

      const response = await manuscriptService.submitManuscript(fd);
      const data = response?.data?.data ?? response?.data;
      setSubmittedId(data?.id ?? null);
      setSuccess(true);
      setTimeout(() => navigate('/'), 5000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'AUTHOR_PROFILE_REQUIRED') {
        setError(data.detail || t('pages.submitManuscript.authorGateTitle'));
        return;
      }
      if (data && typeof data === 'object' && !data.detail && !data.message && !data.code) {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => { normalized[k] = Array.isArray(v) ? v[0] : v; });
        setFieldErrors(normalized);
        setError(Object.values(normalized)[0] || t('pages.submitManuscript.fixErrors'));
      } else {
        setError(data?.detail || data?.message || t('pages.submitManuscript.submitError'));
      }
    } finally { setIsSubmitting(false); }
  };

  // ── Composant carte éditeur réutilisable ──
  const OrgCard = ({ org, isSelected, onSelect, onPreview, recommended }) => (
    <div className={`ms-org-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(org)}>
      {recommended && <span className="ms-org-card__rec-badge"><i className="fas fa-star" /> {t('pages.submitManuscript.recommended')}</span>}
      <div className="ms-org-card__logo">
        {org.logo ? <img src={org.logo} alt={org.name} /> : <i className="fas fa-building" />}
      </div>
      <div className="ms-org-card__body">
        <h4>{org.name} {org.is_verified && <i className="fas fa-check-circle ms-org-card__verified" />}</h4>
        <p className="ms-org-card__location"><CountryFlag country={org.country} size={14} /> <i className="fas fa-map-marker-alt" /> {org.city || org.country || t('pages.submitManuscript.notSpecified')}</p>
        {org.description && <p className="ms-org-card__desc">{org.description.length > 120 ? org.description.slice(0, 120) + '...' : org.description}</p>}
        <div className="ms-org-card__meta">
          <span><i className="fas fa-star" /> {parseFloat(org.avg_rating || 0).toFixed(1)} ({org.review_count || 0})</span>
          {org.avg_response_days && <span><i className="fas fa-clock" /> ~{org.avg_response_days}j</span>}
        </div>
        {org.accepted_genres && org.accepted_genres.length > 0 && (
          <div className="ms-org-card__genres">
            {org.accepted_genres.slice(0, 4).map(g => {
              const label = GENRE_OPTIONS.find(o => o.value === g)?.label || g;
              return <span key={g} className="ms-org-card__genre-tag">{label}</span>;
            })}
            {org.accepted_genres.length > 4 && <span className="ms-org-card__genre-tag">+{org.accepted_genres.length - 4}</span>}
          </div>
        )}
      </div>
      <div className="ms-org-card__actions">
        <button className="ms-org-card__preview-btn" onClick={(e) => { e.stopPropagation(); onPreview(org); }} title={t('pages.submitManuscript.viewDetails')}>
          <i className="fas fa-info-circle" />
        </button>
        <div className="ms-org-card__check">
          {isSelected ? <i className="fas fa-check-circle" /> : <i className="far fa-circle" />}
        </div>
      </div>
    </div>
  );

  // ═════════════════════════════════
  // Écran succès
  // ═════════════════════════════════
  if (success) {
    return (
      <div className="submit-manuscript-page">
        <SEO title={t('pages.submitManuscript.seoTitle')} />
        <PageHero
          title={t('pages.submitManuscript.successTitle')}
          subtitle={t('pages.submitManuscript.successSub')}
        />
        <div className="submit-manuscript-container success-view">
          <div className="success-card">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h1>{t('pages.submitManuscript.manuscriptReceived')}</h1>
            <p className="success-message">
              {t('pages.submitManuscript.thankYou')}
              {selectedOrg && <> {t('pages.submitManuscript.sentTo', { name: selectedOrg.name })}</>}
              {submissionMode === 'open' && <> {t('pages.submitManuscript.openMarketConfirm')}</>}
              {' '}{t('pages.submitManuscript.contactAt', { email: formData.email })}
            </p>
            <div className="success-details">
              {submittedId && <p className="success-ref"><strong>{t('pages.submitManuscript.reference')} :</strong> MS-{String(submittedId).padStart(5, '0')}</p>}
              <p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {t('pages.submitManuscript.responseDelay')}</p>
            </div>
            <p className="redirect-message">{t('pages.submitManuscript.redirecting')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════
  // Étape 1 : Choix du mode
  // ═════════════════════════════════
  if (step === 'choose') {
    return (
      <div className="submit-manuscript-page">
        <SEO title={t('pages.submitManuscript.seoTitle')} />
        <PageHero
          title={t('pages.submitManuscript.chooseTitle')}
          subtitle={t('pages.submitManuscript.chooseSubtitle')}
        />
        <div className="submit-manuscript-container">
          <div className="ms-choose">
            <div className="ms-choose__card" onClick={() => { setSubmissionMode('specific'); setStep('select-org'); }}>
              <div className="ms-choose__icon"><i className="fas fa-building" /></div>
              <h3>{t('pages.submitManuscript.specificTitle')}</h3>
              <p>{t('pages.submitManuscript.specificDesc')}</p>
              <span className="ms-choose__action">{t('pages.submitManuscript.specificAction')} <i className="fas fa-arrow-right" /></span>
            </div>
            <div className="ms-choose__card" onClick={() => { setSubmissionMode('open'); setStep('form'); }}>
              <div className="ms-choose__icon"><i className="fas fa-globe" /></div>
              <h3>{t('pages.submitManuscript.openTitle')}</h3>
              <p>{t('pages.submitManuscript.openDesc')}</p>
              <span className="ms-choose__action">{t('pages.submitManuscript.openAction')} <i className="fas fa-arrow-right" /></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════
  // Étape 2 : Recherche & sélection éditeur — Full-width premium
  // ═════════════════════════════════
  if (step === 'select-org') {
    return (
      <div className="submit-manuscript-page ms-explore">
        <SEO title={t('pages.submitManuscript.selectOrgTitle')} />

        {/* Hero compact avec recherche intégrée */}
        <section className="ms-explore__hero page-hero">
          <div className="page-hero__orb page-hero__orb--1" />
          <div className="page-hero__orb page-hero__orb--2" />
          <div className="page-hero__grid-bg" />
          <div className="ms-explore__hero-inner">
            <button className="ms-explore__back-btn" onClick={() => setStep('choose')}>
              <i className="fas fa-arrow-left" /> {t('common.back')}
            </button>
            <h1>{t('pages.submitManuscript.selectOrgTitle')}</h1>
            <p>{t('pages.submitManuscript.selectOrgSubtitle')}</p>

            {/* Recherche dans le hero */}
            <div className="ms-explore__search">
              <div className="ms-explore__search-main">
                <i className="fas fa-search" />
                <input type="text" placeholder={t('pages.submitManuscript.searchPlaceholder')} defaultValue={searchQuery} onChange={(e) => handleSearchChange(e.target.value, setSearchQuery)} />
              </div>
              <div className="ms-explore__search-city">
                <i className="fas fa-map-marker-alt" />
                <input type="text" placeholder={t('pages.submitManuscript.cityPlaceholder')} defaultValue={searchCity} onChange={(e) => handleSearchChange(e.target.value, setSearchCity)} />
              </div>
              <div className="ms-explore__search-genre">
                <select value={formData.genre} onChange={(e) => setFormData(p => ({ ...p, genre: e.target.value }))}>
                  {GENRE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Bannière sélection sticky */}
        {selectedOrg && (
          <div className="ms-explore__sticky-bar">
            <div className="ms-explore__sticky-inner">
              <div className="ms-explore__sticky-info">
                <div className="ms-explore__sticky-logo">
                  {selectedOrg.logo ? <img src={selectedOrg.logo} alt="" /> : <i className="fas fa-building" />}
                </div>
                <div>
                  <strong>{selectedOrg.name}</strong>
                  <span>{selectedOrg.city}{selectedOrg.city && selectedOrg.country ? ', ' : ''}{selectedOrg.country}</span>
                </div>
              </div>
              <button className="ms-explore__continue-btn" onClick={() => setStep('form')}>
                {t('pages.submitManuscript.continueSubmission')} <i className="fas fa-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {/* Grille full-width */}
        <div className="ms-explore__body">
          <div className="ms-explore__toolbar">
            <span className="ms-explore__count">
              {loadingOrgs ? '...' : t('pages.submitManuscript.orgCount', { count: sortedOrgs.length })}
            </span>
            <button className="ms-explore__open-link" onClick={() => { setSubmissionMode('open'); setStep('form'); }}>
              <i className="fas fa-globe" /> {t('pages.submitManuscript.openMarket')}
            </button>
          </div>

          {loadingOrgs ? (
            <div className="ms-explore__loading"><div className="admin-spinner" /><p>{t('common.loading')}</p></div>
          ) : sortedOrgs.length === 0 ? (
            <div className="ms-explore__empty">
              <div className="ms-explore__empty-icon"><i className="fas fa-search" /></div>
              <h3>{t('pages.submitManuscript.noOrgs')}</h3>
              <p>{searchQuery ? t('pages.submitManuscript.noOrgsSearch', { query: searchQuery }) : t('pages.submitManuscript.noOrgsDesc')}</p>
              <button className="submit-btn" onClick={() => { setSubmissionMode('open'); setStep('form'); }}>
                <i className="fas fa-globe" /> {t('pages.submitManuscript.submitOpen')}
              </button>
            </div>
          ) : (
            <div className="ms-explore__grid">
              {sortedOrgs.map(org => (
                <div key={org.id} className={`ms-card ${selectedOrg?.id === org.id ? 'ms-card--selected' : ''}`} onClick={() => setSelectedOrg(org)}>
                  {isRecommended(org) && <div className="ms-card__badge"><i className="fas fa-star" /> {t('pages.submitManuscript.recommended')}</div>}
                  <div className="ms-card__header">
                    <div className="ms-card__logo">
                      {org.logo ? <img src={org.logo} alt={org.name} /> : <i className="fas fa-building" />}
                    </div>
                    <div className="ms-card__check">
                      {selectedOrg?.id === org.id ? <i className="fas fa-check-circle" /> : <i className="far fa-circle" />}
                    </div>
                  </div>
                  <h3 className="ms-card__name">{org.name} {org.is_verified && <i className="fas fa-check-circle ms-card__verified" />}</h3>
                  <p className="ms-card__location"><i className="fas fa-map-marker-alt" /> {org.city || org.country || '—'}</p>
                  {org.description && <p className="ms-card__desc">{org.description.length > 100 ? org.description.slice(0, 100) + '...' : org.description}</p>}
                  <div className="ms-card__rating">
                    <span className="ms-card__stars">
                      {[1,2,3,4,5].map(i => <i key={i} className={`fa${i <= Math.round(parseFloat(org.avg_rating || 0)) ? 's' : 'r'} fa-star`} />)}
                    </span>
                    <span className="ms-card__rating-text">{parseFloat(org.avg_rating || 0).toFixed(1)} ({org.review_count || 0})</span>
                  </div>
                  {org.accepted_genres?.length > 0 && (
                    <div className="ms-card__tags">
                      {org.accepted_genres.slice(0, 3).map(g => (
                        <span key={g} className={`ms-card__tag ${g === formData.genre ? 'ms-card__tag--match' : ''}`}>
                          {GENRE_OPTIONS.find(o => o.value === g)?.label || g}
                        </span>
                      ))}
                      {org.accepted_genres.length > 3 && <span className="ms-card__tag">+{org.accepted_genres.length - 3}</span>}
                    </div>
                  )}
                  {org.avg_response_days && <p className="ms-card__response"><i className="fas fa-clock" /> {t('pages.submitManuscript.responseIn', { days: org.avg_response_days })}</p>}
                  <button className="ms-card__detail-btn" onClick={(e) => { e.stopPropagation(); openPreview(org); }}>
                    {t('pages.submitManuscript.viewProfile')} <i className="fas fa-chevron-right" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Preview éditeur */}
        {previewOrg && (
          <div className="ms-preview__overlay" onClick={() => setPreviewOrg(null)}>
            <div className="ms-preview__modal" onClick={(e) => e.stopPropagation()}>
              <button className="ms-preview__close" onClick={() => setPreviewOrg(null)} aria-label={t('common.close')}><i className="fas fa-times" /></button>
              {previewOrg.cover_image && (
                <div className="ms-preview__cover" style={{ backgroundImage: `url(${previewOrg.cover_image})` }} />
              )}
              <div className="ms-preview__content">
                <div className="ms-preview__header">
                  <div className="ms-preview__logo">
                    {previewOrg.logo ? <img src={previewOrg.logo} alt="" /> : <i className="fas fa-building" />}
                  </div>
                  <div>
                    <h2>{previewOrg.name} {previewOrg.is_verified && <i className="fas fa-check-circle" style={{ color: '#3b82f6' }} />}</h2>
                    <p className="ms-preview__location"><i className="fas fa-map-marker-alt" /> {previewOrg.city}{previewOrg.city && previewOrg.country ? ', ' : ''}{previewOrg.country}</p>
                  </div>
                </div>

                <div className="ms-preview__stats">
                  <div><strong>{parseFloat(previewOrg.avg_rating || 0).toFixed(1)}</strong><span><i className="fas fa-star" /> {t('pages.submitManuscript.previewRating')}</span></div>
                  <div><strong>{previewOrg.review_count || 0}</strong><span>{t('pages.submitManuscript.previewReviews')}</span></div>
                  {previewOrg.avg_response_days && <div><strong>~{previewOrg.avg_response_days}j</strong><span>{t('pages.submitManuscript.previewResponse')}</span></div>}
                  {previewOrg.member_count && <div><strong>{previewOrg.member_count}</strong><span>{t('pages.submitManuscript.previewMembers')}</span></div>}
                </div>

                {previewOrg.description && (
                  <div className="ms-preview__section"><h4>{t('pages.submitManuscript.previewAbout')}</h4><p>{previewOrg.description}</p></div>
                )}

                {previewOrg.accepted_genres?.length > 0 && (
                  <div className="ms-preview__section">
                    <h4>{t('pages.submitManuscript.previewGenres')}</h4>
                    <div className="ms-preview__tags">
                      {previewOrg.accepted_genres.map(g => (
                        <span key={g} className={`ms-preview__tag ${g === formData.genre ? 'ms-preview__tag--match' : ''}`}>
                          {GENRE_OPTIONS.find(o => o.value === g)?.label || g}
                          {g === formData.genre && <i className="fas fa-check" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {previewOrg.specialties?.length > 0 && (
                  <div className="ms-preview__section">
                    <h4>{t('pages.submitManuscript.previewSpecialties')}</h4>
                    <div className="ms-preview__tags">
                      {previewOrg.specialties.map(s => <span key={s} className="ms-preview__tag ms-preview__tag--specialty">{s}</span>)}
                    </div>
                  </div>
                )}

                {previewOrg.submission_guidelines && (
                  <div className="ms-preview__section">
                    <h4><i className="fas fa-file-alt" /> {t('pages.submitManuscript.previewGuidelines')}</h4>
                    <div className="ms-preview__guidelines">{previewOrg.submission_guidelines}</div>
                  </div>
                )}

                {(previewOrg.email || previewOrg.website) && (
                  <div className="ms-preview__section">
                    <h4>{t('pages.submitManuscript.previewContact')}</h4>
                    {previewOrg.email && <p><i className="fas fa-envelope" /> {previewOrg.email}</p>}
                    {previewOrg.website && <p><i className="fas fa-globe" /> <a href={previewOrg.website} target="_blank" rel="noopener noreferrer">{previewOrg.website}</a></p>}
                    {previewOrg.phone_number && <p><i className="fas fa-phone" /> {previewOrg.phone_number}</p>}
                  </div>
                )}

                <div className="ms-preview__actions">
                  <button className="submit-btn" onClick={() => { setSelectedOrg(previewOrg); setPreviewOrg(null); }}>
                    <i className="fas fa-check" /> {t('pages.submitManuscript.select')}
                  </button>
                  <Link to={`/organizations/${previewOrg.slug}`} target="_blank" className="cancel-btn">
                    <i className="fas fa-external-link-alt" /> {t('pages.submitManuscript.storefront')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════
  // Guard : profil AUTEUR requis
  // ═════════════════════════════════
  if (!isAuthor) {
    return (
      <div className="submit-manuscript-page">
        <SEO title={t('pages.submitManuscript.authorRequired', 'Profil Auteur requis')} />
        <div className="ms-author-gate">
          <div className="ms-author-gate__icon">
            <i className="fas fa-pen-fancy" />
          </div>
          <h1 className="ms-author-gate__title">
            {t('pages.submitManuscript.authorGateTitle', 'Activez votre profil Auteur pour soumettre un manuscrit')}
          </h1>
          <p className="ms-author-gate__desc">
            {t('pages.submitManuscript.authorGateDesc', 'En activant le profil Auteur, vous pourrez soumettre vos manuscrits aux maisons d\'édition partenaires, recevoir des devis éditoriaux, gérer vos publications et créer votre page auteur publique sur Frollot.')}
          </p>
          <Link to="/dashboard/settings" className="ms-author-gate__btn">
            <i className="fas fa-user-plus" /> {t('pages.submitManuscript.activateAuthor', 'Activer mon profil Auteur')}
          </Link>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════
  // Étape 3 : Formulaire
  // ═════════════════════════════════
  return (
    <div className="submit-manuscript-page">
      <PageHero
        title={t('pages.submitManuscript.formTitle')}
        subtitle={submissionMode === 'specific' && selectedOrg ? t('pages.submitManuscript.targetBanner', { name: selectedOrg.name }) : submissionMode === 'open' ? t('pages.submitManuscript.openBanner') : t('pages.submitManuscript.formSubtitle')}
      />

      {/* Bandeau de contexte */}
      {(submissionMode === 'specific' && selectedOrg) && (
        <div className="ms-context-banner">
          <div className="ms-context-banner__content">
            {selectedOrg.logo && <img src={selectedOrg.logo} alt="" className="ms-context-banner__logo" />}
            <i className="fas fa-building" />
            <span>{t('pages.submitManuscript.targetBanner', { name: selectedOrg.name })}</span>
            {selectedOrg.is_verified && <i className="fas fa-check-circle" style={{ color: '#3b82f6', fontSize: '.8rem' }} />}
            <button onClick={() => { setStep('select-org'); setSelectedOrg(null); }}>{t('pages.submitManuscript.changeBanner')}</button>
          </div>
        </div>
      )}
      {submissionMode === 'open' && (
        <div className="ms-context-banner ms-context-banner--open">
          <div className="ms-context-banner__content">
            <i className="fas fa-globe" />
            <span>{t('pages.submitManuscript.openBannerDesc')}</span>
            <button onClick={() => setStep('choose')}>{t('pages.submitManuscript.changeBanner')}</button>
          </div>
        </div>
      )}

      <div className="submit-manuscript-container">
        <div className="submit-manuscript-content">
          {/* Left Side - Info Cards */}
          <div className="info-section">
            {/* Carte éditeur sélectionné */}
            {submissionMode === 'specific' && selectedOrg && (
              <div className="info-card info-card--org">
                <div className="info-card-header">
                  <div className="info-icon" style={{ background: 'rgba(59, 130, 246, .1)' }}>
                    {selectedOrg.logo ? <img src={selectedOrg.logo} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} /> : <i className="fas fa-building" style={{ color: '#3b82f6' }}></i>}
                  </div>
                  <h3>{selectedOrg.name}</h3>
                </div>
                <div className="ms-org-selected-info">
                  {selectedOrg.city && <p><i className="fas fa-map-marker-alt" /> {selectedOrg.city}, {selectedOrg.country}</p>}
                  <p><i className="fas fa-star" /> {parseFloat(selectedOrg.avg_rating || 0).toFixed(1)} ({selectedOrg.review_count || 0} {t('pages.submitManuscript.previewReviews').toLowerCase()})</p>
                  {selectedOrg.avg_response_days && <p><i className="fas fa-clock" /> {t('pages.submitManuscript.responseIn', { days: selectedOrg.avg_response_days })}</p>}
                </div>
                {selectedOrg.submission_guidelines && (
                  <div className="ms-org-guidelines">
                    <strong><i className="fas fa-file-alt" /> {t('pages.submitManuscript.previewGuidelines')}</strong>
                    <p>{selectedOrg.submission_guidelines.length > 200 ? selectedOrg.submission_guidelines.slice(0, 200) + '...' : selectedOrg.submission_guidelines}</p>
                  </div>
                )}
              </div>
            )}

            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon"><i className="fas fa-book-open"></i></div>
                <h3>{t('pages.submitManuscript.whyFrollot')}</h3>
              </div>
              <ul className="info-list">
                <li><span className="list-icon"><i className="fas fa-check"></i></span><span className="list-text">{t('pages.submitManuscript.whyPoint1')}</span></li>
                <li><span className="list-icon"><i className="fas fa-check"></i></span><span className="list-text">{t('pages.submitManuscript.whyPoint2')}</span></li>
                <li><span className="list-icon"><i className="fas fa-check"></i></span><span className="list-text">{t('pages.submitManuscript.whyPoint3')}</span></li>
                <li><span className="list-icon"><i className="fas fa-check"></i></span><span className="list-text">{t('pages.submitManuscript.whyPoint4')}</span></li>
              </ul>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon"><i className="fas fa-lightbulb"></i></div>
                <h3>{t('pages.submitManuscript.acceptedFormats')}</h3>
              </div>
              <div className="format-badges">
                <div className="format-badge"><i className="fas fa-file-pdf"></i><span>PDF</span></div>
                <div className="format-badge"><i className="fas fa-file-word"></i><span>DOC</span></div>
                <div className="format-badge"><i className="fas fa-file-word"></i><span>DOCX</span></div>
              </div>
              <div className="format-note"><i className="fas fa-info-circle"></i><span>{t('pages.submitManuscript.maxSize')}</span></div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon"><i className="fas fa-clock"></i></div>
                <h3>{t('pages.submitManuscript.process')}</h3>
              </div>
              <div className="process-steps">
                <div className="process-step"><div className="step-number">1</div><div className="step-content"><div className="step-title">{t('pages.submitManuscript.step1Title')}</div><div className="step-description">{t('pages.submitManuscript.step1Desc')}</div></div></div>
                <div className="process-step"><div className="step-number">2</div><div className="step-content"><div className="step-title">{t('pages.submitManuscript.step2Title')}</div><div className="step-description">{t('pages.submitManuscript.step2Desc')}</div></div></div>
                <div className="process-step"><div className="step-number">3</div><div className="step-content"><div className="step-title">{t('pages.submitManuscript.step3Title')}</div><div className="step-description">{t('pages.submitManuscript.step3Desc')}</div></div></div>
                <div className="process-step"><div className="step-number">4</div><div className="step-content"><div className="step-title">{t('pages.submitManuscript.step4Title')}</div><div className="step-description">{t('pages.submitManuscript.step4Desc')}</div></div></div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="form-section">
            <form onSubmit={handleSubmit} className="manuscript-form">
              <div className="form-header">
                <div className="form-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                </div>
                <h2>{t('pages.submitManuscript.formHeader')}</h2>
              </div>

              {error && (
                <div className="error-message">
                  <div className="error-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                  <div className="error-content"><span className="error-text">{error}</span></div>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="title" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelTitle')}</span><span className="required">*</span></label>
                  <div className="input-group">
                    <span className="input-group__icon" aria-hidden><i className="fas fa-book" /></span>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} placeholder={t('pages.submitManuscript.placeholderTitle')} className="form-input" required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="author_name" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelAuthorName')}</span><span className="required">*</span></label>
                  <div className="input-group input-group--locked">
                    <span className="input-group__icon" aria-hidden><i className="fas fa-user" /></span>
                    <input type="text" id="author_name" name="author_name" value={formData.author_name} readOnly className="form-input" required />
                    <span className="input-group__lock" aria-hidden><i className="fas fa-lock" /></span>
                  </div>
                  <div className="field-hint">Information de votre compte. Pour la modifier, rendez-vous dans <Link to="/dashboard/settings">Paramètres</Link>.</div>
                </div>

                <div className="form-group">
                  <label htmlFor="pen_name" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelPenName')}</span><span className="required">*</span></label>
                  <div className={`input-group ${fieldErrors.pen_name ? 'input-group--error' : ''}`}>
                    <span className="input-group__icon" aria-hidden><i className="fas fa-mask" /></span>
                    <input type="text" id="pen_name" name="pen_name" value={formData.pen_name} onChange={handleChange} placeholder="Votre nom de plume ou votre vrai nom" className="form-input" required />
                  </div>
                  {fieldErrors.pen_name && <span className="field-error">{fieldErrors.pen_name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelEmail')}</span><span className="required">*</span></label>
                  <div className="input-group input-group--locked">
                    <span className="input-group__icon" aria-hidden><i className="fas fa-envelope" /></span>
                    <input type="email" id="email" name="email" value={formData.email} readOnly className="form-input" required />
                    <span className="input-group__lock" aria-hidden><i className="fas fa-lock" /></span>
                  </div>
                  <div className="field-hint">Information de votre compte. Pour la modifier, rendez-vous dans <Link to="/dashboard/settings">Paramètres</Link>.</div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone_local" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelPhone')}</span><span className="required">*</span></label>
                  <div className="ms-phone-split">
                    <div className="input-group input-group--select ms-phone-split__dial">
                      <select id="dial_code" name="dial_code" value={formData.dial_code} onChange={(e) => { setFormData(p => ({ ...p, dial_code: e.target.value })); setDialCodeManual(true); }} className="form-input" required>
                        <option value="">Indicatif</option>
                        {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.dialCode}>{c.dialCode} · {c.name}</option>)}
                      </select>
                    </div>
                    <div className={`input-group ms-phone-split__number ${fieldErrors.phone_number ? 'input-group--error' : ''}`}>
                      <input type="tel" id="phone_local" name="phone_local" value={formData.phone_local} onChange={handleChange} inputMode="numeric" pattern="[0-9]*" placeholder="XX XX XX XX" className="form-input" required />
                    </div>
                  </div>
                  {fieldErrors.phone_number && <span className="field-error">{fieldErrors.phone_number}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="country" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelCountry')}</span><span className="required">*</span></label>
                  <div className={`input-group input-group--select ${fieldErrors.country ? 'input-group--error' : ''}`}>
                    <span className="input-group__icon" aria-hidden><i className="fas fa-globe-africa" /></span>
                    <select id="country" name="country" value={formData.country} onChange={handleChange} className="form-input" required>
                      <option value="">— Sélectionnez votre pays —</option>
                      {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  {fieldErrors.country && <span className="field-error">{fieldErrors.country}</span>}
                </div>

                <div className="form-group full-width form-row-3">
                  <div className="form-group">
                    <label htmlFor="genre" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelGenre')}</span><span className="required">*</span></label>
                    <div className="input-group input-group--select">
                      <span className="input-group__icon" aria-hidden><i className="fas fa-bookmark" /></span>
                      <select id="genre" name="genre" value={formData.genre} onChange={handleChange} className="form-input" required>
                        {GENRE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="language" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelLanguage')}</span><span className="required">*</span></label>
                    <div className="input-group input-group--select">
                      <span className="input-group__icon" aria-hidden><i className="fas fa-language" /></span>
                      <select id="language" name="language" value={formData.language} onChange={handleChange} className="form-input" required>
                        {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="page_count" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelPages')}</span><span className="required">*</span></label>
                    <div className={`input-group ${fieldErrors.page_count ? 'input-group--error' : ''}`}>
                      <span className="input-group__icon" aria-hidden><i className="fas fa-file-alt" /></span>
                      <input type="number" id="page_count" name="page_count" value={formData.page_count} onChange={handleChange} placeholder="250" className="form-input" min="1" max="10000" required />
                    </div>
                    {fieldErrors.page_count && <span className="field-error">{fieldErrors.page_count}</span>}
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelDescription')}</span><span className="required">*</span></label>
                <div className={`input-group input-group--textarea ${fieldErrors.description ? 'input-group--error' : ''}`}>
                  <span className="input-group__icon input-group__icon--top" aria-hidden><i className="fas fa-align-left" /></span>
                  <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('pages.submitManuscript.placeholderDescription')} className="form-textarea" rows="5" minLength={50} required />
                </div>
                <div className="field-hint">
                  {fieldErrors.description ? <span className="field-error">{fieldErrors.description}</span> : <>{descWordCount} {t('pages.submitManuscript.words', { count: descWordCount })} — {t('pages.submitManuscript.minChars')}</>}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="file" className="form-label"><span className="label-text">{t('pages.submitManuscript.labelFile')}</span><span className="required">*</span></label>
                <div className="file-upload-group">
                  <input type="file" id="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="file-input" required />
                  <label htmlFor="file" className="file-input-label">
                    <div className="file-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                    <div className="file-content">
                      <div className="file-title">{fileName || t('pages.submitManuscript.fileChoose')}</div>
                      <div className="file-subtitle">{t('pages.submitManuscript.fileFormats')}</div>
                    </div>
                    <div className="file-browse"><i className="fas fa-folder-open" /> <span>{t('pages.submitManuscript.browse')}</span></div>
                  </label>
                  {fileName && (
                    <div className="selected-file">
                      <div className="selected-file-icon"><i className="fas fa-file" /></div>
                      <div className="selected-file-info">
                        <div className="selected-file-name">{fileName}</div>
                        <div className="selected-file-size">{(file?.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                      <button type="button" className="remove-file" onClick={() => { setFile(null); setFileName(''); document.getElementById('file').value = ''; }}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group full-width form-terms">
                <label className="terms-checkbox">
                  <input type="checkbox" name="terms_accepted" checked={formData.terms_accepted} onChange={handleChange} required />
                  <span className="terms-checkbox__box" />
                  <span className="terms-checkbox__text">
                    {t('pages.submitManuscript.termsAccept')} <Link to="/privacy" className="privacy-link" target="_blank" rel="noopener noreferrer">{t('pages.submitManuscript.termsLink')}</Link> {t('pages.submitManuscript.termsPrivacy')}
                  </span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting || !file || !formData.terms_accepted} className="submit-btn">
                  <span className="btn-icon">{isSubmitting ? <span className="btn-spinner" /> : <i className="fas fa-paper-plane" />}</span>
                  <span className="btn-text">{isSubmitting ? t('pages.submitManuscript.submitting') : t('pages.submitManuscript.submitBtn')}</span>
                </button>
                <button type="button" onClick={() => navigate(-1)} className="cancel-btn">
                  <span className="btn-icon"><i className="fas fa-arrow-left" /></span>
                  <span className="btn-text">{t('common.back')}</span>
                </button>
              </div>

              <div className="form-note">
                <div className="note-icon"><i className="fas fa-lock" /></div>
                <div className="note-content">
                  {t('pages.submitManuscript.dataProtected')} <Link to="/privacy" className="privacy-link" target="_blank">{t('pages.submitManuscript.privacyPolicy')}</Link>.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitManuscript;
