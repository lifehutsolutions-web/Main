import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getUserLicenses } from '../services/licenseService';
import { License } from '../types';

export function useLicense() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLicenses = async () => {
    if (!user) {
      setLicenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetched = await getUserLicenses(user.id);
      setLicenses(fetched);
    } catch (e) {
      console.error('Failed to refresh licenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLicenses();
  }, [user]);

  const hasLicense = (templateId: string): boolean => {
    return licenses.some(lic => lic.template_id === templateId && lic.active);
  };

  return {
    licenses,
    loading,
    refreshLicenses,
    hasLicense,
  };
}
