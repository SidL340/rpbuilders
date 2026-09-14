import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

const CompanyContext = createContext(null);

const DEFAULT_COMPANY = {
  company_name: 'R.P. BUILDERS PVT. LTD.',
  company_name_np: 'आर. पी. विल्डर्स प्रा. लि.',
  company_address: 'Kathmandu, Nepal',
  company_phone: '01-4444444',
  company_email: 'info@rpbuilders.com',
  company_pan: '601234567',
  company_logo_data: null,
};

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(() => {
    try {
      const cached = localStorage.getItem('rp_company');
      return cached ? JSON.parse(cached) : DEFAULT_COMPANY;
    } catch {
      return DEFAULT_COMPANY;
    }
  });

  const refreshCompany = async () => {
    try {
      const res = await settingsAPI.getCompany();
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        localStorage.setItem('rp_company', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.warn('Company details could not be loaded from API, using cached/default:', err.message);
    }
  };

  useEffect(() => {
    refreshCompany();
  }, []);

  const updateCompany = (newData) => {
    setCompany((prev) => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('rp_company', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <CompanyContext.Provider value={{ company, refreshCompany, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    return {
      company: DEFAULT_COMPANY,
      refreshCompany: () => {},
      updateCompany: () => {},
    };
  }
  return ctx;
};
