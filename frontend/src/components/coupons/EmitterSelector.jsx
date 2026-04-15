import { useTranslation } from 'react-i18next';
import './EmitterSelector.css';

/**
 * Stable color from org name (deterministic hash → hue).
 */
function orgColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}

/**
 * Translate org_type via i18n with fallback.
 */
function orgTypeLabel(orgType, t) {
  const key = `coupons.emitterSelector.orgType.${orgType}`;
  const val = t(key);
  return val !== key ? val : t('coupons.emitterSelector.orgType.AUTRE');
}

/**
 * EmitterSelector — shared component for the 3 coupon emitter pages.
 *
 * Props (all from useEmitterContext):
 *   context, emitterType, setEmitterType, activeOrgId, setActiveOrgId,
 *   activeOrg, hasDualContext, organizations, canEmit, needsOrgSelection
 */
const EmitterSelector = ({
  emitterType,
  setEmitterType,
  activeOrgId,
  setActiveOrgId,
  activeOrg,
  hasDualContext,
  organizations,
  canEmit,
  needsOrgSelection,
}) => {
  const { t } = useTranslation();

  // No context → handled by caller (no-context screen)
  if (!canEmit) return null;

  const orgCount = organizations?.length || 0;

  return (
    <div className="emitter-selector">
      {/* Bloc 1 — Dual context pills */}
      {hasDualContext && (
        <div className="emitter-selector__dual">
          <button
            className={`emitter-selector__pill ${emitterType === 'organization' ? 'emitter-selector__pill--active' : ''}`}
            onClick={() => setEmitterType('organization')}
          >
            <i className="fas fa-building" />
            {t('coupons.emitterSelector.dualContext.org')}
          </button>
          <button
            className={`emitter-selector__pill ${emitterType === 'provider_profile' ? 'emitter-selector__pill--active' : ''}`}
            onClick={() => setEmitterType('provider_profile')}
          >
            <i className="fas fa-user-tie" />
            {t('coupons.emitterSelector.dualContext.profile')}
          </button>
        </div>
      )}

      {/* Bloc 2 — Org selector (only if multi-org + emitterType=organization) */}
      {needsOrgSelection && orgCount >= 2 && (
        <div className="emitter-selector__org">
          <label className="emitter-selector__org-label">
            {t('coupons.emitterSelector.orgLabel')}
          </label>

          {orgCount <= 5 ? (
            /* Dropdown for 2-5 orgs */
            <select
              className="emitter-selector__select"
              value={activeOrgId || ''}
              onChange={(e) => setActiveOrgId(Number(e.target.value))}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} — {orgTypeLabel(org.org_type, t)}
                </option>
              ))}
            </select>
          ) : (
            /* Pill grid for 6+ orgs */
            <div className="emitter-selector__pill-grid">
              {organizations.map((org) => {
                const isActive = org.id === activeOrgId;
                const color = orgColor(org.name);
                return (
                  <button
                    key={org.id}
                    className={`emitter-selector__org-pill ${isActive ? 'emitter-selector__org-pill--active' : ''}`}
                    style={{ '--org-color': color }}
                    onClick={() => setActiveOrgId(org.id)}
                  >
                    <span className="emitter-selector__org-initial" style={{ background: color }}>
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="emitter-selector__org-info">
                      <span className="emitter-selector__org-name">{org.name}</span>
                      <span className="emitter-selector__org-type">{orgTypeLabel(org.org_type, t)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active org banner */}
      {activeOrg && emitterType === 'organization' && orgCount >= 2 && (
        <div className="emitter-selector__banner">
          <i className="fas fa-info-circle" />
          {t('coupons.emitterSelector.activeBanner', {
            name: activeOrg.name,
            type: orgTypeLabel(activeOrg.org_type, t),
          })}
        </div>
      )}
    </div>
  );
};

export default EmitterSelector;
