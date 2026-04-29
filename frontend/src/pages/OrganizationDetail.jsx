import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import organizationService from '../services/organizationService';
import libraryService from '../services/libraryService';
import servicesService from '../services/servicesService';
import socialService from '../services/socialService';
import analyticsService from '../services/analyticsService';
import aiService from '../services/aiService';
import SEO from '../components/SEO';
import BookCard from '../components/BookCard';
import toast from 'react-hot-toast';
import '../styles/OrganizationDetail.css';

const GENRE_LABELS = { ROMAN: 'Roman', NOUVELLE: 'Nouvelle', POESIE: 'Poésie', ESSAI: 'Essai', THEATRE: 'Théâtre', JEUNESSE: 'Jeunesse', BD: 'BD', SCOLAIRE: 'Scolaire', UNIVERSITAIRE: 'Universitaire', RELIGIEUX: 'Religieux', AUTRE: 'Autre' };

function LibraryRecommendations({ orgId, t }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (recs) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const { recommendations } = await aiService.libraryRecommend(orgId);
      setRecs(recommendations || []);
      setOpen(true);
    } catch {
      toast.error('Erreur recommandations IA');
    }
    setLoading(false);
  };

  return (
    <div className="od-lib-recs">
      <button className="od-lib-recs__btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> {t('pages.orgDetail.loadingRecs', 'Analyse en cours...')}</>
          : open
            ? <><i className="fas fa-chevron-up" /> {t('pages.orgDetail.hideRecs', 'Masquer les suggestions')}</>
            : <><i className="fas fa-robot" /> {t('pages.orgDetail.aiRecs', 'Suggestions personnalisées (IA)')}</>
        }
      </button>
      {open && recs?.length > 0 && (
        <div className="od-lib-recs__grid">
          {recs.map((r, i) => (
            <Link key={i} to={`/books/${r.book_id}`} className="od-lib-recs__card">
              {r.book?.cover_image && <img src={r.book.cover_image} alt="" className="od-lib-recs__cover" />}
              <div className="od-lib-recs__info">
                <strong>{r.book?.title || `Livre #${r.book_id}`}</strong>
                {r.book?.author?.full_name && <span className="od-lib-recs__author">{r.book.author.full_name}</span>}
                <p className="od-lib-recs__reason">{r.reason}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {open && recs?.length === 0 && (
        <p className="od-lib-recs__empty">{t('pages.orgDetail.noRecs', 'Empruntez quelques livres pour obtenir des suggestions personnalisées.')}</p>
      )}
    </div>
  );
}
const ORG_TYPE_ICONS = { MAISON_EDITION: 'fas fa-book-open', LIBRAIRIE: 'fas fa-store', BIBLIOTHEQUE: 'fas fa-landmark', IMPRIMERIE: 'fas fa-print' };

const DAYS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const STORE_TYPE_LABELS = { PHYSICAL: 'Physique', ONLINE: 'En ligne', BOTH: 'Physique & en ligne' };
const LIBRARY_TYPE_LABELS = { PUBLIC: 'Publique', UNIVERSITY: 'Universitaire', SCHOOL: 'Scolaire', PRIVATE: 'Privée', NATIONAL: 'Nationale', MUNICIPAL: 'Municipale' };
const PRODUCT_TYPE_LABELS = { NEW: 'Neufs', USED: 'Occasion', RARE: 'Rares', EBOOKS: 'E-books', STATIONERY: 'Papeterie' };
const FACILITY_LABELS = { READING_SPACE: 'Espace lecture', CAFE: 'Café', WIFI: 'WiFi', WHEELCHAIR: 'Accès PMR', PARKING: 'Parking' };
const SERVICE_LABELS = { GIFT_WRAPPING: 'Emballage cadeau', CLICK_COLLECT: 'Click & Collect', DELIVERY: 'Livraison', BOOK_CLUBS: 'Clubs de lecture', EVENTS: 'Événements', CONSIGNMENT: 'Dépôt-vente', WIFI: 'WiFi', PRINTING: 'Impression', SCANNING: 'Scan', STUDY_ROOMS: "Salles d'étude", CHILDREN: 'Espace enfants', AUDIOVISUAL: 'Audiovisuel', WORKSHOPS: 'Ateliers', EXHIBITIONS: 'Expositions' };
const PRINTING_LABELS = { OFFSET: 'Offset', DIGITAL: 'Numérique', LARGE_FORMAT: 'Grand format', SCREEN: 'Sérigraphie', POD: 'À la demande' };
const BINDING_LABELS = { PERFECT: 'Dos carré collé', SADDLE_STITCH: 'Agrafage', HARDCOVER: 'Couverture rigide', SPIRAL: 'Spirale', WIRE_O: 'Wire-O', SEWN: 'Cousu' };
const FINISHING_LABELS = { GLOSS_LAMINATION: 'Pelliculage brillant', MATTE_LAMINATION: 'Pelliculage mat', UV_SPOT: 'Vernis UV sélectif', FOIL: 'Dorure', EMBOSSING: 'Gaufrage', DIE_CUT: 'Découpe', SOFT_TOUCH: 'Soft-touch' };
const SPECIALIZATION_LABELS = { BOOKS: 'Livres', MAGAZINES: 'Magazines', FLYERS: 'Flyers', POSTERS: 'Affiches', PACKAGING: 'Emballages', BUSINESS_CARDS: 'Cartes de visite', BANNERS: 'Banderoles' };
const PAYMENT_LABELS = { CASH: 'Espèces', MOBILE_MONEY: 'Mobile Money', AIRTEL_MONEY: 'Airtel Money', CARD: 'Carte bancaire', VIREMENT: 'Virement' };
const CONDITION_LABELS = { NEW: 'Neuf', USED_GOOD: 'Occasion — Bon état', USED_FAIR: 'Occasion — État correct' };

const formatDate = (ds) => new Date(ds).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const StarRating = ({ rating, size = '0.85rem' }) => (
  <span className="od-stars" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map(n => <i key={n} className={`fa${n <= Math.round(rating) ? 's' : 'r'} fa-star`} />)}
  </span>
);

/* ── Tags helper ── */
const TagList = ({ items, labels, variant }) => {
  if (!items?.length) return null;
  return (
    <div className="od-tags">
      {items.map((v, i) => <span key={i} className={`od-tag ${variant ? `od-tag--${variant}` : ''}`}>{labels?.[v] || v.replace(/_/g, ' ')}</span>)}
    </div>
  );
};

/* ── Horaires d'ouverture ── */
const BusinessHours = ({ hours, t }) => {
  if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return null;
  const DAYS_FR = {
    lundi: t('pages.orgDetail.dayMon', 'Lundi'),
    mardi: t('pages.orgDetail.dayTue', 'Mardi'),
    mercredi: t('pages.orgDetail.dayWed', 'Mercredi'),
    jeudi: t('pages.orgDetail.dayThu', 'Jeudi'),
    vendredi: t('pages.orgDetail.dayFri', 'Vendredi'),
    samedi: t('pages.orgDetail.daySat', 'Samedi'),
    dimanche: t('pages.orgDetail.daySun', 'Dimanche'),
  };
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  return (
    <div className="od-card od-card--compact">
      <h3><i className="fas fa-clock" /> {t('pages.orgDetail.hours', 'Horaires')}</h3>
      <div className="od-hours">
        {DAYS_ORDER.map(day => {
          const slot = hours[day];
          const isToday = day === today;
          const isClosed = !slot || (!slot.open && !slot.close);
          return (
            <div key={day} className={`od-hours__row ${isToday ? 'od-hours__row--today' : ''}`}>
              <span className="od-hours__day">{DAYS_FR[day]}</span>
              <span className={`od-hours__time ${isClosed ? 'od-hours__time--closed' : ''}`}>
                {isClosed ? t('pages.orgDetail.closed', 'Fermé') : `${slot.open} — ${slot.close}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Sections type_specific_data ── */
const BookstoreDetails = ({ data, t }) => {
  if (!data || Object.keys(data).length === 0) return <><h2><i className="fas fa-store" /> Informations librairie</h2><p className="od-cell__text od-cell__text--muted">Informations à venir.</p></>;
  return (
    <>
      <h2><i className="fas fa-store" /> {t('pages.orgDetail.bookstoreInfo', 'Informations librairie')}</h2>
      <div className="od-type-grid">
        {data.store_type && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.type', 'Type')}</span><span className="od-type-item__value">{STORE_TYPE_LABELS[data.store_type] || data.store_type}</span></div>}
        {data.inventory_size && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.titlesInStock', 'Titres en stock')}</span><span className="od-type-item__value">{parseInt(data.inventory_size).toLocaleString('fr-FR')}</span></div>}
      </div>
      {data.genres_carried?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-bookmark" /> {t('pages.orgDetail.availableGenres', 'Genres disponibles')}</h3><TagList items={data.genres_carried} labels={GENRE_LABELS} /></div>}
      {data.product_types?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-box-open" /> {t('pages.orgDetail.products', 'Produits')}</h3><TagList items={data.product_types} labels={PRODUCT_TYPE_LABELS} /></div>}
      {data.services?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-concierge-bell" /> {t('pages.orgDetail.services', 'Services')}</h3><TagList items={data.services} labels={SERVICE_LABELS} /></div>}
      {data.facilities?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-chair" /> {t('pages.orgDetail.facilities', 'Équipements')}</h3><TagList items={data.facilities} labels={FACILITY_LABELS} /></div>}
    </>
  );
};

const LibraryDetails = ({ data, t }) => {
  if (!data || Object.keys(data).length === 0) return <><h2><i className="fas fa-landmark" /> Informations bibliothèque</h2><p className="od-cell__text od-cell__text--muted">Informations à venir.</p></>;
  return (
    <>
      <h2><i className="fas fa-landmark" /> {t('pages.orgDetail.libraryInfo', 'Informations bibliothèque')}</h2>
      <div className="od-type-grid">
        {data.library_type && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.type', 'Type')}</span><span className="od-type-item__value">{LIBRARY_TYPE_LABELS[data.library_type] || data.library_type}</span></div>}
        {data.parent_institution && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.institution', 'Institution')}</span><span className="od-type-item__value">{data.parent_institution}</span></div>}
        {data.book_count && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.books', 'Livres')}</span><span className="od-type-item__value">{parseInt(data.book_count).toLocaleString('fr-FR')}</span></div>}
        {data.digital_count && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.digitalCollection', 'Collection numérique')}</span><span className="od-type-item__value">{parseInt(data.digital_count).toLocaleString('fr-FR')}</span></div>}
        {data.total_seats && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.seats', 'Places assises')}</span><span className="od-type-item__value">{data.total_seats}</span></div>}
        {data.computer_stations && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.computerStations', 'Postes informatiques')}</span><span className="od-type-item__value">{data.computer_stations}</span></div>}
      </div>
      <div className="od-type-grid" style={{ marginTop: '.75rem' }}>
        {data.membership_required !== undefined && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.membership', 'Adhésion')}</span><span className="od-type-item__value">{data.membership_required ? t('pages.orgDetail.membershipRequired', 'Obligatoire') : t('pages.orgDetail.membershipFree', 'Libre')}</span></div>}
        {data.membership_fee && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.membershipFee', 'Cotisation')}</span><span className="od-type-item__value">{parseInt(data.membership_fee).toLocaleString('fr-FR')} FCFA</span></div>}
        {data.loan_duration_days && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.loanDuration', 'Durée de prêt')}</span><span className="od-type-item__value">{data.loan_duration_days} {t('pages.orgDetail.days', 'jours')}</span></div>}
        {data.max_loans && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.maxLoans', 'Emprunts max')}</span><span className="od-type-item__value">{data.max_loans}</span></div>}
      </div>
      {data.services?.length > 0 && <div className="od-cell__section" style={{ marginTop: '.75rem' }}><h3><i className="fas fa-concierge-bell" /> {t('pages.orgDetail.services', 'Services')}</h3><TagList items={data.services} labels={SERVICE_LABELS} /></div>}
    </>
  );
};

const PrinterDetails = ({ data, t }) => {
  if (!data || Object.keys(data).length === 0) return <><h2><i className="fas fa-print" /> Informations imprimerie</h2><p className="od-cell__text od-cell__text--muted">Informations à venir.</p></>;
  return (
    <>
      <h2><i className="fas fa-print" /> {t('pages.orgDetail.printerInfo', 'Informations imprimerie')}</h2>
      <div className="od-type-grid">
        {data.min_order && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.minOrder', 'Quantité min')}</span><span className="od-type-item__value">{data.min_order} {t('pages.orgDetail.copies', 'ex.')}</span></div>}
        {(data.turnaround_min || data.turnaround_max) && (
          <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.turnaround', 'Délais')}</span><span className="od-type-item__value">{data.turnaround_min && data.turnaround_max ? `${data.turnaround_min}–${data.turnaround_max} ${t('pages.orgDetail.days', 'jours')}` : `${data.turnaround_min || data.turnaround_max} ${t('pages.orgDetail.days', 'jours')}`}</span></div>
        )}
        {data.print_on_demand && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.printOnDemand', "Impression à l'unité")}</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-check-circle" /> {t('pages.orgDetail.yes', 'Oui')}</span></div>}
        {data.eco_friendly && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.ecoFriendly', 'Éco-responsable')}</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-leaf" /> {t('pages.orgDetail.yes', 'Oui')}</span></div>}
        {data.design_service && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.designService', 'Service graphique')}</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-palette" /> {t('pages.orgDetail.yes', 'Oui')}</span></div>}
      </div>
      {data.printing_types?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-cog" /> {t('pages.orgDetail.printingTypes', "Types d'impression")}</h3><TagList items={data.printing_types} labels={PRINTING_LABELS} /></div>}
      {data.specializations?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-bullseye" /> {t('pages.orgDetail.specializations', 'Spécialisations')}</h3><TagList items={data.specializations} labels={SPECIALIZATION_LABELS} /></div>}
      {data.binding_options?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-book" /> {t('pages.orgDetail.bindingOptions', 'Options de reliure')}</h3><TagList items={data.binding_options} labels={BINDING_LABELS} /></div>}
      {data.finishing_options?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-wand-magic-sparkles" /> {t('pages.orgDetail.finishingOptions', 'Finitions')}</h3><TagList items={data.finishing_options} labels={FINISHING_LABELS} /></div>}
    </>
  );
};

const OrganizationDetail = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [org, setOrg] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [team, setTeam] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [libraryMembership, setLibraryMembership] = useState(undefined);
  const [loanLoading, setLoanLoading] = useState(null);
  const [printForm, setPrintForm] = useState({ quantity: 100, delivery_address: '', format_specs: {} });
  const [printSubmitting, setPrintSubmitting] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    organizationService.getStorefront(slug)
      .then(res => setOrg(res.data))
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Check follow status
  useEffect(() => {
    if (!org || !isAuthenticated) return;
    socialService.getFollowStatus({ organization_id: org.id })
      .then(r => setFollowing(!!r.data.follows_organization))
      .catch(() => {});
    socialService.getOrgFollowers(org.id)
      .then(r => setFollowersCount(r.data.count ?? r.data.results?.length ?? 0))
      .catch(() => {});
  }, [org, isAuthenticated]);

  // Check library membership for BIBLIOTHEQUE
  useEffect(() => {
    if (!org || org.org_type !== 'BIBLIOTHEQUE' || !isAuthenticated) return;
    libraryService.members.myMemberships()
      .then(r => {
        const list = r.data?.results || r.data || [];
        const match = list.find(m => m.library === org.id && m.is_active && !m.is_expired);
        setLibraryMembership(match || null);
      })
      .catch(() => setLibraryMembership(null));
  }, [org, isAuthenticated]);

  useEffect(() => {
    if (!org) return;
    if (activeTab === 'catalog' && !catalog) organizationService.getCatalog(slug).then(r => {
      const d = r.data;
      setCatalog(Array.isArray(d) ? d : d?.results || d || []);
    }).catch(() => setCatalog([]));
    if (activeTab === 'team' && !team) organizationService.getTeam(slug).then(r => setTeam(r.data)).catch(() => setTeam([]));
    if (activeTab === 'reviews' && !reviews) organizationService.getReviews(slug).then(r => setReviews(r.data)).catch(() => setReviews({ results: [], count: 0 }));
  }, [activeTab, org, slug, catalog, team, reviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await organizationService.createReview(slug, { rating: reviewRating, comment: reviewComment });
      toast.success(t('pages.orgDetail.reviewSent', 'Avis envoyé !'));
      setReviewComment(''); setReviewRating(5);
      const [revRes, orgRes] = await Promise.all([organizationService.getReviews(slug), organizationService.getStorefront(slug)]);
      setReviews(revRes.data); setOrg(orgRes.data);
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || t('pages.orgDetail.reviewError', "Erreur lors de l'envoi."));
    }
    setSubmittingReview(false);
  };

  const handleLibraryRegister = async () => {
    if (!isAuthenticated) { toast.error(t('pages.orgDetail.loginRequired', 'Connectez-vous pour vous inscrire.')); return; }
    try {
      const res = await libraryService.members.register(org.id, {});
      setLibraryMembership(res.data);
      toast.success(t('pages.orgDetail.membershipCreated', 'Inscription réussie !'));
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('pages.orgDetail.membershipError', "Erreur lors de l'inscription."));
    }
  };

  const handleBorrow = async (catalogItemId, loanType = 'PHYSICAL') => {
    if (!libraryMembership) { toast.error(t('pages.orgDetail.membershipRequired', "Vous devez être membre pour emprunter.")); return; }
    setLoanLoading(catalogItemId);
    try {
      await libraryService.loans.create(org.id, { catalog_item: catalogItemId, loan_type: loanType });
      const borrowedItem = (Array.isArray(catalog) ? catalog : []).find(b => b.catalog_item_id === catalogItemId);
      if (borrowedItem) analyticsService.trackBorrowRequest(borrowedItem.id);
      toast.success(t('pages.orgDetail.loanRequested', 'Demande d\'emprunt envoyée !'));
      // Refresh catalog to update availability
      organizationService.getCatalog(slug).then(r => setCatalog(r.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('pages.orgDetail.loanError', "Erreur lors de la demande."));
    }
    setLoanLoading(null);
  };

  const handleReserve = async (catalogItemId) => {
    if (!libraryMembership) { toast.error(t('pages.orgDetail.membershipRequired', "Vous devez être membre pour réserver.")); return; }
    try {
      await libraryService.reservations.create(org.id, { catalog_item: catalogItemId });
      toast.success(t('pages.orgDetail.reservationCreated', 'Réservation enregistrée !'));
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('pages.orgDetail.reservationError', "Erreur lors de la réservation."));
    }
  };

  const handlePrintRequest = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error(t('pages.orgDetail.loginRequired', 'Connectez-vous pour envoyer une demande.')); return; }
    setPrintSubmitting(true);
    try {
      await servicesService.createPrintRequest({
        printer: org.id,
        quantity: printForm.quantity,
        delivery_address: printForm.delivery_address,
        format_specs: printForm.format_specs,
      });
      toast.success(t('pages.orgDetail.printRequestSent', 'Demande de devis envoyée !'));
      setShowPrintForm(false);
      setPrintForm({ quantity: 100, delivery_address: '', format_specs: {} });
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('pages.orgDetail.printRequestError', "Erreur lors de l'envoi."));
    }
    setPrintSubmitting(false);
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) { toast.error(t('pages.orgDetail.loginToFollow', 'Connectez-vous pour suivre cette organisation.')); return; }
    setFollowLoading(true);
    try {
      const res = await socialService.followOrganization(org.id);
      setFollowing(res.data.status === 'followed');
      setFollowersCount(res.data.followers_count ?? followersCount + (res.data.status === 'followed' ? 1 : -1));
      toast.success(res.data.status === 'followed' ? t('pages.orgDetail.followed', 'Organisation suivie !') : t('pages.orgDetail.unfollowed', 'Vous ne suivez plus cette organisation.'));
    } catch { toast.error(t('pages.orgDetail.followError', 'Erreur, réessayez.')); }
    setFollowLoading(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (!org) return <div className="od-not-found"><h2>{t('pages.orgDetail.notFound', 'Organisation introuvable')}</h2><Link to="/organizations">{t('pages.orgDetail.backToDirectory', "Retour à l'annuaire")}</Link></div>;

  const orgIcon = ORG_TYPE_ICONS[org.org_type] || 'fas fa-building';
  const isPublisher = org.org_type === 'MAISON_EDITION';
  const isBookstore = org.org_type === 'LIBRAIRIE';
  const isLibrary = org.org_type === 'BIBLIOTHEQUE';
  const isPrinter = org.org_type === 'IMPRIMERIE';
  const typeData = org.type_specific_data || {};
  const hasTypeData = Object.keys(typeData).length > 0;

  const catalogLabel = isPrinter
    ? t('pages.orgDetail.tabServices', 'Services')
    : t('pages.orgDetail.tabCatalog', 'Catalogue');
  const catalogIcon = isPrinter ? 'fas fa-cog' : 'fas fa-book';

  const TABS = [
    { key: 'about', label: t('pages.orgDetail.tabAbout', 'À propos'), icon: 'fas fa-info-circle' },
    { key: 'catalog', label: catalogLabel, icon: catalogIcon },
    { key: 'team', label: t('pages.orgDetail.tabTeam', 'Équipe'), icon: 'fas fa-users' },
    { key: 'reviews', label: t('pages.orgDetail.tabReviews', 'Avis'), icon: 'fas fa-star' },
  ];

  return (
    <div className="od">
      <SEO title={org.name} description={org.short_description || org.description?.slice(0, 160)} />

      {/* ═══ COUVERTURE (style Facebook) ═══ */}
      <div className="od-cover" style={org.cover_image ? { backgroundImage: `url(${org.cover_image})` } : {}}>
        <div className="od-cover__gradient" />
      </div>

      {/* ═══ PROFIL HEADER ═══ */}
      <div className="od-profile">
        <div className="od-profile__inner">
          <div className="od-profile__logo">
            {org.logo ? <img src={org.logo} alt={org.name} /> : <i className={orgIcon} />}
          </div>
          <div className="od-profile__info">
            <div className="od-profile__name-row">
              <h1>{org.name}</h1>
              {org.is_verified && <span className="od-profile__verified"><i className="fas fa-circle-check" /></span>}
            </div>
            <div className="od-profile__meta">
              <span className="od-profile__type"><i className={orgIcon} /> {org.org_type_display}</span>
              {org.city && <span><i className="fas fa-map-marker-alt" /> {org.city}{org.country ? `, ${org.country}` : ''}</span>}
              {org.founding_year && <span><i className="fas fa-calendar" /> {t('pages.orgDetail.since', 'Depuis')} {org.founding_year}</span>}
              {org.member_count > 0 && <span><i className="fas fa-users" /> {org.member_count} {t('pages.orgDetail.member', 'membre')}{org.member_count > 1 ? 's' : ''}</span>}
            </div>
            {org.short_description && <p className="od-profile__tagline">{org.short_description}</p>}
          </div>
          <div className="od-profile__actions">
            {isPublisher && org.is_accepting_manuscripts && (
              <Link to={`/submit-manuscript?org=${org.slug}`} className="od-btn od-btn--primary">
                <i className="fas fa-paper-plane" /> {t('pages.orgDetail.submitManuscript', 'Soumettre un manuscrit')}
              </Link>
            )}
            <button
              className={`od-btn ${following ? 'od-btn--following' : 'od-btn--follow'}`}
              onClick={handleToggleFollow}
              disabled={followLoading}
            >
              <i className={`fas fa-${following ? 'check' : 'plus'}`} />
              {following ? t('pages.orgDetail.following', 'Suivi') : t('pages.orgDetail.follow', 'Suivre')}
              {followersCount > 0 && <span className="od-btn__count">{followersCount}</span>}
            </button>
            <Link to={`/inquiries/new?org=${org.id}`} className="od-btn od-btn--secondary">
              <i className="fas fa-envelope" /> {t('pages.orgDetail.contact', 'Contacter')}
            </Link>
          </div>
        </div>

        {/* Stats inline enrichies */}
        <div className="od-profile__stats">
          <div className="od-profile__stat">
            <strong>{parseFloat(org.avg_rating || 0).toFixed(1)}</strong>
            <span><StarRating rating={parseFloat(org.avg_rating || 0)} size=".7rem" /> ({org.review_count} {t('pages.orgDetail.reviewsCount', 'avis')})</span>
          </div>
          {org.book_count > 0 && (
            <div className="od-profile__stat">
              <strong>{org.book_count}</strong>
              <span><i className="fas fa-book" style={{ marginRight: 3 }} />{isPublisher ? t('pages.orgDetail.published', 'Publiés') : isBookstore ? t('pages.orgDetail.inCatalog', 'En vente') : t('pages.orgDetail.inCollection', 'Au catalogue')}</span>
            </div>
          )}
          {(org.response_time_days || org.avg_response_days) && (
            <div className="od-profile__stat">
              <strong>~{org.response_time_days || org.avg_response_days}j</strong>
              <span><i className="fas fa-clock" style={{ marginRight: 3 }} />{t('pages.orgDetail.responseTime', 'Temps de réponse')}</span>
            </div>
          )}
          {org.member_count > 0 && (
            <div className="od-profile__stat">
              <strong>{org.member_count}</strong>
              <span><i className="fas fa-users" style={{ marginRight: 3 }} />{t('pages.orgDetail.teamMembers', 'Membres')}</span>
            </div>
          )}
          {followersCount > 0 && (
            <div className="od-profile__stat">
              <strong>{followersCount}</strong>
              <span><i className="fas fa-heart" style={{ marginRight: 3 }} />{t('pages.orgDetail.followers', 'Abonnés')}</span>
            </div>
          )}
          {isPublisher && org.is_accepting_manuscripts && (
            <div className="od-profile__stat od-profile__stat--accent">
              <strong><i className="fas fa-door-open" /></strong>
              <span>{t('pages.orgDetail.manuscriptsOpen', 'Manuscrits ouverts')}</span>
            </div>
          )}
          {(() => {
            if (!org.business_hours || typeof org.business_hours !== 'object') return null;
            const now = new Date();
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const today = dayNames[now.getDay()];
            const todayHours = org.business_hours[today];
            if (!todayHours) return null;
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const isOpen = todayHours.open && todayHours.close && currentTime >= todayHours.open && currentTime <= todayHours.close;
            return (
              <div className={`od-profile__stat ${isOpen ? 'od-profile__stat--open' : 'od-profile__stat--closed'}`}>
                <strong><i className={`fas fa-${isOpen ? 'check-circle' : 'times-circle'}`} /></strong>
                <span>{isOpen ? t('pages.orgDetail.openNow', 'Ouvert') : t('pages.orgDetail.closedNow', 'Fermé')}{todayHours.close && isOpen ? ` · ${t('pages.orgDetail.until', "Jusqu'à")} ${todayHours.close}` : ''}</span>
              </div>
            );
          })()}
        </div>

        {/* Fondateur + ancienneté */}
        {(org.owner_name || org.created_at) && (
          <div className="od-profile__trust">
            {org.owner_name && (
              <span className="od-profile__trust-item">
                <i className="fas fa-user-tie" /> {t('pages.orgDetail.foundedBy', 'Fondée par')} {org.owner_slug ? <Link to={`/u/${org.owner_slug}`}><strong>{org.owner_name}</strong></Link> : <strong>{org.owner_name}</strong>}
              </span>
            )}
            {org.created_at && (
              <span className="od-profile__trust-item">
                <i className="fas fa-clock" /> {t('pages.orgDetail.activeSince', 'Sur Frollot depuis')} {new Date(org.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {org.is_verified && (
              <span className="od-profile__trust-item od-profile__trust-item--verified">
                <i className="fas fa-shield-alt" /> {t('pages.orgDetail.verifiedOrg', 'Organisation vérifiée')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="od-tabs">
        <div className="od-tabs__inner">
          {TABS.map(tab => (
            <button key={tab.key} className={`od-tabs__btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <i className={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENU ═══ */}
      <div className="od-body">

        {/* ── À propos ── */}
        {activeTab === 'about' && (<>
          {/* ═══ GRILLE 2 COLONNES ÉGALES — 10 cartes, 5 lignes ═══ */}
          <div className="od-grid">

            {/* L1 gauche — Présentation */}
            <div className="od-cell">
              <h2><i className="fas fa-align-left" /> Présentation</h2>
              <p className="od-cell__text">{org.description || 'Bienvenue sur notre page. Plus d\'informations bientôt disponibles.'}</p>
            </div>

            {/* L1 droite — Genres & spécialités */}
            <div className="od-cell">
              <h2><i className="fas fa-masks-theater" /> Genres & spécialités</h2>
              {org.accepted_genres?.length > 0 && <div className="od-cell__section"><h3>Genres</h3><div className="od-tags">{org.accepted_genres.map(g => <span key={g} className="od-tag">{GENRE_LABELS[g] || g}</span>)}</div></div>}
              {org.specialties?.length > 0 && <div className="od-cell__section"><h3>Spécialités</h3><div className="od-tags">{org.specialties.map((s, i) => <span key={i} className="od-tag od-tag--specialty">{s}</span>)}</div></div>}
              {org.target_audience?.length > 0 && <div className="od-cell__section"><h3>Public cible</h3><div className="od-tags">{org.target_audience.map((a, i) => <span key={i} className="od-tag">{a}</span>)}</div></div>}
              {org.languages?.length > 0 && <div className="od-cell__section"><h3>Langues</h3><div className="od-tags">{org.languages.map((l, i) => <span key={i} className="od-tag">{l}</span>)}</div></div>}
              {!org.accepted_genres?.length && !org.specialties?.length && !org.target_audience?.length && !org.languages?.length && (
                <p className="od-cell__text od-cell__text--muted">Informations à venir.</p>
              )}
            </div>

            {/* L2 gauche — Chiffres clés */}
            <div className="od-cell">
              <h2><i className="fas fa-chart-pie" /> Chiffres clés</h2>
              <div className="od-key-figures">
                <div className="od-key-figure"><i className="fas fa-book" style={{ color: 'var(--color-primary)' }} /><strong>{org.book_count || 0}</strong><span>{isPublisher ? 'publiés' : isBookstore ? 'en vente' : isLibrary ? 'ouvrages' : 'projets'}</span></div>
                <div className="od-key-figure"><i className="fas fa-users" style={{ color: '#10b981' }} /><strong>{org.member_count || 0}</strong><span>membres</span></div>
                <div className="od-key-figure"><i className="fas fa-star" style={{ color: '#f59e0b' }} /><strong>{parseFloat(org.avg_rating || 0).toFixed(1)}</strong><span>{org.review_count || 0} avis</span></div>
                <div className="od-key-figure"><i className="fas fa-clock" style={{ color: '#8b5cf6' }} /><strong>{org.response_time_days || org.avg_response_days ? `~${org.response_time_days || org.avg_response_days}j` : '—'}</strong><span>réponse</span></div>
                <div className="od-key-figure"><i className="fas fa-heart" style={{ color: '#ec4899' }} /><strong>{followersCount || 0}</strong><span>abonnés</span></div>
                <div className="od-key-figure"><i className="fas fa-calendar" style={{ color: '#6366f1' }} /><strong>{org.founding_year ? new Date().getFullYear() - org.founding_year : '—'}</strong><span>ans</span></div>
              </div>
            </div>

            {/* L2 droite — Contact */}
            <div className="od-cell">
              <h2><i className="fas fa-address-book" /> Contact</h2>
              <div className="od-contact">
                {org.email && <a href={`mailto:${org.email}`}><i className="fas fa-envelope" /> {org.email}</a>}
                {org.phone_number && <a href={`tel:${org.phone_number}`}><i className="fas fa-phone" /> {org.phone_number}</a>}
                {org.whatsapp && <a href={`https://wa.me/${org.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp" /> {org.whatsapp}</a>}
                {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer"><i className="fas fa-globe" /> {org.website}</a>}
                {org.address && <p><i className="fas fa-map-marker-alt" /> {org.address}{org.po_box ? ` — ${org.po_box}` : ''}</p>}
              </div>
            </div>

            {/* L3 gauche — Mission / Ligne éditoriale */}
            <div className="od-cell">
              {isPublisher ? (
                <><h2><i className="fas fa-feather" /> Ligne éditoriale</h2><p className="od-cell__text">{org.editorial_line || 'Notre ligne éditoriale sera bientôt disponible.'}</p></>
              ) : isBookstore ? (
                <><h2><i className="fas fa-bullseye" /> Notre mission</h2><p className="od-cell__text">{org.editorial_line || 'Nous sélectionnons avec soin des ouvrages de qualité pour offrir à nos clients une expérience de lecture unique.'}</p></>
              ) : isLibrary ? (
                <><h2><i className="fas fa-bullseye" /> Notre mission</h2><p className="od-cell__text">{org.editorial_line || 'Faciliter l\'accès au savoir et à la culture pour tous à travers un fonds diversifié et des espaces adaptés.'}</p></>
              ) : (
                <><h2><i className="fas fa-bullseye" /> Notre mission</h2><p className="od-cell__text">{org.editorial_line || 'Accompagner les éditeurs et auteurs dans la réalisation de leurs projets d\'impression avec un savoir-faire de pointe.'}</p></>
              )}
            </div>

            {/* L3 droite — Horaires */}
            <div className="od-cell">
              <h2><i className="fas fa-clock" /> Horaires d'ouverture</h2>
              {org.business_hours && typeof org.business_hours === 'object' && Object.keys(org.business_hours).length > 0 ? (
                <div className="od-hours">
                  {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(day => {
                    const h = org.business_hours[day];
                    if (!h) return null;
                    return <div key={day} className="od-hours__row"><span className="od-hours__day">{day.charAt(0).toUpperCase() + day.slice(1)}</span><span className="od-hours__time">{h.closed ? 'Fermé' : `${h.open} — ${h.close}`}</span></div>;
                  })}
                </div>
              ) : (
                <p className="od-cell__text od-cell__text--muted">Horaires non renseignés.</p>
              )}
            </div>

            {/* L4 gauche — Guide soumission / Engagements */}
            <div className="od-cell">
              {isPublisher && org.submission_guidelines ? (
                <>
                  <h2><i className="fas fa-file-lines" /> Guide de soumission</h2>
                  <p className="od-cell__text">{org.submission_guidelines}</p>
                  {org.required_documents?.length > 0 && <div className="od-cell__section"><h3>Documents requis</h3><div className="od-tags">{org.required_documents.map(d => <span key={d} className="od-tag od-tag--doc"><i className="fas fa-file" /> {d.replace(/_/g, ' ')}</span>)}</div></div>}
                  {org.response_time_days && <p className="od-cell__meta"><i className="fas fa-clock" /> Délai : <strong>{org.response_time_days} jours</strong></p>}
                </>
              ) : (
                <>
                  <h2><i className="fas fa-handshake" /> Nos engagements</h2>
                  <div className="od-engagements">
                    {isBookstore ? <>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Livres soigneusement sélectionnés</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Conseil personnalisé</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Livraison rapide et soignée</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Satisfaction garantie</span></div>
                    </> : isLibrary ? <>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Accès libre et gratuit au catalogue</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Accompagnement et conseils de lecture</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Espaces calmes et accessibles</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Animations et clubs de lecture</span></div>
                    </> : <>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Qualité d'impression professionnelle</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Respect des délais annoncés</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Devis transparent et détaillé</span></div>
                      <div className="od-engagement"><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> <span>Suivi de production en temps réel</span></div>
                    </>}
                  </div>
                </>
              )}
            </div>

            {/* L4 droite — Paiements */}
            <div className="od-cell">
              <h2><i className="fas fa-credit-card" /> Paiements acceptés</h2>
              {org.payment_methods?.length > 0 ? (
                <TagList items={org.payment_methods} labels={PAYMENT_LABELS} />
              ) : (
                <p className="od-cell__text od-cell__text--muted">Moyens de paiement non renseignés.</p>
              )}
            </div>

            {/* L5 gauche — Détails métier */}
            <div className="od-cell">
              {isPublisher ? (
                <>
                  <h2><i className="fas fa-book-open" /> Notre maison d'édition</h2>
                  <div className="od-type-grid">
                    {org.accepted_genres?.length > 0 && <div className="od-type-item"><span className="od-type-item__label">Genres</span><span className="od-type-item__value">{org.accepted_genres.map(g => GENRE_LABELS[g] || g).join(', ')}</span></div>}
                    {org.accepted_languages?.length > 0 && <div className="od-type-item"><span className="od-type-item__label">Langues</span><span className="od-type-item__value">{org.accepted_languages.join(', ')}</span></div>}
                    {org.response_time_days && <div className="od-type-item"><span className="od-type-item__label">Délai</span><span className="od-type-item__value">{org.response_time_days}j</span></div>}
                    <div className="od-type-item"><span className="od-type-item__label">Manuscrits</span><span className="od-type-item__value">{org.is_accepting_manuscripts ? <span style={{ color: '#10b981' }}><i className="fas fa-check-circle" /> Ouvert</span> : <span style={{ color: '#dc2626' }}><i className="fas fa-times-circle" /> Fermé</span>}</span></div>
                  </div>
                </>
              ) : isBookstore ? (
                <BookstoreDetails data={typeData} t={t} />
              ) : isLibrary ? (
                <LibraryDetails data={typeData} t={t} />
              ) : (
                <PrinterDetails data={typeData} t={t} />
              )}
            </div>

            {/* L5 droite — Réseaux sociaux */}
            <div className="od-cell">
              <h2><i className="fas fa-share-alt" /> Réseaux sociaux</h2>
              {org.social_links && Object.values(org.social_links).some(v => v) ? (
                <div className="od-social--grid">
                  {org.social_links.facebook && <a href={org.social_links.facebook} target="_blank" rel="noopener noreferrer" className="od-social__link"><i className="fab fa-facebook" /> Facebook</a>}
                  {org.social_links.instagram && <a href={org.social_links.instagram} target="_blank" rel="noopener noreferrer" className="od-social__link"><i className="fab fa-instagram" /> Instagram</a>}
                  {org.social_links.twitter && <a href={org.social_links.twitter} target="_blank" rel="noopener noreferrer" className="od-social__link"><i className="fab fa-twitter" /> Twitter</a>}
                  {org.social_links.linkedin && <a href={org.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="od-social__link"><i className="fab fa-linkedin" /> LinkedIn</a>}
                  {org.social_links.youtube && <a href={org.social_links.youtube} target="_blank" rel="noopener noreferrer" className="od-social__link"><i className="fab fa-youtube" /> YouTube</a>}
                </div>
              ) : (
                <p className="od-cell__text od-cell__text--muted">Aucun réseau social renseigné.</p>
              )}
            </div>

          </div>

          {/* ── Processus — 4 étapes pour tous ── */}
          <div className="od-card" style={{ marginTop: '.85rem' }}>
            <h2><i className="fas fa-route" /> {t('pages.orgDetail.howItWorks', 'Comment ça marche')}</h2>
            <div className="od-process__steps">
              {isPublisher && <>
                <div className="od-process__step"><div className="od-process__step-num">1</div><div className="od-process__step-body"><strong>Soumission</strong><span>Envoyez votre manuscrit via notre formulaire.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">2</div><div className="od-process__step-body"><strong>Lecture</strong><span>Notre comité évalue votre manuscrit.{org.response_time_days ? ` (~${org.response_time_days}j)` : ''}</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">3</div><div className="od-process__step-body"><strong>Décision</strong><span>Vous recevez notre réponse par email.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">4</div><div className="od-process__step-body"><strong>Publication</strong><span>Édition, impression et mise en vente.</span></div></div>
              </>}
              {isPrinter && <>
                <div className="od-process__step"><div className="od-process__step-num">1</div><div className="od-process__step-body"><strong>Devis</strong><span>Décrivez votre projet et recevez un chiffrage.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">2</div><div className="od-process__step-body"><strong>Confirmation</strong><span>Validez le devis pour lancer la production.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">3</div><div className="od-process__step-body"><strong>Impression</strong><span>Votre livre est imprimé selon vos spécifications.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">4</div><div className="od-process__step-body"><strong>Livraison</strong><span>Réception à l'adresse de votre choix.</span></div></div>
              </>}
              {isLibrary && <>
                <div className="od-process__step"><div className="od-process__step-num">1</div><div className="od-process__step-body"><strong>Inscription</strong><span>Créez votre carte de membre en ligne.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">2</div><div className="od-process__step-body"><strong>Emprunt</strong><span>Choisissez un livre et empruntez-le.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">3</div><div className="od-process__step-body"><strong>Lecture</strong><span>{typeData.loan_duration_days ? `Profitez-en pendant ${typeData.loan_duration_days} jours.` : 'Profitez-en pendant la durée du prêt.'}</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">4</div><div className="od-process__step-body"><strong>Retour</strong><span>Rendez le livre et empruntez-en un autre !</span></div></div>
              </>}
              {isBookstore && <>
                <div className="od-process__step"><div className="od-process__step-num">1</div><div className="od-process__step-body"><strong>Parcourez</strong><span>Explorez notre catalogue de livres.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">2</div><div className="od-process__step-body"><strong>Sélectionnez</strong><span>Neuf ou occasion, choisissez votre édition.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">3</div><div className="od-process__step-body"><strong>Commandez</strong><span>Ajoutez au panier et passez commande.</span></div></div>
                <div className="od-process__step"><div className="od-process__step-num">4</div><div className="od-process__step-body"><strong>Livraison</strong><span>Recevez votre commande chez vous.</span></div></div>
              </>}
            </div>
          </div>

          {/* ── Catalogue récent / Portfolio (tous) ── */}
          {!isPrinter && Array.isArray(catalog) && catalog.length > 0 ? (
            <div className="od-card" style={{ marginTop: '.85rem' }}>
              <h2><i className="fas fa-book-open" /> {isPublisher ? 'Publications récentes' : isBookstore ? 'Nouveautés en rayon' : 'Derniers ajouts au catalogue'}</h2>
              <div className="home-books-grid" style={{ marginTop: '.75rem' }}>
                {catalog.slice(0, 4).map(b => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
              {catalog.length > 4 && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="od-btn od-btn--secondary" onClick={() => setActiveTab('catalog')}>
                    <i className="fas fa-arrow-right" /> Voir les {catalog.length} titres
                  </button>
                </div>
              )}
            </div>
          ) : isPrinter ? (
            <div className="od-card" style={{ marginTop: '.85rem' }}>
              <h2><i className="fas fa-images" /> Portfolio</h2>
              {Array.isArray(catalog) && catalog.recent_projects?.length > 0 ? (
                <div className="od-print-projects" style={{ marginTop: '.5rem' }}>
                  {catalog.recent_projects.map(p => (
                    <div key={p.id} className="od-print-project">
                      {p.book_cover && <img src={p.book_cover} alt={p.book_title} />}
                      <div><strong>{p.book_title}</strong><span>{p.quantity} exemplaires</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="od-card__text" style={{ color: 'var(--color-text-muted-ui)' }}>
                  <i className="fas fa-camera" style={{ marginRight: '.35rem' }} />
                  Notre portfolio de réalisations sera bientôt disponible. Consultez l'onglet Services pour découvrir nos capacités.
                </p>
              )}
            </div>
          ) : (
            <div className="od-card" style={{ marginTop: '.85rem' }}>
              <h2><i className="fas fa-book-open" /> Catalogue</h2>
              <p className="od-card__text" style={{ color: 'var(--color-text-muted-ui)' }}>
                Le catalogue sera bientôt disponible. Revenez prochainement pour découvrir nos titres.
              </p>
            </div>
          )}
        </>)}

        {/* ── Catalogue / Services ── */}
        {activeTab === 'catalog' && (
          <div className="od-catalog">
            {!catalog ? <div className="dashboard-loading"><div className="admin-spinner" /></div>
            : isPrinter ? (
              /* ── Services d'impression pour IMPRIMERIE ── */
              <div className="od-print-services">
                {/* Résumé des capacités */}
                <div className="od-card">
                  <h2><i className="fas fa-print" /> {t('pages.orgDetail.printingCapabilities', "Capacités d'impression")}</h2>
                  {catalog.services && Object.keys(catalog.services).length > 0 ? (
                    <>
                      <div className="od-type-grid">
                        {catalog.services.min_order && <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.minOrder', 'Quantité min')}</span><span className="od-type-item__value">{catalog.services.min_order} ex.</span></div>}
                        {(catalog.services.turnaround_min || catalog.services.turnaround_max) && (
                          <div className="od-type-item"><span className="od-type-item__label">{t('pages.orgDetail.turnaround', 'Délais')}</span><span className="od-type-item__value">{catalog.services.turnaround_min && catalog.services.turnaround_max ? `${catalog.services.turnaround_min}–${catalog.services.turnaround_max} jours` : `${catalog.services.turnaround_min || catalog.services.turnaround_max} jours`}</span></div>
                        )}
                        {catalog.services.print_on_demand && <div className="od-type-item"><span className="od-type-item__label">Impression à l'unité</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-check-circle" /> Oui</span></div>}
                        {catalog.services.eco_friendly && <div className="od-type-item"><span className="od-type-item__label">Éco-responsable</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-leaf" /> Oui</span></div>}
                        {catalog.services.design_service && <div className="od-type-item"><span className="od-type-item__label">Service graphique</span><span className="od-type-item__value od-type-item__value--yes"><i className="fas fa-palette" /> Oui</span></div>}
                      </div>
                      {catalog.services.printing_types?.length > 0 && <div className="od-cell__section" style={{ marginTop: '1rem' }}><h3><i className="fas fa-cog" /> Types d'impression</h3><TagList items={catalog.services.printing_types} labels={PRINTING_LABELS} /></div>}
                      {catalog.services.specializations?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-bullseye" /> Spécialisations</h3><TagList items={catalog.services.specializations} labels={SPECIALIZATION_LABELS} /></div>}
                      {catalog.services.binding_options?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-book" /> Options de reliure</h3><TagList items={catalog.services.binding_options} labels={BINDING_LABELS} /></div>}
                      {catalog.services.finishing_options?.length > 0 && <div className="od-cell__section"><h3><i className="fas fa-wand-magic-sparkles" /> Finitions</h3><TagList items={catalog.services.finishing_options} labels={FINISHING_LABELS} /></div>}
                    </>
                  ) : (
                    <p className="od-card__text">{t('pages.orgDetail.noServiceDetails', 'Détails des services à venir.')}</p>
                  )}
                </div>

                {/* Réalisations récentes */}
                {catalog.recent_projects?.length > 0 && (
                  <div className="od-card" style={{ marginTop: '1.25rem' }}>
                    <h2><i className="fas fa-trophy" /> {t('pages.orgDetail.recentProjects', 'Réalisations')} <span className="od-print-count">{catalog.total_projects} projet{catalog.total_projects > 1 ? 's' : ''} livrés</span></h2>
                    <div className="od-print-projects">
                      {catalog.recent_projects.map(p => (
                        <div key={p.id} className="od-print-project">
                          {p.book_cover && <img src={p.book_cover} alt={p.book_title} />}
                          <div>
                            <strong>{p.book_title}</strong>
                            <span>{p.quantity} exemplaires</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demander un devis */}
                <div className="od-card" style={{ marginTop: '1.25rem' }}>
                  <h2><i className="fas fa-file-invoice" /> {t('pages.orgDetail.requestQuote', 'Demander un devis')}</h2>
                  {!showPrintForm ? (
                    <button className="od-btn od-btn--primary" onClick={() => setShowPrintForm(true)} style={{ width: '100%', justifyContent: 'center' }}>
                      <i className="fas fa-paper-plane" /> {t('pages.orgDetail.startQuoteRequest', 'Commencer une demande')}
                    </button>
                  ) : (
                    <form onSubmit={handlePrintRequest} className="od-print-form">
                      <div className="od-print-form__row">
                        <div className="od-print-form__field">
                          <label>{t('pages.orgDetail.quantity', 'Quantité')} *</label>
                          <input type="number" min="1" value={printForm.quantity} onChange={e => setPrintForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} required />
                        </div>
                      </div>
                      <div className="od-print-form__field">
                        <label>{t('pages.orgDetail.deliveryAddress', 'Adresse de livraison')} *</label>
                        <textarea value={printForm.delivery_address} onChange={e => setPrintForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="Adresse complète..." rows={2} required />
                      </div>
                      <div className="od-print-form__actions">
                        <button type="submit" className="od-btn od-btn--primary" disabled={printSubmitting}>
                          {printSubmitting ? <><i className="fas fa-spinner fa-spin" /> Envoi...</> : <><i className="fas fa-paper-plane" /> Envoyer la demande</>}
                        </button>
                        <button type="button" className="od-btn od-btn--secondary" onClick={() => setShowPrintForm(false)}>Annuler</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : (Array.isArray(catalog) && catalog.length === 0) ? (
              <div className="od-empty"><i className="fas fa-book-open" /><h3>{t('pages.orgDetail.noCatalog', isBookstore ? 'Aucun livre en vente' : 'Aucun livre publié')}</h3><p>{t('pages.orgDetail.catalogSoon', 'Le catalogue sera bientôt disponible.')}</p></div>
            ) : isBookstore ? (
              /* ── Grille LIBRAIRIE avec BookCard + actions ── */
              <div className="home-books-grid">
                {catalog.map(b => {
                  const price = parseInt(b.price);
                  const bookPrice = b.book_price ? parseInt(b.book_price) : null;
                  const alreadyInCart = b.listing_id ? isInCart(b.id, b.listing_id) : false;
                  const handleAdd = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (alreadyInCart) return;
                    addToCart(
                      { id: b.id, title: b.title, slug: b.slug, cover_image: b.cover_image, author: { full_name: b.author }, price: bookPrice || price, format: b.format },
                      1,
                      { id: b.listing_id, price, vendor_id: org.id, vendor_name: org.name, vendor_slug: org.slug }
                    );
                    toast.success(t('pages.orgDetail.addedToCart', 'Ajouté au panier'));
                  };
                  const bookData = { ...b, price: bookPrice || price };
                  return (
                    <div key={b.listing_id || b.id} className="od-bookcard-wrap">
                      <BookCard book={bookData} />
                      <div className="od-bookcard-extra">
                        {b.condition && <span className={`od-book__condition od-book__condition--${b.condition === 'NEW' ? 'new' : 'used'}`}>{CONDITION_LABELS[b.condition] || b.condition}</span>}
                        <div className="od-bookcard-extra__row">
                          {b.in_stock
                            ? <span className="od-book__stock--yes"><i className="fas fa-check-circle" /> {t('pages.orgDetail.inStock', 'En stock')} ({b.stock})</span>
                            : <span className="od-book__stock--no"><i className="fas fa-times-circle" /> {t('pages.orgDetail.outOfStock', 'Rupture')}</span>
                          }
                        </div>
                        {b.in_stock && (
                          <button className={`od-book__cart-btn ${alreadyInCart ? 'od-book__cart-btn--added' : ''}`} onClick={handleAdd} disabled={alreadyInCart}>
                            <i className={`fas fa-${alreadyInCart ? 'check' : 'cart-plus'}`} />
                            {alreadyInCart ? t('pages.orgDetail.inCart', 'Dans le panier') : t('pages.orgDetail.addToCart', 'Ajouter')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isLibrary ? (
              /* ── Grille enrichie pour BIBLIOTHEQUE : disponibilité, emprunt, réservation ── */
              <>
                {/* Bandeau membership */}
                {isAuthenticated && libraryMembership === null && (
                  <div className="od-library-banner">
                    <i className="fas fa-id-card" />
                    <span>{t('pages.orgDetail.notMember', "Vous n'êtes pas membre de cette bibliothèque.")}</span>
                    <button className="od-btn od-btn--primary od-btn--sm" onClick={handleLibraryRegister}>
                      <i className="fas fa-user-plus" /> {t('pages.orgDetail.register', "S'inscrire")}
                    </button>
                  </div>
                )}
                {isAuthenticated && libraryMembership && (
                  <div className="od-library-banner od-library-banner--member">
                    <i className="fas fa-check-circle" />
                    <span>{t('pages.orgDetail.memberOf', 'Membre')} — N° {libraryMembership.membership_number}</span>
                  </div>
                )}
                {isAuthenticated && libraryMembership && (
                  <LibraryRecommendations orgId={org.id} t={t} />
                )}
                <div className="od-lib-grid">
                  {(Array.isArray(catalog) ? catalog : []).map(b => (
                    <div key={b.catalog_item_id || b.id} className="od-lib-card">
                      <Link to={`/books/${b.id}`} className="od-lib-card__cover-link">
                        {b.cover_image ? (
                          <img src={b.cover_image} alt={b.title} className="od-lib-card__cover" />
                        ) : (
                          <div className="od-lib-card__cover od-lib-card__cover--empty">
                            <i className="fas fa-book" />
                          </div>
                        )}
                      </Link>
                      <div className="od-lib-card__body">
                        <Link to={`/books/${b.id}`} className="od-lib-card__title">{b.title}</Link>
                        <span className="od-lib-card__author">{b.author || '\u00A0'}</span>
                        <div className="od-lib-card__infos">
                          <span className={`od-lib-card__avail ${b.in_stock ? 'od-lib-card__avail--yes' : 'od-lib-card__avail--no'}`}>
                            <i className={`fas fa-${b.in_stock ? 'check-circle' : 'times-circle'}`} />
                            {b.in_stock
                              ? `${b.available_copies}/${b.total_copies} ${t('pages.orgDetail.available', 'dispo.')}`
                              : t('pages.orgDetail.unavailable', 'Indisponible')
                            }
                          </span>
                          {b.allows_digital_loan && <span className="od-lib-card__tag"><i className="fas fa-tablet-alt" /> {t('pages.orgDetail.digitalLoan', 'Prêt num.')}</span>}
                          {b.consultation_only
                            ? <span className="od-lib-card__tag od-lib-card__tag--consult"><i className="fas fa-eye" /> {t('pages.orgDetail.consultationOnly', 'Sur place')}</span>
                            : <span className="od-lib-card__tag"><i className="fas fa-calendar-day" /> {b.max_loan_days}j</span>
                          }
                        </div>
                        {libraryMembership && !b.consultation_only && (
                          <div className="od-lib-card__actions">
                            {b.in_stock ? (
                              <>
                                <button className="od-lib-card__btn" onClick={() => handleBorrow(b.catalog_item_id, 'PHYSICAL')} disabled={loanLoading === b.catalog_item_id}>
                                  {loanLoading === b.catalog_item_id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-hand-holding" />}
                                  {t('pages.orgDetail.borrow', 'Emprunter')}
                                </button>
                                {b.allows_digital_loan && (
                                  <button className="od-lib-card__btn od-lib-card__btn--digital" onClick={() => handleBorrow(b.catalog_item_id, 'DIGITAL')} disabled={loanLoading === b.catalog_item_id}>
                                    <i className="fas fa-tablet-alt" /> {t('pages.orgDetail.borrowDigital', 'Numérique')}
                                  </button>
                                )}
                              </>
                            ) : (
                              <button className="od-lib-card__btn od-lib-card__btn--reserve" onClick={() => handleReserve(b.catalog_item_id)}>
                                <i className="fas fa-bell" /> {t('pages.orgDetail.reserve', 'Réserver')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* ── Grille standard pour MAISON_EDITION ── */
              <div className="home-books-grid">
                {catalog.map(b => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Équipe ── */}
        {activeTab === 'team' && (
          <div className="od-team">
            {!team ? <div className="dashboard-loading"><div className="admin-spinner" /></div>
            : team.length === 0 ? (
              <div className="od-empty"><i className="fas fa-users" /><h3>{t('pages.orgDetail.noTeam', 'Aucun membre visible')}</h3></div>
            ) : (
              <div className="od-team__grid">
                {team.map(m => (
                  <Link key={m.id} to={m.user_slug ? `/u/${m.user_slug}` : '#'} className="od-member" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="od-member__avatar">{m.avatar ? <img src={m.avatar} alt={m.user_name} /> : <span>{(m.user_name || '?')[0].toUpperCase()}</span>}</div>
                    <h4>{m.user_name}</h4>
                    <span className="od-member__role">{m.role_display}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Avis ── */}
        {activeTab === 'reviews' && (
          <div className="od-reviews">
            {user && (
              <form onSubmit={handleSubmitReview} className="od-review-form">
                <h3>{t('pages.orgDetail.leaveReview', 'Laisser un avis')}</h3>
                <div className="od-review-form__stars">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" className={`od-star-btn ${n <= reviewRating ? 'active' : ''}`} onClick={() => setReviewRating(n)}><i className="fas fa-star" /></button>
                  ))}
                  <span>{reviewRating}/5</span>
                </div>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder={t('pages.orgDetail.reviewPlaceholder', 'Partagez votre expérience...')} rows={3} />
                <button type="submit" className="od-btn od-btn--primary" disabled={submittingReview}>
                  {submittingReview ? <><i className="fas fa-spinner fa-spin" /> {t('pages.orgDetail.sending', 'Envoi...')}</> : <><i className="fas fa-paper-plane" /> {t('pages.orgDetail.send', 'Envoyer')}</>}
                </button>
              </form>
            )}
            {!reviews ? <div className="dashboard-loading"><div className="admin-spinner" /></div>
            : reviews.results?.length === 0 ? (
              <div className="od-empty"><i className="fas fa-comments" /><h3>{t('pages.orgDetail.noReviews', 'Aucun avis')}</h3><p>{t('pages.orgDetail.beFirst', 'Soyez le premier !')}</p></div>
            ) : (
              <div className="od-reviews__list">
                {reviews.results?.map(r => (
                  <div key={r.id} className="od-review">
                    <div className="od-review__avatar">{(r.user_name || '?')[0].toUpperCase()}</div>
                    <div className="od-review__body">
                      <div className="od-review__header">
                        {r.user_slug ? <Link to={`/u/${r.user_slug}`} style={{ textDecoration: 'none', color: 'inherit' }}><strong>{r.user_name}</strong></Link> : <strong>{r.user_name}</strong>}
                        <StarRating rating={r.rating} size=".75rem" />
                        <span className="od-review__date">{formatDate(r.created_at)}</span>
                      </div>
                      {r.comment && <p>{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDetail;
