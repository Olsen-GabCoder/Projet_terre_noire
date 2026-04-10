import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { organizationAPI, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const MyOrganizations = () => {
  const { organizationMemberships, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ORG_TYPE_LABELS = {
    MAISON_EDITION: { label: t('pages.profile.organizations.typeMaisonEdition'), icon: 'fas fa-book-open', desc: t('pages.profile.organizations.typeMaisonEditionDesc') },
    LIBRAIRIE: { label: t('pages.profile.organizations.typeLibrairie'), icon: 'fas fa-store', desc: t('pages.profile.organizations.typeLibrairieDesc') },
    BIBLIOTHEQUE: { label: t('pages.profile.organizations.typeBibliotheque'), icon: 'fas fa-landmark', desc: t('pages.profile.organizations.typeBibliothequeDesc') },
    IMPRIMERIE: { label: t('pages.profile.organizations.typeImprimerie'), icon: 'fas fa-print', desc: t('pages.profile.organizations.typeImprimerieDesc') },
  };

  const GENRE_OPTIONS = [
    { value: 'ROMAN', label: t('pages.profile.organizations.genreRoman') }, { value: 'NOUVELLE', label: t('pages.profile.organizations.genreNouvelle') },
    { value: 'POESIE', label: t('pages.profile.organizations.genrePoesie') }, { value: 'ESSAI', label: t('pages.profile.organizations.genreEssai') },
    { value: 'THEATRE', label: t('pages.profile.organizations.genreTheatre') }, { value: 'JEUNESSE', label: t('pages.profile.organizations.genreJeunesse') },
    { value: 'BD', label: t('pages.profile.organizations.genreBD') }, { value: 'AUTRE', label: t('pages.profile.organizations.genreAutre') },
  ];

  const LANG_OPTIONS = [
    { value: 'FR', label: t('pages.profile.organizations.langFR') }, { value: 'EN', label: t('pages.profile.organizations.langEN') },
    { value: 'AR', label: t('pages.profile.organizations.langAR') }, { value: 'PT', label: t('pages.profile.organizations.langPT') },
    { value: 'ES', label: t('pages.profile.organizations.langES') },
  ];

  const AUDIENCE_OPTIONS = [
    { value: 'ADULTE', label: t('pages.profile.organizations.audienceAdulte') }, { value: 'JEUNESSE', label: t('pages.profile.organizations.audienceJeunesse') },
    { value: 'UNIVERSITAIRE', label: t('pages.profile.organizations.audienceUniversitaire') }, { value: 'PROFESSIONNEL', label: t('pages.profile.organizations.audienceProfessionnel') },
  ];

  const DOC_OPTIONS = [
    { value: 'MANUSCRIT', label: t('pages.profile.organizations.docManuscrit') }, { value: 'SYNOPSIS', label: t('pages.profile.organizations.docSynopsis') },
    { value: 'LETTRE_MOTIVATION', label: t('pages.profile.organizations.docLettre') }, { value: 'CV', label: t('pages.profile.organizations.docCV') },
    { value: 'PHOTO', label: t('pages.profile.organizations.docPhoto') }, { value: 'EXTRAIT', label: t('pages.profile.organizations.docExtrait') },
  ];

  const PAYMENT_OPTIONS = [
    { value: 'CASH', label: t('pages.profile.organizations.payCash') }, { value: 'MOBILE_MONEY', label: t('pages.profile.organizations.payMobileMoney') },
    { value: 'AIRTEL_MONEY', label: t('pages.profile.organizations.payAirtelMoney') }, { value: 'CARD', label: t('pages.profile.organizations.payCard') },
    { value: 'VIREMENT', label: t('pages.profile.organizations.payVirement') },
  ];

  const SOCIAL_KEYS = [
    { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook', placeholder: 'https://facebook.com/...' },
    { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', placeholder: 'https://instagram.com/...' },
    { key: 'twitter', label: 'Twitter / X', icon: 'fab fa-twitter', placeholder: 'https://twitter.com/...' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin', placeholder: 'https://linkedin.com/...' },
    { key: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', placeholder: 'https://youtube.com/...' },
  ];

  const STEPS_MAP = {
    MAISON_EDITION: [
      { key: 'type', label: t('pages.profile.organizations.stepType'), icon: 'fas fa-th-large' },
      { key: 'identity', label: t('pages.profile.organizations.stepIdentity'), icon: 'fas fa-id-card' },
      { key: 'contact', label: t('pages.profile.organizations.stepContact'), icon: 'fas fa-address-book' },
      { key: 'publishing', label: t('pages.profile.organizations.stepPublishing'), icon: 'fas fa-book-open' },
      { key: 'social', label: t('pages.profile.organizations.stepSocial'), icon: 'fas fa-share-alt' },
    ],
    LIBRAIRIE: [
      { key: 'type', label: t('pages.profile.organizations.stepType'), icon: 'fas fa-th-large' },
      { key: 'identity', label: t('pages.profile.organizations.stepIdentity'), icon: 'fas fa-id-card' },
      { key: 'contact', label: t('pages.profile.organizations.stepContact'), icon: 'fas fa-address-book' },
      { key: 'store', label: t('pages.profile.organizations.stepStore'), icon: 'fas fa-store' },
      { key: 'social', label: t('pages.profile.organizations.stepSocial'), icon: 'fas fa-share-alt' },
    ],
    BIBLIOTHEQUE: [
      { key: 'type', label: t('pages.profile.organizations.stepType'), icon: 'fas fa-th-large' },
      { key: 'identity', label: t('pages.profile.organizations.stepIdentity'), icon: 'fas fa-id-card' },
      { key: 'contact', label: t('pages.profile.organizations.stepContact'), icon: 'fas fa-address-book' },
      { key: 'library', label: t('pages.profile.organizations.stepLibrary'), icon: 'fas fa-landmark' },
      { key: 'social', label: t('pages.profile.organizations.stepSocial'), icon: 'fas fa-share-alt' },
    ],
    IMPRIMERIE: [
      { key: 'type', label: t('pages.profile.organizations.stepType'), icon: 'fas fa-th-large' },
      { key: 'identity', label: t('pages.profile.organizations.stepIdentity'), icon: 'fas fa-id-card' },
      { key: 'contact', label: t('pages.profile.organizations.stepContact'), icon: 'fas fa-address-book' },
      { key: 'printing', label: t('pages.profile.organizations.stepPrinting'), icon: 'fas fa-print' },
      { key: 'social', label: t('pages.profile.organizations.stepSocial'), icon: 'fas fa-share-alt' },
    ],
  };

  // ── Composants UI ──
  const ChipSelect = ({ options, selected, onChange }) => (
    <div className="org-wizard__genres">
      {options.map(o => (
        <button key={o.value} type="button" className={`org-wizard__genre-chip ${selected.includes(o.value) ? 'active' : ''}`}
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
        <div className="org-wizard__specialties">
          {tags.map(tg => (
            <span key={tg} className="org-wizard__specialty-tag">{tg} <button type="button" onClick={() => onChange(tags.filter(x => x !== tg))}><i className="fas fa-times" /></button></span>
          ))}
        </div>
        <div className="org-wizard__add-row">
          <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="dashboard-btn dashboard-btn--secondary" onClick={add}><i className="fas fa-plus" /></button>
        </div>
      </>
    );
  };

  const [form, setForm] = useState({
    name: '', org_type: '', description: '', short_description: '',
    email: '', phone_number: '', whatsapp: '', website: '', address: '', po_box: '', city: '', country: 'Gabon',
    founding_year: '', languages: [],
    is_accepting_manuscripts: false, accepted_genres: [], accepted_languages: [],
    specialties: [], submission_guidelines: '', response_time_days: '',
    required_documents: [], simultaneous_submissions: true,
    editorial_line: '', target_audience: [],
    social_links: {}, payment_methods: [],
    type_specific_data: {},
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const logoRef = useRef(null);
  const coverRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const setField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const setTypeData = (key, value) => setForm(prev => ({ ...prev, type_specific_data: { ...prev.type_specific_data, [key]: value } }));
  const handleSocial = (key, value) => setForm(prev => ({ ...prev, social_links: { ...prev.social_links, [key]: value } }));

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(t('pages.profile.organizations.imageTooLarge')); return; }
    const preview = URL.createObjectURL(file);
    if (type === 'logo') { setLogoFile(file); setLogoPreview(preview); }
    else { setCoverFile(file); setCoverPreview(preview); }
    setError('');
  };

  const steps = STEPS_MAP[form.org_type] || STEPS_MAP.MAISON_EDITION;
  const canProceed = () => { if (step === 0) return !!form.org_type; if (step === 1) return !!form.name.trim(); return true; };

  const handleSubmit = async () => {
    setCreating(true); setError('');
    try {
      const fd = new FormData();
      // Tous les champs texte
      ['name','org_type','description','short_description','email','phone_number','whatsapp','website','address','po_box','city','country','submission_guidelines','editorial_line'].forEach(k => { if (form[k]) fd.append(k, form[k]); });
      if (form.founding_year) fd.append('founding_year', form.founding_year);
      if (form.response_time_days) fd.append('response_time_days', form.response_time_days);
      // Booleans
      fd.append('is_accepting_manuscripts', form.is_accepting_manuscripts);
      fd.append('simultaneous_submissions', form.simultaneous_submissions);
      // JSON fields
      ['accepted_genres','accepted_languages','specialties','languages','required_documents','target_audience','payment_methods'].forEach(k => { if (form[k]?.length) fd.append(k, JSON.stringify(form[k])); });
      ['social_links','type_specific_data'].forEach(k => { if (Object.keys(form[k] || {}).length) fd.append(k, JSON.stringify(form[k])); });
      // Fichiers
      if (logoFile) fd.append('logo', logoFile);
      if (coverFile) fd.append('cover_image', coverFile);

      const res = await organizationAPI.create(fd);
      setSuccess(res.data.message || t('pages.profile.organizations.createSuccess'));
      setShowForm(false); setStep(0);
      // Rafraîchir le profil pour que la nouvelle org apparaisse dans organizationMemberships
      await refreshUser();
    } catch (err) { setError(handleApiError(err)); }
    finally { setCreating(false); }
  };

  // ── Liste ──
  if (!showForm) {
    return (
      <div className="my-organizations">
        <div className="dashboard-home__header">
          <h1>{t('pages.profile.organizations.title')}</h1>
          <p className="dashboard-home__subtitle">{t('pages.profile.organizations.subtitle')}</p>
        </div>
        {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}
        {success && <div className="dashboard-alert dashboard-alert--success">{success}</div>}
        {organizationMemberships.length > 0 ? (
          <div className="my-orgs__list">
            {organizationMemberships.map((m) => {
              const meta = ORG_TYPE_LABELS[m.organization_type] || {};
              return (
                <Link key={m.organization_id} to={`/dashboard/organizations/${m.organization_id}`} className="my-orgs__card">
                  <div className="my-orgs__card-icon"><i className={meta.icon || 'fas fa-building'} /></div>
                  <div className="my-orgs__card-info"><h3>{m.organization_name}</h3><p>{meta.label || m.organization_type}</p><span className="my-orgs__role-badge">{m.role}</span></div>
                  <i className="fas fa-chevron-right my-orgs__card-arrow" />
                </Link>
              );
            })}
          </div>
        ) : <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{t('pages.profile.organizations.noOrganizations')}</p>}
        <button className="dashboard-btn dashboard-btn--primary" onClick={() => { setShowForm(true); setSuccess(''); }}><i className="fas fa-plus" /> {t('pages.profile.organizations.createOrganization')}</button>
      </div>
    );
  }

  // ── Wizard ──
  return (
    <div className="my-organizations">
      <div className="dashboard-home__header">
        <h1>{t('pages.profile.organizations.newOrganization')}</h1>
        <p className="dashboard-home__subtitle">{t('pages.profile.organizations.stepProgress', { current: step + 1, total: steps.length })}</p>
      </div>
      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}

      {/* Stepper */}
      <div className="org-wizard__stepper">
        {steps.map((s, i) => (
          <div key={s.key} className={`org-wizard__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="org-wizard__step-dot">{i < step ? <i className="fas fa-check" /> : <i className={s.icon} />}</div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-card org-wizard__card">

        {/* ── ÉTAPE 0 : Type ── */}
        {step === 0 && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.whatType')}</h2>
            <p className="org-wizard__hint">{t('pages.profile.organizations.whatTypeHint')}</p>
            <div className="org-wizard__type-grid">
              {Object.entries(ORG_TYPE_LABELS).map(([value, { label, icon, desc }]) => (
                <div key={value} className={`org-wizard__type-card ${form.org_type === value ? 'selected' : ''}`} onClick={() => setField('org_type', value)}>
                  <div className="org-wizard__type-icon"><i className={icon} /></div>
                  <h4>{label}</h4><p>{desc}</p>
                  <div className="org-wizard__type-check">{form.org_type === value ? <i className="fas fa-check-circle" /> : <i className="far fa-circle" />}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 1 : Identité ── */}
        {step === 1 && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.identityTitle')}</h2>
            <div className="org-wizard__images">
              <div className="org-wizard__image-group">
                <label>{t('pages.profile.organizations.logo')}</label>
                <div className="org-wizard__image-preview org-wizard__image-preview--logo" onClick={() => logoRef.current?.click()}>
                  {logoPreview ? <img src={logoPreview} alt="Logo" /> : <div className="org-wizard__image-placeholder"><i className="fas fa-camera" /><span>{t('pages.profile.organizations.addImage')}</span></div>}
                  <div className="org-wizard__image-overlay"><i className="fas fa-camera" /></div>
                </div>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'logo')} />
              </div>
              <div className="org-wizard__image-group">
                <label>{t('pages.profile.organizations.cover')}</label>
                <div className="org-wizard__image-preview org-wizard__image-preview--cover" onClick={() => coverRef.current?.click()}>
                  {coverPreview ? <img src={coverPreview} alt="Cover" /> : <div className="org-wizard__image-placeholder"><i className="fas fa-panorama" /><span>{t('pages.profile.organizations.addImage')}</span></div>}
                  <div className="org-wizard__image-overlay"><i className="fas fa-camera" /></div>
                </div>
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'cover')} />
              </div>
            </div>
            <div className="org-wizard__fields org-wizard__fields--2col">
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.orgName')}</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder={t('pages.profile.organizations.orgNamePlaceholder')} required />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.tagline')}</label>
                <input name="short_description" value={form.short_description} onChange={handleChange} placeholder={t('pages.profile.organizations.taglinePlaceholder')} maxLength={280} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.description')}</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder={t('pages.profile.organizations.descriptionPlaceholder')} />
              </div>
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.foundingYear')}</label>
                <input name="founding_year" type="number" value={form.founding_year} onChange={handleChange} placeholder="2005" min="1800" max={new Date().getFullYear()} />
              </div>
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.workingLanguages')}</label>
                <ChipSelect options={LANG_OPTIONS} selected={form.languages} onChange={v => setField('languages', v)} />
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Contact ── */}
        {step === 2 && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.contactTitle')}</h2>
            <p className="org-wizard__hint">{t('pages.profile.organizations.contactHint')}</p>
            <div className="org-wizard__fields org-wizard__fields--2col">
              <div className="org-wizard__field"><label><i className="fas fa-envelope" /> {t('pages.profile.organizations.email')}</label><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@exemple.com" /></div>
              <div className="org-wizard__field"><label><i className="fas fa-phone" /> {t('pages.profile.organizations.phone')}</label><input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="+241 XX XX XX XX" /></div>
              <div className="org-wizard__field"><label><i className="fab fa-whatsapp" /> WhatsApp</label><input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+241 XX XX XX XX" /></div>
              <div className="org-wizard__field"><label><i className="fas fa-globe" /> {t('pages.profile.organizations.website')}</label><input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://..." /></div>
              <div className="org-wizard__field"><label><i className="fas fa-map-marker-alt" /> {t('pages.profile.organizations.city')}</label><input name="city" value={form.city} onChange={handleChange} placeholder="Libreville" /></div>
              <div className="org-wizard__field"><label><i className="fas fa-flag" /> {t('pages.profile.organizations.country')}</label><input name="country" value={form.country} onChange={handleChange} /></div>
              <div className="org-wizard__field"><label><i className="fas fa-mailbox" /> {t('pages.profile.organizations.poBox')}</label><input name="po_box" value={form.po_box} onChange={handleChange} placeholder="BP 1234" /></div>
              <div className="org-wizard__field org-wizard__field--full"><label><i className="fas fa-home" /> {t('pages.profile.organizations.address')}</label><textarea name="address" value={form.address} onChange={handleChange} rows={2} placeholder={t('pages.profile.organizations.addressPlaceholder')} /></div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Maison d'édition ── */}
        {step === 3 && form.org_type === 'MAISON_EDITION' && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.publishingTitle')}</h2>
            <div className="org-wizard__fields">
              <div className="org-wizard__field org-wizard__field--full">
                <label className="org-wizard__checkbox-label"><input type="checkbox" name="is_accepting_manuscripts" checked={form.is_accepting_manuscripts} onChange={handleChange} /><span>{t('pages.profile.organizations.acceptManuscripts')}</span></label>
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.acceptedGenres')}</label>
                <ChipSelect options={GENRE_OPTIONS} selected={form.accepted_genres} onChange={v => setField('accepted_genres', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.acceptedLanguages')}</label>
                <ChipSelect options={LANG_OPTIONS} selected={form.accepted_languages} onChange={v => setField('accepted_languages', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.targetAudience')}</label>
                <ChipSelect options={AUDIENCE_OPTIONS} selected={form.target_audience} onChange={v => setField('target_audience', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.requiredDocuments')}</label>
                <ChipSelect options={DOC_OPTIONS} selected={form.required_documents} onChange={v => setField('required_documents', v)} />
              </div>
              <div className="org-wizard__field">
                <label><i className="fas fa-clock" /> {t('pages.profile.organizations.responseTime')}</label>
                <input name="response_time_days" type="number" value={form.response_time_days} onChange={handleChange} placeholder={t('pages.profile.organizations.responseTimePlaceholder')} min="1" max="365" />
              </div>
              <div className="org-wizard__field">
                <label className="org-wizard__checkbox-label"><input type="checkbox" name="simultaneous_submissions" checked={form.simultaneous_submissions} onChange={handleChange} /><span>{t('pages.profile.organizations.simultaneousSubmissions')}</span></label>
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.specialties')}</label>
                <TagInput tags={form.specialties} onChange={v => setField('specialties', v)} placeholder={t('pages.profile.organizations.specialtiesPlaceholder')} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.editorialLine')}</label>
                <textarea name="editorial_line" value={form.editorial_line} onChange={handleChange} rows={3} placeholder={t('pages.profile.organizations.editorialLinePlaceholder')} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.submissionGuide')}</label>
                <textarea name="submission_guidelines" value={form.submission_guidelines} onChange={handleChange} rows={4} placeholder={t('pages.profile.organizations.submissionGuidePlaceholder')} />
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Librairie ── */}
        {step === 3 && form.org_type === 'LIBRAIRIE' && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.storeTitle')}</h2>
            <div className="org-wizard__fields org-wizard__fields--2col">
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.storeType')}</label>
                <select value={form.type_specific_data.store_type || ''} onChange={e => setTypeData('store_type', e.target.value)}>
                  <option value="">{t('pages.profile.organizations.choose')}</option>
                  <option value="PHYSICAL">{t('pages.profile.organizations.storePhysical')}</option><option value="ONLINE">{t('pages.profile.organizations.storeOnline')}</option><option value="BOTH">{t('pages.profile.organizations.storeBoth')}</option>
                </select>
              </div>
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.inventorySize')}</label>
                <input type="number" value={form.type_specific_data.inventory_size || ''} onChange={e => setTypeData('inventory_size', e.target.value)} placeholder={t('pages.profile.organizations.inventorySizePlaceholder')} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.availableGenres')}</label>
                <ChipSelect options={[...GENRE_OPTIONS, { value: 'SCOLAIRE', label: t('pages.profile.organizations.genreScolaire') }, { value: 'UNIVERSITAIRE', label: t('pages.profile.organizations.genreUniversitaire') }, { value: 'RELIGIEUX', label: t('pages.profile.organizations.genreReligieux') }]}
                  selected={form.type_specific_data.genres_carried || []} onChange={v => setTypeData('genres_carried', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.productTypes')}</label>
                <ChipSelect options={[{ value: 'NEW', label: t('pages.profile.organizations.productNew') }, { value: 'USED', label: t('pages.profile.organizations.productUsed') }, { value: 'RARE', label: t('pages.profile.organizations.productRare') }, { value: 'EBOOKS', label: t('pages.profile.organizations.productEbooks') }, { value: 'STATIONERY', label: t('pages.profile.organizations.productStationery') }]}
                  selected={form.type_specific_data.product_types || []} onChange={v => setTypeData('product_types', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.servicesOffered')}</label>
                <ChipSelect options={[{ value: 'GIFT_WRAPPING', label: t('pages.profile.organizations.serviceGiftWrap') }, { value: 'CLICK_COLLECT', label: t('pages.profile.organizations.serviceClickCollect') }, { value: 'DELIVERY', label: t('pages.profile.organizations.serviceDelivery') }, { value: 'BOOK_CLUBS', label: t('pages.profile.organizations.serviceBookClubs') }, { value: 'EVENTS', label: t('pages.profile.organizations.serviceEvents') }, { value: 'CONSIGNMENT', label: t('pages.profile.organizations.serviceConsignment') }]}
                  selected={form.type_specific_data.services || []} onChange={v => setTypeData('services', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.facilities')}</label>
                <ChipSelect options={[{ value: 'READING_SPACE', label: t('pages.profile.organizations.facilityReading') }, { value: 'CAFE', label: t('pages.profile.organizations.facilityCafe') }, { value: 'WIFI', label: t('pages.profile.organizations.facilityWifi') }, { value: 'WHEELCHAIR', label: t('pages.profile.organizations.facilityWheelchair') }, { value: 'PARKING', label: t('pages.profile.organizations.facilityParking') }]}
                  selected={form.type_specific_data.facilities || []} onChange={v => setTypeData('facilities', v)} />
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Bibliothèque ── */}
        {step === 3 && form.org_type === 'BIBLIOTHEQUE' && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.libraryTitle')}</h2>
            <div className="org-wizard__fields org-wizard__fields--2col">
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.libraryType')}</label>
                <select value={form.type_specific_data.library_type || ''} onChange={e => setTypeData('library_type', e.target.value)}>
                  <option value="">{t('pages.profile.organizations.choose')}</option>
                  <option value="PUBLIC">{t('pages.profile.organizations.libraryPublic')}</option><option value="UNIVERSITY">{t('pages.profile.organizations.libraryUniversity')}</option><option value="SCHOOL">{t('pages.profile.organizations.librarySchool')}</option>
                  <option value="PRIVATE">{t('pages.profile.organizations.libraryPrivate')}</option><option value="NATIONAL">{t('pages.profile.organizations.libraryNational')}</option><option value="MUNICIPAL">{t('pages.profile.organizations.libraryMunicipal')}</option>
                </select>
              </div>
              <div className="org-wizard__field">
                <label>{t('pages.profile.organizations.parentInstitution')}</label>
                <input value={form.type_specific_data.parent_institution || ''} onChange={e => setTypeData('parent_institution', e.target.value)} placeholder={t('pages.profile.organizations.parentInstitutionPlaceholder')} />
              </div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.bookCount')}</label><input type="number" value={form.type_specific_data.book_count || ''} onChange={e => setTypeData('book_count', e.target.value)} placeholder={t('pages.profile.organizations.bookCountPlaceholder')} /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.digitalCollection')}</label><input type="number" value={form.type_specific_data.digital_count || ''} onChange={e => setTypeData('digital_count', e.target.value)} placeholder={t('pages.profile.organizations.digitalCollectionPlaceholder')} /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.seats')}</label><input type="number" value={form.type_specific_data.total_seats || ''} onChange={e => setTypeData('total_seats', e.target.value)} /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.computerStations')}</label><input type="number" value={form.type_specific_data.computer_stations || ''} onChange={e => setTypeData('computer_stations', e.target.value)} /></div>
              <div className="org-wizard__field"><label className="org-wizard__checkbox-label"><input type="checkbox" checked={form.type_specific_data.membership_required || false} onChange={e => setTypeData('membership_required', e.target.checked)} /><span>{t('pages.profile.organizations.membershipRequired')}</span></label></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.annualFee')}</label><input type="number" value={form.type_specific_data.membership_fee || ''} onChange={e => setTypeData('membership_fee', e.target.value)} placeholder={t('pages.profile.organizations.annualFeePlaceholder')} /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.loanDuration')}</label><input type="number" value={form.type_specific_data.loan_duration_days || ''} onChange={e => setTypeData('loan_duration_days', e.target.value)} placeholder="14" /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.maxLoans')}</label><input type="number" value={form.type_specific_data.max_loans || ''} onChange={e => setTypeData('max_loans', e.target.value)} placeholder="5" /></div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.services')}</label>
                <ChipSelect options={[{ value: 'WIFI', label: t('pages.profile.organizations.facilityWifi') }, { value: 'PRINTING', label: t('pages.profile.organizations.servicePrinting') }, { value: 'SCANNING', label: t('pages.profile.organizations.serviceScanning') }, { value: 'STUDY_ROOMS', label: t('pages.profile.organizations.serviceStudyRooms') }, { value: 'CHILDREN', label: t('pages.profile.organizations.serviceChildren') }, { value: 'AUDIOVISUAL', label: t('pages.profile.organizations.serviceAudiovisual') }, { value: 'WORKSHOPS', label: t('pages.profile.organizations.serviceWorkshops') }, { value: 'EXHIBITIONS', label: t('pages.profile.organizations.serviceExhibitions') }]}
                  selected={form.type_specific_data.services || []} onChange={v => setTypeData('services', v)} />
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Imprimerie ── */}
        {step === 3 && form.org_type === 'IMPRIMERIE' && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.printingTitle')}</h2>
            <div className="org-wizard__fields org-wizard__fields--2col">
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.printingTypes')}</label>
                <ChipSelect options={[{ value: 'OFFSET', label: t('pages.profile.organizations.printOffset') }, { value: 'DIGITAL', label: t('pages.profile.organizations.printDigital') }, { value: 'LARGE_FORMAT', label: t('pages.profile.organizations.printLargeFormat') }, { value: 'SCREEN', label: t('pages.profile.organizations.printScreen') }, { value: 'POD', label: t('pages.profile.organizations.printPOD') }]}
                  selected={form.type_specific_data.printing_types || []} onChange={v => setTypeData('printing_types', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.productSpecializations')}</label>
                <ChipSelect options={[{ value: 'BOOKS', label: t('pages.profile.organizations.specBooks') }, { value: 'MAGAZINES', label: t('pages.profile.organizations.specMagazines') }, { value: 'FLYERS', label: t('pages.profile.organizations.specFlyers') }, { value: 'POSTERS', label: t('pages.profile.organizations.specPosters') }, { value: 'PACKAGING', label: t('pages.profile.organizations.specPackaging') }, { value: 'BUSINESS_CARDS', label: t('pages.profile.organizations.specBusinessCards') }, { value: 'BANNERS', label: t('pages.profile.organizations.specBanners') }]}
                  selected={form.type_specific_data.specializations || []} onChange={v => setTypeData('specializations', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.bindingOptions')}</label>
                <ChipSelect options={[{ value: 'PERFECT', label: t('pages.profile.organizations.bindPerfect') }, { value: 'SADDLE_STITCH', label: t('pages.profile.organizations.bindSaddleStitch') }, { value: 'HARDCOVER', label: t('pages.profile.organizations.bindHardcover') }, { value: 'SPIRAL', label: t('pages.profile.organizations.bindSpiral') }, { value: 'WIRE_O', label: t('pages.profile.organizations.bindWireO') }, { value: 'SEWN', label: t('pages.profile.organizations.bindSewn') }]}
                  selected={form.type_specific_data.binding_options || []} onChange={v => setTypeData('binding_options', v)} />
              </div>
              <div className="org-wizard__field org-wizard__field--full">
                <label>{t('pages.profile.organizations.finishingOptions')}</label>
                <ChipSelect options={[{ value: 'LAMINATION_GLOSS', label: t('pages.profile.organizations.finishGloss') }, { value: 'LAMINATION_MATTE', label: t('pages.profile.organizations.finishMatte') }, { value: 'UV_SPOT', label: t('pages.profile.organizations.finishUVSpot') }, { value: 'FOIL_GOLD', label: t('pages.profile.organizations.finishFoilGold') }, { value: 'EMBOSSING', label: t('pages.profile.organizations.finishEmbossing') }, { value: 'DIE_CUT', label: t('pages.profile.organizations.finishDieCut') }, { value: 'SOFT_TOUCH', label: t('pages.profile.organizations.finishSoftTouch') }]}
                  selected={form.type_specific_data.finishing_options || []} onChange={v => setTypeData('finishing_options', v)} />
              </div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.minOrder')}</label><input type="number" value={form.type_specific_data.min_order || ''} onChange={e => setTypeData('min_order', e.target.value)} placeholder={t('pages.profile.organizations.minOrderPlaceholder')} /></div>
              <div className="org-wizard__field"><label className="org-wizard__checkbox-label"><input type="checkbox" checked={form.type_specific_data.print_on_demand || false} onChange={e => setTypeData('print_on_demand', e.target.checked)} /><span>{t('pages.profile.organizations.printOnDemand')}</span></label></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.turnaroundMin')}</label><input type="number" value={form.type_specific_data.turnaround_min || ''} onChange={e => setTypeData('turnaround_min', e.target.value)} placeholder="3" /></div>
              <div className="org-wizard__field"><label>{t('pages.profile.organizations.turnaroundMax')}</label><input type="number" value={form.type_specific_data.turnaround_max || ''} onChange={e => setTypeData('turnaround_max', e.target.value)} placeholder="21" /></div>
              <div className="org-wizard__field"><label className="org-wizard__checkbox-label"><input type="checkbox" checked={form.type_specific_data.eco_friendly || false} onChange={e => setTypeData('eco_friendly', e.target.checked)} /><span>{t('pages.profile.organizations.ecoFriendly')}</span></label></div>
              <div className="org-wizard__field"><label className="org-wizard__checkbox-label"><input type="checkbox" checked={form.type_specific_data.design_service || false} onChange={e => setTypeData('design_service', e.target.checked)} /><span>{t('pages.profile.organizations.designService')}</span></label></div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : Réseaux sociaux & Paiements ── */}
        {step === 4 && (
          <div className="org-wizard__section">
            <h2>{t('pages.profile.organizations.socialPaymentsTitle')}</h2>
            <div className="org-wizard__fields">
              <div className="org-wizard__field org-wizard__field--full"><label style={{ marginBottom: '.5rem', fontSize: '.9rem', fontWeight: 700 }}>{t('pages.profile.organizations.socialNetworks')}</label></div>
              {SOCIAL_KEYS.map(s => (
                <div key={s.key} className="org-wizard__field org-wizard__field--full">
                  <label><i className={s.icon} /> {s.label}</label>
                  <input value={form.social_links[s.key] || ''} onChange={e => handleSocial(s.key, e.target.value)} placeholder={s.placeholder} />
                </div>
              ))}
              <div className="org-wizard__field org-wizard__field--full" style={{ marginTop: '1.5rem' }}>
                <label style={{ marginBottom: '.5rem', fontSize: '.9rem', fontWeight: 700 }}>{t('pages.profile.organizations.paymentMethods')}</label>
                <ChipSelect options={PAYMENT_OPTIONS} selected={form.payment_methods} onChange={v => setField('payment_methods', v)} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="org-wizard__nav">
          <button type="button" className="dashboard-btn" onClick={step === 0 ? () => setShowForm(false) : () => setStep(s => s - 1)}>
            {step === 0 ? t('pages.profile.organizations.cancel') : <><i className="fas fa-arrow-left" /> {t('pages.profile.organizations.previous')}</>}
          </button>
          <div className="org-wizard__nav-right">
            {step < steps.length - 1 ? (
              <button type="button" className="dashboard-btn dashboard-btn--primary" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
                {t('pages.profile.organizations.next')} <i className="fas fa-arrow-right" />
              </button>
            ) : (
              <button type="button" className="dashboard-btn dashboard-btn--primary" disabled={creating || !form.name.trim()} onClick={handleSubmit}>
                {creating ? <><i className="fas fa-spinner fa-spin" /> {t('pages.profile.organizations.creating')}</> : <><i className="fas fa-check" /> {t('pages.profile.organizations.createOrg')}</>}
              </button>
            )}
            {step > 0 && step < steps.length - 1 && (
              <button type="button" className="org-wizard__skip" onClick={() => setStep(s => s + 1)}>{t('pages.profile.organizations.skip')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyOrganizations;
