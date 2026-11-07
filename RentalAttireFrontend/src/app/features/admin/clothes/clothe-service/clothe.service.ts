import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Result } from '../../../../data/models/Results/result';
import { PagedResult } from '../../../../data/models/Results/pagedResult';
import { firstValueFrom } from 'rxjs';
import { BaseApiUrl } from '../../../../../environments/base-api-url';
import { ClotheDTO } from '../../../../data/models/DTOs/Clothes/clothes';
import { CreateClotheCommand } from '../create-clothe/create-clothe.component';
import { UpdateClotheCommand } from '../edit-clothe/edit-clothe.component';
import { ArchiveClotheCommand } from '../../../../data/models/DTOs/Clothes/archive-clothe';
import { extractErrorMessage } from '../../../../data/utils/error-response-util';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClotheService {
  private clotheUrl = `${environment.apiUrl}/Clothe`

  constructor(
    private httpClient : HttpClient
  ) { }

  async filterClothesAsync(
    searchQuery : string,
    condition : string,
    gender : string,
    category : string,
    currentPage : number,
    itemsPerPage : number,
  ) : Promise<Result<PagedResult<ClotheDTO>>> {
    try {
      const filters = {
        searchQuery,
        condition,
        gender,
        category,
        currentPage,
        itemsPerPage
      };

      var result = await firstValueFrom(
        this.httpClient.get<Result<PagedResult<ClotheDTO>>>(
          `${this.clotheUrl}/filter-clothes`, { params : filters }
        )
      );
      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }

  async createClotheAsync(
    command : FormData
  ) : Promise<Result<boolean>> {
    try { 
      var result = await firstValueFrom(
        this.httpClient.post<Result<boolean>>(`${this.clotheUrl}`, command)
      );

      return result;
    }catch(err : any) {
      console.log(`ERROR LOG CLOTHE CREATION: ${err.error}`);
      return Result.failure(err.error);
    }
  }

  async updateClotheAsync(
    command : FormData
  ) : Promise<Result<boolean>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.put<Result<boolean>>(`${this.clotheUrl}`, command)
      );

      return result;
    }catch(err : any) {
      console.log(`Error Message ${JSON.stringify(extractErrorMessage(err.error))}`);
      return Result.failure(extractErrorMessage(err.error));
    }
  }

  async archiveClotheByIdAsync(
    command : ArchiveClotheCommand
  ) : Promise<Result<boolean>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.patch<Result<boolean>>(
          `${this.clotheUrl}`, command
        )
      );

      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }

}
