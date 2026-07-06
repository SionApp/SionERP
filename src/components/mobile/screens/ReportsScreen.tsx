import { useState } from 'react';
import { ReportsContent, ReportsHistory } from '@/pages/dashboard/reports/report-content';
import { MobileScreen } from '../MobileScreen';
import { MobileSegment } from '../MobileSegment';

export function MobileReportsScreen() {
  const [tab, setTab] = useState('reports');

  return (
    <MobileScreen title="Reportes" subtitle="Trazabilidad y analítica">
      <div className="space-y-4 px-4 py-4">
        <MobileSegment
          options={[
            { value: 'reports', label: 'Reportes' },
            { value: 'history', label: 'Historial' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'reports' ? <ReportsContent /> : <ReportsHistory />}
      </div>
    </MobileScreen>
  );
}
