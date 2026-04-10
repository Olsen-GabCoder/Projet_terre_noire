import React from 'react';
import { Link } from 'react-router-dom';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">
            <i className="fas fa-exclamation-triangle" />
          </div>
          <h2 className="error-boundary__title">{t('errorBoundary.title')}</h2>
          <p className="error-boundary__desc">
            {t('errorBoundary.description')}
          </p>
          <div className="error-boundary__actions">
            <button onClick={this.handleReset} className="error-boundary__btn error-boundary__btn--primary">
              <i className="fas fa-redo" /> {t('common.retry')}
            </button>
            <Link to="/" onClick={this.handleReset} className="error-boundary__btn error-boundary__btn--outline">
              <i className="fas fa-home" /> {t('errorBoundary.home')}
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
