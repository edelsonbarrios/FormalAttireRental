import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Result } from '../../../data/models/Results/result';
import { UserViewModel } from '../../../data/models/DTOs/Users/user-view-model';
import { firstValueFrom } from 'rxjs';
import { BaseApiUrl } from '../../../../environments/base-api-url';
import { BaseRouteReuseStrategy } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';
import { CreateCategoryCommand } from '../../../data/models/DTOs/Category/create-category';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/User`;

  constructor(
    private httpClient: HttpClient,
    private authService : AuthService
  ) {}

  async getUserViewModelByIdAsync(id: number): Promise<Result<UserViewModel>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<Result<UserViewModel>>(
          `${this.baseUrl}/user-view-model/${id}`,
        ),
      );
      return result;
    } catch (err: any) {
      const message = err.error;
      return Result.failure(message);
    }
  }

  async getCurrentUserViewModel(): Promise<Result<UserViewModel>> {
    try {
      const userId = this.authService.getCurrentUser();

      if (!userId) return Result.failure('User does not exist.');

      const result = await firstValueFrom(
        this.httpClient.get<Result<UserViewModel>>(
          `${this.baseUrl}/user-view-model/${userId}`,
        ),
      );

      return result;
    } catch (err: any) {
      return Result.failure(err.error);
    }
  }
}
