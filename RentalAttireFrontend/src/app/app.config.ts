import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNoopAnimations(),
    provideToastr({
      timeOut: 4000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true
    }),
    {
      provide: 'SocialAuthServiceConfig',   // ← tells Angular what this config is for
      useValue: {                            // ← the actual config value
        providers: [                         // ← array of login providers
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('823033561760-8hufmkpd8vtpda89u9g8clc133p6nfoj.apps.googleusercontent.com298900847548-31u217akbqqj8f7bunr81b85c6emalvl.apps.googleusercontent.com')
          }
        ]
      } as SocialAuthServiceConfig
    }
  ]
};