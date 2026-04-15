import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../../services/api';
import '../../styles/AdminDashboard.css';

const COLORS = ['#2563eb', '#e63946', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const STATUS_LABELS = {
  PENDING: 'En attente',
  PAID: 'Payées',
  SHIPPED: 'Expédiées',
  CANCELLED: 'Annulées',
};

const MANUSCRIPT_LABELS = {
  PENDING: 'En attente',
  REVIEWING: 'En lecture',
  ACCEPTED: 'Acceptés',
  REJECTED: 'Refusés',
};

const formatPrice = (value) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + ' FCFA';

const formatMonth = (str) => {
  const [, m] = str.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[parseInt(m, 10) - 1] || str;
};

const formatDay = (str) => {
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard/');
        setData(res.data);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [location.key]);

  if (loading) {
    return (
      <div className="admin-dash-page">
        <div className="admin-dash-loading">
          <i className="fas fa-spinner fa-spin" /> Chargement du tableau de bord…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-dash-page">
        <div className="admin-dash-loading admin-dash-loading--error">
          <i className="fas fa-exclamation-triangle" /> {error || 'Données indisponibles.'}
        </div>
      </div>
    );
  }

  const { kpis, orders_by_status, revenue_by_month, recent_orders_by_day, top_books, manuscripts_by_status, manuscripts_total, books_by_format, top_categories } = data;

  const orderStatusData = Object.entries(orders_by_status).map(([key, val]) => ({
    name: STATUS_LABELS[key] || key,
    value: val,
  }));

  const formatData = Object.entries(books_by_format).map(([key, val]) => ({
    name: key === 'EBOOK' ? 'Ebooks' : 'Papier',
    value: val,
  }));

  const manuscriptStatusData = Object.entries(manuscripts_by_status).map(([key, val]) => ({
    name: MANUSCRIPT_LABELS[key] || key,
    value: val,
  }));

  return (
    <div className="admin-dash-page">
      {/* ── Hero (même style que les autres pages admin) ── */}
      <section className="admin-dash-hero">
        <div className="admin-dash-hero__orb admin-dash-hero__orb--1" />
        <div className="admin-dash-hero__orb admin-dash-hero__orb--2" />
        <div className="admin-dash-hero__grid-bg" />
        <div className="admin-dash-hero__inner">
          <div className="admin-dash-hero__line" />
          <h1 className="admin-dash-hero__title">Tableau de bord</h1>
          <p className="admin-dash-hero__sub">
            Vue d'ensemble de l'activité de Frollot
          </p>
        </div>
      </section>
      <div className="admin-dash-hero-fade" />

      <section className="admin-dash-content">
        <div className="admin-dash-inner">

          {/* ── KPI Stats rapides ── */}
          <div className="admin-dash-stats">
            <div className="admin-dash-stat admin-dash-stat--revenue">
              <div className="admin-dash-stat__icon"><i className="fas fa-coins" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{formatPrice(kpis.total_revenue)}</span>
                <span className="admin-dash-stat__label">Revenus totaux</span>
              </div>
              <span className="admin-dash-stat__badge">{formatPrice(kpis.revenue_30d)} / 30j</span>
            </div>

            <div className="admin-dash-stat admin-dash-stat--orders">
              <div className="admin-dash-stat__icon"><i className="fas fa-shopping-cart" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{kpis.total_orders}</span>
                <span className="admin-dash-stat__label">Commandes</span>
              </div>
              <span className="admin-dash-stat__badge">{orders_by_status.PAID || 0} payées</span>
            </div>

            <div className="admin-dash-stat admin-dash-stat--users">
              <div className="admin-dash-stat__icon"><i className="fas fa-users" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{kpis.total_users}</span>
                <span className="admin-dash-stat__label">Utilisateurs</span>
              </div>
              <span className="admin-dash-stat__badge">+{kpis.new_users_30d} / 30j</span>
            </div>

            <div className="admin-dash-stat admin-dash-stat--books">
              <div className="admin-dash-stat__icon"><i className="fas fa-book" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{kpis.total_books}</span>
                <span className="admin-dash-stat__label">Livres au catalogue</span>
              </div>
            </div>

            <div className="admin-dash-stat admin-dash-stat--manuscripts">
              <div className="admin-dash-stat__icon"><i className="fas fa-file-alt" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{manuscripts_total}</span>
                <span className="admin-dash-stat__label">Manuscrits</span>
              </div>
              {kpis.manuscripts_pending > 0 && (
                <span className="admin-dash-stat__badge admin-dash-stat__badge--warn">{kpis.manuscripts_pending} en attente</span>
              )}
            </div>

            <div className="admin-dash-stat admin-dash-stat--newsletter">
              <div className="admin-dash-stat__icon"><i className="fas fa-envelope" /></div>
              <div className="admin-dash-stat__body">
                <span className="admin-dash-stat__value">{kpis.newsletter_subscribers}</span>
                <span className="admin-dash-stat__label">Abonnés newsletter</span>
              </div>
              {kpis.unread_messages > 0 && (
                <span className="admin-dash-stat__badge admin-dash-stat__badge--warn">{kpis.unread_messages} msg non lus</span>
              )}
            </div>
          </div>

          {/* ── Graphiques ── */}
          <div className="admin-dash-charts">
            {revenue_by_month.length > 0 && (
              <div className="admin-dash-chart">
                <h3 className="admin-dash-chart__title"><i className="fas fa-chart-bar" /> Revenus par mois</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue_by_month}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val) => formatPrice(val)} labelFormatter={formatMonth} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenus" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {recent_orders_by_day.length > 0 && (
              <div className="admin-dash-chart">
                <h3 className="admin-dash-chart__title"><i className="fas fa-calendar-alt" /> Commandes (7 derniers jours)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={recent_orders_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={formatDay} />
                    <Line type="monotone" dataKey="count" stroke="#e63946" strokeWidth={2} dot={{ r: 4 }} name="Commandes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {orderStatusData.length > 0 && (
              <div className="admin-dash-chart">
                <h3 className="admin-dash-chart__title"><i className="fas fa-tasks" /> Commandes par statut</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {orderStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {formatData.length > 0 && (
              <div className="admin-dash-chart">
                <h3 className="admin-dash-chart__title"><i className="fas fa-book-open" /> Livres par format</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={formatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {formatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Tableaux ── */}
          <div className="admin-dash-tables">
            <div className="admin-dash-table-card">
              <h3 className="admin-dash-table-card__title"><i className="fas fa-trophy" /> Top 5 livres vendus</h3>
              {top_books.length === 0 ? (
                <p className="admin-dash-table-card__empty">Aucune vente enregistrée.</p>
              ) : (
                <table className="admin-dash-table">
                  <thead>
                    <tr><th>#</th><th>Titre</th><th>Vendus</th><th>Revenus</th></tr>
                  </thead>
                  <tbody>
                    {top_books.map((b, i) => (
                      <tr key={b.book__id}>
                        <td className="admin-dash-table__rank">{i + 1}</td>
                        <td>{b.book__title}</td>
                        <td>{b.sold}</td>
                        <td>{formatPrice(b.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-dash-table-card">
              <h3 className="admin-dash-table-card__title"><i className="fas fa-tags" /> Catégories populaires</h3>
              {top_categories.length === 0 ? (
                <p className="admin-dash-table-card__empty">Aucune catégorie avec des livres.</p>
              ) : (
                <table className="admin-dash-table">
                  <thead>
                    <tr><th>Catégorie</th><th>Livres</th></tr>
                  </thead>
                  <tbody>
                    {top_categories.map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>{c.book_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {manuscriptStatusData.length > 0 && (
              <div className="admin-dash-table-card">
                <h3 className="admin-dash-table-card__title"><i className="fas fa-pen-fancy" /> Manuscrits par statut</h3>
                <div className="admin-dash-status-pills">
                  {manuscriptStatusData.map((m, i) => (
                    <div key={m.name} className="admin-dash-status-pill" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
                      <span className="admin-dash-status-pill__label">{m.name}</span>
                      <span className="admin-dash-status-pill__value">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Raccourcis admin ── */}
          <div className="admin-dash-shortcuts">
            <Link to="/admin-dashboard/books" className="admin-dash-shortcut">
              <i className="fas fa-book" /> Gérer les livres
            </Link>
            <Link to="/admin-dashboard/orders" className="admin-dash-shortcut">
              <i className="fas fa-shopping-cart" /> Gérer les commandes
            </Link>
            <Link to="/admin-dashboard/manuscripts" className="admin-dash-shortcut">
              <i className="fas fa-file-alt" /> Gérer les manuscrits
            </Link>
            <Link to="/admin-dashboard/authors" className="admin-dash-shortcut">
              <i className="fas fa-user-edit" /> Gérer les auteurs
            </Link>
            <Link to="/admin-dashboard/users" className="admin-dash-shortcut">
              <i className="fas fa-users-cog" /> Gérer les utilisateurs
            </Link>
            <Link to="/admin-dashboard/coupons" className="admin-dash-shortcut">
              <i className="fas fa-ticket-alt" /> Supervision coupons
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
