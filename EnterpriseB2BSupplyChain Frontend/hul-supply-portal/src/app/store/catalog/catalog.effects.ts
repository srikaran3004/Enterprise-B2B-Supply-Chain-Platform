import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { map, switchMap, catchError, debounceTime } from 'rxjs/operators';
import * as CatalogActions from './catalog.actions';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

@Injectable()
export class CatalogEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogActions.loadCategories),
      switchMap(() =>
        this.http.get<any[]>(API_ENDPOINTS.catalog.categories()).pipe(
          map(categories => CatalogActions.loadCategoriesSuccess({ categories })),
          catchError(error => of(CatalogActions.loadCategoriesFailure({ error: error.message })))
        )
      )
    )
  );

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogActions.loadProducts),
      switchMap(({ params }) => {
        let url = API_ENDPOINTS.catalog.products();
        const queryParams: string[] = [];
        if (params?.categoryId) queryParams.push(`categoryId=${params.categoryId}`);
        if (params?.inStockOnly) queryParams.push(`inStockOnly=true`);
        if (params?.searchTerm) queryParams.push(`searchTerm=${encodeURIComponent(params.searchTerm)}`);
        if (queryParams.length > 0) url += '?' + queryParams.join('&');

        return this.http.get<any[]>(url).pipe(
          map(products => CatalogActions.loadProductsSuccess({ products })),
          catchError(error => {
            console.error('Failed to load products:', error);
            return of(CatalogActions.loadProductsFailure({ error: error.message }));
          })
        );
      })
    )
  );

  applyFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogActions.applyFilter),
      debounceTime(350),
      switchMap(({ filters }) =>
        [CatalogActions.loadProducts({ params: filters })]
      )
    )
  );
}
