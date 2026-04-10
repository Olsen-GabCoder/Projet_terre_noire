import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/Inquiries.css';

const InquiryNew = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('org');
  const profileId = searchParams.get('profile');

  const [targetName, setTargetName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Charger le nom de la cible
    if (orgId) {
      organizationService.getDirectory({ search: '' })
        .then(res => {
          const orgs = Array.isArray(res.data) ? res.data : res.data.results || [];
          const found = orgs.find(o => String(o.id) === orgId);
          if (found) setTargetName(found.name);
        })
        .catch(() => {});
    }
    if (profileId) {
      organizationService.getProfessionals({})
        .then(res => {
          const pros = Array.isArray(res.data) ? res.data : res.data.results || [];
          const found = pros.find(p => String(p.id) === profileId);
          if (found) setTargetName(found.user_name);
        })
        .catch(() => {});
    }
  }, [orgId, profileId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      if (orgId) data.append('target_org', orgId);
      if (profileId) data.append('target_profile', profileId);
      data.append('subject', subject);
      data.append('message', message);
      if (attachment) data.append('attachment', attachment);

      await organizationService.createInquiry(data);
      toast.success(t('pages.inquiryNew.successMessage'));
      navigate('/inquiries');
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || t('pages.inquiryNew.sendError');
      toast.error(msg);
    }
    setSubmitting(false);
  };

  return (
    <div className="inquiry-new">
      <SEO title={t('pages.inquiryNew.seoTitle')} />

      <div className="inquiry-new__header">
        <h1>{t('pages.inquiryNew.title')}</h1>
        {targetName && (
          <p className="inquiry-new__target">
            <i className={orgId ? 'fas fa-building' : 'fas fa-user-tie'} /> {t('pages.inquiryNew.to')} <strong>{targetName}</strong>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="inquiry-new__form">
        <div className="inquiry-new__field">
          <label htmlFor="inq-subject">{t('pages.inquiryNew.subjectLabel')}</label>
          <input
            id="inq-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('pages.inquiryNew.subjectPlaceholder')}
            required
          />
        </div>

        <div className="inquiry-new__field">
          <label htmlFor="inq-message">{t('pages.inquiryNew.messageLabel')}</label>
          <textarea
            id="inq-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('pages.inquiryNew.messagePlaceholder')}
            rows={6}
            required
          />
        </div>

        <div className="inquiry-new__field">
          <label htmlFor="inq-attachment">{t('pages.inquiryNew.attachmentLabel')}</label>
          <input
            id="inq-attachment"
            type="file"
            onChange={(e) => setAttachment(e.target.files[0] || null)}
          />
        </div>

        <div className="inquiry-new__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting || !subject.trim() || !message.trim()}>
            {submitting ? t('pages.inquiryNew.sending') : t('pages.inquiryNew.submit')}
          </button>
          <button type="button" className="btn btn--outline-dark" onClick={() => navigate(-1)}>
            {t('pages.inquiryNew.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InquiryNew;
