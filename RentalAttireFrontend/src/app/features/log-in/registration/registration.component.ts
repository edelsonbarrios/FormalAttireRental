import { CommonModule } from '@angular/common';
import { ApplicationConfig, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterCustomerCommand } from '../../../data/models/DTOs/Customer/register-customer';
import { AppToastrService } from '../../../core/services/toastr-service/app-toastr.service';
import { AuthService } from '../../../core/services/auth-service/auth.service';
// import { AuthService } from '../../../core/services/auth-service/auth.service';
// import { AppToastrService } from '../../../core/services/toastr-service/app-toastr.service';

// ── Inline command — replace with real import once created ───
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss',
})
export class RegistrationComponent implements OnInit{
  @Output() closed = new EventEmitter<void>();

  form: RegisterCustomerCommand = new RegisterCustomerCommand();

  // UI State
  isSubmitting  = false;
  touched       = false;
  showPassword  = false;
  showConfirm   = false;
  successMsg: string | undefined;

  constructor(
    private router: Router,
    private toastrService : AppToastrService,
    private authService : AuthService
  ) {}

  ngOnInit(): void {
    
  }

  // ============================================================
  // Validation
  // ============================================================
  get errors(): Record<string, string> {
    const f = this.form;
    const e: Record<string, string> = {};

    if (!f.email?.trim())       e['username'] = 'Username is required.';
    if (!f.password?.trim())       e['password'] = 'Password is required.';
    else if (f.password.length < 8) e['password'] = 'Password must be at least 8 characters.';
    if (!f.confirmPassword?.trim()) e['confirmPassword'] = 'Please confirm your password.';
    else if (f.password !== f.confirmPassword)
                                    e['confirmPassword'] = 'Passwords do not match.';

    // Personal
    if (!f.person.lastName?.trim())       e['lastName']      = 'Last name is required.';
    if (!f.person.firstName?.trim())      e['firstName']     = 'First name is required.';
    if (!f.person.age || f.person.age < 1)       e['age']           = 'Enter a valid age.';
    if (f.person.age > 120)               e['age']           = 'Age cannot exceed 120.';
    if (!f.person.gender)                 e['gender']        = 'Select a gender.';
    if (!f.person.maritalStatus)          e['maritalStatus'] = 'Select marital status.';
    if (!f.person.phoneNumber?.trim())
      e['phoneNumber'] = 'Phone number is required.';
    else if (!/^09\d{9}$/.test(f.person.phoneNumber.trim()))
      e['phoneNumber'] = 'Must be 11 digits starting with 09.';

    // Address
    if (!f.person.street?.trim())     e['street']     = 'Street is required.';
    if (!f.person.barangay?.trim())   e['barangay']   = 'Barangay is required.';
    if (!f.person.city?.trim())       e['city']       = 'City is required.';
    if (!f.person.province?.trim())   e['province']   = 'Province is required.';
    if (!f.person.postalCode?.trim()) e['postalCode'] = 'Postal code is required.';

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

  togglePassword(): void  { this.showPassword = !this.showPassword; }
  toggleConfirm(): void   { this.showConfirm  = !this.showConfirm; }

  goToLogin(): void {
    this.router.navigateByUrl('/log-in');
  }

  submit(): void {
    this.touched = true;
    if (!this.isValid) return;

    this.isSubmitting = true;

    this.authService.customerRegistrationAsync(this.form)
    .then(res => {
      if(!res.isSuccess)
        this.toastrService.error(res.errorMessage ?? 'Transaction failed.');
      this.toastrService.success('Account created successfully.');
    }).catch(err => {
      this.toastrService.error(err.error);
    }).finally(() => {
      this.isSubmitting = false;
      this.router.navigateByUrl('/admin');
    });
  }
}