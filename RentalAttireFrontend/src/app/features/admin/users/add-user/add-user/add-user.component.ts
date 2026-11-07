import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeDTO } from '../../../../../data/models/DTOs/Employees/employee-dto';
import { CreateEmployeeCommand } from '../../../../../data/models/DTOs/Employees/create-employee';
import { EmployeeService } from '../../employee-service/employee.service';
import { UserViewModel } from '../../../../../data/models/DTOs/Users/user-view-model';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { EmptyError } from 'rxjs';
import { createUrlTreeFromSnapshot } from '@angular/router';
import { CreateEmployeeValidator } from '../../validators/create-employee-validator';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss',
})
export class AddUserComponent implements OnInit {
  @Output() closeForm = new EventEmitter<boolean>();
  @Input() newEmployee = new EmployeeDTO();
  currentUser: UserViewModel | undefined;

  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private employeeService: EmployeeService,
    private userService: UserService,
    private createEmployeeValidator: CreateEmployeeValidator,
    private toastr : ToastrService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
  }

  async createEmployee() {
    const employee = this.newEmployee;

    const employeePayload: CreateEmployeeCommand = {
      id: 0,
      employeeCode: employee.employeeCode,
      department: employee.department,
      salary: employee.salary,
      rolePosition: employee.rolePosition,
      email: this.email,
      password: this.password,
      createdBy: this.currentUser?.fullName ?? '',
      createdById: this.currentUser?.id ?? 0,
      person: employee.person,
    };

    const result = this.employeeService
      .createEmployeeAsync(employeePayload)
      .then((res) => {
        if (!res.isSuccess) {
          return;
        } else {
          this.toastr.success(res.successMessage);
          this.closeForm.emit(true);
        }
      })
      .catch((err) => {
      });
  }

  getCurrentUser() {
    const user = this.userService
      .getCurrentUserViewModel()
      .then((res) => {
        if (!res.isSuccess) return;
        this.currentUser = res.data;
      })
      .catch((err) => {
      });
  }

  closed() {
    this.closeForm.emit(false);
  }
}
