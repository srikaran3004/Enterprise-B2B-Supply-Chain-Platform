import { createAction, props } from '@ngrx/store';

export const loadCategories = createAction('[Catalog] Load Categories');
export const loadCategoriesSuccess = createAction('[Catalog] Load Categories Success', props<{ categories: any[] }>());
export const loadCategoriesFailure = createAction('[Catalog] Load Categories Failure', props<{ error: string }>());

export const loadProducts = createAction('[Catalog] Load Products', props<{ params?: any }>());
export const loadProductsSuccess = createAction('[Catalog] Load Products Success', props<{ products: any[] }>());
export const loadProductsFailure = createAction('[Catalog] Load Products Failure', props<{ error: string }>());

export const applyFilter = createAction('[Catalog] Apply Filter', props<{ filters: any }>());
export const resetFilters = createAction('[Catalog] Reset Filters');
