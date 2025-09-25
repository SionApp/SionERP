import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import LeaderDashboard from './discipleship/LeaderDashboard';
import AuxiliarySupervisorDashboard from './discipleship/AuxiliarySupervisorDashboard';
import GeneralSupervisorDashboard from './discipleship/GeneralSupervisorDashboard';
import CoordinatorDashboard from './discipleship/CoordinatorDashboard';
import PastoralDashboard from './discipleship/PastoralDashboard';

const DiscipleshipPage: React.FC = () => {
  const { user } = useAuth();
  const [hierarchyLevel, setHierarchyLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineHierarchyLevel = async () => {
      if (!user) return;
      
      try {
        const level = await DiscipleshipMockService.getUserHierarchyLevel(user.id);
        setHierarchyLevel(level);
      } catch (error) {
        console.error('Error determining hierarchy level:', error);
        // Default to level 1 if there's an error
        setHierarchyLevel(1);
      } finally {
        setLoading(false);
      }
    };

    determineHierarchyLevel();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard de discipulado...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on hierarchy level
  const renderDashboard = () => {
    switch (hierarchyLevel) {
      case 5: // Pastor
        return <PastoralDashboard />;
      case 4: // Coordinator
        return <CoordinatorDashboard />;
      case 3: // General Supervisor
        return <GeneralSupervisorDashboard />;
      case 2: // Auxiliary Supervisor
        return <AuxiliarySupervisorDashboard />;
      case 1: // Group Leader
      default:
        return <LeaderDashboard />;
    }
  };

  return renderDashboard();
};

export default DiscipleshipPage;