import { ApiService } from './api.service';
import type {
  UsersReport,
  GrowthReport,
  DemographicsReport,
  ActivitiesReport,
  ReportGeneration,
  ReportType,
  ReportFormat,
} from '@/types/report.types';

export class ReportsService {
  private static base = '/reports';

  static getUsersReport(): Promise<UsersReport> {
    return ApiService.get<UsersReport>(`${this.base}/users`);
  }

  static getGrowthReport(): Promise<GrowthReport> {
    return ApiService.get<GrowthReport>(`${this.base}/growth`);
  }

  static getDemographicsReport(): Promise<DemographicsReport> {
    return ApiService.get<DemographicsReport>(`${this.base}/demographics`);
  }

  static getActivitiesReport(): Promise<ActivitiesReport> {
    return ApiService.get<ActivitiesReport>(`${this.base}/activities`);
  }

  static getGenerations(): Promise<ReportGeneration[]> {
    return ApiService.get<ReportGeneration[]>(`${this.base}/generations`);
  }

  static logGeneration(reportType: ReportType, format: ReportFormat, title: string): Promise<void> {
    return ApiService.post<void, { report_type: ReportType; format: ReportFormat; title: string }>(
      `${this.base}/generations`,
      { report_type: reportType, format, title }
    );
  }
}
