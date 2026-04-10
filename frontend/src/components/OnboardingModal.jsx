import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import '../styles/Onboarding.css';

const OnboardingModal = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = [
    {
      icon: 'fas fa-book-open',
      title: t('onboarding.step1Title'),
      desc: t('onboarding.step1Desc'),
      link: '/catalog',
      linkText: t('onboarding.step1Link'),
    },
    {
      icon: 'fas fa-users',
      title: t('onboarding.step2Title'),
      desc: t('onboarding.step2Desc'),
      link: '/clubs',
      linkText: t('onboarding.step2Link'),
    },
    {
      icon: 'fas fa-pen-nib',
      title: t('onboarding.step3Title'),
      desc: t('onboarding.step3Desc'),
      link: '/submit-manuscript',
      linkText: t('onboarding.step3Link'),
    },
  ];

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const key = `frollot-onboarding-${user.id}`;
    if (!localStorage.getItem(key)) {
      // Attendre un peu pour ne pas bloquer le premier render
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);

  const dismiss = () => {
    setVisible(false);
    if (user) {
      localStorage.setItem(`frollot-onboarding-${user.id}`, 'done');
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="onboarding-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={dismiss} aria-label="Fermer">
          <i className="fas fa-times" />
        </button>

        <div className="onboarding-header">
          <h2>{t('onboarding.welcome', { name: user?.first_name || user?.username })}</h2>
          <p>{t('onboarding.subtitle')}</p>
        </div>

        <div className="onboarding-step">
          <div className="onboarding-step__icon">
            <i className={current.icon} />
          </div>
          <h3>{current.title}</h3>
          <p>{current.desc}</p>
          <Link to={current.link} className="onboarding-step__link" onClick={dismiss}>
            {current.linkText} <i className="fas fa-arrow-right" />
          </Link>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`onboarding-dot ${i === step ? 'active' : ''}`}
                onClick={() => setStep(i)}
                aria-label={t('onboarding.stepLabel', { number: i + 1 })}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            {step < STEPS.length - 1 ? (
              <button className="onboarding-btn onboarding-btn--primary" onClick={() => setStep(step + 1)}>
                {t('onboarding.nextBtn')} <i className="fas fa-chevron-right" />
              </button>
            ) : (
              <button className="onboarding-btn onboarding-btn--primary" onClick={dismiss}>
                {t('onboarding.startBtn')} <i className="fas fa-rocket" />
              </button>
            )}
            <button className="onboarding-btn onboarding-btn--skip" onClick={dismiss}>
              {t('onboarding.skipBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
