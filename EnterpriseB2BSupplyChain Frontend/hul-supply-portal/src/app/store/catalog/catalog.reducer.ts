import { createReducer, on } from '@ngrx/store';
import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as CatalogActions from './catalog.actions';

export interface CatalogState {
  categories: any[];
  products: any[];
  loading: boolean;
  filters: {
    categoryId: string | null;
    inStockOnly: boolean;
    searchTerm: string;
    brandFilter: string[];
    priceRange: { min: number; max: number } | null;
  };
  error: string | null;
}

export const initialState: CatalogState = {
  categories: [],
  products: [],
  loading: false,
  filters: {
    categoryId: null,
    inStockOnly: false,
    searchTerm: '',
    brandFilter: [],
    priceRange: null,
  },
  error: null,
};

export const catalogReducer = createReducer(
  initialState,
  on(CatalogActions.loadCategories, (state) => ({ ...state })),
  on(CatalogActions.loadCategoriesSuccess, (state, { categories }) => ({ ...state, categories })),
  on(CatalogActions.loadProducts, (state) => ({ ...state, loading: true, error: null })),
  on(CatalogActions.loadProductsSuccess, (state, { products }) => ({ ...state, products, loading: false })),
  on(CatalogActions.loadProductsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(CatalogActions.applyFilter, (state, { filters }) => ({
    ...state, filters: { ...state.filters, ...filters }
  })),
  on(CatalogActions.resetFilters, (state) => ({
    ...state, filters: initialState.filters
  })),
);

export const selectCatalogState = createFeatureSelector<CatalogState>('catalog');
export const selectCategories = createSelector(selectCatalogState, s => s.categories);
export const selectProducts = createSelector(selectCatalogState, s => s.products);
export const selectCatalogLoading = createSelector(selectCatalogState, s => s.loading);
export const selectFilters = createSelector(selectCatalogState, s => s.filters);
