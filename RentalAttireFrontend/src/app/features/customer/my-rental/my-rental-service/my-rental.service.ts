import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../../environments/base-api-url';
import { PagedResult } from '../../../../data/models/Results/pagedResult';
import { RentalDTO } from '../../../../data/models/DTOs/Rentals/rental';
import { Result } from '../../../../data/models/Results/result';
import { extractErrorMessage } from '../../../../data/utils/error-response-util';
import { filter, firstValueFrom } from 'rxjs';
import { BaseRouteReuseStrategy } from '@angular/router';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MyRentalService {
  private baseUrl = `${environment.apiUrl}/Rental`;
  constructor(
    private httpClient: HttpClient
  ) { }

  async getCustomerRentalsAsync(
    searchQuery : string,
    rentalStatus : string,
    currentPage : number,
    itemsPerPage : number,
    startingDate ?: string,
    endingdate ?: string,
  ) : Promise<Result<PagedResult<RentalDTO>>> {
    try {
      var params = new HttpParams()
      .set('currentPage', currentPage)
      .set('itemsPerPage', itemsPerPage)
      .set('rentalStatus', rentalStatus);

      if(searchQuery) params = params.set('searchQuery', searchQuery);
      if(startingDate) params = params.set('startingDate', startingDate);
      if(endingdate) params = params.set('endingDate', endingdate);

      const result = await firstValueFrom(
        this.httpClient.get<Result<PagedResult<RentalDTO>>>(`${this.baseUrl}/my-rentals`, { params : params})
      );
      
      return result;
    }catch(err : any) {
      return Result.failure(extractErrorMessage(err.error));
    }
  }
}
