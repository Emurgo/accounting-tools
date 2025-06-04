import { apis } from './fetch';
import type { Category } from '../types';

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

/**
 * Fetch balances for all addresses in each category.
 * Adds a 'balance' property to each address object and a 'price' property to the category.
 */
export async function fetchBalancesForCategories(categories: Category[]): Promise<CategoryWithBalances[]> {
    const apiMap = Object.fromEntries(apis.map(api => [api.name, api]));

    return Promise.all(
        categories.map(async (category) => {
            const api = apiMap[category.name];
            if (!api) throw new Error(`No API found for category: ${category.name}`);

            const [price, addressesWithBalances] = await Promise.all([
                api.getPriceUSD(),
                Promise.all(
                    category.addresses.map(async (addr) => {
                        const balance = await api.getBalance(addr.address);
                        return { ...addr, balance };
                    })
                )
            ]);
            return { ...category, addresses: addressesWithBalances, price };
        })
    );
}