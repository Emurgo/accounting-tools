import { apis, fetchAndStoreCopperWallets } from './fetch';
import type { Category } from '../types';
import PromiseThrottle from 'promise-throttle';

export const CATEGORIES = apis.map(api => api.name);

export { apis };

/**
 * CategoryWithBalances: Category with each address having a balance property.
 */
export type AddressWithBalance = Category['addresses'][number] & { balance: string };
export type CategoryWithBalances = Omit<Category, 'addresses'> & { 
    addresses: AddressWithBalance[];
    price: string; // USD price of the coin
};

// Throttle for price requests: 1 per second
const priceThrottle = new PromiseThrottle({
    requestsPerSecond: 0.1,
    promiseImplementation: Promise
});

/**
 * Fetch balances for all addresses in each category.
 * Adds a 'balance' property to each address object and a 'price' property to the category.
 */
export async function fetchBalancesForCategories(categories: Category[]): Promise<CategoryWithBalances[]> {
    const apiMap = Object.fromEntries(apis.map(api => [api.name, api]));
  
    if (CATEGORIES.includes('copper')) {
      await fetchAndStoreCopperWallets()
    }

    return Promise.all(
        categories.map(async (category) => {
            const api = apiMap[category.name];
            if (!api) throw new Error(`No API found for category: ${category.name}`);

            // Throttle price fetch
            const pricePromise = priceThrottle.add(api.getPriceUSD);

            const addressesWithBalances = await Promise.all(
                category.addresses.map(async (addr) => {
                    const balance = await api.getBalance(addr.address);
                    return { ...addr, balance };
                })
            );
            const price = await pricePromise;
            return { ...category, addresses: addressesWithBalances, price };
        })
    );
}
