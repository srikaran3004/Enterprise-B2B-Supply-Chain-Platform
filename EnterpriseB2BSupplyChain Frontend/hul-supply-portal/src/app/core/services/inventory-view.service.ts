import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';
import { ZoneHttpService } from './zone-http.service';

@Injectable({ providedIn: 'root' })
export class InventoryViewService {
  private readonly reservedStatuses = new Set([
    'Placed',
    'OnHold',
    'Processing',
    'ReadyForDispatch',
    'InTransit',
  ]);

  constructor(private http: ZoneHttpService) {}

  getInventorySnapshot(pageSize = 500): Observable<any[]> {
    return forkJoin({
      products: this.http.get<any[]>(API_ENDPOINTS.catalog.products()),
      orders: this.http.get<any>(`${API_ENDPOINTS.orders.base()}?pageSize=${pageSize}`),
    }).pipe(
      map(({ products, orders }) => this.mergeInventory(products, orders?.items || orders || []))
    );
  }

  mergeInventory(products: any[], orders: any[]): any[] {
    const reservedByProduct = new Map<string, number>();

    for (const order of orders || []) {
      if (!this.reservedStatuses.has(order?.status)) {
        continue;
      }

      for (const line of order?.lines || order?.items || []) {
        const productId = line?.productId;
        if (!productId) {
          continue;
        }

        const quantity = Number(line?.quantity || 0);
        reservedByProduct.set(productId, (reservedByProduct.get(productId) || 0) + quantity);
      }
    }

    return (products || []).map(product => {
      const totalStock = Number(product?.totalStock || 0);
      const reservedStock = Math.max(0, reservedByProduct.get(product?.productId) ?? Number(product?.reservedStock || 0));
      const safeReserved = Math.min(totalStock, reservedStock);
      const availableStock = Math.max(0, totalStock - safeReserved);

      return {
        ...product,
        reservedStock: safeReserved,
        availableStock,
        totalStock,
        isInStock: availableStock >= Number(product?.minOrderQuantity || 1),
      };
    });
  }
}
