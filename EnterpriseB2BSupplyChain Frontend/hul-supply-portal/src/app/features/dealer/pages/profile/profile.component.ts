import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-profile',
  standalone: false,
  template: `
    <div class="profile-page">
      <hul-page-header title="Profile" subtitle="Manage your account details and preferences"
        [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Profile'}]">
      </hul-page-header>

      <div class="profile-layout">
        <!-- Profile Card -->
        <hul-card padding="lg" shadow="sm">
          <div class="profile-header">
            <hul-avatar [name]="user?.fullName || 'Dealer'" size="xl" [imageUrl]="user?.profilePictureUrl" [editable]="true" (fileSelected)="onProfilePictureSelected($event)"></hul-avatar>
            <div class="profile-info">
              <h3>{{ user?.fullName || 'Dealer' }}</h3>
              <p>{{ user?.email }}</p>
              <hul-badge variant="primary" size="sm">{{ user?.role || 'Dealer' }}</hul-badge>
            </div>
          </div>
        </hul-card>

        <!-- Business Info -->
        <hul-card padding="lg" shadow="sm">
          <h3 class="section-title">Business Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Business Name</span>
              <span class="info-value">{{ user?.businessName || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">GST Number</span>
              <span class="info-value mono">{{ user?.gstNumber || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone Number</span>
              <span class="info-value">{{ user?.phoneNumber || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Address</span>
              <span class="info-value">{{ user?.addressLine1 || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">City / State</span>
              <span class="info-value">{{ user?.city || '—' }}, {{ user?.state || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">PIN Code</span>
              <span class="info-value mono">{{ user?.pinCode || '—' }}</span>
            </div>
          </div>
        </hul-card>

        <!-- Shipping Addresses -->
        <hul-card padding="lg" shadow="sm">
          <div class="address-header">
            <h3 class="section-title" style="margin: 0;">Shipping Addresses</h3>
            <hul-button variant="outline" size="sm" (click)="openAddAddressModal()">+ Add New</hul-button>
          </div>
          <div class="addresses-list">
            <div *ngFor="let addr of addresses" class="address-card">
              <div class="address-card__header">
                <span class="address-label">{{ addr.label || 'Address' }}</span>
                <span *ngIf="addr.isDefault" class="default-badge">Default</span>
              </div>
              <div class="address-card__body">
                <p class="address-text">
                  {{ addr.addressLine1 }}<br/>
                  {{ addr.city }}<span *ngIf="addr.district">, {{ addr.district }}</span>, {{ addr.state }} - {{ addr.pinCode }}
                </p>
                <div class="address-actions">
                  <button *ngIf="!addr.isDefault" class="set-default-btn" (click)="setDefault(addr.addressId)">Set Default</button>
                  <button class="edit-addr-btn" (click)="openEditAddressModal(addr)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
              </div>
            </div>
            
            <div *ngIf="addresses.length === 0" class="empty-addresses">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p>No shipping addresses yet. Use <strong>+ Add New</strong> above to add one.</p>
            </div>
          </div>
        </hul-card>

        <!-- Account Actions -->
        <hul-card padding="lg" shadow="sm">
          <h3 class="section-title">Account</h3>
          <div class="account-actions">
            <hul-button variant="outline" size="md" (click)="openChangePasswordModal()">Change Password</hul-button>
            <hul-button variant="danger" size="md" (click)="logout()">Sign Out</hul-button>
          </div>
        </hul-card>
      </div>

      <!-- Edit Address Modal -->
      <hul-modal *ngIf="showEditAddressModal" [open]="showEditAddressModal" title="Edit Shipping Address" size="md" (close)="showEditAddressModal = false">
        <div class="address-form">
          <div class="form-row">
            <div class="form-group">
              <label>Address Label *</label>
              <input type="text" [(ngModel)]="editAddressForm.label" placeholder="e.g., Warehouse 1, Office" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label>Street Address *</label>
            <input type="text" [(ngModel)]="editAddressForm.streetLine1" placeholder="Building number, street name" class="form-input" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>City *</label>
              <input type="text" [(ngModel)]="editAddressForm.city" placeholder="City" class="form-input" />
            </div>
            <div class="form-group">
              <label>District</label>
              <input type="text" [(ngModel)]="editAddressForm.district" placeholder="District (optional)" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>State *</label>
              <input type="text" [(ngModel)]="editAddressForm.state" placeholder="State" class="form-input" />
            </div>
            <div class="form-group">
              <label>PIN Code *</label>
              <input type="text" [(ngModel)]="editAddressForm.pinCode" placeholder="6-digit PIN" maxlength="6" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" [(ngModel)]="editAddressForm.phoneNumber" placeholder="Contact number" class="form-input" />
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showEditAddressModal = false" [disabled]="savingAddress">Cancel</button>
            <button class="btn btn--primary" (click)="updateAddress()" [disabled]="!isEditAddressFormValid() || savingAddress">
              {{ savingAddress ? 'Saving...' : 'Update Address' }}
            </button>
          </div>
        </div>
      </hul-modal>

      <!-- Add Address Modal -->
      <hul-modal *ngIf="showAddAddressModal" [open]="showAddAddressModal" title="Add Shipping Address" size="md" (close)="showAddAddressModal = false">
        <div class="address-form">
          <div class="form-row">
            <div class="form-group">
              <label>Address Label *</label>
              <input type="text" [(ngModel)]="addressForm.label" placeholder="e.g., Warehouse 1, Office" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label>Street Address Line 1 *</label>
            <input type="text" [(ngModel)]="addressForm.streetLine1" placeholder="Building number, street name" class="form-input" />
          </div>
          <div class="form-group">
            <label>Street Address Line 2</label>
            <input type="text" [(ngModel)]="addressForm.streetLine2" placeholder="Apartment, suite, unit (optional)" class="form-input" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>City *</label>
              <input type="text" [(ngModel)]="addressForm.city" placeholder="City" class="form-input" />
            </div>
            <div class="form-group">
              <label>District</label>
              <input type="text" [(ngModel)]="addressForm.district" placeholder="District (optional)" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>State *</label>
              <input type="text" [(ngModel)]="addressForm.state" placeholder="State" class="form-input" />
            </div>
            <div class="form-group">
              <label>PIN Code *</label>
              <input type="text" [(ngModel)]="addressForm.pinCode" placeholder="6-digit PIN" maxlength="6" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" [(ngModel)]="addressForm.phoneNumber" placeholder="Contact number" class="form-input" />
            </div>
            <div class="form-group">
              <label>Country</label>
              <input type="text" [(ngModel)]="addressForm.country" class="form-input" readonly />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showAddAddressModal = false" [disabled]="savingAddress">Cancel</button>
            <button class="btn btn--primary" (click)="saveAddress()" [disabled]="!isAddressFormValid() || savingAddress">
              {{ savingAddress ? 'Saving...' : 'Save Address' }}
            </button>
          </div>
        </div>
      </hul-modal>

      <!-- Change Password Modal -->
      <hul-modal *ngIf="showChangePasswordModal" [open]="showChangePasswordModal" title="Change Password" size="sm" (close)="showChangePasswordModal = false">
        <div class="password-form">
          <div class="form-group">
            <label>Current Password *</label>
            <input type="password" [(ngModel)]="currentPassword" placeholder="Enter current password" class="form-input" />
          </div>
          <div class="form-group">
            <label>New Password *</label>
            <input type="password" [(ngModel)]="newPassword" placeholder="Enter new password" class="form-input" />
            <span class="help-text">Must be at least 8 characters with uppercase, lowercase, number, and special character</span>
          </div>
          <div class="form-group">
            <label>Confirm New Password *</label>
            <input type="password" [(ngModel)]="confirmPassword" placeholder="Confirm new password" class="form-input" />
          </div>
          <div *ngIf="newPassword && confirmPassword && newPassword !== confirmPassword" class="error-message">
            Passwords do not match
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showChangePasswordModal = false" [disabled]="changingPassword">Cancel</button>
            <button class="btn btn--primary" (click)="changePassword()" [disabled]="!isPasswordFormValid() || changingPassword">
              {{ changingPassword ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .profile-page { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .profile-layout { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }

    .profile-header { display: flex; align-items: center; gap: 20px; }

    .profile-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--hul-primary), var(--hul-primary-hover));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-display);
      flex-shrink: 0;
    }

    .profile-info h3 {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    .profile-info p { font-size: 14px; color: var(--text-tertiary); margin: 0 0 8px; }

    .section-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) { .info-grid { grid-template-columns: 1fr; } }

    .info-item { }
    .info-label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 4px; }
    .info-value { font-size: 15px; color: var(--text-primary); }
    .mono { font-family: var(--font-mono); }

    .account-actions { display: flex; gap: 12px; }
    
    .address-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .addresses-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .address-card { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; transition: all var(--duration-fast); }
    .address-card:hover { box-shadow: var(--shadow-sm); }
    .address-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .address-label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .default-badge { padding: 3px 10px; background: var(--hul-primary-light); color: var(--hul-primary); font-size: 11px; font-weight: 600; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.03em; }
    .address-card__body { }
    .address-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 12px; }
    .address-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .set-default-btn { padding: 6px 14px; background: transparent; border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--duration-fast); }
    .set-default-btn:hover { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }
    .edit-addr-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: transparent; border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--duration-fast); }
    .edit-addr-btn:hover { background: var(--hul-primary-light); color: var(--hul-primary); border-color: var(--hul-primary); }
    .empty-addresses { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; border: 2px dashed var(--border-default); border-radius: var(--radius-lg); }
    .empty-addresses p { margin: 12px 0 0; font-size: 14px; color: var(--text-secondary); }
    
    .address-form { padding: 8px 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
    
    .password-form { padding: 8px 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .help-text { display: block; font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
    .error-message { padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); color: #dc2626; font-size: 13px; margin-bottom: 16px; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all var(--duration-fast); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class ProfileComponent implements OnInit {
  user: any = null;
  addresses: any[] = [];
  
  // Change password modal state
  showChangePasswordModal = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = false;

  // Edit address modal state
  showEditAddressModal = false;
  editingAddressId: string | null = null;
  editAddressForm = {
    label: '',
    streetLine1: '',
    district: '',
    city: '',
    state: '',
    pinCode: '',
    phoneNumber: '',
  };

  // Add address modal state
  showAddAddressModal = false;
  addressForm = {
    label: '',
    streetLine1: '',
    streetLine2: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    phoneNumber: '',
    country: 'India'
  };
  savingAddress = false;

  constructor(
    private authService: AuthService,
    private http: ZoneHttpService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const decoded = this.authService.getDecodedToken();
    if (decoded) {
      this.user = {
        fullName: decoded.fullName,
        email: decoded.email,
        role: decoded.role,
        businessName: decoded.businessName,
        gstNumber: decoded.gstNumber,
        phoneNumber: decoded.phoneNumber,
        addressLine1: decoded.addressLine1,
        city: decoded.city,
        state: decoded.state,
        pinCode: decoded.pinCode,
      };
    }
    this.loadAddresses();
  }

  loadAddresses() {
    this.http.get<any[]>(API_ENDPOINTS.shippingAddress.base()).subscribe({
      next: (data) => this.addresses = data,
      error: (err) => {
        // Silently handle - addresses are optional
        console.warn('Failed to load addresses:', err);
        this.addresses = [];
      }
    });
  }

  setDefault(id: string) {
    this.http.put(API_ENDPOINTS.shippingAddress.setDefault(id), {}).subscribe({
      next: () => {
        this.toast.success('Default address updated');
        this.loadAddresses();
      },
      error: () => this.toast.error('Failed to update default address')
    });
  }

  getInitials(): string {
    return (this.user?.fullName || 'U')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onProfilePictureSelected(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error("File size must be under 2MB");
      return;
    }
    const formData = new FormData();
    formData.append("profilePicture", file);
    this.http.post<{url: string}>(API_ENDPOINTS.users.profilePicture(), formData).subscribe({
      next: (res) => {
        if (this.user) {
          this.user.profilePictureUrl = res.url;
          // Disabling updating token inside because Angular doesn't easily let us mint a new JWT locally.
        }
        this.toast.success("Profile picture updated!");
      },
      error: () => this.toast.error("Failed to update profile picture")
    });
  }

  logout(): void {
    this.authService.logout();
  }

  openChangePasswordModal() {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.showChangePasswordModal = true;
  }

  isPasswordFormValid(): boolean {
    return (
      this.currentPassword.trim().length > 0 &&
      this.newPassword.trim().length >= 8 &&
      this.newPassword === this.confirmPassword &&
      this.isPasswordStrong(this.newPassword)
    );
  }

  isPasswordStrong(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  changePassword() {
    if (!this.isPasswordFormValid()) return;

    this.changingPassword = true;
    this.http.post(API_ENDPOINTS.users.changePassword(), {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.toast.success('Password changed successfully');
        this.showChangePasswordModal = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.changingPassword = false;
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to change password');
        this.changingPassword = false;
      }
    });
  }

  openEditAddressModal(addr: any) {
    this.editingAddressId = addr.addressId;
    this.editAddressForm = {
      label:       addr.label || '',
      streetLine1: addr.addressLine1 || '',
      district:    addr.district || '',
      city:        addr.city || '',
      state:       addr.state || '',
      pinCode:     addr.pinCode || '',
      phoneNumber: addr.phoneNumber || '',
    };
    this.showEditAddressModal = true;
  }

  isEditAddressFormValid(): boolean {
    return (
      this.editAddressForm.label.trim().length > 0 &&
      this.editAddressForm.streetLine1.trim().length > 0 &&
      this.editAddressForm.city.trim().length > 0 &&
      this.editAddressForm.state.trim().length > 0 &&
      this.editAddressForm.pinCode.trim().length === 6 &&
      /^\d{6}$/.test(this.editAddressForm.pinCode)
    );
  }

  updateAddress() {
    if (!this.isEditAddressFormValid() || !this.editingAddressId) return;

    this.savingAddress = true;
    this.http.put(API_ENDPOINTS.shippingAddress.base() + '/' + this.editingAddressId, {
      label:        this.editAddressForm.label,
      addressLine1: this.editAddressForm.streetLine1,
      district:     this.editAddressForm.district || null,
      city:         this.editAddressForm.city,
      state:        this.editAddressForm.state,
      pinCode:      this.editAddressForm.pinCode,
      phoneNumber:  this.editAddressForm.phoneNumber || null,
    }).subscribe({
      next: () => {
        this.toast.success('Address updated successfully');
        this.showEditAddressModal = false;
        this.editingAddressId = null;
        this.loadAddresses();
        this.savingAddress = false;
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to update address');
        this.savingAddress = false;
      }
    });
  }

  openAddAddressModal() {
    this.addressForm = {
      label: '',
      streetLine1: '',
      streetLine2: '',
      city: '',
      district: '',
      state: '',
      pinCode: '',
      phoneNumber: '',
      country: 'India'
    };
    this.showAddAddressModal = true;
  }

  isAddressFormValid(): boolean {
    return (
      this.addressForm.label.trim().length > 0 &&
      this.addressForm.streetLine1.trim().length > 0 &&
      this.addressForm.city.trim().length > 0 &&
      this.addressForm.state.trim().length > 0 &&
      this.addressForm.pinCode.trim().length === 6 &&
      /^\d{6}$/.test(this.addressForm.pinCode)
    );
  }

  saveAddress() {
    if (!this.isAddressFormValid()) return;

    this.savingAddress = true;
    // Backend expects AddressLine1 (not streetLine1) per AddShippingAddressRequest
    this.http.post(API_ENDPOINTS.shippingAddress.base(), {
      label: this.addressForm.label,
      addressLine1: this.addressForm.streetLine1,
      district: this.addressForm.district || null,
      city: this.addressForm.city,
      state: this.addressForm.state,
      pinCode: this.addressForm.pinCode,
      phoneNumber: this.addressForm.phoneNumber || null,
      isDefault: this.addresses.length === 0
    }).subscribe({
      next: () => {
        this.toast.success('Address added successfully');
        this.showAddAddressModal = false;
        this.loadAddresses();
        this.savingAddress = false;
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to add address');
        this.savingAddress = false;
      }
    });
  }
}
