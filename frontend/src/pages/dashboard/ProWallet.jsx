import { useState, useEffect, useCallback } from 'react';
import servicesService from '../../services/servicesService';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';
import { useTranslation } from 'react-i18next';

const ProWallet = () => {
  const [wallet, setWallet] = useState(null);
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', provider: 'MOBICASH', phone_number: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [walRes, txRes, wdRes] = await Promise.all([
        servicesService.getWallet(),
        servicesService.getWalletTransactions().catch(() => ({ data: [] })),
        marketplaceService.getWithdrawals().catch(() => ({ data: [] })),
      ]);
      setWallet(walRes.data);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : txRes.data?.results || []);
      const wds = Array.isArray(wdRes.data) ? wdRes.data : [];
      setWithdrawals(wds.filter(w => w.wallet_type === 'PROFESSIONAL'));
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < 1000) return toast.error('Montant minimum : 1 000 FCFA.');
    if (!withdrawForm.phone_number.trim()) return toast.error('Numero de telephone requis.');

    setWithdrawing(true);
    try {
      const res = await marketplaceService.requestWithdrawal({
        wallet_type: 'PROFESSIONAL',
        amount,
        provider: withdrawForm.provider,
        phone_number: withdrawForm.phone_number.trim(),
      });
      toast.success(res.data?.message || 'Retrait effectue.');
      setShowWithdraw(false);
      setWithdrawForm({ amount: '', provider: 'MOBICASH', phone_number: '' });
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || handleApiError(err));
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!wallet) return null;

  const fmtPrice = (v) => Math.round(parseFloat(v) || 0).toLocaleString('fr-FR');
  const balance = parseFloat(wallet.balance) || 0;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-wallet" style={{ color: '#ec4899' }} /> Portefeuille</h1>
          <p className="author-space__subtitle">Suivi de vos gains de services professionnels.</p>
        </div>
        {balance >= 1000 && !showWithdraw && (
          <button className="as-cta" onClick={() => setShowWithdraw(true)}>
            <i className="fas fa-money-bill-wave" /> Retirer mes gains
          </button>
        )}
      </div>

      <div className="as-stats">
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-wallet" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.balance)} F</div>
            <div className="as-stat__label">Solde disponible</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}><i className="fas fa-arrow-up" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.total_earned)} F</div>
            <div className="as-stat__label">Total gagne</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-arrow-down" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.total_withdrawn)} F</div>
            <div className="as-stat__label">Total retire</div>
          </div>
        </div>
      </div>

      {/* Formulaire retrait */}
      {showWithdraw && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-money-bill-wave" /> Retrait Mobile Money</h2>
            <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> Annuler
            </button>
          </div>
          <div className="as-card__body">
            <form onSubmit={handleWithdraw}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>Montant (FCFA) *</label>
                  <input type="number" min="1000" max={balance} step="500" value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))} placeholder={`Max: ${fmtPrice(balance)}`} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>Minimum 1 000 FCFA. Disponible : {fmtPrice(balance)} FCFA.</span>
                </div>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>Provider *</label>
                  <select value={withdrawForm.provider} onChange={e => setWithdrawForm(f => ({ ...f, provider: e.target.value }))}>
                    <option value="MOBICASH">Mobicash (Gabon Telecom)</option>
                    <option value="AIRTEL">Airtel Money</option>
                  </select>
                </div>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>Numero Mobile Money *</label>
                  <input type="tel" value={withdrawForm.phone_number} onChange={e => setWithdrawForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+241 XX XX XX XX" />
                </div>
              </div>
              <div className="ob-form__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setShowWithdraw(false)}>Annuler</button>
                <button type="submit" className="as-cta" disabled={withdrawing}>
                  {withdrawing ? <><i className="fas fa-spinner fa-spin" /> Traitement...</> : <><i className="fas fa-paper-plane" /> Retirer {withdrawForm.amount ? `${fmtPrice(withdrawForm.amount)} F` : ''}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historique retraits */}
      {withdrawals.length > 0 && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-exchange-alt" /> Historique des retraits</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead><tr><th>Date</th><th>Montant</th><th>Provider</th><th>Numero</th><th>Statut</th></tr></thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap' }}>{new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700 }}>{fmtPrice(w.amount)} F</td>
                    <td>{w.provider_display}</td>
                    <td style={{ fontSize: '0.8rem' }}>{w.phone_number}</td>
                    <td><span className={`ob-badge ${w.status === 'COMPLETED' ? 'ob-badge--ok' : w.status === 'FAILED' ? 'ob-badge--off' : 'ob-badge--pending'}`}>{w.status_display}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      {transactions.length > 0 ? (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-history" /> Historique</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Description</th></tr></thead>
              <tbody>
                {transactions.map(tx => {
                  const isCredit = tx.transaction_type?.startsWith('CREDIT');
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap' }}>{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><span className={`ob-badge ${isCredit ? 'ob-badge--ok' : 'ob-badge--off'}`}>{tx.type_display}</span></td>
                      <td style={{ fontWeight: 700, color: isCredit ? 'var(--color-success)' : 'var(--color-error)' }}>{isCredit ? '+' : '-'}{fmtPrice(tx.amount)} F</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>{tx.description || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="as-card">
          <div className="as-card__body" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted-ui)' }}>
            <i className="fas fa-receipt" style={{ fontSize: '1.25rem', opacity: 0.4, marginBottom: '0.5rem', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucune transaction pour le moment.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProWallet;
