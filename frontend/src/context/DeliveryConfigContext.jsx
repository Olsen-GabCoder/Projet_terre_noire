import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { configAPI } from '../services/api';

const DeliveryConfigContext = createContext();

export const useDeliveryConfig = () => {
  const context = useContext(DeliveryConfigContext);
  if (!context) {
    throw new Error('useDeliveryConfig doit être utilisé dans un DeliveryConfigProvider');
  }
  return context;
};

const DEFAULTS = { shipping_free_threshold: 25000, shipping_cost: 2000, zone: 'default', estimated_days_min: 1, estimated_days_max: 5 };

export const DeliveryConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // Charge la config par défaut au mount
  useEffect(() => {
    configAPI.getDeliveryConfig()
      .then((res) => {
        if (res.data?.shipping_cost != null) {
          setConfig(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.error('[DeliveryConfig] Erreur chargement:', err))
      .finally(() => setLoading(false));
  }, []);

  // Recalcule les frais pour une ville donnée
  const updateForCity = useCallback(async (city) => {
    if (!city) return;
    try {
      const res = await configAPI.getDeliveryConfig({ city });
      if (res.data?.shipping_cost != null) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) { console.error('[DeliveryConfig] Erreur ville:', err); }
  }, []);

  const value = useMemo(() => ({
    shippingFreeThreshold: config.shipping_free_threshold,
    shippingCost: config.shipping_cost,
    zone: config.zone || 'default',
    estimatedDaysMin: config.estimated_days_min || 1,
    estimatedDaysMax: config.estimated_days_max || 5,
    loading,
    updateForCity,
  }), [config, loading, updateForCity]);

  return (
    <DeliveryConfigContext.Provider value={value}>
      {children}
    </DeliveryConfigContext.Provider>
  );
};
