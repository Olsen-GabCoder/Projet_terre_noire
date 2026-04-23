/**
 * PollSection — Poll display in conversation + poll creation modal
 * Supports BOOK polls (select books) and GENERIC polls (free text options)
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function optionLabel(opt) {
  if (opt.text_label) return opt.text_label;
  if (opt.book?.title) return opt.book.title;
  return '—';
}

export function ConversationPoll({ activePoll, isMember, isAdmin, myVote, votePollOption, closePollAction, t }) {
  if (!isMember || !activePoll) return null;
  const totalVotes = activePoll.options?.reduce((s, o) => s + o.votes_count, 0) || 0;
  const isClosed = activePoll.status === 'CLOSED';
  const hasVoted = !!myVote;
  const showResults = hasVoted || isClosed;
  const isGeneric = activePoll.poll_type === 'GENERIC';
  return (
    <div className={`cc-conv-poll${isClosed ? ' cc-conv-poll--closed' : ''}`}>
      <div className="cc-conv-poll__header">
        <div className="cc-conv-poll__badge">{isClosed ? t('pages.bookClubDetail.pollClosed', 'Sondage terminé') : (isGeneric ? t('pages.bookClubDetail.pollGenericBadge', 'Sondage') : t('pages.bookClubDetail.pollBookBadge', 'Vote livre'))}</div>
        <div className="cc-conv-poll__by"><i className="fas fa-poll-h" /> {t('pages.bookClubDetail.pollBy')} {activePoll.created_by?.full_name || activePoll.created_by?.username || 'Admin'}</div>
      </div>
      <div className="cc-conv-poll__question">{activePoll.title}</div>
      {!showResults && <div className="cc-conv-poll__instruction">{t('pages.bookClubDetail.pollChooseOption')}</div>}
      {activePoll.options?.length > 0 && (
        <div className="cc-conv-poll__options">
          {activePoll.options.map(opt => {
            const pct = totalVotes > 0 ? Math.round(opt.votes_count / totalVotes * 100) : 0;
            const isWinner = isClosed && opt.votes_count === Math.max(...activePoll.options.map(o => o.votes_count)) && opt.votes_count > 0;
            return (
              <button key={opt.id} className={`cc-conv-poll__option${opt.voted_by_me ? ' cc-conv-poll__option--voted' : ''}${isWinner ? ' cc-conv-poll__option--winner' : ''}`} onClick={() => !isClosed && votePollOption(opt.id)} disabled={isClosed}>
                <div className="cc-conv-poll__radio">{opt.voted_by_me ? <i className="fas fa-check-circle" /> : <i className="far fa-circle" />}</div>
                <div className="cc-conv-poll__option-info">
                  <div className="cc-conv-poll__option-title">
                    {isGeneric ? optionLabel(opt) : <>{opt.book?.title} {opt.book?.author?.full_name && <span>— {opt.book.author.full_name}</span>}</>}
                  </div>
                  {showResults && <div className="cc-conv-poll__bar-wrap"><div className="cc-conv-poll__bar" style={{width: `${pct}%`}} /></div>}
                </div>
                {showResults && <div className="cc-conv-poll__pct"><span>{opt.votes_count}</span> <span className="cc-conv-poll__pct-num">{pct}%</span></div>}
              </button>
            );
          })}
        </div>
      )}
      <div className="cc-conv-poll__footer">
        <span>{t('pages.bookClubDetail.pollTotalVotes', {count: totalVotes})} · {t('pages.bookClubDetail.pollAnonymous')}</span>
        {isAdmin && !isClosed && <button className="cc-conv-poll__close-btn" onClick={closePollAction}>{t('pages.bookClubDetail.closePoll')}</button>}
      </div>
      {!hasVoted && !isClosed && <div className="cc-conv-poll__vote-hint">{t('pages.bookClubDetail.pollChooseOption')}</div>}
    </div>
  );
}

export function PollCreateModal({ show, onClose, slug, socialService, toast, handleApiError, setActivePoll, setMyVote, t }) {
  const [pollType, setPollType] = useState('BOOK'); // BOOK | GENERIC
  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState('');
  const [creating, setCreating] = useState(false);

  // BOOK mode state
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);

  // GENERIC mode state
  const [textOptions, setTextOptions] = useState(['', '']);
  const [newOption, setNewOption] = useState('');

  // Reset when modal opens/closes or type changes
  useEffect(() => {
    if (show) {
      setStep(1);
      setQuestion('');
      setSelectedBooks([]);
      setBookSearch('');
      setBookResults([]);
      setTextOptions(['', '']);
      setNewOption('');
      setCreating(false);
    }
  }, [show]);

  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const bs = await import('../../services/bookService');
        const r = await bs.default.searchBooks(bookSearch);
        const books = Array.isArray(r) ? r : r?.results || [];
        setBookResults(books.slice(0, 10));
      } catch (e) { console.error('Poll search error:', e); setBookResults([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const toggleBook = (book) => {
    setSelectedBooks(prev => {
      const exists = prev.find(b => b.id === book.id);
      if (exists) return prev.filter(b => b.id !== book.id);
      if (prev.length >= 4) return prev;
      return [...prev, {id: book.id, title: book.title, author: book.author?.full_name || '', cover_image: book.cover_image}];
    });
  };

  const addTextOption = () => {
    const val = newOption.trim();
    if (!val || textOptions.length >= 6) return;
    setTextOptions(prev => [...prev.filter(o => o), val]);
    setNewOption('');
  };

  const removeTextOption = (idx) => {
    setTextOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTextOption = (idx, val) => {
    setTextOptions(prev => prev.map((o, i) => i === idx ? val : o));
  };

  const validTextOptions = textOptions.filter(o => o.trim());
  const canProceedBook = selectedBooks.length >= 2;
  const canProceedGeneric = validTextOptions.length >= 2;
  const canProceed = pollType === 'BOOK' ? canProceedBook : canProceedGeneric;

  const publish = async () => {
    if (!question.trim() || !canProceed) return;
    setCreating(true);
    try {
      let poll;
      if (pollType === 'BOOK') {
        poll = await socialService.createPollWithBooks(slug, question.trim(), selectedBooks.map(b => b.id));
      } else {
        poll = await socialService.createGenericPoll(slug, question.trim(), validTextOptions);
      }
      setActivePoll(poll); onClose(); setMyVote(null);
      toast.success(t('pages.bookClubDetail.pollCreatedSuccess'));
    } catch (e) { toast.error(handleApiError(e)); }
    setCreating(false);
  };

  if (!show) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-poll-create" onClick={e => e.stopPropagation()}>
        <div className="cc-poll-create__header">
          <button className="cc-poll-create__close" onClick={onClose}><i className="fas fa-times" /></button>
          <h2>{t('pages.bookClubDetail.createPollTitle')}</h2>
          {step === 1 && <button className="cc-poll-create__next" disabled={!canProceed} onClick={() => setStep(2)}>{t('pages.bookClubDetail.pollNext')}</button>}
        </div>

        {step === 1 ? (
          <div className="cc-poll-create__body">
            {/* Type selector */}
            <div className="cc-poll-create__type-selector">
              <button className={`cc-poll-create__type-btn${pollType === 'BOOK' ? ' cc-poll-create__type-btn--active' : ''}`} onClick={() => setPollType('BOOK')}>
                <i className="fas fa-book" /> {t('pages.bookClubDetail.pollTypeBook', 'Vote livre')}
              </button>
              <button className={`cc-poll-create__type-btn${pollType === 'GENERIC' ? ' cc-poll-create__type-btn--active' : ''}`} onClick={() => setPollType('GENERIC')}>
                <i className="fas fa-list-ul" /> {t('pages.bookClubDetail.pollTypeGeneric', 'Sondage libre')}
              </button>
            </div>

            {pollType === 'BOOK' ? (
              <>
                <div className="cc-poll-create__step-label">{t('pages.bookClubDetail.pollStep1')}</div>
                <div className="cc-poll-create__search-row">
                  <div className="cc-poll-create__search-field">
                    <i className="fas fa-search" />
                    <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder={t('pages.bookClubDetail.pollSearchPlaceholder')} />
                  </div>
                </div>
                <div className="cc-poll-create__filters">
                  {['pollFilterGenre', 'pollFilterAuthor', 'pollFilterAvailability', 'pollFilterLanguage', 'pollFilterMore'].map(k => (
                    <button key={k} className="cc-poll-create__chip">{t(`pages.bookClubDetail.${k}`)}</button>
                  ))}
                </div>
                <div className="cc-poll-create__results">
                  {bookResults.map(b => {
                    const selected = selectedBooks.some(s => s.id === b.id);
                    return (
                      <div key={b.id} className={`cc-poll-create__book${selected ? ' cc-poll-create__book--selected' : ''}`} onClick={() => toggleBook(b)}>
                        <div className={`cc-poll-create__check${selected ? ' cc-poll-create__check--on' : ''}`}>{selected && <i className="fas fa-check" />}</div>
                        {b.cover_image && <img src={b.cover_image} alt="" className="cc-poll-create__cover" />}
                        <div className="cc-poll-create__book-info">
                          <strong>{b.title}</strong>
                          <span>{b.author?.full_name || ''}</span>
                        </div>
                      </div>
                    );
                  })}
                  {bookSearch.length >= 2 && bookResults.length === 0 && <p className="cc-poll-create__empty">Aucun résultat</p>}
                  {bookSearch.length < 2 && <p className="cc-poll-create__hint">{t('pages.bookClubDetail.pollSearchPlaceholder')}</p>}
                </div>
                <div className="cc-poll-create__footer">
                  <span>{t('pages.bookClubDetail.pollSelectedCount', {count: selectedBooks.length})}{selectedBooks.length < 2 && ` — ${t('pages.bookClubDetail.pollMinBooks')}`}</span>
                  <button className="cc-poll-create__next-btn" disabled={!canProceedBook} onClick={() => setStep(2)}>{t('pages.bookClubDetail.pollNext')}</button>
                </div>
              </>
            ) : (
              <>
                <div className="cc-poll-create__step-label">{t('pages.bookClubDetail.pollGenericStep1', 'Ajoutez les options du sondage')}</div>
                <div className="cc-poll-create__text-options">
                  {textOptions.map((opt, i) => (
                    <div key={i} className="cc-poll-create__text-option">
                      <span className="cc-poll-create__preview-num">{i + 1}</span>
                      <input
                        value={opt}
                        onChange={e => updateTextOption(i, e.target.value)}
                        placeholder={t('pages.bookClubDetail.pollOptionPlaceholder', 'Option {{n}}', {n: i + 1})}
                        maxLength={200}
                      />
                      {textOptions.length > 2 && <button className="cc-poll-create__text-remove" onClick={() => removeTextOption(i)}><i className="fas fa-times" /></button>}
                    </div>
                  ))}
                </div>
                {textOptions.length < 6 && (
                  <div className="cc-poll-create__add-option">
                    <input
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      placeholder={t('pages.bookClubDetail.pollAddOption', 'Ajouter une option...')}
                      maxLength={200}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTextOption(); } }}
                    />
                    <button onClick={addTextOption} disabled={!newOption.trim()}><i className="fas fa-plus" /></button>
                  </div>
                )}
                <div className="cc-poll-create__footer">
                  <span>{t('pages.bookClubDetail.pollSelectedCount', {count: validTextOptions.length})}{validTextOptions.length < 2 && ` — ${t('pages.bookClubDetail.pollMinOptions', 'min. 2 options')}`}</span>
                  <button className="cc-poll-create__next-btn" disabled={!canProceedGeneric} onClick={() => setStep(2)}>{t('pages.bookClubDetail.pollNext')}</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="cc-poll-create__body">
            <div className="cc-poll-create__step-label">{t('pages.bookClubDetail.pollStep2')}</div>
            <label className="cc-poll-create__label">{t('pages.bookClubDetail.pollQuestionLabel')}</label>
            <input className="cc-poll-create__question" value={question} onChange={e => setQuestion(e.target.value)} placeholder={pollType === 'GENERIC' ? t('pages.bookClubDetail.pollGenericQuestionPlaceholder', 'Votre question...') : t('pages.bookClubDetail.pollQuestionPlaceholder')} autoFocus />
            <div className="cc-poll-create__preview-label">Options :</div>
            <div className="cc-poll-create__preview-list">
              {pollType === 'BOOK' ? (
                selectedBooks.map((b, i) => (
                  <div key={b.id} className="cc-poll-create__preview-item">
                    <span className="cc-poll-create__preview-num">{i + 1}</span>
                    {b.cover_image && <img src={b.cover_image} alt="" />}
                    <div><strong>{b.title}</strong><span>{b.author}</span></div>
                    <button onClick={() => setSelectedBooks(p => p.filter(x => x.id !== b.id))}><i className="fas fa-times" /></button>
                  </div>
                ))
              ) : (
                validTextOptions.map((opt, i) => (
                  <div key={i} className="cc-poll-create__preview-item">
                    <span className="cc-poll-create__preview-num">{i + 1}</span>
                    <div><strong>{opt}</strong></div>
                  </div>
                ))
              )}
            </div>
            <div className="cc-poll-create__footer">
              <button className="cc-poll-create__back" onClick={() => setStep(1)}><i className="fas fa-arrow-left" /> Retour</button>
              <button className="cc-poll-create__publish" disabled={creating || !question.trim() || !canProceed} onClick={publish}>
                {creating ? t('pages.bookClubDetail.pollPublishing') : t('pages.bookClubDetail.pollPublish')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
