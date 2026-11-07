import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AccessTokenKey } from '../../../../environments/access-token-key';
import { RefreshTokenKey } from '../../../../environments/refresh-token-key';
import { AuthenticationResult } from '../../../data/models/Results/authentication-result';
import { Result } from '../../../data/models/Results/result';
import { BaseApiUrl } from '../../../../environments/base-api-url';
import { firstValueFrom, Observable } from 'rxjs';
import { CurrentUser } from '../../../../environments/current-user';
import { UserViewModel } from '../../../data/models/DTOs/Users/user-view-model';
import { UserDTO } from '../../../data/models/DTOs/Users/user-dto';
import { identifierName } from '@angular/compiler';
import { RegisterCustomerCommand } from '../../../data/models/DTOs/Customer/register-customer';
import { USER_ID } from '../../../../environments/user-id';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../../../data/models/DTOs/Authentication/jwt-payload';
import { ProfileCompletionComponent } from '../../../features/log-in/profile-completion/profile-completion.component';
import { ProfileCompletionRequest } from '../../../data/models/DTOs/Authentication/profile-completion';
import { extractErrorMessage } from '../../../data/utils/error-response-util';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private httpClient: HttpClient,
    private router: Router,
  ) {}

  private baseUrl = `${environment.apiUrl}/Authentication`;
  private customerUrl = `${environment.apiUrl}/Customer`
  private accessTokenKey = `${AccessTokenKey}`;
  private refreshTokenKey = `${RefreshTokenKey}`;
  private isLoggingOut = false;

  logout() {
    console.log("LOGOUT CLICKED!");

    this.isLoggingOut = true;
    this.removeTokens();

    console.log(`ACCESS TOKEN AFTER LOGOUT: ${this.getAccessToken()}`);

    this.router.navigateByUrl('/log-in').then(() => {
      this.isLoggingOut = false;
    });
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  saveTokens(
    access: string | null | undefined,
    refresh: string | null | undefined,
  ) {
    if (access && refresh) {
      localStorage.setItem(this.accessTokenKey, access);
      localStorage.setItem(this.refreshTokenKey, refresh);
    }
  }

  removeTokens() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(USER_ID);
  }

  getCurrentUser() {
    return localStorage.getItem(USER_ID);
  }

  getCurrentUserRolePosition() : string | null{
    const token = this.getAccessToken();

    if(!token) {
      return null;
    }

    const decoded = jwtDecode<JwtPayload>(token);

    return decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  }

  async login(
    email: string,
    password: string,
  ): Promise<Result<AuthenticationResult>> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<Result<AuthenticationResult>>(`${this.baseUrl}`, {
          email: email,
          password: password,
        }),
      );
      localStorage.setItem(USER_ID, JSON.stringify(response.data?.id));
      return response;
    } catch (err: any) {
      console.log('Error body:', err?.error);
      const message = err?.error;
      return Result.failure(message);
    }
  }

  refreshToken(): Observable<Result<AuthenticationResult>> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    return this.httpClient.post<Result<AuthenticationResult>>(
      `${this.baseUrl}/refresh`,
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    );
  }

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
      console.log(message);
      return Result.failure(message);
    }
  }

  googleLogin(idToken: string): Promise<Result<AuthenticationResult>> {
    return firstValueFrom(
      this.httpClient.post<Result<AuthenticationResult>>(
        `${this.baseUrl}/google-login`,
        { idToken },
      ),
    );
  }

  async customerRegistrationAsync(
    command : RegisterCustomerCommand
  ) : Promise<Result<AuthenticationResult>> {
    try {
      var result = await firstValueFrom(
        this.httpClient.post<Result<AuthenticationResult>>(`${this.customerUrl}`, command)
      );

      this.saveTokens(result.data?.accessToken, result.data?.refreshToken);
      localStorage.setItem(USER_ID, JSON.stringify(result.data?.id));

      return result;
    }catch(err : any) {
      return Result.failure(err.error);
    }
  }

  async profileCompletionAsync(
    request : ProfileCompletionRequest
  ) : Promise<Result<boolean>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.put<Result<boolean>>(`${this.baseUrl}/profile-completion`, request)
      );

      return result;
    }catch(err : any) {
      return Result.failure(extractErrorMessage(err.error));
    }
  }
}
