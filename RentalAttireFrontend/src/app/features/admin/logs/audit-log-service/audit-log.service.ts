import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../../environments/base-api-url';
import { HttpClient } from '@angular/common/http';
import { Result } from '../../../../data/models/Results/result';
import { PagedResult } from '../../../../data/models/Results/pagedResult';
import { AuditLog } from '../../../../data/models/DTOs/AuditLogs/audit-log';
import { audit, firstValueFrom } from 'rxjs';
import { LogsReponse } from '../../../../data/models/DTOs/AuditLogs/logs-reponse';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private auditUrl = `${environment.apiUrl}/Audit`;

  constructor(private httpClient: HttpClient) {}

  async getAllAuditLogs(
    actionType: string,
    searchQuery: string,
    currentPage: number,
    itemsPerPage: number,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Result<LogsReponse>> {
    try {
      const params = {
        actionType,
        searchQuery,
        currentPage,
        itemsPerPage,
        dateFrom: dateFrom ? dateFrom.toISOString() : '',
        dateTo: dateTo ? dateTo.toISOString() : '',
      };

      const result = await firstValueFrom(
        this.httpClient.get<Result<LogsReponse>>(`${this.auditUrl}`, {params}),
      );
      return result;
    } catch (err: any) {
      return Result.failure(err.error);
    }
  }
}
