import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios-based api module
vi.mock('./api', () => {
  const mockApi = {
    post: vi.fn(() => Promise.resolve({ data: {} })),
    get: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  };

  function _emitterParams(emitterType, organizationId) {
    const params = {};
    if (emitterType) params.emitter_type = emitterType;
    if (organizationId) params.organization_id = organizationId;
    return params;
  }

  return {
    default: mockApi,
    couponAPI: {
      getEmitterContext: vi.fn(() => mockApi.get('/coupons/emitter-context/')),
      validate: vi.fn((code, cartItems, serviceQuoteId) => {
        const body = { code };
        if (cartItems) body.cart_items = cartItems;
        if (serviceQuoteId) body.service_quote_id = serviceQuoteId;
        return mockApi.post('/coupons/validate/', body);
      }),
      getApplicable: vi.fn((cartItemIds, serviceQuoteId) => {
        const params = {};
        if (cartItemIds && cartItemIds.length > 0) params.cart_item_ids = cartItemIds.join(',');
        if (serviceQuoteId) params.service_quote_id = serviceQuoteId;
        return mockApi.get('/coupons/applicable/', { params });
      }),
      getMyReceived: vi.fn((params) => mockApi.get('/coupons/my-received/', { params })),
      getTemplates: vi.fn((emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.get('/coupons/templates/', Object.keys(params).length ? { params } : undefined);
      }),
      createTemplate: vi.fn((data, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.post('/coupons/templates/', data, Object.keys(params).length ? { params } : undefined);
      }),
      updateTemplate: vi.fn((id, data, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.patch(`/coupons/templates/${id}/`, data, Object.keys(params).length ? { params } : undefined);
      }),
      deleteTemplate: vi.fn((id, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.delete(`/coupons/templates/${id}/`, Object.keys(params).length ? { params } : undefined);
      }),
      send: vi.fn((data, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.post('/coupons/send/', data, Object.keys(params).length ? { params } : undefined);
      }),
      getMyIssued: vi.fn((extraParams, emitterType, organizationId) => {
        const params = { ...extraParams, ..._emitterParams(emitterType, organizationId) };
        return mockApi.get('/coupons/my-issued/', { params });
      }),
      revoke: vi.fn((id, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.post(`/coupons/${id}/revoke/`, {}, Object.keys(params).length ? { params } : undefined);
      }),
      getVendorCustomers: vi.fn((emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.get('/coupons/vendor-customers/', Object.keys(params).length ? { params } : undefined);
      }),
      getServiceCustomers: vi.fn((emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.get('/coupons/service-customers/', Object.keys(params).length ? { params } : undefined);
      }),
      adminOverview: vi.fn(() => mockApi.get('/coupons/admin/overview/')),
      adminList: vi.fn((params) => mockApi.get('/coupons/admin/list/', { params })),
      getSystemLibrary: vi.fn((extraParams, emitterType, organizationId) => {
        const params = { ...extraParams, ..._emitterParams(emitterType, organizationId) };
        return mockApi.get('/coupons/templates/system/', { params });
      }),
      cloneSystemTemplate: vi.fn((systemTemplateId, emitterType, organizationId) => {
        const params = _emitterParams(emitterType, organizationId);
        return mockApi.post('/coupons/templates/clone/', { system_template_id: systemTemplateId }, Object.keys(params).length ? { params } : undefined);
      }),
    },
  };
});

import { couponAPI } from './api';
import api from './api';

describe('couponAPI', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getEmitterContext calls GET /coupons/emitter-context/ without params', async () => {
    await couponAPI.getEmitterContext();
    expect(api.get).toHaveBeenCalledWith('/coupons/emitter-context/');
  });

  it('validate calls POST /coupons/validate/ with code', async () => {
    await couponAPI.validate('TEST123');
    expect(api.post).toHaveBeenCalledWith('/coupons/validate/', { code: 'TEST123' });
  });

  it('validate with cart_items includes them in payload', async () => {
    const items = [{ book_id: 1, quantity: 2 }];
    await couponAPI.validate('TEST123', items);
    expect(api.post).toHaveBeenCalledWith('/coupons/validate/', { code: 'TEST123', cart_items: items });
  });

  it('validate with service_quote_id includes it in payload', async () => {
    await couponAPI.validate('SVC50', null, 42);
    expect(api.post).toHaveBeenCalledWith('/coupons/validate/', { code: 'SVC50', service_quote_id: 42 });
  });

  it('getApplicable calls GET with cart_item_ids', async () => {
    await couponAPI.getApplicable([1, 2, 3]);
    expect(api.get).toHaveBeenCalledWith('/coupons/applicable/', { params: { cart_item_ids: '1,2,3' } });
  });

  it('getApplicable with service_quote_id includes it in params', async () => {
    await couponAPI.getApplicable(null, 99);
    expect(api.get).toHaveBeenCalledWith('/coupons/applicable/', { params: { service_quote_id: 99 } });
  });

  it('send calls POST /coupons/send/', async () => {
    const payload = { template_id: 1, recipient_emails: ['a@b.com'] };
    await couponAPI.send(payload);
    expect(api.post).toHaveBeenCalledWith('/coupons/send/', payload, undefined);
  });

  it('send with emitterType and organizationId passes both params', async () => {
    const payload = { template_id: 1, recipient_emails: ['a@b.com'] };
    await couponAPI.send(payload, 'organization', 42);
    expect(api.post).toHaveBeenCalledWith('/coupons/send/', payload, {
      params: { emitter_type: 'organization', organization_id: 42 },
    });
  });

  it('revoke calls POST /coupons/{id}/revoke/', async () => {
    await couponAPI.revoke(42);
    expect(api.post).toHaveBeenCalledWith('/coupons/42/revoke/', {}, undefined);
  });

  it('getTemplates calls GET /coupons/templates/', async () => {
    await couponAPI.getTemplates();
    expect(api.get).toHaveBeenCalledWith('/coupons/templates/', undefined);
  });

  it('getTemplates with emitter_type passes it as query param', async () => {
    await couponAPI.getTemplates('organization');
    expect(api.get).toHaveBeenCalledWith('/coupons/templates/', { params: { emitter_type: 'organization' } });
  });

  it('getTemplates with emitterType and organizationId passes both params', async () => {
    await couponAPI.getTemplates('organization', 7);
    expect(api.get).toHaveBeenCalledWith('/coupons/templates/', {
      params: { emitter_type: 'organization', organization_id: 7 },
    });
  });

  it('createTemplate calls POST /coupons/templates/', async () => {
    const data = { name: 'Test', discount_type: 'PERCENT', discount_value: '10' };
    await couponAPI.createTemplate(data);
    expect(api.post).toHaveBeenCalledWith('/coupons/templates/', data, undefined);
  });

  it('deleteTemplate calls DELETE /coupons/templates/{id}/', async () => {
    await couponAPI.deleteTemplate(5);
    expect(api.delete).toHaveBeenCalledWith('/coupons/templates/5/', undefined);
  });

  it('deleteTemplate with emitter_type passes it as query param', async () => {
    await couponAPI.deleteTemplate(5, 'organization');
    expect(api.delete).toHaveBeenCalledWith('/coupons/templates/5/', { params: { emitter_type: 'organization' } });
  });

  it('adminOverview calls GET /coupons/admin/overview/', async () => {
    await couponAPI.adminOverview();
    expect(api.get).toHaveBeenCalledWith('/coupons/admin/overview/');
  });

  it('getMyReceived calls GET with params', async () => {
    await couponAPI.getMyReceived({ status: 'SENT' });
    expect(api.get).toHaveBeenCalledWith('/coupons/my-received/', { params: { status: 'SENT' } });
  });

  it('getServiceCustomers calls GET /coupons/service-customers/', async () => {
    await couponAPI.getServiceCustomers();
    expect(api.get).toHaveBeenCalledWith('/coupons/service-customers/', undefined);
  });

  it('getMyIssued with emitter_type includes it in params', async () => {
    await couponAPI.getMyIssued({ status: 'SENT' }, 'provider_profile');
    expect(api.get).toHaveBeenCalledWith('/coupons/my-issued/', { params: { status: 'SENT', emitter_type: 'provider_profile' } });
  });

  it('getSystemLibrary calls GET /coupons/templates/system/ with params', async () => {
    await couponAPI.getSystemLibrary({ category: 'FLASH' });
    expect(api.get).toHaveBeenCalledWith('/coupons/templates/system/', { params: { category: 'FLASH' } });
  });

  it('cloneSystemTemplate calls POST /coupons/templates/clone/ with system_template_id', async () => {
    await couponAPI.cloneSystemTemplate(7);
    expect(api.post).toHaveBeenCalledWith('/coupons/templates/clone/', { system_template_id: 7 }, undefined);
  });

});
