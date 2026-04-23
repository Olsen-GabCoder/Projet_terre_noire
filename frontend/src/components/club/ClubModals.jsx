/**
 * ClubModals — QR code, report, and delete confirmation modals
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';

export function QrModal({ show, inviteUrl, club, onClose, toast, t }) {
  if (!show || !inviteUrl) return null;

  const downloadQr = () => {
    const canvas = document.querySelector('.cc-qr-modal canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${club.name.replace(/\s+/g, '-')}-invite-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: club.name,
          text: t('pages.bookClubDetail.shareText', { clubName: club.name }),
          url: inviteUrl,
        });
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(inviteUrl); toast.success(t('pages.bookClubDetail.shareCopied')); } catch {}
  };

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-qr-modal" onClick={e => e.stopPropagation()}>
        <h3><i className="fas fa-qrcode" /> {t('pages.bookClubDetail.qrTitle', 'Inviter par QR code')}</h3>
        <p className="cc-qr-modal__sub">{t('pages.bookClubDetail.qrSub', 'Scannez ce code pour rejoindre le club. Partagez-le sur WhatsApp, imprimez-le ou montrez votre écran.')}</p>
        <div className="cc-qr-modal__code">
          <QRCodeCanvas value={inviteUrl} size={220} level="H" includeMargin={true}
            bgColor="#f5f1ea"
            fgColor="#1a1713"
          />
        </div>
        <p className="cc-qr-modal__club">{club.name}</p>
        <div className="cc-qr-modal__actions">
          <button className="cc-btn cc-btn--join" onClick={shareNative}><i className="fas fa-share-alt" /> {t('pages.bookClubDetail.shareNative', 'Partager')}</button>
          <button className="cc-btn cc-btn--outline" onClick={downloadQr}><i className="fas fa-download" /> {t('pages.bookClubDetail.qrDownload', 'Télécharger PNG')}</button>
          <button className="cc-btn cc-btn--outline" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success(t('pages.bookClubDetail.shareCopied')); }}><i className="fas fa-copy" /> {t('pages.bookClubDetail.qrCopyLink', 'Copier le lien')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ReportModal({ reportMsg, onClose, slug, socialService, toast, handleApiError, t }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reportMsg || !reason) return;
    setSending(true);
    try {
      await socialService.reportMessage(slug, reportMsg.id, {reason, details});
      toast.success(t('pages.bookClubDetail.reportSent', 'Signalement envoyé'));
    } catch (e) {
      const msg = e.response?.status === 409 ? t('pages.bookClubDetail.alreadyReported', 'Déjà signalé') : handleApiError(e);
      toast.error(msg);
    }
    onClose();
    setReason(''); setDetails(''); setSending(false);
  };

  if (!reportMsg) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-report-modal" onClick={e => e.stopPropagation()}>
        <h3><i className="fas fa-flag" /> {t('pages.bookClubDetail.reportTitle', 'Signaler un message')}</h3>
        <p className="cc-report-modal__preview">
          <strong>{reportMsg.author?.full_name || reportMsg.author?.username || 'Membre'}</strong>
          <span>{reportMsg.content?.slice(0, 100) || ({VOICE: 'Note vocale', IMAGE: 'Photo', FILE: 'Fichier', QUOTE: 'Citation'}[reportMsg.message_type] || '')}</span>
        </p>
        <label>{t('pages.bookClubDetail.reportReason', 'Motif')}</label>
        <div className="cc-report-modal__reasons">
          {[['SPAM', 'Spam'], ['HARASSMENT', 'Harcèlement'], ['INAPPROPRIATE', 'Contenu inapproprié'], ['HATE_SPEECH', 'Discours haineux'], ['OTHER', 'Autre']].map(([val, label]) => (
            <button key={val} className={`cc-report-reason${reason === val ? ' cc-report-reason--active' : ''}`} onClick={() => setReason(val)}>{label}</button>
          ))}
        </div>
        <label>{t('pages.bookClubDetail.reportDetails', 'Détails (optionnel)')}</label>
        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} placeholder={t('pages.bookClubDetail.reportDetailsPlaceholder', 'Précisez si nécessaire...')} />
        <div className="cc-report-modal__actions">
          <button className="cc-btn cc-btn--leave" onClick={onClose}>{t('common.cancel', 'Annuler')}</button>
          <button className="cc-btn cc-btn--danger" onClick={submit} disabled={!reason || sending}>{sending ? '...' : t('pages.bookClubDetail.reportSubmit', 'Signaler')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ForwardModal({ forwardMsg, onClose, slug, socialService, toast, handleApiError, t }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!forwardMsg) return;
    (async () => {
      try {
        const r = await socialService.getClubs({my_clubs: true});
        const list = Array.isArray(r.data) ? r.data : r.data.results || [];
        setClubs(list.filter(c => c.slug !== slug));
      } catch {} setLoading(false);
    })();
  }, [forwardMsg]);

  const forward = async (targetSlug) => {
    setSending(targetSlug);
    try {
      await socialService.forwardMessage(slug, forwardMsg.id, targetSlug);
      toast.success(t('pages.bookClubDetail.forwardSuccess', 'Message transféré !'));
      onClose();
    } catch (e) { toast.error(handleApiError(e)); }
    setSending(null);
  };

  if (!forwardMsg) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-forward-modal" onClick={e => e.stopPropagation()}>
        <h3><i className="fas fa-share" /> {t('pages.bookClubDetail.forwardTitle', 'Transférer le message')}</h3>
        <p className="cc-forward-modal__preview">
          <strong>{forwardMsg.author?.full_name || forwardMsg.author?.username || ''}</strong>
          <span>{forwardMsg.content?.slice(0, 80) || ({VOICE: 'Note vocale', IMAGE: 'Photo', FILE: 'Fichier', QUOTE: 'Citation'}[forwardMsg.message_type] || '...')}</span>
        </p>
        <div className="cc-forward-modal__label">{t('pages.bookClubDetail.forwardSelectClub', 'Choisir un club')}</div>
        {loading ? (
          <div className="cc-forward-modal__loading"><i className="fas fa-spinner fa-spin" /></div>
        ) : clubs.length > 0 ? (
          <div className="cc-forward-modal__list">
            {clubs.map(c => (
              <button key={c.slug} className="cc-forward-modal__club" onClick={() => forward(c.slug)} disabled={sending === c.slug}>
                <div className="cc-forward-modal__club-av">
                  {c.cover_image ? <img src={c.cover_image} alt="" /> : <i className="fas fa-users" />}
                </div>
                <div className="cc-forward-modal__club-info">
                  <strong>{c.name}</strong>
                  <span>{c.members_count} {t('pages.bookClubDetail.members')}</span>
                </div>
                {sending === c.slug ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
              </button>
            ))}
          </div>
        ) : (
          <p className="cc-forward-modal__empty">{t('pages.bookClubDetail.forwardNoClubs', 'Vous n\'êtes membre d\'aucun autre club.')}</p>
        )}
      </div>
    </div>,
    document.body
  );
}

export function DeleteConfirmModal({ show, onClose, onDelete }) {
  if (!show) return null;
  return createPortal(
    <div className="cc-confirm-overlay">
      <div className="cc-confirm">
        <i className="fas fa-exclamation-triangle" />
        <h3>Supprimer ce club ?</h3>
        <p>Cette action est irréversible. Tous les messages et membres seront perdus.</p>
        <div className="cc-confirm__actions">
          <button onClick={onClose}>Annuler</button>
          <button className="cc-confirm__delete" onClick={onDelete}>Supprimer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
