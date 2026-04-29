import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';
import { ZoneHttpService } from './zone-http.service';
import { ProductDto, OrderSummary, PagedResponse } from '../models/api-models';
import { OrderStatus } from '../models/status.enums';

/** Merged inventory view: ProductDto enriched with live reservation data from active orders. */
export interface InventorySnapshot extends ProductDto {
  reservedStock: number;
  availableStock: number;
  isInStock: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventoryViewService {
  /** Orders in these statuses are considered to have inventory reserved. */
  private readonly reservedStatuses = new Set<string>([
    OrderStatus.Placed,
    OrderStatus.OnHold,
    OrderStatus.Processing,
    OrderStatus.ReadyForDispatch,
    OrderStatus.InTransit,
  ]);

  constructor(private http: ZoneHttpService) {}

  getInventorySnapshot(pageSize = 500): Observable<InventorySnapshot[]> {
    return forkJoin({
      products: this.http.get<ProductDto[]>(API_ENDPOINTS.catalog.products()),
      orders:   this.http.get<PagedResponse<OrderSummary>>(`${API_ENDPOINTS.orders.base()}?pageSize=${pageSize}`),
    }).pipe(
      map(({ products, orders }) =>
        this.mergeInventory(products, orders?.items ?? (orders as unknown as OrderSummary[]) ?? [])
      )
    );
  }

  mergeInventory(products: ProductDto[], orders: OrderSummary[]): InventorySnapshot[] {
    const reservedByProduct = new Map<string, number>();

    for (const order of orders ?? []) {
      if (!this.reservedStatuses.has(order?.status)) {
        continue;
      }

      for (const line of order?.lines ?? []) {
        const productId = line?.productId;
        if (!productId) continue;
        reservedByProduct.set(productId, (reservedByProduct.get(productId) ?? 0) + (line.quantity ?? 0));
      }
    }

    return (products ?? []).map(product => {
      const totalStock    = Number(product?.totalStock ?? 0);
      const reservedStock = Math.max(0, reservedByProduct.get(product?.productId) ?? Number(product?.reservedStock ?? 0));
      const safeReserved  = Math.min(totalStock, reservedStock);
      const availableStock = Math.max(0, totalStock - safeReserved);

      return {
        ...product,
        reservedStock:  safeReserved,
        availableStock,
        totalStock,
        isInStock: availableStock >= Number(product?.minOrderQuantity ?? 1),
      };
    });
  }
}
