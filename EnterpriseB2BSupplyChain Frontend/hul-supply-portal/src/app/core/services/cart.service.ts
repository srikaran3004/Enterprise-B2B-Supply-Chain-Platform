import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private http = inject(HttpClient);

    /**
     * Reserve inventory when adding item to cart
     */
    reserveInventory(productId: string, quantity: number): Observable<any> {
        return this.http.post(`${API_ENDPOINTS.inventory.base()}/reserve`, {
            productId,
            quantity
        });
    }

    /**
     * Release inventory reservation when removing item from cart
     */
    releaseInventory(productId: string): Observable<any> {
        return this.http.post(`${API_ENDPOINTS.inventory.base()}/release`, {
            productId
        });
    }

    /**
     * Release all inventory reservations (clear cart)
     */
    releaseAllInventory(): Observable<any> {
        return this.http.post(`${API_ENDPOINTS.inventory.base()}/release-all`, {});
    }
}
