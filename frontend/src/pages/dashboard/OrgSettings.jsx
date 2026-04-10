import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import organizationService from '../../services/organizationService';
import { organizationAPI, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const GENRE_OPTIONS = [
  { value: 'ROMAN', label: 'Roman' }, { value: 'NOUVELLE', label: 'Nouvelle' },
  { value: 'POESIE', label: 'Poésie' }, { value: 'ESSAI', label: 'Essai' },
  { value: 'THEATRE', label: 'Théâtre' }, { value: 'JEUNESSE', label: 'Jeunesse' },
  { value: 'BD', label: 'BD' }, { value: 'AUTRE', label: 'Autre' },
];
const LANG_OPTIONS = [
  { value: 'FR', label: 'Français' }, { value: 'EN', label: 'Anglais' },
  { value: 'AR', label: 'Arabe' }, { value: 'PT', label: 'Portugais' }, { value: 'ES', label: 'Espagnol' },
];
const AUDIENCE_OPTIONS = [
  { value: 'ADULTE', label: 'Adulte' }, { value: 'JEUNESSE', label: 'Jeunesse' },
  { value: 'UNIVERSITAIRE', label: 'Universitaire' }, { value: 'PROFESSIONNEL', label: 'Professionnel' },
];
const DOC_OPTIONS = [
  { value: 'MANUSCRIT', label: 'Manuscrit complet' }, { value: 'SYNOPSIS', label: 'Synopsis' },
  { value: 'LETTRE_MOTIVATION', label: 'Lettre de motivation' }, { value: 'CV', label: 'CV' },
  { value: 'PHOTO', label: 'Photo' }, { value: 'EXTRAIT', label: 'Extrait (50 pages)' },
];
const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Espèces' }, { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'CARD', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
];
const SOCIAL_KEYS = [
  { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook' },
  { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
  { key: 'twitter', label: 'Twitter / X', icon: 'fab fa-twitter' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin' },
  { key: 'youtube', label: 'YouTube', icon: 'fab fa-youtube' },
];

const ChipSelect = ({ options, selected, onChange }) => (
  <div className="org-settings__genres">
  const { t } = useTranslation();
    {options.map(o => (
      <button key={o.value} type="button" className={`org-settings__genre-chip ${selected.includes(o.value) ? 'active' : ''}`}
        onClick={() => onChange(selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value])}>
        {selected.includes(o.value) && <i className="fas fa-check" />} {o.label}
      </button>
    ))}
  </div>
);

const TagInput = ({ tags, onChange, placeholder }) => {
  const [val, setVal] = useState('');
  const add = () => { const v = val.trim(); if (v && !tags.includes(v)) { onChange([...tags, v]); setVal(''); } };
  return (
    <>
      <div className="org-settings__specialties">
        {tags.map(t => <span key={t} className="org-settings__specialty-chip">{t}<button type="button" onClick={() => onChange(tags.filter(x => x !== t))}><i className="fas fa-times" /></button></span>)}
      </div>
      <div className="org-settings__add-specialty">
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="dashboard-btn dashboard-btn--secondary" onClick={add}><i className="fas fa-plus" /></button>
      </div>
    </>
  );
};

const OrgSettings = () => {
  const { id: orgId } = useParams();
  const { hasOrgRole } = useAuth();
  const canManage = hasOrgRole(Number(orgId), 'PROPRIETAIRE') || hasOrgRole(Number(orgId), 'ADMINISTRATEUR');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [org, setOrg] = useState(null);
  const [orgType, setOrgType] = useState('');

  const [form, setForm] = useState({
    name: '', description: '', short_description: '',
    email: '', phone_number: '', whatsapp: '', website: '', address: '', po_box: '', city: '', country: 'Gabon',
    founding_year: '', languages: [],
    is_accepting_manuscripts: false, accepted_genres: [], accepted_languages: [],
    specialties: [], submission_guidelines: '', response_time_days: '',
    required_documents: [], simultaneous_submissions: true,
    editorial_line: '', target_audience: [],
    social_links: {}, payment_methods: [], type_specific_data: {},
    business_hours: {},
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const logoRef = useRef(null);
  const coverRef = useRef(null);

  useEffect(() => {
    organizationAPI.get(orgId)
      .then((res) => {
        const d = res.data;
        setOrg(d);
        setOrgType(d.org_type || '');
        setForm({
          name: d.name || '', description: d.description || '', short_description: d.short_description || '',
          email: d.email || '', phone_number: d.phone_number || '', whatsapp: d.whatsapp || '',
          website: d.website || '', address: d.address || '', po_box: d.po_box || '',
          city: d.city || '', country: d.country || 'Gabon',
          founding_year: d.founding_year || '', languages: d.languages || [],
          is_accepting_manuscripts: d.is_accepting_manuscripts || false,
          accepted_genres: d.accepted_genres || [], accepted_languages: d.accepted_languages || [],
          specialties: d.specialties || [], submission_guidelines: d.submission_guidelines || '',
          response_time_days: d.response_time_days || '',
          required_documents: d.required_documents || [], simultaneous_submissions: d.simultaneous_submissions ?? true,
          editorial_line: d.editorial_line || '', target_audience: d.target_audience || [],
          social_links: d.social_links || {}, payment_methods: d.payment_methods || [],
          type_specific_data: d.type_specific_data || {},
          business_hours: d.business_hours || {},
        });
        if (d.logo) setLogoPreview(d.logo);
        if (d.cover_image) setCoverPreview(d.cover_image);
      })
      .catch(() => setError("Impossible de charger l'organisation."))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const setField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const setTypeData = (key, value) => setForm(prev => ({ ...prev, type_specific_data: { ...prev.type_specific_data, [key]: value } }));
  const handleSocial = (key, value) => setForm(prev => ({ ...prev, social_links: { ...prev.social_links, [key]: value } }));
  const handleHours = (day, field, value) => setForm(prev => ({
    ...prev, business_hours: { ...prev.business_hours, [day]: { ...(prev.business_hours[day] || {}), [field]: value } }
  }));

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image trop volumineuse. Max 5 MB.'); return; }
    const preview = URL.createObjectURL(file);
    if (type === 'logo') { setLogoFile(file); setLogoPreview(preview); } else { setCoverFile(file); setCoverPreview(preview); }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      ['name','description','short_description','email','phone_number','whatsapp','website','address','po_box','city','country','submission_guidelines','editorial_line'].forEach(k => fd.append(k, form[k]));
      if (form.founding_year) fd.append('founding_year', form.founding_year);
      if (form.response_time_days) fd.append('response_time_days', form.response_time_days);
      fd.append('is_accepting_manuscripts', form.is_accepting_manuscripts);
      fd.append('simultaneous_submissions', form.simultaneous_submissions);
      ['accepted_genres','accepted_languages','specialties','languages','required_documents','target_audience','payment_methods'].forEach(k => fd.append(k, JSON.stringify(form[k] || [])));
      ['social_links','type_specific_data','business_hours'].forEach(k => fd.append(k, JSON.stringify(form[k] || {})));
      if (logoFile) fd.append('logo', logoFile);
      if (coverFile) fd.append('cover_image', coverFile);

      const res = await organizationService.updateOrganization(orgId, fd);
      setSuccess('Organisation mise à jour avec succès.');
      setOrg(res.data.organization || res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(handleApiError(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (!canManage) return <div className="dashboard-alert dashboard-alert--error">Vous n'avez pas la permission de modifier cette organisation.</div>;

  const isPublisher = orgType === 'MAISON_EDITION';
  const isBookstore = orgType === 'LIBRAIRIE';
  const isLibrary = orgType === 'BIBLIOTHEQUE';
  const isPrinter = orgType === 'IMPRIMERIE';

  return (
    <div className="org-settings">
      <div className="dashboard-home__header">
        <h1><i className="fas fa-cog" /> Paramètres</h1>
        <p className="dashboard-home__subtitle">{org?.name}</p>
      </div>

      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}
      {success && <div className="dashboard-alert dashboard-alert--success">{success}</div>}

      <form onSubmit={handleSubmit} className="org-settings__form">

        {/* ── Identité visuelle ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-image" /> Identité visuelle</h2></div>
          <div className="dashboard-card__body">
            <div className="org-settings__images">
              <div className="org-settings__image-group">
                <label>Logo</label>
                <div className="org-settings__image-preview org-settings__image-preview--logo" onClick={() => logoRef.current?.click()}>
                  {logoPreview ? <img src={logoPreview} alt="Logo" /> : <div className="org-settings__image-placeholder"><i className="fas fa-camera" /><span>Ajouter</span></div>}
                  <div className="org-settings__image-overlay"><i className="fas fa-camera" /></div>
                </div>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'logo')} />
                <span className="org-settings__hint">Carré, max 5 MB</span>
              </div>
              <div className="org-settings__image-group">
                <label>Couverture</label>
                <div className="org-settings__image-preview org-settings__image-preview--cover" onClick={() => coverRef.current?.click()}>
                  {coverPreview ? <img src={coverPreview} alt="Cover" /> : <div className="org-settings__image-placeholder"><i className="fas fa-panorama" /><span>Ajouter</span></div>}
                  <div className="org-settings__image-overlay"><i className="fas fa-camera" /></div>
                </div>
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'cover')} />
                <span className="org-settings__hint">16:9, max 5 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Informations générales ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-info-circle" /> Informations générales</h2></div>
          <div className="dashboard-card__body">
            <div className="org-settings__grid">
              <div className="org-settings__field"><label>Nom *</label><input name="name" value={form.name} onChange={handleChange} required /></div>
              <div className="org-settings__field"><label>Année de création</label><input name="founding_year" type="number" value={form.founding_year} onChange={handleChange} min="1800" max={new Date().getFullYear()} /></div>
              <div className="org-settings__field org-settings__field--full"><label>Accroche / slogan</label><input name="short_description" value={form.short_description} onChange={handleChange} maxLength={280} placeholder="Phrase courte pour les cartes" /></div>
              <div className="org-settings__field org-settings__field--full"><label>Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Histoire, mission, valeurs..." /></div>
              <div className="org-settings__field org-settings__field--full"><label>Langues de travail</label><ChipSelect options={LANG_OPTIONS} selected={form.languages} onChange={v => setField('languages', v)} /></div>
            </div>
          </div>
        </div>

        {/* ── Contact ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-address-book" /> Contact</h2></div>
          <div className="dashboard-card__body">
            <div className="org-settings__grid">
              <div className="org-settings__field"><label><i className="fas fa-envelope" /> Email</label><input type="email" name="email" value={form.email} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fas fa-phone" /> Téléphone</label><input name="phone_number" value={form.phone_number} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fab fa-whatsapp" /> WhatsApp</label><input name="whatsapp" value={form.whatsapp} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fas fa-globe" /> Site web</label><input type="url" name="website" value={form.website} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fas fa-map-marker-alt" /> Ville</label><input name="city" value={form.city} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fas fa-flag" /> Pays</label><input name="country" value={form.country} onChange={handleChange} /></div>
              <div className="org-settings__field"><label><i className="fas fa-mailbox" /> Boîte postale</label><input name="po_box" value={form.po_box} onChange={handleChange} placeholder="BP 1234" /></div>
              <div className="org-settings__field org-settings__field--full"><label><i className="fas fa-home" /> Adresse</label><textarea name="address" value={form.address} onChange={handleChange} rows={2} /></div>
            </div>
          </div>
        </div>

        {/* ── Réseaux sociaux ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-share-alt" /> Réseaux sociaux</h2></div>
          <div className="dashboard-card__body">
            <div className="org-settings__grid">
              {SOCIAL_KEYS.map(s => (
                <div key={s.key} className="org-settings__field"><label><i className={s.icon} /> {s.label}</label><input value={form.social_links[s.key] || ''} onChange={e => handleSocial(s.key, e.target.value)} placeholder={`https://${s.key}.com/...`} /></div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Paiements ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-credit-card" /> Moyens de paiement</h2></div>
          <div className="dashboard-card__body">
            <ChipSelect options={PAYMENT_OPTIONS} selected={form.payment_methods} onChange={v => setField('payment_methods', v)} />
          </div>
        </div>

        {/* ── Horaires d'ouverture ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-clock" /> Horaires d'ouverture</h2></div>
          <div className="dashboard-card__body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(day => {
                const h = form.business_hours[day] || {};
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    <span style={{ width: 80, fontWeight: 600, fontSize: '.85rem', color: 'var(--color-text-heading)', textTransform: 'capitalize' }}>{day}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={h.closed || false} onChange={e => handleHours(day, 'closed', e.target.checked)} />
                      Fermé
                    </label>
                    {!h.closed && (
                      <>
                        <input type="time" value={h.open || '09:00'} onChange={e => handleHours(day, 'open', e.target.value)}
                          style={{ padding: '.35rem .5rem', border: '1px solid var(--color-border-card)', borderRadius: 6, fontSize: '.82rem', fontFamily: 'inherit', background: 'var(--color-bg-page)', color: 'var(--color-text-heading)' }} />
                        <span style={{ color: 'var(--color-text-muted-ui)', fontSize: '.82rem' }}>—</span>
                        <input type="time" value={h.close || '18:00'} onChange={e => handleHours(day, 'close', e.target.value)}
                          style={{ padding: '.35rem .5rem', border: '1px solid var(--color-border-card)', borderRadius: 6, fontSize: '.82rem', fontFamily: 'inherit', background: 'var(--color-bg-page)', color: 'var(--color-text-heading)' }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── MAISON D'ÉDITION : Manuscrits & édition ── */}
        {isPublisher && (
          <div className="dashboard-card">
            <div className="dashboard-card__header"><h2><i className="fas fa-book-open" /> Manuscrits & édition</h2></div>
            <div className="dashboard-card__body">
              <div className="org-settings__grid">
                <div className="org-settings__field org-settings__field--full">
                  <label className="org-settings__checkbox-label"><input type="checkbox" name="is_accepting_manuscripts" checked={form.is_accepting_manuscripts} onChange={handleChange} /><span>Accepter les soumissions de manuscrits</span></label>
                </div>
                <div className="org-settings__field org-settings__field--full"><label>Genres acceptés</label><ChipSelect options={GENRE_OPTIONS} selected={form.accepted_genres} onChange={v => setField('accepted_genres', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Langues acceptées</label><ChipSelect options={LANG_OPTIONS} selected={form.accepted_languages} onChange={v => setField('accepted_languages', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Public cible</label><ChipSelect options={AUDIENCE_OPTIONS} selected={form.target_audience} onChange={v => setField('target_audience', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Documents requis</label><ChipSelect options={DOC_OPTIONS} selected={form.required_documents} onChange={v => setField('required_documents', v)} /></div>
                <div className="org-settings__field"><label><i className="fas fa-clock" /> Délai de réponse (jours)</label><input name="response_time_days" type="number" value={form.response_time_days} onChange={handleChange} min="1" max="365" /></div>
                <div className="org-settings__field"><label className="org-settings__checkbox-label"><input type="checkbox" name="simultaneous_submissions" checked={form.simultaneous_submissions} onChange={handleChange} /><span>Soumissions simultanées</span></label></div>
                <div className="org-settings__field org-settings__field--full"><label>Spécialités</label><TagInput tags={form.specialties} onChange={v => setField('specialties', v)} placeholder="Ex: Littérature africaine" /></div>
                <div className="org-settings__field org-settings__field--full"><label>Ligne éditoriale</label><textarea name="editorial_line" value={form.editorial_line} onChange={handleChange} rows={3} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Guide de soumission</label><textarea name="submission_guidelines" value={form.submission_guidelines} onChange={handleChange} rows={4} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ── LIBRAIRIE ── */}
        {isBookstore && (
          <div className="dashboard-card">
            <div className="dashboard-card__header"><h2><i className="fas fa-store" /> Paramètres librairie</h2></div>
            <div className="dashboard-card__body">
              <div className="org-settings__grid">
                <div className="org-settings__field">
                  <label>Type</label>
                  <select value={form.type_specific_data.store_type || ''} onChange={e => setTypeData('store_type', e.target.value)}>
                    <option value="">—</option><option value="PHYSICAL">Physique</option><option value="ONLINE">En ligne</option><option value="BOTH">Les deux</option>
                  </select>
                </div>
                <div className="org-settings__field"><label>Titres en stock</label><input type="number" value={form.type_specific_data.inventory_size || ''} onChange={e => setTypeData('inventory_size', e.target.value)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Genres disponibles</label>
                  <ChipSelect options={[...GENRE_OPTIONS, { value: 'SCOLAIRE', label: 'Scolaire' }, { value: 'UNIVERSITAIRE', label: 'Universitaire' }, { value: 'RELIGIEUX', label: 'Religieux' }]} selected={form.type_specific_data.genres_carried || []} onChange={v => setTypeData('genres_carried', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Produits</label>
                  <ChipSelect options={[{ value: 'NEW', label: 'Neufs' }, { value: 'USED', label: 'Occasion' }, { value: 'RARE', label: 'Rares' }, { value: 'EBOOKS', label: 'E-books' }, { value: 'STATIONERY', label: 'Papeterie' }]} selected={form.type_specific_data.product_types || []} onChange={v => setTypeData('product_types', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Services</label>
                  <ChipSelect options={[{ value: 'GIFT_WRAPPING', label: 'Emballage cadeau' }, { value: 'CLICK_COLLECT', label: 'Click & Collect' }, { value: 'DELIVERY', label: 'Livraison' }, { value: 'BOOK_CLUBS', label: 'Clubs de lecture' }, { value: 'EVENTS', label: 'Événements' }, { value: 'CONSIGNMENT', label: 'Dépôt-vente' }]} selected={form.type_specific_data.services || []} onChange={v => setTypeData('services', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Équipements</label>
                  <ChipSelect options={[{ value: 'READING_SPACE', label: 'Espace lecture' }, { value: 'CAFE', label: 'Café' }, { value: 'WIFI', label: 'WiFi' }, { value: 'WHEELCHAIR', label: 'Accès PMR' }, { value: 'PARKING', label: 'Parking' }]} selected={form.type_specific_data.facilities || []} onChange={v => setTypeData('facilities', v)} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ── BIBLIOTHÈQUE ── */}
        {isLibrary && (
          <div className="dashboard-card">
            <div className="dashboard-card__header"><h2><i className="fas fa-landmark" /> Paramètres bibliothèque</h2></div>
            <div className="dashboard-card__body">
              <div className="org-settings__grid">
                <div className="org-settings__field">
                  <label>Type</label>
                  <select value={form.type_specific_data.library_type || ''} onChange={e => setTypeData('library_type', e.target.value)}>
                    <option value="">—</option><option value="PUBLIC">Publique</option><option value="UNIVERSITY">Universitaire</option><option value="SCHOOL">Scolaire</option><option value="PRIVATE">Privée</option><option value="NATIONAL">Nationale</option><option value="MUNICIPAL">Municipale</option>
                  </select>
                </div>
                <div className="org-settings__field"><label>Institution parente</label><input value={form.type_specific_data.parent_institution || ''} onChange={e => setTypeData('parent_institution', e.target.value)} /></div>
                <div className="org-settings__field"><label>Livres</label><input type="number" value={form.type_specific_data.book_count || ''} onChange={e => setTypeData('book_count', e.target.value)} /></div>
                <div className="org-settings__field"><label>Collection numérique</label><input type="number" value={form.type_specific_data.digital_count || ''} onChange={e => setTypeData('digital_count', e.target.value)} /></div>
                <div className="org-settings__field"><label>Places assises</label><input type="number" value={form.type_specific_data.total_seats || ''} onChange={e => setTypeData('total_seats', e.target.value)} /></div>
                <div className="org-settings__field"><label>Postes informatiques</label><input type="number" value={form.type_specific_data.computer_stations || ''} onChange={e => setTypeData('computer_stations', e.target.value)} /></div>
                <div className="org-settings__field"><label className="org-settings__checkbox-label"><input type="checkbox" checked={form.type_specific_data.membership_required || false} onChange={e => setTypeData('membership_required', e.target.checked)} /><span>Adhésion obligatoire</span></label></div>
                <div className="org-settings__field"><label>Cotisation (FCFA)</label><input type="number" value={form.type_specific_data.membership_fee || ''} onChange={e => setTypeData('membership_fee', e.target.value)} /></div>
                <div className="org-settings__field"><label>Durée prêt (jours)</label><input type="number" value={form.type_specific_data.loan_duration_days || ''} onChange={e => setTypeData('loan_duration_days', e.target.value)} /></div>
                <div className="org-settings__field"><label>Emprunts max</label><input type="number" value={form.type_specific_data.max_loans || ''} onChange={e => setTypeData('max_loans', e.target.value)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Services</label>
                  <ChipSelect options={[{ value: 'WIFI', label: 'WiFi' }, { value: 'PRINTING', label: 'Impression' }, { value: 'SCANNING', label: 'Scan' }, { value: 'STUDY_ROOMS', label: 'Salles d\'étude' }, { value: 'CHILDREN', label: 'Espace enfants' }, { value: 'AUDIOVISUAL', label: 'Audiovisuel' }, { value: 'WORKSHOPS', label: 'Ateliers' }, { value: 'EXHIBITIONS', label: 'Expositions' }]} selected={form.type_specific_data.services || []} onChange={v => setTypeData('services', v)} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPRIMERIE ── */}
        {isPrinter && (
          <div className="dashboard-card">
            <div className="dashboard-card__header"><h2><i className="fas fa-print" /> Paramètres imprimerie</h2></div>
            <div className="dashboard-card__body">
              <div className="org-settings__grid">
                <div className="org-settings__field org-settings__field--full"><label>Types d'impression</label>
                  <ChipSelect options={[{ value: 'OFFSET', label: 'Offset' }, { value: 'DIGITAL', label: 'Numérique' }, { value: 'LARGE_FORMAT', label: 'Grand format' }, { value: 'SCREEN', label: 'Sérigraphie' }, { value: 'POD', label: 'À la demande' }]} selected={form.type_specific_data.printing_types || []} onChange={v => setTypeData('printing_types', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Spécialisations</label>
                  <ChipSelect options={[{ value: 'BOOKS', label: 'Livres' }, { value: 'MAGAZINES', label: 'Magazines' }, { value: 'FLYERS', label: 'Flyers' }, { value: 'POSTERS', label: 'Affiches' }, { value: 'PACKAGING', label: 'Emballages' }, { value: 'BUSINESS_CARDS', label: 'Cartes de visite' }, { value: 'BANNERS', label: 'Banderoles' }]} selected={form.type_specific_data.specializations || []} onChange={v => setTypeData('specializations', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Reliure</label>
                  <ChipSelect options={[{ value: 'PERFECT', label: 'Dos carré collé' }, { value: 'SADDLE_STITCH', label: 'Agrafage' }, { value: 'HARDCOVER', label: 'Couverture rigide' }, { value: 'SPIRAL', label: 'Spirale' }, { value: 'WIRE_O', label: 'Wire-O' }, { value: 'SEWN', label: 'Cousu' }]} selected={form.type_specific_data.binding_options || []} onChange={v => setTypeData('binding_options', v)} /></div>
                <div className="org-settings__field org-settings__field--full"><label>Finitions</label>
                  <ChipSelect options={[{ value: 'LAMINATION_GLOSS', label: 'Pelliculage brillant' }, { value: 'LAMINATION_MATTE', label: 'Pelliculage mat' }, { value: 'UV_SPOT', label: 'Vernis UV sélectif' }, { value: 'FOIL_GOLD', label: 'Dorure' }, { value: 'EMBOSSING', label: 'Gaufrage' }, { value: 'DIE_CUT', label: 'Découpe' }, { value: 'SOFT_TOUCH', label: 'Soft-touch' }]} selected={form.type_specific_data.finishing_options || []} onChange={v => setTypeData('finishing_options', v)} /></div>
                <div className="org-settings__field"><label>Quantité min</label><input type="number" value={form.type_specific_data.min_order || ''} onChange={e => setTypeData('min_order', e.target.value)} /></div>
                <div className="org-settings__field"><label className="org-settings__checkbox-label"><input type="checkbox" checked={form.type_specific_data.print_on_demand || false} onChange={e => setTypeData('print_on_demand', e.target.checked)} /><span>Impression à l'unité</span></label></div>
                <div className="org-settings__field"><label>Délai rapide (jours)</label><input type="number" value={form.type_specific_data.turnaround_min || ''} onChange={e => setTypeData('turnaround_min', e.target.value)} /></div>
                <div className="org-settings__field"><label>Délai standard (jours)</label><input type="number" value={form.type_specific_data.turnaround_max || ''} onChange={e => setTypeData('turnaround_max', e.target.value)} /></div>
                <div className="org-settings__field"><label className="org-settings__checkbox-label"><input type="checkbox" checked={form.type_specific_data.eco_friendly || false} onChange={e => setTypeData('eco_friendly', e.target.checked)} /><span>Éco-responsable</span></label></div>
                <div className="org-settings__field"><label className="org-settings__checkbox-label"><input type="checkbox" checked={form.type_specific_data.design_service || false} onChange={e => setTypeData('design_service', e.target.checked)} /><span>Service graphique</span></label></div>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="org-settings__actions">
          <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Enregistrement...</> : <><i className="fas fa-save" /> Enregistrer les modifications</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrgSettings;
