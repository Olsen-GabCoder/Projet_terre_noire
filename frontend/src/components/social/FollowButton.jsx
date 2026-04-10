import { useState } from 'react';
import socialService from '../../services/socialService';
import { useAuth } from '../../context/AuthContext';

const FollowButton = ({ type, id, initialFollowed = false, onToggle }) => {
  const { isAuthenticated } = useAuth();
  const [followed, setFollowed] = useState(initialFollowed);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      let res;
      if (type === 'user') res = await socialService.followUser(id);
      else if (type === 'author') res = await socialService.followAuthor(id);
      else if (type === 'organization') res = await socialService.followOrganization(id);
      setFollowed(res.data.followed);
      onToggle?.(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`follow-btn ${followed ? 'follow-btn--active' : ''}`}
      onClick={handleToggle}
      disabled={loading}
    >
      <i className={followed ? 'fas fa-user-check' : 'fas fa-user-plus'} />
      {followed ? ' Suivi' : ' Suivre'}
    </button>
  );
};

export default FollowButton;
