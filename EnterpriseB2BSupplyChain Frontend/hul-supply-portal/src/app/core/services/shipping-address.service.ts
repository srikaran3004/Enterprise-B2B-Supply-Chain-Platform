import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';
import { ShippingAddress, AddShippingAddressDto } from '../models/shipping-address.model';

@Injectable({
  providedIn: 'root'
})
export class ShippingAddressService {
  private http = inject(HttpClient);

  getShippingAddresses(): Observable<ShippingAddress[]> {
    return this.http.get<ShippingAddress[]>(API_ENDPOINTS.shippingAddress.base());
  }

  addShippingAddress(data: AddShippingAddressDto): Observable<{ addressId: string }> {
    return this.http.post<{ addressId: string }>(API_ENDPOINTS.shippingAddress.base(), data);
  }

  updateShippingAddress(id: string, data: Partial<AddShippingAddressDto>): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.shippingAddress.byId(id), data);
  }

  deleteShippingAddress(id: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.shippingAddress.byId(id));
  }

  setDefaultAddress(id: string): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.shippingAddress.setDefault(id), {});
  }
}
