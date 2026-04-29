import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import analyticsService from '../services/analyticsService';
import '../styles/ShareButtons.css';

const ShareButtons = ({ book }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!book) return null;

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const title = `${book.title} — Frollot`;
  const text = book.description
    ? `${book.title} : ${book.description.substring(0, 120)}…`
    : `Découvrez « ${book.title} » sur Frollot`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('share.linkCopied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      toast.success(t('share.linkCopied'));
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled — ignore
      }
    }
  };

  const channels = [
    {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      color: '#1877f2',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'Twitter',
      icon: 'fab fa-x-twitter',
      color: '#000000',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      color: '#25d366',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      color: '#0a66c2',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'Email',
      icon: 'fas fa-envelope',
      color: '#6366f1',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  return (
    <div className="share-buttons">
      <span className="share-buttons__label">
        <i className="fas fa-share-nodes" /> {t('share.title')}
      </span>
      <div className="share-buttons__list">
        {channels.map((ch) => (
          <a
            key={ch.name}
            href={ch.href}
            target={ch.name === 'Email' ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="share-btn"
            style={{ '--share-color': ch.color }}
            aria-label={`${t('share.shareOn')} ${ch.name}`}
            title={ch.name}
            onClick={() => analyticsService.trackShare(book.id, ch.name.toLowerCase())}
          >
            <i className={ch.icon} />
          </a>
        ))}
        <button
          type="button"
          className={`share-btn share-btn--copy ${copied ? 'share-btn--copied' : ''}`}
          onClick={handleCopyLink}
          aria-label={t('share.copyLink')}
          title={t('share.copyLink')}
        >
          <i className={copied ? 'fas fa-check' : 'fas fa-link'} />
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            className="share-btn share-btn--native"
            onClick={handleNativeShare}
            aria-label={t('share.more')}
            title={t('share.more')}
          >
            <i className="fas fa-ellipsis" />
          </button>
        )}
        <button
          type="button"
          className={`share-btn share-btn--qr ${showQR ? 'share-btn--qr-active' : ''}`}
          onClick={() => setShowQR(q => !q)}
          aria-label="QR Code"
          title="QR Code"
        >
          <i className="fas fa-qrcode" />
        </button>
      </div>
      {showQR && (() => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&bgcolor=F7F5F0&color=A04A2A&margin=12&format=png`;
        const handleDownload = async () => {
          try {
            const resp = await fetch(qrUrl);
            const blob = await resp.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `frollot-qr-${(book.title || 'page').replace(/\s+/g, '-').slice(0, 30)}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          } catch {
            window.open(qrUrl, '_blank');
          }
        };
        const handleShareQR = async () => {
          if (navigator.share) {
            try {
              const resp = await fetch(qrUrl);
              const blob = await resp.blob();
              const file = new File([blob], 'frollot-qr.png', { type: 'image/png' });
              await navigator.share({ title: `QR — ${title}`, files: [file] });
            } catch { /* cancelled */ }
          }
        };
        return (
          <div className="share-qr">
            <img src={qrUrl} alt={`QR Code — ${title}`} className="share-qr__img" width={200} height={200} />
            <p className="share-qr__hint">{t('share.scanQR', 'Scannez pour accéder à cette page')}</p>
            <div className="share-qr__actions">
              <button type="button" className="share-qr__btn" onClick={handleDownload}>
                <i className="fas fa-download" /> {t('share.downloadQR', 'Télécharger')}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button type="button" className="share-qr__btn" onClick={handleShareQR}>
                  <i className="fas fa-share-alt" /> {t('share.shareQR', 'Partager')}
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ShareButtons;
