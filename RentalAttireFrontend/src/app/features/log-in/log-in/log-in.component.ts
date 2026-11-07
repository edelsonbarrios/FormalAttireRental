import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service/auth.service';
import {
  SocialAuthService,
  SocialUser,
  SocialLoginModule,
} from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';
import { CurrentUser } from '../../../../environments/current-user';
import { USER_ID } from '../../../../environments/user-id';

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SocialLoginModule],
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss',
})
export class LogInComponent implements OnInit, OnDestroy {

  loginForm!: FormGroup;

  // UI State
  usernameFocused = false;
  passwordFocused = false;
  showPassword    = false;
  isLoading       = false;
  isGoogleLoading = false;
  loginError: string | undefined;

  private authStateSub!: Subscription;
  private isLoggingOut = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private socialAuthService: SocialAuthService,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username:   ['', [Validators.required]],
      password:   ['', [Validators.required]],
      rememberMe: [false],
    });

    // Fires when the Google button completes sign-in
    this.authStateSub = this.socialAuthService.authState.subscribe((user: SocialUser) => {
      if (!user?.idToken || this.isLoggingOut) return;

      this.isGoogleLoading = true;
      this.loginError      = undefined;

      this.authService
        .googleLogin(user.idToken)
        .then((result) => {
          if (!result.isSuccess) {
            this.loginError = result.errorMessage;
            return;
          }
          if (result.data?.accessToken && result.data?.refreshToken) {
            this.authService.saveTokens(result.data.accessToken, result.data.refreshToken);
            localStorage.setItem(USER_ID, JSON.stringify(result.data.id));
          }

          if (!result.data?.isProfileComplete) {
            this.router.navigateByUrl('/profile-completion');
            return;   // ← add this
          }

          var rolePosition = this.authService.getCurrentUserRolePosition();

          if(rolePosition == 'Administrator')
            this.router.navigateByUrl('/admin');

          if(rolePosition == 'Customer') 
            this.router.navigateByUrl('/customer')
        })
        .catch((err) => {
          this.loginError = err?.error?.errorMessage ?? 'Google sign-in failed.';
          console.error('Google login error:', err);
        })
        .finally(() => {
          this.isGoogleLoading = false;
        });
    });
  }

  ngOnDestroy(): void {
    this.authStateSub?.unsubscribe();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ── Standard login ─────────────────────────────────────────
  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading  = true;
    this.loginError = undefined;

    const { username, password } = this.loginForm.value;

    this.authService
      .login(username, password)
      .then((result) => {
        if (!result.isSuccess) {
          this.loginError = result.errorMessage;
          return;
        }
        if (result.data?.accessToken && result.data?.refreshToken) {
          this.authService.saveTokens(result.data.accessToken, result.data.refreshToken);
        }

        

        if(!result.data?.isProfileComplete)
          this.router.navigateByUrl('/profile-completion');

        var rolePosition = this.authService.getCurrentUserRolePosition();   

        if(!rolePosition)
          this.loginError = 'Invalid role position.';

        if(rolePosition == 'Administrator')
          this.router.navigateByUrl('/admin');

        if(rolePosition == 'Customer')
          this.router.navigateByUrl('/customer');
      })
      .catch((err) => {
        this.loginError = err?.error?.errorMessage ?? 'An unexpected error occurred.';
        console.error('Login error:', err);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // ── Navigate to registration ───────────────────────────────
  goToRegister(): void {
    this.router.navigateByUrl('/register');
  }

  get usernameCtrl() { return this.loginForm.get('username'); }
  get passwordCtrl() { return this.loginForm.get('password'); }
}