/**
 * MemberList — Participants tab with roles, progress, admin actions, ban
 */
import { ini } from './clubUtils';

export default function MemberList({
  members, club, user, isAdmin, isMod,
  inviteInput, setInviteInput, inviting, invite,
  changeRole, kick, ban, t,
}) {
  return (
    <div className="cc-tab-content">
      {isAdmin && <div className="cc-sec">
        <div className="cc-invite">
          <input value={inviteInput} onChange={e => setInviteInput(e.target.value)} placeholder="Inviter par nom d'utilisateur ou email" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); invite(); } }} />
          <button onClick={invite} disabled={inviting || !inviteInput.trim()}>{inviting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-plus" />}</button>
        </div>
      </div>}
      <div className="cc-members">
        {members.map(m => {
          const isCreator = m.user?.id === club.creator?.id;
          const isSelf = m.user?.id === user?.id;
          const canChangeRole = isAdmin && !isCreator && !isSelf && !m.is_banned;
          const canKick = isMod && !isCreator && !isSelf && !m.is_banned && (isAdmin || m.role === 'MEMBER');
          const canBan = isMod && !isCreator && !isSelf && !m.is_banned && (isAdmin || m.role === 'MEMBER');
          return (
            <div key={m.id} className={`cc-member${m.is_banned ? ' cc-member--banned' : ''}`}>
              <div className="cc-member__av">{m.user?.profile_image ? <img src={m.user.profile_image} alt="" /> : <span>{ini(m.user?.full_name || m.user?.username)}</span>}</div>
              <div className="cc-member__info">
                <div className="cc-member__top">
                  <strong>{m.user?.full_name || m.user?.username}</strong>
                  {m.is_banned && <span className="cc-member__badge cc-member__badge--banned">{t('pages.bookClubDetail.banned', 'Banni')}</span>}
                  {!m.is_banned && isCreator && <span className="cc-member__badge cc-member__badge--creator">{t('pages.bookClubDetail.creator', 'Créateur')}</span>}
                  {!m.is_banned && !isCreator && m.role === 'ADMIN' && <span className="cc-member__badge">{t('pages.bookClubDetail.admin')}</span>}
                  {!m.is_banned && !isCreator && m.role === 'MODERATOR' && <span className="cc-member__badge cc-member__badge--mod">{t('pages.bookClubDetail.moderator')}</span>}
                  {!m.is_banned && !isCreator && m.role === 'MEMBER' && <span className="cc-member__badge cc-member__badge--member">{t('pages.bookClubDetail.member', 'Membre')}</span>}
                </div>
                {!m.is_banned && club.current_book && (
                  <div className="cc-member__progress">
                    <div className="cc-member__progress-bar"><div className="cc-member__progress-fill" style={{width: `${m.reading_progress || 0}%`}} /></div>
                    <span>{m.reading_progress || 0}%</span>
                  </div>
                )}
              </div>
              {!m.is_banned && (canChangeRole || canKick || canBan) && <div className="cc-member__actions">
                {canChangeRole && (
                  m.role === 'MEMBER' ? <>
                    <button onClick={() => changeRole(m.id, 'MODERATOR')} title={t('pages.bookClubDetail.promoteToMod', 'Promouvoir modérateur')}><i className="fas fa-shield-alt" /></button>
                    <button onClick={() => changeRole(m.id, 'ADMIN')} title={t('pages.bookClubDetail.promoteToAdmin', 'Promouvoir admin')}><i className="fas fa-arrow-up" /></button>
                  </> : m.role === 'MODERATOR' ? <>
                    <button onClick={() => changeRole(m.id, 'ADMIN')} title={t('pages.bookClubDetail.promoteToAdmin', 'Promouvoir admin')}><i className="fas fa-arrow-up" /></button>
                    <button onClick={() => changeRole(m.id, 'MEMBER')} title={t('pages.bookClubDetail.demoteToMember', 'Rétrograder membre')}><i className="fas fa-arrow-down" /></button>
                  </> :
                    <button onClick={() => changeRole(m.id, 'MEMBER')} title={t('pages.bookClubDetail.demoteToMember', 'Rétrograder membre')}><i className="fas fa-arrow-down" /></button>
                )}
                {canKick && <button onClick={() => kick(m.id, m.user?.full_name || m.user?.username)} title={t('pages.bookClubDetail.kickMember', 'Exclure')} className="cc-member__kick"><i className="fas fa-user-slash" /></button>}
                {canBan && <button onClick={() => ban(m.id, m.user?.full_name || m.user?.username)} title={t('pages.bookClubDetail.banMember', 'Bannir')} className="cc-member__ban"><i className="fas fa-ban" /></button>}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
