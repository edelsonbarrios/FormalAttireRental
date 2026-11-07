import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../environments/base-api-url';
import { Result } from '../../../data/models/Results/result';
import { firstValueFrom } from 'rxjs';
import { Customer } from '../../../data/models/DTOs/Customer/customer';
import { BaseLoginProvider } from '@abacritt/angularx-social-login';
import { extractErrorMessage } from '../../../data/utils/error-response-util';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomerProfileService {
  private baseUrl = `${environment.apiUrl}/Customer`;
  constructor(private httpClient: HttpClient) {}

  async getCustomerProfileAsync(): Promise<Result<Customer>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<Result<Customer>>(
          `${this.baseUrl}/get-customer-profile`,
        ),
      );

      return result;
    } catch (err: any) {
      return Result.failure(extractErrorMessage(err.error));
    }
  }

  async updateCustomerProfileAsync(
    formData : FormData
  ) : Promise<Result<boolean>>{
    try {
      const result = await firstValueFrom(
        this.httpClient.put<Result<boolean>>(`${this.baseUrl}/customer-profile`, formData)
      );

      return result;
    }catch(err: any) {
      return Result.failure(extractErrorMessage(err.error));
    }
  }
}
