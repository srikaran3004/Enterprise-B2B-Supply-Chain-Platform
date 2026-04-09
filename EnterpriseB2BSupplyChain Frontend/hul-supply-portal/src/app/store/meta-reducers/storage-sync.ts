import { ActionReducer, INIT, UPDATE } from '@ngrx/store';

const CART_STORAGE_KEY = 'hul_cart_state';
const CART_EXPIRY_DAYS = 7;

export function storageSyncMetaReducer(reducer: ActionReducer<any>): ActionReducer<any> {
    return (state, action) => {
        // Hydrate cart from localStorage on app init
        if (action.type === INIT || action.type === UPDATE) {
            const storedCart = loadCartFromStorage();
            if (storedCart) {
                state = {
                    ...state,
                    cart: storedCart
                };
            }
        }

        // Run the actual reducer
        const nextState = reducer(state, action);

        // Save cart to localStorage after every cart action
        if (nextState?.cart && action.type.startsWith('[Cart]')) {
            saveCartToStorage(nextState.cart);
        }

        return nextState;
    };
}

function loadCartFromStorage(): any | null {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // Check if cart has expired
        if (parsed.timestamp) {
            const expiryTime = parsed.timestamp + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            if (Date.now() > expiryTime) {
                localStorage.removeItem(CART_STORAGE_KEY);
                return null;
            }
        }

        return parsed.cart;
    } catch (error) {
        console.warn('Failed to load cart from localStorage:', error);
        return null;
    }
}

function saveCartToStorage(cart: any): void {
    try {
        const dataToStore = {
            cart,
            timestamp: Date.now()
        };
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
        console.warn('Failed to save cart to localStorage:', error);
    }
}
