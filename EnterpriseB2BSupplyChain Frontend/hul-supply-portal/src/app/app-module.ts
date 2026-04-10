import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// NgRx
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { storageSyncMetaReducer } from './store/meta-reducers/storage-sync';

// Core
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { SharedModule } from './shared/shared.module';

// Interceptors
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { ResponseEnvelopeInterceptor } from './core/interceptors/response-envelope.interceptor';
import { ZoneInterceptor } from './core/interceptors/zone.interceptor';

// Store
import { authReducer } from './store/auth/auth.reducer';
import { cartReducer } from './store/cart/cart.reducer';
import { catalogReducer } from './store/catalog/catalog.reducer';
import { ordersReducer } from './store/orders/orders.reducer';
import { shippingAddressReducer } from './store/shipping-address/shipping-address.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { CatalogEffects } from './store/catalog/catalog.effects';
import { OrdersEffects } from './store/orders/orders.effects';
import { ShippingAddressEffects } from './store/shipping-address/shipping-address.effects';
import { CartEffects } from './store/cart/cart.effects';

import { environment } from '../environments/environment';

// Pages
import { UnauthorizedPageComponent } from './features/unauthorized/unauthorized-page.component';

@NgModule({
  declarations: [
    App,
    UnauthorizedPageComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,

    // NgRx Store
    StoreModule.forRoot({
      auth: authReducer,
      cart: cartReducer,
      catalog: catalogReducer,
      orders: ordersReducer,
      shippingAddresses: shippingAddressReducer,
    }, {
      metaReducers: [storageSyncMetaReducer]
    }),
    EffectsModule.forRoot([
      AuthEffects,
      CartEffects,
      CatalogEffects,
      OrdersEffects,
      ShippingAddressEffects,
    ]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production,
    }),
  ],
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    { provide: HTTP_INTERCEPTORS, useClass: ZoneInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ResponseEnvelopeInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [App]
})
export class AppModule { }
