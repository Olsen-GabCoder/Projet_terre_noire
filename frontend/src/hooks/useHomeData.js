import { useQuery } from '@tanstack/react-query';
import bookService from '../services/bookService';
import { organizationAPI } from '../services/api';
import socialService from '../services/socialService';

/**
 * Hook React Query pour les données de la page d'accueil.
 * Cache automatique 5 min (staleTime) + 10 min (gcTime).
 * Les navigations retour affichent le cache instantanément.
 */
export function useHomeData(isAuthenticated) {
  const bestsellers = useQuery({
    queryKey: ['home', 'bestsellers'],
    queryFn: () => bookService.getBooks({ ordering: '-is_bestseller,-rating', page_size: 12 }),
    select: (data) => data.results || data || [],
  });

  const newReleases = useQuery({
    queryKey: ['home', 'newReleases'],
    queryFn: () => bookService.getBooks({ ordering: '-created_at', page_size: 12 }),
    select: (data) => data.results || data || [],
  });

  const authors = useQuery({
    queryKey: ['home', 'authors'],
    queryFn: async () => {
      const data = await bookService.getFeaturedAuthors(50);
      const list = Array.isArray(data) ? data : data.results || data;
      // Mélanger une seule fois au fetch pour varier l'ordre à chaque visite
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },
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
    queryFn: () => socialService.getClubs({ page_size: 1 }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list[0] || null;
    },
  });

  const lists = useQuery({
    queryKey: ['home', 'lists'],
    queryFn: () => socialService.getLists({ page_size: 1, is_public: true }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list[0] || null;
    },
  });

  const posts = useQuery({
    queryKey: ['home', 'posts'],
    queryFn: () => socialService.getFeed({ page_size: 6, scope: 'public' }),
    select: (data) => {
      const list = data.data?.results || data.results || [];
      return list.slice(0, 6);
    },
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
    queryFn: () => bookService.getBooks({ has_listings: true, ordering: '-rating', page_size: 12 }),
    select: (data) => data.results || data || [],
  });

  const recommendations = useQuery({
    queryKey: ['home', 'recommendations'],
    queryFn: async () => {
      const res = await socialService.getRecommendations();
      const list = res.data?.results || res.results || res.data || [];
      return Array.isArray(list) ? list.slice(0, 8) : [];
    },
    enabled: isAuthenticated,
  });

  const isLoading = bestsellers.isLoading || newReleases.isLoading;

  const computedStats = {
    books: stats.data?.total_books || (bestsellers.data?.length || 0) + (newReleases.data?.length || 0),
    authors: stats.data?.total_authors || authors.data?.length || 0,
    categories: stats.data?.total_categories || categories.data?.length || 0,
    organizations: organizations.data?.length || 0,
  };

  return {
    bestsellers: bestsellers.data || [],
    newReleases: newReleases.data || [],
    marketplace: marketplace.data || [],
    authors: authors.data || [],
    organizations: organizations.data || [],
    categories: categories.data || [],
    topClub: clubs.data || null,
    topList: lists.data || null,
    recentPosts: posts.data || [],
    recommendations: recommendations.data || [],
    testimonials: testimonials.data || [],
    stats: computedStats,
    isLoading,
  };
}
