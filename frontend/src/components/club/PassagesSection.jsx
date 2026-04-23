/**
 * PassagesSection — Quoted book passages tab
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { fmtTime } from './clubUtils';

export default function PassagesSection({ messages, i18n }) {
  const passages = messages.filter(m => m.message_type === 'QUOTE' && !m.is_deleted);
  return (
    <div className="cc-tab-content">
      {passages.length > 0 ? (
        <div className="cc-passages">
          {passages.map(m => (
            <div key={m.id} className="cc-passage">
              {m.quote_book_detail?.cover_image && <div className="cc-passage__cover"><img src={m.quote_book_detail.cover_image} alt="" /></div>}
              <div className="cc-passage__body">
                <div className="cc-passage__text">« {m.quote_text} »</div>
                <div className="cc-passage__source">— PAGE {m.quote_page} · {(m.quote_book_detail?.title || '').toUpperCase()}</div>
                <div className="cc-passage__meta">{m.author?.full_name || m.author?.username} · {fmtTime(m.created_at, i18n.language)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cc-empty"><p>Aucun passage commenté pour le moment.</p></div>
      )}
    </div>
  );
}
