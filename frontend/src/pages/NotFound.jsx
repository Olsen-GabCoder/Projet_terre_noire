import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/NotFound.css';
import PageHero from '../components/PageHero';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="notfound-page">
      <PageHero
        title={t('pages.notFound.title')}
        subtitle={t('pages.notFound.description')}
        hasFade={false}
      >
        <div className="notfound-hero__code">404</div>
        <div className="notfound-hero__actions">
          <Link to="/" className="notfound-btn notfound-btn--primary">
            <i className="fas fa-home" /> {t('pages.notFound.backHome')}
          </Link>
          <Link to="/catalog" className="notfound-btn notfound-btn--outline">
            <i className="fas fa-book" /> {t('pages.notFound.viewCatalog')}
          </Link>
        </div>
      </PageHero>
    </div>
  );
};

export default NotFound;
