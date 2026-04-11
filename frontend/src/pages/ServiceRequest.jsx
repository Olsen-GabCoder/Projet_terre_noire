import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../services/servicesService';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/ServiceRequest.css';

const ACCEPTED_TYPES = '.pdf,.doc,.docx';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ServiceRequest = () => {
  const { t } = useTranslation();
  const { listingId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1 = form, 2 = review
  const [form, setForm] = useState({
    title: '', description: '', requirements: '',
    page_count: '', word_count: '', budget_min: '', budget_max: '',
  });

  useEffect(() => {
    servicesService.getListing(listingId)
      .then(res => setListing(res.data))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error(t('pages.serviceRequest.fileTooLarge'));
      return;
    }
    setFile(f);
  };

  const removeFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = t('pages.serviceRequest.required');
    if (!form.description.trim()) errs.description = t('pages.serviceRequest.required');
    if (form.budget_min && form.budget_max && parseFloat(form.budget_min) > parseFloat(form.budget_max)) {
      errs.budget_max = t('pages.serviceRequest.budgetError');
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('listing', listingId);
      formData.append('provider_profile', listing.provider);
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      if (form.requirements.trim()) formData.append('requirements', form.requirements.trim());
      if (form.page_count) formData.append('page_count', parseInt(form.page_count));
      if (form.word_count) formData.append('word_count', parseInt(form.word_count));
      if (form.budget_min) formData.append('budget_min', parseFloat(form.budget_min));
      if (form.budget_max) formData.append('budget_max', parseFloat(form.budget_max));
      if (file) formData.append('file', file);

      await servicesService.createRequest(formData);
      toast.success(t('pages.serviceRequest.success'));
      navigate('/dashboard/orders');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail) {
        setFieldErrors(data);
        setStep(1);
      } else {
        setError(handleApiError(err));
      }
    }
    setSubmitting(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (!listing) return (
    <div className="sr__not-found">
      <i className="fas fa-exclamation-triangle" aria-hidden="true" />
      <h2>{t('pages.serviceRequest.serviceNotFound')}</h2>
      <Link to="/services">{t('pages.services.backToServices')}</Link>
    </div>
  );

  const formatFileSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;

  return (
    <div className="sr">
      <SEO title={t('pages.serviceRequest.seoTitle')} />

      {/* Cover */}
      <div className="sr__cover">
        <div className="sr__cover-gradient" />
      </div>

      {/* Profile header */}
      <div className="sr__profile">
        <div className="sr__profile-inner">
          <div className="sr__profile-logo">
            <i className="fas fa-file-invoice" aria-hidden="true" />
          </div>
          <div className="sr__profile-info">
            <h1>{t('pages.serviceRequest.title')}</h1>
            <div className="sr__profile-meta">
              <span className="sr__profile-type"><i className="fas fa-briefcase" /> {listing.service_type_display}</span>
              <span><i className="fas fa-user" /> {listing.provider_name}</span>
              <span><i className="fas fa-tag" /> {parseInt(listing.base_price).toLocaleString()} FCFA / {listing.price_type_display}</span>
            </div>
          </div>
          {/* Steps indicator */}
          <div className="sr__steps">
            <div className={`sr__step ${step >= 1 ? 'active' : ''}`}><span>1</span> {t('pages.serviceRequest.stepForm')}</div>
            <div className="sr__step-line" />
            <div className={`sr__step ${step >= 2 ? 'active' : ''}`}><span>2</span> {t('pages.serviceRequest.stepReview')}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="sr__body">
        {error && <div className="sr__error"><i className="fas fa-exclamation-circle" aria-hidden="true" /> {error}</div>}

        {step === 1 && (
          <form onSubmit={handleReview} className="sr__grid">
            {/* Service context card */}
            <div className="sr__cell sr__cell--accent">
              <h2><i className="fas fa-info-circle" /> {t('pages.serviceRequest.serviceInfo')}</h2>
              <Link to={`/services/${listing.slug || listing.id}`} className="sr__service-link">
                <strong>{listing.title}</strong>
                <p>{listing.description?.slice(0, 100)}...</p>
                <div className="sr__service-meta">
                  <span><i className="fas fa-clock" /> {listing.turnaround_days} {t('pages.services.days')}</span>
                  <span><i className="fas fa-tag" /> {parseInt(listing.base_price).toLocaleString()} FCFA</span>
                </div>
              </Link>
            </div>

            {/* Title */}
            <div className="sr__cell sr__cell--wide">
              <h2><i className="fas fa-heading" /> {t('pages.serviceRequest.requestTitle')} *</h2>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder={t('pages.serviceRequest.titlePlaceholder')}
                className={fieldErrors.title ? 'has-error' : ''}
                required
              />
              {fieldErrors.title && <span className="sr__field-error">{fieldErrors.title}</span>}
            </div>

            {/* Description */}
            <div className="sr__cell sr__cell--wide">
              <h2><i className="fas fa-align-left" /> {t('pages.serviceRequest.descriptionLabel')} *</h2>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder={t('pages.serviceRequest.descriptionPlaceholder')}
                className={fieldErrors.description ? 'has-error' : ''}
                required
              />
              {fieldErrors.description && <span className="sr__field-error">{fieldErrors.description}</span>}
            </div>

            {/* Requirements */}
            <div className="sr__cell sr__cell--wide">
              <h2><i className="fas fa-list-check" /> {t('pages.serviceRequest.requirementsLabel')}</h2>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                rows={3}
                placeholder={t('pages.serviceRequest.requirementsPlaceholder')}
              />
            </div>

            {/* File upload */}
            <div className="sr__cell sr__cell--wide">
              <h2><i className="fas fa-paperclip" /> {t('pages.serviceRequest.fileLabel')}</h2>
              <p className="sr__hint">{t('pages.serviceRequest.fileHint')}</p>
              {!file ? (
                <label className="sr__file-drop" tabIndex={0}>
                  <input type="file" ref={fileRef} onChange={handleFileChange} accept={ACCEPTED_TYPES} hidden />
                  <i className="fas fa-cloud-upload-alt" aria-hidden="true" />
                  <span>{t('pages.serviceRequest.fileDropText')}</span>
                  <small>PDF, DOC, DOCX — {t('pages.serviceRequest.maxSize', { size: '20 Mo' })}</small>
                </label>
              ) : (
                <div className="sr__file-preview">
                  <i className="fas fa-file-pdf" aria-hidden="true" />
                  <div className="sr__file-info">
                    <strong>{file.name}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <button type="button" className="sr__file-remove" onClick={removeFile} aria-label={t('common.delete')}>
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Dimensions */}
            <div className="sr__cell">
              <h2><i className="fas fa-ruler" /> {t('pages.serviceRequest.dimensions')}</h2>
              <div className="sr__field-row">
                <div className="sr__field">
                  <label>{t('pages.serviceRequest.pageCount')}</label>
                  <input type="number" name="page_count" value={form.page_count} onChange={handleChange} min="0" placeholder="0" />
                </div>
                <div className="sr__field">
                  <label>{t('pages.serviceRequest.wordCount')}</label>
                  <input type="number" name="word_count" value={form.word_count} onChange={handleChange} min="0" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="sr__cell">
              <h2><i className="fas fa-coins" /> {t('pages.serviceRequest.budget')}</h2>
              <div className="sr__field-row">
                <div className="sr__field">
                  <label>{t('pages.serviceRequest.budgetMin')}</label>
                  <input type="number" name="budget_min" value={form.budget_min} onChange={handleChange} min="0" placeholder="FCFA" />
                </div>
                <div className="sr__field">
                  <label>{t('pages.serviceRequest.budgetMax')}</label>
                  <input type="number" name="budget_max" value={form.budget_max} onChange={handleChange} min="0" placeholder="FCFA"
                    className={fieldErrors.budget_max ? 'has-error' : ''} />
                  {fieldErrors.budget_max && <span className="sr__field-error">{fieldErrors.budget_max}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sr__cell sr__cell--wide sr__actions">
              <Link to={`/services/${listing.slug || listing.id}`} className="sr__btn sr__btn--secondary">
                <i className="fas fa-arrow-left" aria-hidden="true" /> {t('common.cancel')}
              </Link>
              <button type="submit" className="sr__btn sr__btn--primary">
                {t('pages.serviceRequest.reviewBtn')} <i className="fas fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="sr__grid">
            {/* Review summary */}
            <div className="sr__cell sr__cell--wide">
              <h2><i className="fas fa-clipboard-check" /> {t('pages.serviceRequest.reviewTitle')}</h2>
              <div className="sr__review-grid">
                <div className="sr__review-item">
                  <span className="sr__review-label">{t('pages.serviceRequest.requestTitle')}</span>
                  <span className="sr__review-value">{form.title}</span>
                </div>
                <div className="sr__review-item sr__review-item--wide">
                  <span className="sr__review-label">{t('pages.serviceRequest.descriptionLabel')}</span>
                  <span className="sr__review-value">{form.description}</span>
                </div>
                {form.requirements && (
                  <div className="sr__review-item sr__review-item--wide">
                    <span className="sr__review-label">{t('pages.serviceRequest.requirementsLabel')}</span>
                    <span className="sr__review-value">{form.requirements}</span>
                  </div>
                )}
                {file && (
                  <div className="sr__review-item">
                    <span className="sr__review-label">{t('pages.serviceRequest.fileLabel')}</span>
                    <span className="sr__review-value"><i className="fas fa-file" /> {file.name} ({formatFileSize(file.size)})</span>
                  </div>
                )}
                {(form.page_count || form.word_count) && (
                  <div className="sr__review-item">
                    <span className="sr__review-label">{t('pages.serviceRequest.dimensions')}</span>
                    <span className="sr__review-value">
                      {form.page_count && `${form.page_count} pages`}{form.page_count && form.word_count && ' — '}{form.word_count && `${parseInt(form.word_count).toLocaleString()} mots`}
                    </span>
                  </div>
                )}
                {(form.budget_min || form.budget_max) && (
                  <div className="sr__review-item">
                    <span className="sr__review-label">{t('pages.serviceRequest.budget')}</span>
                    <span className="sr__review-value">
                      {form.budget_min && `${parseInt(form.budget_min).toLocaleString()} FCFA`}
                      {form.budget_min && form.budget_max && ' — '}
                      {form.budget_max && `${parseInt(form.budget_max).toLocaleString()} FCFA`}
                    </span>
                  </div>
                )}
                <div className="sr__review-item">
                  <span className="sr__review-label">{t('pages.services.provider')}</span>
                  <span className="sr__review-value">{listing.provider_name} — {listing.title}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sr__cell sr__cell--wide sr__actions">
              <button type="button" className="sr__btn sr__btn--secondary" onClick={() => setStep(1)}>
                <i className="fas fa-pen" aria-hidden="true" /> {t('pages.serviceRequest.editBtn')}
              </button>
              <button type="button" className="sr__btn sr__btn--primary" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> {t('pages.serviceRequest.submitting')}</>
                  : <><i className="fas fa-paper-plane" aria-hidden="true" /> {t('pages.serviceRequest.submitBtn')}</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequest;
