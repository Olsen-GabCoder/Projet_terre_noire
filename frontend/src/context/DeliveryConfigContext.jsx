import { createContext, useContext, useState, useEffect } from 'react';
import { configAPI } from '../services/api';

const DeliveryConfigContext = createContext();

export const useDeliveryConfig = () => {
  const context = useContext(DeliveryConfigContext);
  if (!context) {
    throw new Error('useDeliveryConfig doit être utilisé dans un DeliveryConfigProvider');
  }
  return context;
};

const DEFAULTS = { shipping_free_threshold: 25000, shipping_cost: 2000 };

export const DeliveryConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configAPI.getDeliveryConfig()
      .then((res) => {
        if (res.data?.shipping_free_threshold != null && res.data?.shipping_cost != null) {
          setConfig({
            shipping_free_threshold: res.data.shipping_free_threshold,
            shipping_cost: res.data.shipping_cost,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const value = {
    shippingFreeThreshold: config.shipping_free_threshold,
    shippingCost: config.shipping_cost,
    loading,
  };

  return (
    <DeliveryConfigContext.Provider value={value}>
      {children}
    </DeliveryConfigContext.Provider>
  );
};
