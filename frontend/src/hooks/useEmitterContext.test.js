import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

// Mock couponAPI
vi.mock('../services/api', () => ({
  couponAPI: {
    getEmitterContext: vi.fn(),
  },
}));

import { couponAPI } from '../services/api';
import useEmitterContext from './useEmitterContext';

describe('useEmitterContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('mono-org user: activeOrgId is set automatically', async () => {
    couponAPI.getEmitterContext.mockResolvedValue({
      data: {
        organizations: [{ id: 10, name: 'Éditions Frollot', org_type: 'MAISON_EDITION' }],
        provider_profile: null,
        can_emit: true,
      },
    });

    const { result } = renderHook(() => useEmitterContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeOrgId).toBe(10);
    expect(result.current.emitterType).toBe('organization');
    expect(result.current.needsOrgSelection).toBe(false);
    expect(result.current.canEmit).toBe(true);
  });

  it('multi-org user: needsOrgSelection === true when emitterType=organization', async () => {
    couponAPI.getEmitterContext.mockResolvedValue({
      data: {
        organizations: [
          { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
          { id: 2, name: 'Org B', org_type: 'LIBRAIRIE' },
          { id: 3, name: 'Org C', org_type: 'MAISON_EDITION' },
        ],
        provider_profile: null,
        can_emit: true,
      },
    });

    const { result } = renderHook(() => useEmitterContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.emitterType).toBe('organization');
    expect(result.current.needsOrgSelection).toBe(true);
    expect(result.current.isMultiOrg).toBe(true);
    expect(result.current.activeOrgId).toBe(1); // first org as default
  });

  it('localStorage persistence: activeOrgId is restored on second init', async () => {
    // Simulate previous selection
    localStorage.setItem('coupons_active_org_id', '2');

    couponAPI.getEmitterContext.mockResolvedValue({
      data: {
        organizations: [
          { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
          { id: 2, name: 'Org B', org_type: 'LIBRAIRIE' },
        ],
        provider_profile: null,
        can_emit: true,
      },
    });

    const { result } = renderHook(() => useEmitterContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeOrgId).toBe(2);
  });

  it('invalid localStorage value falls back to first org', async () => {
    localStorage.setItem('coupons_active_org_id', '999');

    couponAPI.getEmitterContext.mockResolvedValue({
      data: {
        organizations: [
          { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
          { id: 2, name: 'Org B', org_type: 'LIBRAIRIE' },
        ],
        provider_profile: null,
        can_emit: true,
      },
    });

    const { result } = renderHook(() => useEmitterContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeOrgId).toBe(1);
  });

  it('setActiveOrgId persists to localStorage', async () => {
    couponAPI.getEmitterContext.mockResolvedValue({
      data: {
        organizations: [
          { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
          { id: 2, name: 'Org B', org_type: 'LIBRAIRIE' },
        ],
        provider_profile: null,
        can_emit: true,
      },
    });

    const { result } = renderHook(() => useEmitterContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setActiveOrgId(2); });

    expect(result.current.activeOrgId).toBe(2);
    expect(localStorage.getItem('coupons_active_org_id')).toBe('2');
  });
});
