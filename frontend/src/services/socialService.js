import api from './api';

const socialService = {
  // ── Follows ──
  followUser: (userId) => api.post('/social/follow/user/', { user_id: userId }),
  followAuthor: (authorId) => api.post('/social/follow/author/', { author_id: authorId }),
  followOrganization: (orgId) => api.post('/social/follow/organization/', { organization_id: orgId }),
  getFollowStatus: (params) => api.get('/social/follow/status/', { params }),
  getMyFollowing: () => api.get('/social/following/'),
  getUserFollowers: (userId) => api.get(`/social/followers/user/${userId}/`),
  getAuthorFollowers: (authorId) => api.get(`/social/followers/author/${authorId}/`),
  getOrgFollowers: (orgId) => api.get(`/social/followers/organization/${orgId}/`),

  // ── Listes de lecture ──
  getLists: (params) => api.get('/social/lists/', { params }),
  getList: (id) => api.get(`/social/lists/${id}/`),
  createList: (data) => api.post('/social/lists/', data),
  updateList: (id, data) => api.patch(`/social/lists/${id}/`, data),
  deleteList: (slug) => api.delete(`/social/lists/${slug}/`),
  addBookToList: (slug, data) => api.post(`/social/lists/${slug}/add_book/`, data),
  removeBookFromList: (slug, bookId) => api.delete(`/social/lists/${slug}/remove_book/${bookId}/`),

  // ── Posts (fil d'actualite) ──
  getFeed: (params) => api.get('/social/posts/', { params }),
  getPost: (id) => api.get(`/social/posts/${id}/`),
  createPost: (data) => api.post('/social/posts/', data),
  updatePost: (id, data) => api.patch(`/social/posts/${id}/`, data),
  deletePost: (id) => api.delete(`/social/posts/${id}/`),
  likePost: (id) => api.post(`/social/posts/${id}/like/`),
  unlikePost: (id) => api.delete(`/social/posts/${id}/like/`),
  getPostComments: (id) => api.get(`/social/posts/${id}/comments/`),
  addPostComment: (id, data) => api.post(`/social/posts/${id}/comments/`, data),
  getUserPosts: (userId) => api.get(`/social/posts/user/${userId}/`),

  // ── Avis plateforme (public) ──
  getFeaturedPlatformReviews: () => api.get('/social/platform-reviews/featured/'),

  // ── Recommandations ──
  getRecommendations: () => api.get('/social/recommendations/'),

  // ── Clubs de lecture (lookup par slug) ──
  getClubs: (params) => api.get('/social/clubs/', { params }),
  getClub: (slug) => api.get(`/social/clubs/${slug}/`),
  createClub: (data) => api.post('/social/clubs/', data),
  updateClub: (slug, data) => api.patch(`/social/clubs/${slug}/`, data),
  deleteClub: (slug) => api.delete(`/social/clubs/${slug}/`),
  joinClub: (slug) => api.post(`/social/clubs/${slug}/join/`),
  leaveClub: (slug) => api.post(`/social/clubs/${slug}/leave/`),
  getClubMessages: (slug, params) => api.get(`/social/clubs/${slug}/messages/`, { params }),
  getNewClubMessages: (slug, afterId) => api.get(`/social/clubs/${slug}/messages/`, { params: { after: afterId } }),
  getOlderClubMessages: (slug, beforeId, limit) => api.get(`/social/clubs/${slug}/messages/`, { params: { before: beforeId, limit: limit || 30 } }),
  sendClubMessage: (slug, data) => api.post(`/social/clubs/${slug}/messages/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  getClubMembers: (slug) => api.get(`/social/clubs/${slug}/members/`),
  updateMemberRole: (slug, memberId, role) => api.patch(`/social/clubs/${slug}/members/${memberId}/role/`, { role }),
  kickMember: (slug, memberId) => api.delete(`/social/clubs/${slug}/members/${memberId}/kick/`),
  approveMember: (slug, memberId) => api.post(`/social/clubs/${slug}/members/${memberId}/approve/`),
  rejectMember: (slug, memberId) => api.post(`/social/clubs/${slug}/members/${memberId}/reject/`),
  inviteToClub: (slug, username) => api.post(`/social/clubs/${slug}/invite/`, { username }),
  getClubMedia: (slug) => api.get(`/social/clubs/${slug}/media/`),
  markClubRead: (slug) => api.post(`/social/clubs/${slug}/mark_read/`),
  deleteClubMessage: (slug, msgId) => api.delete(`/social/clubs/${slug}/messages/${msgId}/`),
  editClubMessage: (slug, msgId, content) => api.patch(`/social/clubs/${slug}/messages/${msgId}/`, { content }),
  reactToMessage: (slug, msgId, emoji) => api.post(`/social/clubs/${slug}/messages/${msgId}/react/`, { emoji }),
  pinMessage: (slug, msgId) => api.post(`/social/clubs/${slug}/messages/${msgId}/pin/`),
  searchMessages: (slug, query) => api.get(`/social/clubs/${slug}/messages/`, { params: { search: query } }),
  updateReadingProgress: (slug, progress) => api.patch(`/social/clubs/${slug}/progress/`, { progress }),
  // Polls
  getPolls: (slug) => api.get(`/social/clubs/${slug}/polls/`),
  createPoll: (slug, title) => api.post(`/social/clubs/${slug}/polls/`, { title }),
  addPollOption: (slug, pollId, bookId) => api.post(`/social/clubs/${slug}/polls/${pollId}/add-option/`, { book_id: bookId }),
  votePoll: (slug, pollId, optionId) => api.post(`/social/clubs/${slug}/polls/${pollId}/vote/${optionId}/`),
  closePoll: (slug, pollId) => api.post(`/social/clubs/${slug}/polls/${pollId}/close/`),
  createPollWithBooks: async (slug, title, bookIds) => {
    const pollRes = await api.post(`/social/clubs/${slug}/polls/`, { title, poll_type: 'BOOK' });
    const pollId = pollRes.data.id;
    for (const bookId of bookIds) {
      await api.post(`/social/clubs/${slug}/polls/${pollId}/add-option/`, { book_id: bookId });
    }
    const fresh = await api.get(`/social/clubs/${slug}/polls/`);
    const polls = Array.isArray(fresh.data) ? fresh.data : [];
    return polls.find(p => p.id === pollId) || pollRes.data;
  },
  createGenericPoll: async (slug, title, textOptions) => {
    const pollRes = await api.post(`/social/clubs/${slug}/polls/`, { title, poll_type: 'GENERIC' });
    const pollId = pollRes.data.id;
    for (const label of textOptions) {
      await api.post(`/social/clubs/${slug}/polls/${pollId}/add-option/`, { text_label: label });
    }
    const fresh = await api.get(`/social/clubs/${slug}/polls/`);
    const polls = Array.isArray(fresh.data) ? fresh.data : [];
    return polls.find(p => p.id === pollId) || pollRes.data;
  },
  // Invitations
  createInviteLink: (slug, expiresDays, maxUses) => api.post(`/social/clubs/${slug}/invite-link/`, { expires_days: expiresDays || 7, max_uses: maxUses || 0 }),
  getInvitePreview: (token) => api.get(`/social/clubs/join/${token}/`),
  joinByLink: (token) => api.post(`/social/clubs/join/${token}/`),

  // ── Signalements ──
  reportMessage: (slug, msgId, data) => api.post(`/social/clubs/${slug}/messages/${msgId}/report/`, data),
  getReports: (slug, params) => api.get(`/social/clubs/${slug}/reports/`, { params }),
  updateReport: (slug, reportId, data) => api.patch(`/social/clubs/${slug}/reports/${reportId}/`, data),

  // ── Sessions (séances programmées) ──
  getClubSessions: (slug) => api.get(`/social/clubs/${slug}/sessions/`),
  createClubSession: (slug, data) => api.post(`/social/clubs/${slug}/sessions/`, data),
  rsvpSession: (slug, sessionId, status) => api.post(`/social/clubs/${slug}/sessions/${sessionId}/rsvp/`, { status }),

  // ── Archives (historique des livres lus) ──
  getClubArchives: (slug) => api.get(`/social/clubs/${slug}/archives/`),
  addClubArchive: (slug, data) => api.post(`/social/clubs/${slug}/archives/`, data),
  // Wishlist
  getWishlist: (slug) => api.get(`/social/clubs/${slug}/wishlist/`),
  suggestBook: (slug, bookId) => api.post(`/social/clubs/${slug}/wishlist/`, { book_id: bookId }),
  voteWishlistItem: (slug, itemId) => api.post(`/social/clubs/${slug}/wishlist/${itemId}/vote/`),
  removeWishlistItem: (slug, itemId) => api.delete(`/social/clubs/${slug}/wishlist/${itemId}/`),
  banMember: (slug, memberId) => api.post(`/social/clubs/${slug}/members/${memberId}/ban/`),
  forwardMessage: (slug, msgId, targetClubSlug) => api.post(`/social/clubs/${slug}/messages/${msgId}/forward/`, { target_club_slug: targetClubSlug }),
  // Checkpoints
  getCheckpoints: (slug) => api.get(`/social/clubs/${slug}/checkpoints/`),
  createCheckpoint: (slug, data) => api.post(`/social/clubs/${slug}/checkpoints/`, data),
  deleteCheckpoint: (slug, cpId) => api.delete(`/social/clubs/${slug}/checkpoints/${cpId}/`),
  reachCheckpoint: (slug, cpId) => api.post(`/social/clubs/${slug}/checkpoints/${cpId}/reach/`),
  getModerationLog: (slug) => api.get(`/social/clubs/${slug}/moderation-log/`),
};

export default socialService;
