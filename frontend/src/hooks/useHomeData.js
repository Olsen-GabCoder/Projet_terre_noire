import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import bookService from '../services/bookService';
import { organizationAPI } from '../services/api';
import socialService from '../services/socialService';
import aiService from '../services/aiService';

/**
 * Hook React Query pour les données de la page d'accueil.
 * Cache automatique 5 min (staleTime) + 10 min (gcTime).
 * Les navigations retour affichent le cache instantanément.
 */
export function useHomeData(isAuthenticated, sidebarOpen = false) {
  const bestsellers = useQuery({
    queryKey: ['home', 'bestsellers'],
    queryFn: () => bookService.getBooks({ ordering: '-is_bestseller,-rating', page_size: 8 }),
    select: (data) => data.results || data || [],
  });

  const monthlySelection = useQuery({
    queryKey: ['home', 'monthlySelection'],
    queryFn: async () => {
      const res = await api.get('/analytics/monthly-selection/', { params: { count: 8 } });
      return res.data;
    },
  });

  const newReleases = useQuery({
    queryKey: ['home', 'newReleases'],
    queryFn: () => bookService.getBooks({ ordering: '-created_at', page_size: 6 }),
    select: (data) => data.results || data || [],
  });

  const featuredAuthors = useQuery({
    queryKey: ['home', 'featuredAuthors'],
    queryFn: () => bookService.getFeaturedAuthors(8),
    select: (data) => Array.isArray(data) ? data : data.results || [],
  });

  const recentAuthors = useQuery({
    queryKey: ['home', 'recentAuthors'],
    queryFn: () => bookService.getRecentAuthors(4),
    select: (data) => Array.isArray(data) ? data : data.results || [],
  });

  const organizations = useQuery({
    queryKey: ['home', 'organizations'],
    queryFn: () => organizationAPI.list(),
    select: (data) => {
      const list = Array.isArray(data.data) ? data.data : data.data?.results || [];
      return list.slice(0, 6);
    },
  });

  const stats = useQuery({
    queryKey: ['home', 'statistics'],
    queryFn: () => bookService.getStatistics(),
  });

  const categories = useQuery({
    queryKey: ['home', 'categories'],
    queryFn: () => bookService.getCategories(),
    select: (data) => {
      const list = Array.isArray(data) ? data : data.results || data.data?.results || data.data || [];
      return list.slice(0, 8);
    },
  });

  const clubs = useQuery({
    queryKey: ['home', 'clubs'],
    queryFn: () => socialService.getClubs({ page_size: 5, ordering: '-members_count' }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list.slice(0, 5);
    },
  });

  const lists = useQuery({
    queryKey: ['home', 'lists'],
    queryFn: () => socialService.getLists({ page_size: 1, is_public: true }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list[0] || null;
    },
    enabled: sidebarOpen,
  });

  const posts = useQuery({
    queryKey: ['home', 'posts'],
    queryFn: () => socialService.getFeed({ page_size: 6, scope: 'public' }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list.slice(0, 6);
    },
    enabled: sidebarOpen,
  });

  const testimonials = useQuery({
    queryKey: ['home', 'testimonials'],
    queryFn: () => socialService.getFeaturedPlatformReviews(),
    select: (data) => {
      const list = data.data || data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const marketplace = useQuery({
    queryKey: ['home', 'marketplace'],
    queryFn: () => bookService.getBooks({ has_listings: true, ordering: '-rating', page_size: 4 }),
    select: (data) => data.results || data || [],
  });

  const recommendations = useQuery({
    queryKey: ['home', 'recommendations'],
    queryFn: async () => {
      // Tenter les recommandations IA avec explications
      try {
        const aiData = await aiService.recommend(4);
        const recs = aiData.recommendations || aiData || [];
        const valid = recs.filter(r => r.book).map(r => ({ ...r.book, ai_reason: r.reason }));
        if (valid.length > 0) return valid;
      } catch {}
      // Fallback : recommandations algorithmiques
      const res = await socialService.getRecommendations();
      const list = res.data?.results || res.results || res.data || [];
      return Array.isArray(list) ? list.slice(0, 4) : [];
    },
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000, // 30 min — le backend cache aussi 30 min côté Anthropic
    gcTime: 60 * 60 * 1000,    // 1h en mémoire — pas de re-fetch inutile
  });

  const isLoading = bestsellers.isLoading || newReleases.isLoading;

  const bsData = bestsellers.data || [];
  const nrData = newReleases.data || [];
  const mpData = marketplace.data || [];
  const orData = organizations.data || [];

  // Mixer 4 populaires + 2 récents (sans doublons)
  const auData = useMemo(() => {
    const featured = featuredAuthors.data || [];
    const recent = recentAuthors.data || [];
    const popularIds = new Set(featured.slice(0, 4).map(a => a.id));
    const popular = featured.slice(0, 4);
    const recentUnique = recent.filter(a => !popularIds.has(a.id)).slice(0, 2);
    // Compléter si pas assez de récents uniques
    const extra = featured.slice(4).filter(a => !popularIds.has(a.id) && !recentUnique.some(r => r.id === a.id));
    const result = [...popular, ...recentUnique];
    while (result.length < 6 && extra.length > 0) result.push(extra.shift());
    return result;
  }, [featuredAuthors.data, recentAuthors.data]);
  const catData = categories.data || [];
  const recoData = recommendations.data || [];
  const testiData = testimonials.data || [];
  const postsData = posts.data || [];

  const computedStats = useMemo(() => ({
    books: stats.data?.total_books || bsData.length + nrData.length,
    authors: stats.data?.total_authors || auData.length,
    clubs: stats.data?.total_clubs || 0,
    categories: stats.data?.total_categories || catData.length,
    organizations: orData.length,
  }), [stats.data, bsData.length, nrData.length, auData.length, catData.length, orData.length]);

  const msData = monthlySelection.data || {};
  const monthlyBooks = msData.results || [];
  const monthlyMeta = { month: msData.month || '', year: msData.year || '' };

  return useMemo(() => ({
    bestsellers: bsData,
    newReleases: nrData,
    marketplace: mpData,
    authors: auData,
    organizations: orData,
    categories: catData,
    topClubs: clubs.data || [],
    topList: lists.data || null,
    recentPosts: postsData,
    recommendations: recoData,
    testimonials: testiData,
    monthlySelection: monthlyBooks,
    monthlyMeta,
    stats: computedStats,
    isLoading,
  }), [bsData, nrData, mpData, auData, orData, catData, clubs.data, lists.data, postsData, recoData, testiData, monthlyBooks, monthlyMeta, computedStats, isLoading]);
}
