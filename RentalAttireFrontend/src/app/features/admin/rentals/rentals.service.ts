import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../environments/base-api-url';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FilterRentalsParams } from '../../../data/models/DTOs/Rentals/filter-rental-params';
import { Result } from '../../../data/models/Results/result';
import { RentalPageResponse } from '../../../data/models/DTOs/Rentals/rental-page-response';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../data/utils/error-response-util';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RentalsService {
  private baseUrl = `${environment.apiUrl}/Rental`;

  constructor(private httpClient: HttpClient) {}

  async filterRentals(
    request: FilterRentalsParams,
  ): Promise<Result<RentalPageResponse>> {
    try {
      let params = new HttpParams()
        .set('currentPage', request.currentPage)
        .set('itemsPerPage', request.itemsPerPage);

      if (request.status) params = params.set('status', request.status);
      if (request.searchQuery)
        params = params.set('searchQuery', request.searchQuery);
      if (request.startingDate)
        params = params.set('startingDate', request.startingDate);
      if (request.endingDate)
        params = params.set('endingDate', request.endingDate);

      const result = await firstValueFrom(
        this.httpClient.get<Result<RentalPageResponse>>(`${this.baseUrl}`, {
          params,
        }),
      );

      return result;
    } catch (err: any) {
      const error = Result.failure<RentalPageResponse>(extractErrorMessage(err.error));
      console.error('Rental fetch failed:', error);
      return error;
    }
  }

  async updateRentalStatus(
    rentalId: number,
    status: string,
  ): Promise<Result<boolean>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.patch<Result<boolean>>(`${this.baseUrl}`, {
          rentalId,
          status
        }),
      );

      return result;
    } catch (err: any) {
      return Result.failure(extractErrorMessage(err.error));
    }
  }
}
