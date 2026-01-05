import { useAuth } from '@/contexts/AuthContext';
import { ApiService } from '@/services/api.service';
import { createContext, useContext, useEffect, useState } from 'react';

interface SystemContextType {
  installedModules: string[];
  loading: boolean;
  refreshModules: () => Promise<void>;
  isModuleInstalled: (key: string) => boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [installedModules, setInstalledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshModules = async () => {
    // Do not fetch modules when not logged in (avoids /setup/status calls on /login)
    if (!user) {
      setInstalledModules(['base']);
      setLoading(false);
      return;
    }

    try {
      // Fetch setup status which includes installed modules
      // We use ApiService to ensure auth headers are included
      // This endpoint is public (via OptionalAuth) but returns module status
      const data = await ApiService.get<{
        is_initialized: boolean;
        modules: Array<{ key: string; is_installed: boolean }>;
      }>('/setup/status');

      const installed = data.modules.filter(m => m.is_installed).map(m => m.key);

      // Always ensure 'base' is considered installed
      if (!installed.includes('base')) {
        installed.push('base');
      }

      setInstalledModules(installed);
    } catch (error) {
      console.error('Error fetching modules:', error);
      // Fallback: assume only base is installed on error
      setInstalledModules(['base']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshModules();
  }, [user]); // Re-fetch when user changes (login/logout) to ensure fresh state

  const isModuleInstalled = (key: string) => {
    return installedModules.includes(key);
  };

  return (
    <SystemContext.Provider
      value={{
        installedModules,
        loading,
        refreshModules,
        isModuleInstalled,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
