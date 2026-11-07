import { Injectable } from '@angular/core';
import { BaseApiUrl } from '../../../../../environments/base-api-url';
import { HttpClient } from '@angular/common/http';
import { Result } from '../../../../data/models/Results/result';
import { PagedResult } from '../../../../data/models/Results/pagedResult';
import { firstValueFrom } from 'rxjs';
import { EmployeeDTO } from '../../../../data/models/DTOs/Employees/employee-dto';
import { CreateEmployeeCommand } from '../../../../data/models/DTOs/Employees/create-employee';
import { UpdateEmployeeCommand } from '../../../../data/models/DTOs/Employees/update-employee';
import { ArchiveEmployeeCommand } from '../../../../data/models/DTOs/Employees/archive-employee';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private employeeUrl = `${environment.apiUrl}/Employee`;

  constructor(private httpClient: HttpClient) {}

  async getAllEmployeesAsync(
    currentPage: number,
    itemsPerPage: number,
  ): Promise<Result<PagedResult<EmployeeDTO>>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<Result<PagedResult<EmployeeDTO>>>(
          `${this.employeeUrl}?currentPage=${currentPage}&itemsPerPage=${itemsPerPage}`,
        ),
      );
      return result;
    } catch (err: any) {
      const message = err.error;
      return Result.failure(message);
    }
  }

  async searchEmployeeAsync(
    searchQuery: string,
    currentPage: number,
    itemsPerPage: number,
  ): Promise<Result<PagedResult<EmployeeDTO>>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<Result<PagedResult<EmployeeDTO>>>(
          `${this.employeeUrl}/search-employee?searchQuery=${searchQuery}&currentPage=${currentPage}&itemsPerPage=${itemsPerPage}`,
        ),
      );
      return result;
    } catch (error: any) {
      const message = error.error;
      return Result.failure(message);
    }
  }

  async createEmployeeAsync(
    employee: CreateEmployeeCommand,
  ): Promise<Result<boolean>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.post<Promise<Result<boolean>>>(
          `${this.employeeUrl}`,
          employee,
        ),
      );

      return result;
    } catch (err: any) {
      return Result.failure(err.error);
    }
  }

  async updateEmployeeAsync(
    employee: UpdateEmployeeCommand,
  ): Promise<Result<boolean>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.put<Promise<Result<boolean>>>(
          `${this.employeeUrl}`,
          employee,
        ),
      );
      return result;
    } catch (err: any) {
      return Result.failure(err.error);
    }
  }

  async archiveEmployee(
    command: ArchiveEmployeeCommand,
  ): Promise<Result<boolean>> {
    try {
      const result = await firstValueFrom(
        this.httpClient.patch<Result<boolean>>(
          `${this.employeeUrl}`,
          command,
        ),
      );
      return result;
    } catch (err: any) {
      return Result.failure(err.error);
    }
  }
}
