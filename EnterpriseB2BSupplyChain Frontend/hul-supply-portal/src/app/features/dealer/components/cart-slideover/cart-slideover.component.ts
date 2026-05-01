import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, firstValueFrom } from 'rxjs';
import * as CartActions from '../../../../store/cart/cart.actions';
import { selectCartItems, selectCartTotal, selectIsCartOpen, selectCartNotes } from '../../../../store/cart/cart.reducer';
import { CartItem } from '../../../../store/cart/cart.actions';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { RazorpayService } from '../../../../core/services/razorpay.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';



@Component({
  selector: 'app-cart-slideover',
  standalone: false,
  template: `
    <!-- Backdrop -->
    <div class="cart-backdrop" *ngIf="isOpen$ | async" (click)="closeCart()"></div>

    <!-- Payment Initializing Overlay (shown briefly while Razorpay popup loads) -->
    <div class="payment-overlay" *ngIf="initializingPayment">
      <div class="payment-overlay__card">
        <div class="payment-overlay__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h3 class="payment-overlay__title">Opening Payment Gateway</h3>
        <p class="payment-overlay__subtitle">Connecting to Razorpay securely…</p>
        <div class="payment-overlay__dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- Panel -->
    <div class="cart-panel" [class.cart-panel--open]="isOpen$ | async">
      <div class="cart-panel__header">
        <h3>Your Cart <span *ngIf="(items$ | async)?.length as count">({{ count }} items)</span></h3>
        <button class="cart-panel__close" (click)="closeCart()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Cart Items -->
      <div class="cart-panel__body" *ngIf="(items$ | async) as items">
        <div *ngIf="items.length === 0" class="cart-panel__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-disabled)"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p>Your cart is empty</p>
          <a routerLink="/dealer/catalog" class="cart-panel__browse" (click)="closeCart()">Browse the catalog →</a>
        </div>

        <div *ngFor="let item of items" class="cart-item">
          <div class="cart-item__info">
            <div class="cart-item__product-icon" [style.background]="getProductColor(item.product.brand)">
              {{ getProductInitial(item.product.name) }}
            </div>
            <div class="cart-item__details">
              <span class="cart-item__name">{{ item.product.name }}</span>
              <span class="cart-item__sku">{{ item.product.sku }}</span>
            </div>
          </div>
          <div class="cart-item__controls">
            <div class="cart-item__stepper">
              <button (click)="updateQty(item, item.quantity - 1)" [disabled]="item.quantity <= item.product.minOrderQuantity">−</button>
              <span>{{ item.quantity }}</span>
              <button (click)="updateQty(item, item.quantity + 1)">+</button>
            </div>
            <span class="cart-item__total">{{ item.product.unitPrice * item.quantity | inrCurrency }}</span>
            <button class="cart-item__remove" (click)="removeItem(item.product.productId)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          <div *ngIf="item.quantity < item.product.minOrderQuantity" class="cart-item__warning">
            Min order: {{ item.product.minOrderQuantity }} units
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="cart-panel__footer" *ngIf="(items$ | async)?.length">
        
        <!-- Shipping Address Section -->
        <div class="cart-panel__shipping">
          <div class="cart-addr-header">
            <label class="cart-panel__label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Delivery Address
            </label>
            <button class="cart-addr-add-btn" (click)="toggleInlineAddressForm()" *ngIf="!showInlineAddressForm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add New
            </button>
            <button class="cart-addr-add-btn cart-addr-add-btn--cancel" (click)="toggleInlineAddressForm()" *ngIf="showInlineAddressForm">Cancel</button>
          </div>

          <!-- Inline Add Address Form -->
          <div class="cart-inline-addr-form" *ngIf="showInlineAddressForm">
            <div class="ciaf-row">
              <input type="text" [(ngModel)]="inlineAddr.label" placeholder="Label (e.g. Office)*" class="ciaf-input" />
            </div>
            <div class="ciaf-row">
              <input type="text" [(ngModel)]="inlineAddr.streetLine1" placeholder="Street address*" class="ciaf-input" />
            </div>
            <div class="ciaf-row ciaf-row--2col">
              <input type="text" [(ngModel)]="inlineAddr.city" placeholder="City*" class="ciaf-input" />
              <input type="text" [(ngModel)]="inlineAddr.state" placeholder="State*" class="ciaf-input" />
            </div>
            <div class="ciaf-row ciaf-row--2col">
              <input type="text" [(ngModel)]="inlineAddr.pinCode" placeholder="PIN Code*" maxlength="6" class="ciaf-input" />
              <input type="text" [(ngModel)]="inlineAddr.district" placeholder="District" class="ciaf-input" />
            </div>
            <button class="ciaf-save-btn" [disabled]="!isInlineAddrValid() || savingInlineAddr" (click)="saveInlineAddress()">
              {{ savingInlineAddr ? 'Saving…' : 'Save & Use This Address' }}
            </button>
          </div>

          <!-- Address Select -->
          <ng-container *ngIf="!showInlineAddressForm">
            <div *ngIf="shippingAddresses.length > 0" class="shipping-addr-select-wrap">
              <select class="shipping-addr-select" [(ngModel)]="selectedAddressId">
                <option value="" disabled>Select delivery address…</option>
                <option *ngFor="let addr of shippingAddresses" [value]="addr.addressId">
                  {{ addr.label ? addr.label + ' · ' : '' }}{{ addr.city }}, {{ addr.state }} {{ addr.pinCode }}
                </option>
              </select>
              <svg class="shipping-addr-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <p class="shipping-addr-detail" *ngIf="selectedAddress">
              {{ selectedAddress.addressLine1 }}, {{ selectedAddress.city }}, {{ selectedAddress.state }} - {{ selectedAddress.pinCode }}
            </p>
            <div *ngIf="shippingAddresses.length === 0" class="shipping-addr-empty">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              No saved addresses. Use <strong>+ Add New</strong> above.
            </div>
          </ng-container>
        </div>

        <div class="cart-panel__summary">
          <div class="cart-panel__row">
            <span>Subtotal</span>
            <span>{{ total$ | async | inrCurrency }}</span>
          </div>
          <div class="cart-panel__row cart-panel__row--muted">
            <span>GST (18% Estimate)</span>
            <span>{{ gstAmount | inrCurrency }}</span>
          </div>
          <div class="cart-panel__row cart-panel__row--muted" *ngIf="shippingFee > 0">
            <span>Delivery Charges</span>
            <span>{{ shippingFee | inrCurrency }}</span>
          </div>
          <div class="cart-panel__row">
            <span class="cart-panel__total-label">Grand Total</span>
            <span class="cart-panel__total">{{ grandTotal | inrCurrency }}</span>
          </div>
        </div>

        <div class="cart-panel__payment">
          <div class="payment-razorpay-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Secure payment via <strong>Razorpay</strong>
          </div>
        </div>

        <textarea class="cart-panel__notes" placeholder="Order notes (optional)"
          [value]="(notes$ | async) || ''" (input)="setNotes($event)"></textarea>

        <hul-button variant="primary" size="lg" [fullWidth]="true" [loading]="placing || initializingPayment"
          [disabled]="placing || initializingPayment || hasMinOrderIssue || !selectedAddressId || showInlineAddressForm" (click)="placeOrder()">
          Place Order via Razorpay
        </hul-button>
      </div>
    </div>
  `,
  styles: [`
    .cart-backdrop {
      position: fixed;
      inset: 0;
      background: var(--bg-overlay);
      z-index: 200;
      animation: fadeIn 200ms var(--ease-out);
    }

    /* Payment Processing Overlay */
    .payment-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 200ms ease;
    }

    .payment-overlay__card {
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      padding: 40px 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.35);
    }

    .payment-overlay__icon {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #0ea5e9, #0369a1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-bottom: 4px;
    }

    .payment-overlay__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .payment-overlay__subtitle {
      font-size: 14px;
      color: var(--text-tertiary);
      margin: 0;
    }

    .payment-overlay__dots {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .payment-overlay__dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hul-primary);
      animation: dot-bounce 1.2s infinite ease-in-out;
    }

    .payment-overlay__dots span:nth-child(2) { animation-delay: 0.2s; }
    .payment-overlay__dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .cart-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 100vw;
      height: 100vh;
      background: var(--bg-card);
      border-left: 1px solid var(--border-default);
      box-shadow: var(--shadow-xl);
      z-index: 201;
      transform: translateX(100%);
      transition: transform var(--duration-slow) var(--ease-in-out);
      display: flex;
      flex-direction: column;
    }

    .cart-panel--open { transform: translateX(0); }

    .cart-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border-default);
    }

    .cart-panel__header h3 {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .cart-panel__header h3 span { color: var(--text-tertiary); font-weight: 400; }

    .cart-panel__close {
      background: none; border: none; cursor: pointer; color: var(--text-tertiary);
      padding: 6px; border-radius: var(--radius-md); display: flex;
      transition: all var(--duration-fast) var(--ease-out);
    }
    .cart-panel__close:hover { background: var(--bg-muted); color: var(--text-primary); }

    .cart-panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }

    .cart-panel__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: var(--text-tertiary);
      font-size: 14px;
    }

    .cart-panel__browse {
      color: var(--hul-primary);
      font-weight: 600;
      text-decoration: none;
    }

    .cart-item {
      padding: 14px 0;
      border-bottom: 1px solid var(--border-default);
    }

    .cart-item__info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .cart-item__product-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .cart-item__details { flex: 1; min-width: 0; }
    .cart-item__name { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cart-item__sku { display: block; font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

    .cart-item__controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .cart-item__stepper {
      display: flex;
      align-items: center;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .cart-item__stepper button {
      width: 32px;
      height: 32px;
      background: var(--bg-subtle);
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .cart-item__stepper button:hover:not(:disabled) { background: var(--bg-muted); color: var(--text-primary); }
    .cart-item__stepper button:disabled { opacity: 0.3; cursor: not-allowed; }

    .cart-item__stepper span {
      width: 40px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .cart-item__total {
      flex: 1;
      text-align: right;
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
    }

    .cart-item__remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-disabled);
      padding: 4px;
      border-radius: var(--radius-sm);
      display: flex;
      transition: all var(--duration-fast) var(--ease-out);
    }
    .cart-item__remove:hover { color: var(--hul-danger); background: rgba(239, 68, 68, 0.08); }

    .cart-item__warning {
      font-size: 12px;
      color: var(--hul-danger);
      margin-top: 6px;
      padding-left: 52px;
    }

    .cart-panel__footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .cart-panel__summary { display: flex; flex-direction: column; gap: 8px; }
    .cart-panel__row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-secondary); }
    .cart-panel__row--muted { font-size: 13px; color: var(--text-tertiary); }
    .cart-panel__total { font-weight: 700; font-size: 18px; color: var(--text-primary); font-family: var(--font-mono); }

    .cart-panel__payment { }
    .cart-panel__label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); margin-bottom: 8px; }

    /* Address section header */
    .cart-addr-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .cart-addr-add-btn {
      display: inline-flex; align-items: center; gap: 4px; background: none; border: 1px solid var(--hul-primary);
      color: var(--hul-primary); font-size: 11px; font-weight: 600; padding: 4px 10px;
      border-radius: var(--radius-md); cursor: pointer; transition: all var(--duration-fast);
    }
    .cart-addr-add-btn:hover { background: var(--hul-primary-light); }
    .cart-addr-add-btn--cancel { border-color: var(--border-default); color: var(--text-secondary); }
    .cart-addr-add-btn--cancel:hover { background: var(--bg-muted); }

    /* Inline address form */
    .cart-inline-addr-form {
      background: var(--bg-subtle); border: 1px solid var(--border-default);
      border-radius: var(--radius-lg); padding: 12px; display: flex;
      flex-direction: column; gap: 8px; margin-bottom: 10px;
    }
    .ciaf-row { display: flex; gap: 8px; }
    .ciaf-row--2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .ciaf-input {
      width: 100%; padding: 8px 10px; border: 1px solid var(--border-default);
      border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary);
      font-size: 12px; font-family: var(--font-body); box-sizing: border-box; outline: none;
      transition: border-color var(--duration-fast);
    }
    .ciaf-input:focus { border-color: var(--hul-primary); }
    .ciaf-input::placeholder { color: var(--text-disabled); font-size: 11px; }
    .ciaf-save-btn {
      width: 100%; padding: 9px; background: var(--hul-primary); color: white; border: none;
      border-radius: var(--radius-md); font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: var(--font-body); transition: background var(--duration-fast);
    }
    .ciaf-save-btn:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .ciaf-save-btn:disabled { opacity: .5; cursor: not-allowed; }

    .shipping-addr-select-wrap { position: relative; }
    .shipping-addr-select {
      width: 100%; padding: 10px 36px 10px 12px; border: 1px solid var(--border-default);
      border-radius: var(--radius-lg); background: var(--bg-subtle); color: var(--text-primary);
      font-size: 13px; font-family: var(--font-body); font-weight: 500; appearance: none;
      -webkit-appearance: none; cursor: pointer; outline: none; transition: border-color var(--duration-fast);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .shipping-addr-select:focus { border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .shipping-addr-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
    .shipping-addr-detail {
      font-size: 12px; color: var(--text-tertiary); margin: 6px 0 0; padding-left: 2px; line-height: 1.5;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
    }
    .shipping-addr-empty {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-lg);
      background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; font-size: 13px; font-weight: 500;
    }
    :host-context(.dark) .shipping-addr-empty { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); }

    .payment-razorpay-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius-md);
      font-size: 13px;
      color: #15803d;
    }
    :host-context(.dark) .payment-razorpay-badge { background: rgba(21,128,61,.15); border-color: rgba(21,128,61,.3); }

    .cart-panel__notes {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-family: var(--font-body);
      color: var(--text-primary);
      background: var(--bg-base);
      resize: none;
      height: 60px;
      outline: none;
      transition: border-color var(--duration-fast) var(--ease-out);
    }

    .cart-panel__notes:focus {
      border-color: var(--border-focus);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 640px) {
      .cart-panel { width: 100vw; }
    }
  `]
})
export class CartSlideoverComponent implements OnInit, OnDestroy {
  items$: Observable<CartItem[]>;
  total$: Observable<number>;
  isOpen$: Observable<boolean>;
  notes$: Observable<string>;

  shippingAddresses: any[] = [];
  selectedAddressId = '';
  gstAmount = 0;
  shippingFee = 0;
  grandTotal = 0;

  placing = false;
  initializingPayment = false;
  hasMinOrderIssue = false;

  showInlineAddressForm = false;
  savingInlineAddr = false;
  inlineAddr = { label: '', streetLine1: '', city: '', state: '', pinCode: '', district: '' };

  get selectedAddress(): any {
    return this.shippingAddresses.find(a => a.addressId === this.selectedAddressId) || null;
  }

  private brandColors: Record<string, string> = {
    'Dove': '#1a73e8', 'Surf': '#0d9488', 'Axe': '#1e293b', 'Rexona': '#16a34a',
    'Horlicks': '#d97706', 'Knorr': '#15803d', 'Vaseline': '#2563eb',
  };

  constructor(
    private store: Store,
    private authService: AuthService,
    private http: ZoneHttpService,
    private razorpayService: RazorpayService,
    private toast: ToastService,
    private router: Router
  ) {
    this.items$ = this.store.select(selectCartItems);
    this.total$ = this.store.select(selectCartTotal);
    this.isOpen$ = this.store.select(selectIsCartOpen);
    this.notes$ = this.store.select(selectCartNotes);
  }

  ngOnInit() {
    this.fetchAddresses();
    this.store.select(selectCartTotal).subscribe(tot => {
      this.gstAmount = tot * 0.18; // 18% GST estimate
      this.grandTotal = tot + this.gstAmount + this.shippingFee;
    });

    this.items$.subscribe(items => {
      this.hasMinOrderIssue = items.some(i => i.quantity < i.product.minOrderQuantity);
    });
  }

  ngOnDestroy() {
    // nothing to clean up
  }

  fetchAddresses() {
    this.http.get<any[]>(API_ENDPOINTS.shippingAddress.base()).subscribe({
      next: (data) => {
        this.shippingAddresses = data;
        const defaultAddr = data.find(d => d.isDefault);
        if (defaultAddr) this.selectedAddressId = defaultAddr.addressId;
        else if (data.length > 0) this.selectedAddressId = data[0].addressId;
      }
    });
  }

  closeCart(): void {
    this.store.dispatch(CartActions.closeCart());
  }

  updateQty(item: CartItem, qty: number): void {
    if (qty < 1) return;
    this.store.dispatch(CartActions.updateQuantity({ productId: item.product.productId, quantity: qty }));
  }

  removeItem(productId: string): void {
    this.store.dispatch(CartActions.removeFromCart({ productId }));
  }

  setNotes(event: Event): void {
    this.store.dispatch(CartActions.setNotes({ notes: (event.target as HTMLTextAreaElement).value }));
  }

  toggleInlineAddressForm() {
    this.showInlineAddressForm = !this.showInlineAddressForm;
    if (this.showInlineAddressForm) {
      this.inlineAddr = { label: '', streetLine1: '', city: '', state: '', pinCode: '', district: '' };
    }
  }

  isInlineAddrValid(): boolean {
    return (
      this.inlineAddr.label.trim().length > 0 &&
      this.inlineAddr.streetLine1.trim().length > 0 &&
      this.inlineAddr.city.trim().length > 0 &&
      this.inlineAddr.state.trim().length > 0 &&
      /^\d{6}$/.test(this.inlineAddr.pinCode)
    );
  }

  saveInlineAddress() {
    if (!this.isInlineAddrValid()) return;
    this.savingInlineAddr = true;
    this.http.post<{ addressId: string }>(API_ENDPOINTS.shippingAddress.base(), {
      label: this.inlineAddr.label,
      addressLine1: this.inlineAddr.streetLine1,
      district: this.inlineAddr.district || null,
      city: this.inlineAddr.city,
      state: this.inlineAddr.state,
      pinCode: this.inlineAddr.pinCode,
      phoneNumber: null,
      isDefault: this.shippingAddresses.length === 0,
    }).subscribe({
      next: (res) => {
        this.toast.success('Address saved!');
        this.savingInlineAddr = false;
        this.showInlineAddressForm = false;
        this.fetchAddresses();
        // Auto-select the newly added address after reload
        setTimeout(() => {
          if (res?.addressId) this.selectedAddressId = res.addressId;
        }, 500);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to save address');
        this.savingInlineAddr = false;
      }
    });
  }

  async placeOrder() {
    if (!this.selectedAddressId) {
      this.toast.error('Please select a shipping address');
      return;
    }

    this.placing = true;
    let items: CartItem[] = [];
    let notes = '';

    const itemsSub = this.items$.subscribe(i => items = i);
    const notesSub = this.notes$.subscribe(n => notes = n);
    itemsSub.unsubscribe(); notesSub.unsubscribe();

    const payload = {
      dealerId: this.authService.getDealerId() || '00000000-0000-0000-0000-000000000000',
      shippingAddressId: this.selectedAddressId,
      lines: items.map(i => ({
        productId: i.product.productId,
        productName: i.product.name,
        sku: i.product.sku,
        unitPrice: i.product.unitPrice,
        quantity: i.quantity,
      })),
      paymentMode: 'PrePaid',
      notes: notes || null,
    };

    try {
      // Create order in backend — response now includes shippingFee
      const orderResp = await firstValueFrom(
        this.http.post<{ orderId: string; status?: string; shippingFee?: number }>(API_ENDPOINTS.orders.base(), payload)
      );

      const orderId = orderResp.orderId;
      // Update shipping fee and grand total from server response
      if (orderResp.shippingFee != null) {
        this.shippingFee = orderResp.shippingFee;
        const subtotal = await firstValueFrom(this.total$);
        this.gstAmount = subtotal * 0.18;
        this.grandTotal = subtotal + this.gstAmount + this.shippingFee;
      }

      if (orderResp.status === 'OnHold') {
        this.toast.warning('Purchase limit exceeded and waiting for admin approval.');
        this.store.dispatch(CartActions.clearCart());
        this.closeCart();
        this.placing = false;
        this.router.navigate(['/dealer/orders/', orderId]);
        return;
      }

      await this.handleRazorpay(orderId, this.grandTotal);
    } catch (e) {
      this.toast.error('Failed to place order');
      console.error(e);
      this.placing = false;
    }
  }

  async handleRazorpay(orderId: string, amount: number) {
    try {
      this.initializingPayment = true;

      // Step 1: Create Razorpay order on backend
      const rzpOrder = await firstValueFrom(
        this.razorpayService.createOrder(orderId, amount)
      );

      this.initializingPayment = false;

      // Step 2: Open real Razorpay checkout popup
      const options = {
        key: 'rzp_test_SdZPZWzMSu8eO3',
        amount: Math.round(amount * 100).toString(),
        currency: 'INR',
        name: 'UniDistrib Supply Portal',
        description: `Order Payment — ${orderId.substring(0, 8).toUpperCase()}`,
        image: '',
        order_id: rzpOrder.razorpayOrderId,
        handler: async (response: any) => {
          // Step 3: Confirm payment signature on backend
          try {
            await firstValueFrom(
              this.razorpayService.confirmPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId,
                amount,
              })
            );
            this.completeOrderSuccess(orderId);
          } catch (e) {
            this.toast.error('Payment verification failed. Please contact support.');
            this.placing = false;
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        notes: {
          orderId,
        },
        theme: {
          color: '#0369a1',
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'UPI / QR',
                instruments: [
                  {
                    method: 'upi',
                    protocols: ['vpa', 'collect', 'intent']
                  }
                ]
              }
            },
            sequence: ['block.upi'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        modal: {
          ondismiss: () => {
            this.toast.error('Payment was cancelled. Your order has been placed — you can pay from Orders page.');
            this.placing = false;
            // Still navigate to order so dealer can see it
            this.store.dispatch(CartActions.clearCart());
            this.closeCart();
            this.router.navigate(['/dealer/orders/', orderId]);
          },
        },
        paymentFailedHandler: async (response: any) => {
        try {
          await firstValueFrom(
            this.razorpayService.markPaymentFailed({
              orderId,
              amount,
              razorpayPaymentId: response?.error?.metadata?.payment_id,
              errorCode: response?.error?.code,
              errorDescription: response?.error?.description,
              errorReason: response?.error?.reason,
            })
          );
        } catch (e) {
          console.error('Failed to record Razorpay payment failure', e);
        }

        this.toast.error('Payment failed. Please try again.');
        this.placing = false;
        this.store.dispatch(CartActions.clearCart());
        this.closeCart();
        this.router.navigate(['/dealer/orders/', orderId]);
        },
      };

      this.razorpayService.openRazorpay(options);
    } catch (e) {
      this.initializingPayment = false;
      this.toast.error('Failed to initialize Razorpay. Please try again.');
      this.placing = false;
    }
  }

  completeOrderSuccess(orderId: string) {
    this.toast.success('Order placed successfully!');
    this.store.dispatch(CartActions.clearCart());
    this.closeCart();
    this.placing = false;
    this.router.navigate(['/dealer/orders/', orderId]);
  }

  getProductColor(brand: string): string {
    return this.brandColors[brand] || '#6366f1';
  }

  getProductInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'P';
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.closeCart(); }
}
