/**
 * CheckpointSection — Reading milestones timeline in the rail
 */
import { useState, useEffect } from 'react';

export default function CheckpointSection({ slug, club, isAdmin, socialService, toast, handleApiError, t }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [targetPage, setTargetPage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!club.current_book) { setLoading(false); return; }
    (async () => {
      try {
        const r = await socialService.getCheckpoints(slug);
        setCheckpoints(Array.isArray(r.data) ? r.data : []);
      } catch {} setLoading(false);
    })();
  }, [slug, club.current_book?.id]);

  const create = async () => {
    if (!label.trim() || !targetPage) return;
    setSaving(true);
    try {
      const r = await socialService.createCheckpoint(slug, { label: label.trim(), target_page: parseInt(targetPage, 10) });
      setCheckpoints(prev => [...prev, r.data].sort((a, b) => a.target_page - b.target_page));
      setLabel(''); setTargetPage(''); setShowForm(false);
      toast.success(t('pages.bookClubDetail.cpCreated', 'Jalon créé'));
    } catch (e) {
      const msg = e.response?.status === 409 ? t('pages.bookClubDetail.cpDuplicate', 'Un jalon existe déjà pour cette page') : handleApiError(e);
      toast.error(msg);
    }
    setSaving(false);
  };

  const reach = async (cpId) => {
    try {
      const r = await socialService.reachCheckpoint(slug, cpId);
      setCheckpoints(prev => prev.map(cp => cp.id === cpId ? r.data : cp));
      toast.success(t('pages.bookClubDetail.cpReached', 'Jalon atteint !'));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  const remove = async (cpId) => {
    try {
      await socialService.deleteCheckpoint(slug, cpId);
      setCheckpoints(prev => prev.filter(cp => cp.id !== cpId));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  if (!club.current_book || loading) return null;

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.cpTitle', 'Jalons de lecture')}</div>

      {checkpoints.length > 0 ? (
        <div className="cc-checkpoints">
          {checkpoints.map((cp, idx) => (
            <div key={cp.id} className={`cc-checkpoint${cp.is_reached ? ' cc-checkpoint--reached' : ''}`}>
              <div className="cc-checkpoint__line">
                <div className={`cc-checkpoint__dot${cp.is_reached ? ' cc-checkpoint__dot--reached' : ''}`}>
                  {cp.is_reached ? <i className="fas fa-check" /> : <span>{idx + 1}</span>}
                </div>
                {idx < checkpoints.length - 1 && <div className={`cc-checkpoint__connector${cp.is_reached ? ' cc-checkpoint__connector--done' : ''}`} />}
              </div>
              <div className="cc-checkpoint__content">
                <div className="cc-checkpoint__label">{cp.label}</div>
                <div className="cc-checkpoint__page">p. {cp.target_page}</div>
                {cp.is_reached && cp.reached_at && (
                  <div className="cc-checkpoint__date"><i className="fas fa-check-circle" /> {new Date(cp.reached_at).toLocaleDateString()}</div>
                )}
                {isAdmin && !cp.is_reached && (
                  <button className="cc-checkpoint__reach-btn" onClick={() => reach(cp.id)}>
                    <i className="fas fa-flag-checkered" /> {t('pages.bookClubDetail.cpMarkReached', 'Marquer atteint')}
                  </button>
                )}
                {isAdmin && (
                  <button className="cc-checkpoint__remove-btn" onClick={() => remove(cp.id)}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="cc-rail__empty">{t('pages.bookClubDetail.cpEmpty', 'Aucun jalon défini')}</p>
      )}

      {isAdmin && (
        showForm ? (
          <div className="cc-checkpoint__form">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={t('pages.bookClubDetail.cpLabelPlaceholder', 'Ex: Fin du chapitre 5')}
              maxLength={200}
              className="cc-checkpoint__form-input"
            />
            <input
              type="number"
              min="1"
              value={targetPage}
              onChange={e => setTargetPage(e.target.value)}
              placeholder={t('pages.bookClubDetail.cpPagePlaceholder', 'Page')}
              className="cc-checkpoint__form-input cc-checkpoint__form-input--short"
            />
            <div className="cc-checkpoint__form-actions">
              <button className="cc-btn cc-btn--join" onClick={create} disabled={saving || !label.trim() || !targetPage}>
                {saving ? '...' : t('pages.bookClubDetail.cpAdd', 'Ajouter')}
              </button>
              <button className="cc-btn cc-btn--outline" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Annuler')}
              </button>
            </div>
          </div>
        ) : (
          <button className="cc-checkpoint__add-btn" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus" /> {t('pages.bookClubDetail.cpAddBtn', 'Ajouter un jalon')}
          </button>
        )
      )}
    </div>
  );
}
