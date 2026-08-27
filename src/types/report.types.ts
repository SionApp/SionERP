export type ReportType = 'users' | 'growth' | 'demographics' | 'activities';
export type ReportFormat = 'csv' | 'pdf';

export interface LabelValue {
  label: string;
  value: number;
}

export interface UsersReport {
  total: number;
  active_members: number;
  baptized: number;
  new_this_month: number;
  by_role: LabelValue[];
}

export interface GrowthReport {
  monthly: LabelValue[];
}

export interface DemographicsReport {
  by_age: LabelValue[];
  by_marital_status: LabelValue[];
  by_role: LabelValue[];
}

export interface ActivitiesReport {
  total_events: number;
  upcoming_events: number;
  total_registrations: number;
  top_events: LabelValue[];
}

export interface ReportGeneration {
  id: string;
  report_type: ReportType;
  format: ReportFormat;
  title: string;
  generated_by: string;
  generated_at: string;
}

export type ReportFrequency = 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  report_type: ReportType;
  format: ReportFormat;
  title: string;
  frequency: ReportFrequency;
  recipient_user_ids: string[];
  active: boolean;
  next_run_at: string;
  created_by_name: string;
}

export interface UpsertReportScheduleInput {
  report_type: ReportType;
  format: ReportFormat;
  title: string;
  frequency: ReportFrequency;
  recipient_user_ids: string[];
  active?: boolean;
}
