import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeDTO } from '../../../../../data/models/DTOs/Employees/employee-dto';
import { AddUserComponent } from '../../add-user/add-user/add-user.component';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, AddUserComponent],
  templateUrl: './add-employee.component.html',
  styleUrl: './add-employee.component.scss',
})
export class AddEmployeeComponent {
  // ============================================================
  // Outputs — events emitted to the parent (AdminLayoutComponent)
  // ============================================================

  // Tells the parent to close this modal
  @Output() closed = new EventEmitter<void>();

  // Tells the parent the form was fully completed
  @Output() submitted = new EventEmitter<EmployeeDTO>();

  // ============================================================
  // State
  // ============================================================

  // Controls whether the AddUser modal is visible on top of this one
  showUserModal = false;

  // True while waiting for an API call to finish
  isSubmitting = false;

  // Starts false — flips to true when the user clicks "Continue"
  // Error messages only show after the first submit attempt
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

  // ============================================================
  // Form Data — bound to the template via [(ngModel)]
  // ============================================================

  form: EmployeeDTO = {
    id: 0,
    employeeCode: '',
    department: '',
    salary: 0, // null so the input starts empty, not "0"
    rolePosition: '',
    person: {
      id: 0,
      lastName: '',
      firstName: '',
      middleName: '',
      age: 0, // null so the input starts empty, not "0"
      gender: 'Male',
      maritalStatus: '',
      phoneNumber: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      profileImagePath: '',
      fullName: '',
    },
  };

  // ============================================================
  // Validation
  //
  // `errors` is a getter (runs every change detection cycle).
  // It returns a dictionary like: { lastName: 'Last name is required.' }
  // An empty dictionary means the form is valid.
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

  // True when there are zero errors
  get isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  // Used in the template: [class.invalid]="hasError('fieldName')"
  // Only returns true AFTER the user has clicked submit at least once
  hasError(field: string): boolean {
    return this.touched && !!this.errors[field];
  }

  // Used in the template: {{ errorMsg('fieldName') }}
  // Returns the error string, or empty string if not touched yet
  errorMsg(field: string): string {
    return this.touched ? (this.errors[field] ?? '') : '';
  }

  // ============================================================
  // Actions
  // ============================================================

  // Close button or Cancel button — tells the parent to hide this modal
  close(): void {
    this.closed.emit();
  }

  // "Continue to Account Setup" button
  // Marks the form as touched so errors appear, then opens AddUser if valid
  submit(): void {
    this.touched = true;
    if (!this.isValid) return;
    this.showUserModal = true;
  }

  // Called when AddUser emits (closeForm)
  // closeAll = true means the user finished the full flow → close everything
  // closeAll = false means the user just went back → only close AddUser
  closeUserFormModal(closeAll: boolean): void {
    this.showUserModal = false;
    if (closeAll) {
      this.submitted.emit(this.form);
    }
  }
}
