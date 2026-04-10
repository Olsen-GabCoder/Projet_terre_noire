import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/Inquiries.css';

const InquiryDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await organizationService.getInquiry(id);
        setInquiry(res.data);
      } catch {
        setInquiry(null);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleRespond = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await organizationService.respondToInquiry(id, { response: responseText });
      setInquiry(res.data.inquiry || res.data);
      toast.success(t('pages.inquiryDetail.responseSent'));
      setResponseText('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('pages.inquiryDetail.sendError'));
    }
    setSubmitting(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (!inquiry) return (
    <div className="inquiry-detail__not-found">
      <h2>{t('pages.inquiryDetail.notFound')}</h2>
      <Link to="/inquiries">{t('pages.inquiryDetail.backToInquiries')}</Link>
    </div>
  );

  return (
    <div className="inquiry-detail">
      <SEO title={t('pages.inquiryDetail.seoTitle', { subject: inquiry.subject })} />

      <Link to="/inquiries" className="inquiry-detail__back">
        <i className="fas fa-arrow-left" /> {t('pages.inquiryDetail.backToInquiries')}
      </Link>

      <div className="inquiry-detail__card">
        <div className="inquiry-detail__header">
          <h1>{inquiry.subject}</h1>
          <span className={`inquiry-card__status inquiry-card__status--${inquiry.status?.toLowerCase()}`}>
            {inquiry.status_display || inquiry.status}
          </span>
        </div>

        <div className="inquiry-detail__meta">
          <span><i className="fas fa-user" /> {t('pages.inquiryDetail.from')} <strong>{inquiry.sender_name}</strong></span>
          <span>
            <i className="fas fa-arrow-right" /> {t('pages.inquiryDetail.to')} <strong>{inquiry.target_name || '—'}</strong>
          </span>
          <span><i className="fas fa-calendar" /> {new Date(inquiry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Message original */}
        <div className="inquiry-detail__message">
          <h3><i className="fas fa-envelope" /> {t('pages.inquiryDetail.message')}</h3>
          <p>{inquiry.message}</p>
          {inquiry.attachment && (
            <a href={inquiry.attachment} target="_blank" rel="noopener noreferrer" className="inquiry-detail__attachment">
              <i className="fas fa-paperclip" /> {t('pages.inquiryDetail.attachment')}
            </a>
          )}
        </div>

        {/* Réponse */}
        {inquiry.response && (
          <div className="inquiry-detail__response">
            <h3><i className="fas fa-reply" /> {t('pages.inquiryDetail.response')}</h3>
            <p>{inquiry.response}</p>
            <div className="inquiry-detail__response-meta">
              {inquiry.responded_by_name && <span>{t('pages.inquiryDetail.by')} {inquiry.responded_by_name}</span>}
              {inquiry.responded_at && (
                <span>{new Date(inquiry.responded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
            </div>
          </div>
        )}

        {/* Formulaire de réponse */}
        {inquiry.status === 'PENDING' && !inquiry.response && (
          <form onSubmit={handleRespond} className="inquiry-detail__respond-form">
            <h3><i className="fas fa-reply" /> {t('pages.inquiryDetail.respond')}</h3>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t('pages.inquiryDetail.responsePlaceholder')}
              rows={4}
              required
            />
            <button type="submit" className="btn btn--primary" disabled={submitting || !responseText.trim()}>
              {submitting ? t('pages.inquiryDetail.sending') : t('pages.inquiryDetail.sendResponse')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default InquiryDetail;
