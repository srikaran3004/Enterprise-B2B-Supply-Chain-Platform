import { createAction, props } from '@ngrx/store';
import { DecodedToken } from '../../core/models/user.model';

export const login = createAction('[Auth] Login', props<{ email: string; password: string }>());
export const loginSuccess = createAction('[Auth] Login Success', props<{ token: DecodedToken; accessToken: string; role: string; fullName: string }>());
export const loginFailure = createAction('[Auth] Login Failure', props<{ error: string }>());
export const logout = createAction('[Auth] Logout');
export const loadUserFromStorage = createAction('[Auth] Load User From Storage');
export const loadUserFromStorageSuccess = createAction('[Auth] Load User From Storage Success', props<{ token: DecodedToken }>());
