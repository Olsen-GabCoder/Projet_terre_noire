import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';

const VendorWallet = () => {
  const [wallet, setWallet] = useState(null);
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          marketplaceService.getWallet(),
          marketplaceService.getWalletTransactions(),
        ]);
        setWallet(walletRes.data);
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!wallet) return <p className="text-muted">{t('vendor.wallet.unavailable')}</p>;

  return (
    <div className="vendor-wallet">
      <div className="dashboard-home__header">
        <h1>{t('vendor.wallet.title')}</h1>
        <p className="dashboard-home__subtitle">{t('vendor.wallet.subtitle')}</p>
      </div>

      <div className="dashboard-home__grid">
        <div className="dashboard-card">
          <div className="dashboard-card__body">
            <div className="org-dashboard__stats">
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value" style={{ color: '#16a34a' }}>
                  {parseInt(wallet.balance).toLocaleString()} F
                </span>
                <span className="org-dashboard__stat-label">{t('vendor.wallet.availableBalance')}</span>
              </div>
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">
                  {parseInt(wallet.total_earned).toLocaleString()} F
                </span>
                <span className="org-dashboard__stat-label">{t('vendor.wallet.totalEarned')}</span>
              </div>
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">
                  {parseInt(wallet.total_withdrawn).toLocaleString()} F
                </span>
                <span className="org-dashboard__stat-label">{t('vendor.wallet.totalWithdrawn')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem' }}>
        <i className="fas fa-history" /> {t('vendor.wallet.transactionHistory')}
      </h2>

      {transactions.length === 0 ? (
        <p className="text-muted">{t('vendor.wallet.noTransactions')}</p>
      ) : (
        <div className="dashboard-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>{t('vendor.wallet.date')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.wallet.type')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.wallet.amount')}</th>
                <th style={{ padding: '0.75rem' }}>{t('vendor.wallet.description')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                    {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`my-profiles__badge ${tx.transaction_type.startsWith('CREDIT') ? 'my-profiles__badge--active' : ''}`}>
                      {tx.type_display}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: tx.transaction_type.startsWith('CREDIT') ? '#16a34a' : '#dc2626' }}>
                    {tx.transaction_type.startsWith('CREDIT') ? '+' : '-'}{parseInt(tx.amount).toLocaleString()} F
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>{tx.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VendorWallet;
