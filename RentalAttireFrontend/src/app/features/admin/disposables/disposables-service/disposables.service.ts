import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../../environments/base-api-url';
import { HttpClient } from '@angular/common/http';
import { Result } from '../../../../data/models/Results/result';
import { PagedResult } from '../../../../data/models/Results/pagedResult';
import { ArchivedEntity } from '../../../../data/models/DTOs/Disposables/archive-entity';
import { firstValueFrom } from 'rxjs';
import { ViewRecordResponse } from '../DTOs/view-record-response';
import { RestoreRecordCommand } from '../DTOs/restore-record-command';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DisposablesService {
  private disposablesUrl = `${environment.apiUrl}/Disposables`;
  constructor(private httpClient: HttpClient) {}

  async getAllArchivedRecordsAsync(
    currentPage: number,
    itemsPerPage: number,
  ): Promise<Result<PagedResult<ArchivedEntity>>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.get<Result<PagedResult<ArchivedEntity>>>(
          `${this.disposablesUrl}?currentPage=${currentPage}&itemsPerPage=${itemsPerPage}`,
        ),
      );

      return result;
    } catch(err: any) {
      return Result.failure(err.error);
    }
  }

  async viewArchivedRecordAsync(
    id : number,
    entityType : string
  ) : Promise<Result<ViewRecordResponse>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.get<Result<ViewRecordResponse>>(`${this.disposablesUrl}/view-record?id=${id}&entityType=${entityType}`)
      );

      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }

  async deleteRecordAsync(
    id : number,
    entityType : string,
    performedBy : string,
    performedById : number
  ) : Promise<Result<boolean>> {
    try {
      var payload = {
        id,
        entityType,
        performedBy,
        performedById
      };

      var result = await firstValueFrom(
        this.httpClient.patch<Result<boolean>>(`${this.disposablesUrl}/delete-record`, payload)
      );

      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }

  async restoreRecordAsync(
    command : RestoreRecordCommand
  ) : Promise<Result<boolean>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.patch<Result<boolean>>(`${this.disposablesUrl}`, command)
      );

      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }
}
