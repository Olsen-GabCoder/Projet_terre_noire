/**
 * ArchiveSection — Archives tab with book history
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { Link } from 'react-router-dom';

export default function ArchiveSection({ archives, t, i18n }) {
  return (
    <div className="cc-tab-content">
      {archives.length > 0 ? (
        <div className="cc-archives">
          {archives.map(a => (
            <Link key={a.id} to={`/books/${a.book?.id}`} className="cc-archive">
              {a.book?.cover_image && <div className="cc-archive__cover"><img src={a.book.cover_image} alt="" /></div>}
              <div className="cc-archive__info">
                <div className="cc-archive__title">{a.book?.title}</div>
                <div className="cc-archive__author">{a.book?.author?.full_name || ''}</div>
                {a.finished_at && <div className="cc-archive__date">{t('pages.bookClubDetail.finishedOn')} {new Date(a.finished_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}</div>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="cc-empty"><p>{t('pages.bookClubDetail.noArchives')}</p></div>
      )}
    </div>
  );
}
