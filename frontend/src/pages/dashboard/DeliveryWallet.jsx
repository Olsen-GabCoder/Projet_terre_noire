import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';

const DeliveryWallet = () => {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulaire retrait
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', provider: 'MOBICASH', phone_number: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [walRes, txRes, wdRes] = await Promise.all([
        marketplaceService.getDeliveryWallet(),
        marketplaceService.getDeliveryWalletTransactions().catch(() => ({ data: [] })),
        marketplaceService.getWithdrawals().catch(() => ({ data: [] })),
      ]);
      setWallet(walRes.data);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : txRes.data?.results || []);
      const wds = Array.isArray(wdRes.data) ? wdRes.data : [];
      setWithdrawals(wds.filter(w => w.wallet_type === 'DELIVERY'));
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
        wallet_type: 'DELIVERY',
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
          <h1 className="author-space__title"><i className="fas fa-wallet" style={{ color: '#10b981' }} /> {t('dashboard.deliveryWallet.title')}</h1>
          <p className="author-space__subtitle">{t('dashboard.deliveryWallet.subtitle')}</p>
        </div>
        {balance >= 1000 && !showWithdraw && (
          <button className="as-cta" onClick={() => setShowWithdraw(true)}>
            <i className="fas fa-money-bill-wave" /> {t('dashboard.deliveryWallet.withdrawGains')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="as-stats">
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-wallet" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.balance)} F</div>
            <div className="as-stat__label">{t('dashboard.deliveryWallet.availableBalance')}</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}><i className="fas fa-arrow-up" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.total_earned)} F</div>
            <div className="as-stat__label">{t('dashboard.deliveryWallet.totalEarned')}</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-arrow-down" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(wallet.total_withdrawn)} F</div>
            <div className="as-stat__label">{t('dashboard.deliveryWallet.totalWithdrawn')}</div>
          </div>
        </div>
      </div>

      {/* Formulaire retrait */}
      {showWithdraw && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-money-bill-wave" /> {t('dashboard.deliveryWallet.mobileMoneyWithdrawal')}</h2>
            <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('dashboard.deliveryWallet.cancel')}
            </button>
          </div>
          <div className="as-card__body">
            <form onSubmit={handleWithdraw}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryWallet.amount')} *</label>
                  <input
                    type="number" min="1000" max={balance} step="500"
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={`Max: ${fmtPrice(balance)}`}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>
                    {t('dashboard.deliveryWallet.minAmount', { available: fmtPrice(balance) })}
                  </span>
                </div>

                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryWallet.provider')} *</label>
                  <select value={withdrawForm.provider} onChange={e => setWithdrawForm(f => ({ ...f, provider: e.target.value }))}>
                    <option value="MOBICASH">Mobicash (Gabon Telecom)</option>
                    <option value="AIRTEL">Airtel Money</option>
                  </select>
                </div>

                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryWallet.mobileNumber')} *</label>
                  <input
                    type="tel"
                    value={withdrawForm.phone_number}
                    onChange={e => setWithdrawForm(f => ({ ...f, phone_number: e.target.value }))}
                    placeholder="+241 XX XX XX XX"
                  />
                </div>
              </div>

              <div className="ob-form__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setShowWithdraw(false)}>{t('dashboard.deliveryWallet.cancel')}</button>
                <button type="submit" className="as-cta" disabled={withdrawing}>
                  {withdrawing ? <><i className="fas fa-spinner fa-spin" /> {t('dashboard.deliveryWallet.processing')}</> : <><i className="fas fa-paper-plane" /> {t('dashboard.deliveryWallet.withdraw')} {withdrawForm.amount ? `${fmtPrice(withdrawForm.amount)} F` : ''}</>}
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
            <h2 className="as-card__title"><i className="fas fa-exchange-alt" /> {t('dashboard.deliveryWallet.withdrawalHistory')}</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>{t('dashboard.deliveryWallet.colDate')}</th><th>{t('dashboard.deliveryWallet.colAmount')}</th><th>{t('dashboard.deliveryWallet.colProvider')}</th><th>{t('dashboard.deliveryWallet.colNumber')}</th><th>{t('dashboard.deliveryWallet.colStatus')}</th></tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap' }}>
                      {new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmtPrice(w.amount)} F</td>
                    <td>{w.provider_display}</td>
                    <td style={{ fontSize: '0.8rem' }}>{w.phone_number}</td>
                    <td>
                      <span className={`ob-badge ${w.status === 'COMPLETED' ? 'ob-badge--ok' : w.status === 'FAILED' ? 'ob-badge--off' : 'ob-badge--pending'}`}>
                        {w.status_display}
                      </span>
                    </td>
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
            <h2 className="as-card__title"><i className="fas fa-history" /> {t('dashboard.deliveryWallet.transactionHistory')}</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>{t('dashboard.deliveryWallet.colDate')}</th><th>{t('dashboard.deliveryWallet.colType')}</th><th>{t('dashboard.deliveryWallet.colAmount')}</th><th>{t('dashboard.deliveryWallet.colDescription')}</th></tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isCredit = tx.transaction_type?.startsWith('CREDIT');
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td><span className={`ob-badge ${isCredit ? 'ob-badge--ok' : 'ob-badge--off'}`}>{tx.type_display}</span></td>
                      <td style={{ fontWeight: 700, color: isCredit ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {isCredit ? '+' : '-'}{fmtPrice(tx.amount)} F
                      </td>
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
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('dashboard.deliveryWallet.noTransactions')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryWallet;
