import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const map = {
        'coupons.emitterSelector.dualContext.org': 'Mon organisation',
        'coupons.emitterSelector.dualContext.profile': 'Mon profil prestataire',
        'coupons.emitterSelector.orgLabel': 'Émettre au nom de :',
        'coupons.emitterSelector.orgType.MAISON_EDITION': "Maison d'édition",
        'coupons.emitterSelector.orgType.LIBRAIRIE': 'Librairie',
        'coupons.emitterSelector.orgType.AUTRE': 'Organisation',
        'coupons.emitterSelector.activeBanner': `Vous émettez au nom de ${opts?.name || ''} (${opts?.type || ''}).`,
      };
      return map[key] || key;
    },
  }),
}));

import EmitterSelector from './EmitterSelector';

describe('EmitterSelector', () => {
  const baseProps = {
    emitterType: 'organization',
    setEmitterType: vi.fn(),
    activeOrgId: 1,
    setActiveOrgId: vi.fn(),
    activeOrg: { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
    hasDualContext: false,
    organizations: [{ id: 1, name: 'Org A', org_type: 'MAISON_EDITION' }],
    canEmit: true,
    needsOrgSelection: false,
  };

  it('renders nothing visible for mono-org user without dual context', () => {
    const { container } = render(<EmitterSelector {...baseProps} />);
    // Should render the wrapper div but no dual pills, no org selector, no banner
    expect(screen.queryByText('Mon organisation')).toBeNull();
    expect(screen.queryByText('Mon profil prestataire')).toBeNull();
    expect(screen.queryByText('Émettre au nom de :')).toBeNull();
  });

  it('renders dual context pills when hasDualContext is true', () => {
    render(
      <EmitterSelector
        {...baseProps}
        hasDualContext={true}
      />,
    );
    expect(screen.getByText('Mon organisation')).toBeTruthy();
    expect(screen.getByText('Mon profil prestataire')).toBeTruthy();
  });

  it('renders dropdown for 2-5 multi-org users', () => {
    const orgs = [
      { id: 1, name: 'Org A', org_type: 'MAISON_EDITION' },
      { id: 2, name: 'Org B', org_type: 'LIBRAIRIE' },
      { id: 3, name: 'Org C', org_type: 'MAISON_EDITION' },
    ];
    const { container } = render(
      <EmitterSelector
        {...baseProps}
        organizations={orgs}
        needsOrgSelection={true}
      />,
    );
    expect(screen.getByText('Émettre au nom de :')).toBeTruthy();
    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option').length).toBe(3);
  });

  it('renders pill grid for 6+ orgs', () => {
    const orgs = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Org ${String.fromCharCode(65 + i)}`,
      org_type: 'MAISON_EDITION',
    }));
    const { container } = render(
      <EmitterSelector
        {...baseProps}
        organizations={orgs}
        activeOrgId={1}
        activeOrg={orgs[0]}
        needsOrgSelection={true}
      />,
    );
    expect(container.querySelector('.emitter-selector__pill-grid')).toBeTruthy();
    expect(container.querySelectorAll('.emitter-selector__org-pill').length).toBe(7);
  });

  it('returns null when canEmit is false', () => {
    const { container } = render(
      <EmitterSelector {...baseProps} canEmit={false} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
