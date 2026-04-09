import { createReducer, on } from '@ngrx/store';
import { DecodedToken } from '../../core/models/user.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: DecodedToken | null;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.loginSuccess, (state, { token }) => ({ ...state, user: token, loading: false, error: null })),
  on(AuthActions.loginFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(AuthActions.logout, () => initialState),
  on(AuthActions.loadUserFromStorageSuccess, (state, { token }) => ({ ...state, user: token })),
);
