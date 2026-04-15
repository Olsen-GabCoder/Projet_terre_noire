import { useState, useEffect, useMemo, useCallback } from 'react';
import { couponAPI } from '../services/api';

const LS_KEY_ORG = 'coupons_active_org_id';
const LS_KEY_TYPE = 'coupons_emitter_type';

/**
 * Hook partagé — source de vérité du contexte émetteur coupons.
 *
 * Appelle GET /api/coupons/emitter-context/ au montage,
 * gère emitterType, activeOrgId, persistance localStorage.
 */
export default function useEmitterContext() {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emitterType, setEmitterTypeRaw] = useState(null);
  const [activeOrgId, setActiveOrgIdRaw] = useState(null);

  // Fetch context from backend
  const fetchContext = useCallback(() => {
    setLoading(true);
    setError(null);
    couponAPI.getEmitterContext()
      .then(({ data }) => {
        setContext(data);
        initFromContext(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Erreur de chargement du contexte émetteur.');
        setContext({ organizations: [], provider_profile: null, can_emit: false });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  // Initialise emitterType + activeOrgId après fetch
  function initFromContext(ctx) {
    const orgs = ctx.organizations || [];
    const profile = ctx.provider_profile;
    const hasOrgs = orgs.length > 0;
    const hasProfile = !!profile;

    // Restore from localStorage
    const storedType = localStorage.getItem(LS_KEY_TYPE);
    const storedOrgId = parseInt(localStorage.getItem(LS_KEY_ORG), 10) || null;

    // Determine emitterType
    let type;
    if (hasOrgs && hasProfile) {
      type = (storedType === 'provider_profile') ? 'provider_profile' : 'organization';
    } else if (hasOrgs) {
      type = 'organization';
    } else if (hasProfile) {
      type = 'provider_profile';
    } else {
      type = null;
    }
    setEmitterTypeRaw(type);

    // Determine activeOrgId
    if (type === 'organization' && hasOrgs) {
      const validStored = storedOrgId && orgs.some((o) => o.id === storedOrgId);
      setActiveOrgIdRaw(validStored ? storedOrgId : orgs[0].id);
    } else {
      setActiveOrgIdRaw(null);
    }
  }

  // Wrapped setters with localStorage persistence
  const setEmitterType = useCallback((type) => {
    setEmitterTypeRaw(type);
    if (type) localStorage.setItem(LS_KEY_TYPE, type);

    // When switching to 'organization', ensure activeOrgId is set
    if (type === 'organization' && context) {
      const orgs = context.organizations || [];
      if (orgs.length > 0) {
        const stored = parseInt(localStorage.getItem(LS_KEY_ORG), 10) || null;
        const valid = stored && orgs.some((o) => o.id === stored);
        setActiveOrgIdRaw(valid ? stored : orgs[0].id);
      }
    }
  }, [context]);

  const setActiveOrgId = useCallback((id) => {
    setActiveOrgIdRaw(id);
    if (id) localStorage.setItem(LS_KEY_ORG, String(id));
  }, []);

  // Derived values
  const organizations = context?.organizations || [];
  const providerProfile = context?.provider_profile || null;
  const canEmit = context?.can_emit || false;
  const hasDualContext = organizations.length > 0 && !!providerProfile;
  const isMultiOrg = organizations.length >= 2;
  const needsOrgSelection = isMultiOrg && emitterType === 'organization';

  const activeOrg = useMemo(() => {
    if (!activeOrgId || !organizations.length) return null;
    return organizations.find((o) => o.id === activeOrgId) || null;
  }, [activeOrgId, organizations]);

  return {
    context,
    loading,
    error,
    emitterType,
    setEmitterType,
    activeOrgId,
    setActiveOrgId,
    activeOrg,
    organizations,
    providerProfile,
    canEmit,
    hasDualContext,
    isMultiOrg,
    needsOrgSelection,
    refetch: fetchContext,
  };
}
