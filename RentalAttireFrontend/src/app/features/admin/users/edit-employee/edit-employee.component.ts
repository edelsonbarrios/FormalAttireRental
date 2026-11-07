import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeDTO } from '../../../../data/models/DTOs/Employees/employee-dto';
import { EmployeeService } from '../employee-service/employee.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { UserDTO } from '../../../../data/models/DTOs/Users/user-dto';
import { UserViewModel } from '../../../../data/models/DTOs/Users/user-view-model';
import { UpdateEmployeeCommand } from '../../../../data/models/DTOs/Employees/update-employee';

@Component({
  selector: 'app-edit-employee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-employee.component.html',
  styleUrl: './edit-employee.component.scss',
})
export class EditEmployeeComponent implements OnInit {
  // ============================================================
  // Inputs & Outputs
  // ============================================================

  // The employee to edit — passed in from the parent (e.g. EmployeesComponent)
  @Input() employee: EmployeeDTO = new EmployeeDTO();

  // Tells the parent to close this modal
  @Output() closed = new EventEmitter<void>();

  // Tells the parent that the employee was successfully updated
  @Output() updated = new EventEmitter<EmployeeDTO>();

  // ============================================================
  // State
  // ============================================================

  // True while the save API call is in progress
  isSaving = false;

  // Flips to true on first save attempt — shows validation errors
  touched = false;

  // ============================================================
  // Dropdown Options
  // ============================================================

  departments: string[] = [
    'Main Admin Department',
    'IT Department',
    'HR Department',
    'Finance Department',
    'Operations Department',
    'Marketing Department',
  ];

  roles: string[] = [
    'Administrator',
    'Manager',
    'Supervisor',
    'Cashier',
    'ClothesManager',
    'Staff',
  ];

  currentUser: UserViewModel | undefined;
  updateErrorMessage: string | undefined;

  constructor(
    private employeeService: EmployeeService,
    private userService: UserService,
  ) {}

  // ============================================================
  // Form — a copy of the input so edits don't affect the parent
  // until the user clicks Save
  // ============================================================

  form: EmployeeDTO = new EmployeeDTO();

  ngOnInit(): void {
    // Deep-copy the employee into form so we edit a local copy,
    // not the original object in the parent's list
    this.form = {
      ...this.employee,
      person: { ...this.employee.person },
    };

    this.getCurrentUser();
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

  // ============================================================
  // Validation — same pattern as AddEmployeeComponent
  // ============================================================

  get errors(): Record<string, string> {
    const p = this.form.person;
    const e: Record<string, string> = {};

    // Personal Information
    if (!p.lastName?.trim()) e['lastName'] = 'Last name is required.';
    if (!p.firstName?.trim()) e['firstName'] = 'First name is required.';
    if (!p.age || p.age < 1) e['age'] = 'Enter a valid age.';
    if (p.age > 100) e['age'] = 'Age cannot exceed 100.';
    if (!p.gender) e['gender'] = 'Select a gender.';
    if (!p.maritalStatus) e['maritalStatus'] = 'Select marital status.';

    // Phone — required + format check (must be 09XXXXXXXXX)
    if (!p.phoneNumber?.trim()) e['phoneNumber'] = 'Phone number is required.';
    else if (!/^09\d{9}$/.test(p.phoneNumber.trim()))
      e['phoneNumber'] = 'Must be 11 digits starting with 09.';

    // Address
    if (!p.street?.trim()) e['street'] = 'Street is required.';
    if (!p.barangay?.trim()) e['barangay'] = 'Barangay is required.';
    if (!p.city?.trim()) e['city'] = 'City is required.';
    if (!p.province?.trim()) e['province'] = 'Province is required.';
    if (!p.postalCode?.trim()) e['postalCode'] = 'Postal code is required.';

    // Employment Details
    if (!this.form.employeeCode?.trim())
      e['employeeCode'] = 'Employee code is required.';
    if (!this.form.department) e['department'] = 'Select a department.';
    if (!this.form.rolePosition) e['rolePosition'] = 'Select a role.';
    if (!this.form.salary || this.form.salary <= 0)
      e['salary'] = 'Enter a valid salary.';
    return e;
  }

  get isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  hasError(field: string): boolean {
    return this.touched && !!this.errors[field];
  }

  errorMsg(field: string): string {
    return this.touched ? (this.errors[field] ?? '') : '';
  }

  // ============================================================
  // Actions
  // ============================================================

  // X button or Cancel button
  close(): void {
    this.closed.emit();
  }

  // Save button — validates then emits the updated employee to the parent
  save(): void {
    this.touched = true;
    if (!this.isValid) return;

    // TODO: call your EmployeeService.updateEmployeeAsync(this.form) here
    // For now we just emit the updated form back to the parent
    const employeePayload: UpdateEmployeeCommand = {
      performedBy: this.currentUser?.fullName ?? '',
      performedById: this.currentUser?.id ?? 0,
      id: this.form.id,
      employeeCode: this.form.employeeCode,
      department: this.form.department,
      salary: this.form.salary,
      rolePosition: this.form.rolePosition,
      person: this.form.person,
    };

    const result = this.employeeService
      .updateEmployeeAsync(employeePayload)
      .then((res) => {
        if (!res.isSuccess) {
          this.updateErrorMessage = res.errorMessage;
          return;
        } else {
          this.updated.emit(this.form);
        }
      })
      .catch((err) => {
      });
  }
}
