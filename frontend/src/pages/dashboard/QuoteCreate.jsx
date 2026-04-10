import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import quoteService from '../../services/quoteService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/OrgBooks.css';

const PUBLISHING_MODEL_OPTIONS = [
  { value: 'COMPTE_EDITEUR', label: 'Édition à compte d\'éditeur' },
  { value: 'COEDITION', label: 'Coédition' },
  { value: 'COMPTE_AUTEUR', label: 'Édition à compte d\'auteur accompagnée' },
  { value: 'AUTO_EDITION', label: 'Auto-édition accompagnée' },
  { value: 'NUMERIQUE_PUR', label: 'Édition numérique pure' },
  { value: 'REEDITION', label: 'Réédition' },
];

const UNIT_OPTIONS = [
  { value: 'PAGE', label: 'Page' },
  { value: 'MOT', label: 'Mot' },
  { value: 'EXEMPLAIRE', label: 'Exemplaire' },
  { value: 'FORFAIT', label: 'Forfait' },
  { value: 'HEURE', label: 'Heure' },
  { value: 'JOUR', label: 'Jour' },
  { value: 'FEUILLE', label: 'Feuille' },
  { value: 'PLANCHE', label: 'Planche' },
  { value: 'CARACTERE', label: 'Caractère' },
];

const emptyItem = () => ({
  designation: '', description: '', unit: 'FORFAIT', quantity: 1, unit_price: 0, order: 0,
});

const emptyLot = () => ({
  name: '', order: 0, items: [emptyItem()],
});

const QuoteCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Header — pré-rempli depuis les search params si disponible
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [clientName, setClientName] = useState(searchParams.get('client_name') || '');
  const [clientEmail, setClientEmail] = useState(searchParams.get('client_email') || '');
  const [organizationId, setOrganizationId] = useState(searchParams.get('organization') || '');
  const [publishingModel, setPublishingModel] = useState('');

  // Lots & items
  const [lots, setLots] = useState([emptyLot()]);

  // Financials
  const [discountType, setDiscountType] = useState('PERCENT');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  // Conditions
  const [deliveryDays, setDeliveryDays] = useState(30);
  const [validityDays, setValidityDays] = useState(30);
  const [revisionRounds, setRevisionRounds] = useState(1);
  const [notes, setNotes] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState([
    { label: 'A la commande', percent: 40 },
    { label: 'A la livraison BAT', percent: 30 },
    { label: 'A la livraison finale', percent: 30 },
  ]);

  // Pre-fill from search params
  const manuscriptId = searchParams.get('manuscript') || null;
  const serviceRequestId = searchParams.get('service_request') || null;
  const clientIdParam = searchParams.get('client_id') || '';

  // Load templates
  useEffect(() => {
    quoteService.getTemplates({ organization: organizationId || undefined })
      .then(res => setTemplates(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => {});
  }, [organizationId]);

  // Apply template
  const handleTemplateChange = async (templateId) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    try {
      const res = await quoteService.getTemplate(templateId);
      const tpl = res.data;
      if (tpl.publishing_model) {
        setPublishingModel(tpl.publishing_model);
      }
      if (tpl.lots) {
        setLots(tpl.lots.map((lot, li) => ({
          name: lot.name,
          order: li + 1,
          items: lot.items.map((item, ii) => ({
            designation: item.designation,
            description: '',
            unit: item.unit,
            quantity: item.default_quantity || 1,
            unit_price: item.default_unit_price || 0,
            order: ii + 1,
          })),
        })));
      }
    } catch (err) {
      toast.error('Erreur lors du chargement du modèle.');
    }
  };

  // ── Lot/Item CRUD ──
  const addLot = () => setLots(prev => [...prev, { ...emptyLot(), order: prev.length + 1 }]);
  const removeLot = (li) => setLots(prev => prev.filter((_, i) => i !== li));
  const updateLot = (li, field, value) => setLots(prev => prev.map((l, i) => i === li ? { ...l, [field]: value } : l));
  const addItem = (li) => setLots(prev => prev.map((l, i) => i === li ? { ...l, items: [...l.items, { ...emptyItem(), order: l.items.length + 1 }] } : l));
  const removeItem = (li, ii) => setLots(prev => prev.map((l, i) => i === li ? { ...l, items: l.items.filter((_, j) => j !== ii) } : l));
  const updateItem = (li, ii, field, value) => {
    setLots(prev => prev.map((l, i) => i === li ? {
      ...l,
      items: l.items.map((item, j) => j === ii ? { ...item, [field]: value } : item)
    } : l));
  };

  // ── Calculations ──
  const calcItemTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const calcLotSubtotal = (lot) => lot.items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const subtotal = lots.reduce((sum, lot) => sum + calcLotSubtotal(lot), 0);
  const discountAmount = discountType === 'PERCENT'
    ? Math.round(subtotal * (parseFloat(discountValue) || 0) / 100)
    : Math.round(parseFloat(discountValue) || 0);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(subtotalAfterDiscount * (parseFloat(taxRate) || 0) / 100);
  const totalTTC = subtotalAfterDiscount + taxAmount;

  // Payment schedule amounts
  const scheduleWithAmounts = paymentSchedule.map(m => ({
    ...m,
    amount: Math.round(totalTTC * (parseFloat(m.percent) || 0) / 100),
  }));

  const formatPrice = (v) => Math.round(v).toLocaleString('fr-FR');

  // ── Payment schedule CRUD ──
  const addMilestone = () => setPaymentSchedule(prev => [...prev, { label: '', percent: 0 }]);
  const removeMilestone = (i) => setPaymentSchedule(prev => prev.filter((_, j) => j !== i));
  const updateMilestone = (i, field, value) => setPaymentSchedule(prev => prev.map((m, j) => j === i ? { ...m, [field]: value } : m));

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Le titre est requis.'); return; }
    if (lots.length === 0 || lots.every(l => l.items.length === 0)) { toast.error('Ajoutez au moins un poste.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        title,
        template_id: selectedTemplate || null,
        organization_id: organizationId || null,
        manuscript_id: manuscriptId,
        service_request_id: serviceRequestId,
        publishing_model: publishingModel || '',
        client_name: clientName,
        client_email: clientEmail,
        ...(clientIdParam && { client_id: parseInt(clientIdParam) }),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        tax_rate: parseFloat(taxRate) || 0,
        delivery_days: parseInt(deliveryDays) || 30,
        validity_days: parseInt(validityDays) || 30,
        revision_rounds: parseInt(revisionRounds) || 1,
        notes,
        payment_schedule: scheduleWithAmounts,
        lots: lots.map((lot, li) => ({
          name: lot.name || `Lot ${li + 1}`,
          order: li + 1,
          items: lot.items.map((item, ii) => ({
            designation: item.designation,
            description: item.description || '',
            unit: item.unit,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            order: ii + 1,
          })),
        })),
      };

      const res = await quoteService.createQuote(payload);
      toast.success('Devis créé avec succès !');
      navigate(`/dashboard/services/quotes/${res.data.id}`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border-card)', fontFamily: 'inherit', fontSize: '0.875rem', background: 'var(--color-bg-card)', color: 'var(--color-text-heading)' };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: 4 };
  const thStyle = { padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', borderBottom: '2px solid var(--color-border-card)' };
  const tdStyle = { padding: '6px 8px', borderBottom: '1px solid var(--color-border-card)' };
  const smallInput = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border-card)', fontFamily: 'inherit', fontSize: '0.85rem', background: 'var(--color-bg-card)', color: 'var(--color-text-heading)' };

  return (
    <div className="author-space">
      <h1 className="author-space__title"><i className="fas fa-file-invoice-dollar" style={{ color: 'var(--color-primary)' }} /> Nouveau devis DQE</h1>
      <p className="author-space__subtitle">Créez un devis quantitatif détaillé</p>

      <form onSubmit={handleSubmit}>
        {/* ── Header ── */}
        <div className="as-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Modèle éditorial {manuscriptId ? '*' : ''}</label>
              <select value={publishingModel} onChange={e => setPublishingModel(e.target.value)} style={inputStyle} required={!!manuscriptId}>
                <option value="">— Sélectionner —</option>
                {PUBLISHING_MODEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Modèle de devis</label>
              <select value={selectedTemplate} onChange={e => handleTemplateChange(e.target.value)} style={inputStyle}>
                <option value="">— Devis vierge —</option>
                {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.lots_count} lots)</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Objet du devis *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Edition et impression de « Mon Livre »" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Nom du client</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nom complet" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email du client</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* ── Lots & Items ── */}
        {lots.map((lot, li) => (
          <div key={li} className="as-card" style={{ padding: 0, marginBottom: '1rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: 'rgba(var(--color-primary-rgb, 99,102,241), 0.06)', borderBottom: '1px solid var(--color-border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)' }}>LOT {li + 1}</span>
                <input type="text" value={lot.name} onChange={e => updateLot(li, 'name', e.target.value)} placeholder="Nom du lot (ex: Préparation éditoriale)" style={{ ...smallInput, flex: 1, fontWeight: 600 }} />
              </div>
              {lots.length > 1 && (
                <button type="button" onClick={() => removeLot(li)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 8px', fontSize: '0.85rem' }} title="Supprimer le lot">
                  <i className="fas fa-trash" />
                </button>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '35%', textAlign: 'left' }}>Désignation</th>
                  <th style={{ ...thStyle, width: '12%', textAlign: 'center' }}>Unité</th>
                  <th style={{ ...thStyle, width: '12%', textAlign: 'right' }}>Quantité</th>
                  <th style={{ ...thStyle, width: '15%', textAlign: 'right' }}>P.U. (FCFA)</th>
                  <th style={{ ...thStyle, width: '15%', textAlign: 'right' }}>Total (FCFA)</th>
                  <th style={{ ...thStyle, width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {lot.items.map((item, ii) => (
                  <tr key={ii}>
                    <td style={tdStyle}>
                      <input type="text" value={item.designation} onChange={e => updateItem(li, ii, 'designation', e.target.value)} placeholder="Désignation du poste" style={{ ...smallInput, width: '100%' }} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <select value={item.unit} onChange={e => updateItem(li, ii, 'unit', e.target.value)} style={{ ...smallInput, width: '100%', textAlign: 'center' }}>
                        {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" value={item.quantity} onChange={e => updateItem(li, ii, 'quantity', e.target.value)} min="0" step="any" style={{ ...smallInput, width: '100%', textAlign: 'right' }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" value={item.unit_price} onChange={e => updateItem(li, ii, 'unit_price', e.target.value)} min="0" step="any" style={{ ...smallInput, width: '100%', textAlign: 'right' }} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {formatPrice(calcItemTotal(item))}
                    </td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => removeItem(li, ii)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }} title="Supprimer">
                        <i className="fas fa-times" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ padding: '8px 10px' }}>
                    <button type="button" onClick={() => addItem(li)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      <i className="fas fa-plus" /> Ajouter un poste
                    </button>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', borderTop: '2px solid var(--color-border-card)' }}>
                    {formatPrice(calcLotSubtotal(lot))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        <button type="button" onClick={addLot} className="dashboard-btn" style={{ marginBottom: '1.5rem' }}>
          <i className="fas fa-plus" /> Ajouter un lot
        </button>

        {/* ── Totals ── */}
        <div className="as-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}><i className="fas fa-calculator" /> Récapitulatif</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Type de remise</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={inputStyle}>
                <option value="PERCENT">Pourcentage (%)</option>
                <option value="AMOUNT">Montant fixe (FCFA)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valeur remise</label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} min="0" step="any" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Taux TVA (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} min="0" max="100" step="any" placeholder="0 si exonéré, 18 au Gabon" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: 400, marginLeft: 'auto', padding: '1rem', background: 'var(--color-bg-section-alt)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sous-total HT</span><strong>{formatPrice(subtotal)} FCFA</strong>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Remise</span><strong>-{formatPrice(discountAmount)} FCFA</strong>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sous-total après remise</span><strong>{formatPrice(subtotalAfterDiscount)} FCFA</strong>
              </div>
            )}
            {taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TVA ({taxRate}%)</span><strong>{formatPrice(taxAmount)} FCFA</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-text-heading)', paddingTop: 8, fontSize: '1.1rem', fontWeight: 800 }}>
              <span>TOTAL TTC</span><span>{formatPrice(totalTTC)} FCFA</span>
            </div>
          </div>
        </div>

        {/* ── Conditions ── */}
        <div className="as-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}><i className="fas fa-cog" /> Conditions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={labelStyle}>Délai de livraison (jours)</label><input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} min="1" style={inputStyle} /></div>
            <div><label style={labelStyle}>Validité du devis (jours)</label><input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} min="1" style={inputStyle} /></div>
            <div><label style={labelStyle}>Révisions incluses</label><input type="number" value={revisionRounds} onChange={e => setRevisionRounds(e.target.value)} min="0" style={inputStyle} /></div>
          </div>

          {/* Payment schedule */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Écheancier de paiement</label>
            {paymentSchedule.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input type="text" value={m.label} onChange={e => updateMilestone(i, 'label', e.target.value)} placeholder="Libellé" style={{ ...smallInput, flex: 2 }} />
                <input type="number" value={m.percent} onChange={e => updateMilestone(i, 'percent', e.target.value)} min="0" max="100" style={{ ...smallInput, width: 70, textAlign: 'right' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted-ui)' }}>%</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 100, textAlign: 'right' }}>{formatPrice(Math.round(totalTTC * (parseFloat(m.percent) || 0) / 100))} F</span>
                <button type="button" onClick={() => removeMilestone(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><i className="fas fa-times" /></button>
              </div>
            ))}
            <button type="button" onClick={addMilestone} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.25rem' }}>
              <i className="fas fa-plus" /> Ajouter une échéance
            </button>
          </div>

          <div>
            <label style={labelStyle}>Notes / conditions particulières</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Conditions de garantie, exclusions, précisions..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate(-1)} className="dashboard-btn">Annuler</button>
          <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={submitting}>
            {submitting ? <><i className="fas fa-spinner fa-spin" /> Création...</> : <><i className="fas fa-save" /> Créer le devis</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuoteCreate;
