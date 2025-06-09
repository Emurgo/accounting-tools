import { apis, fetchCopperWalletData } from './fetch';
import type { Category } from '../types';
import PromiseThrottle from 'promise-throttle';

export const CATEGORIES = apis.map(api => api.name);

export { apis };

/**
 * CategoryWithBalances: Category with each address having a balance property.
 */
export type AddressWithBalance = Category['addresses'][number] & {
    balance: string,
    price: string; // USD price of the coin
    currency: string;
};
export type CategoryWithBalances = Omit<Category, 'addresses'> & { 
    addresses: AddressWithBalance[];
};

// Throttle for price requests: 1 per second
const priceThrottle = new PromiseThrottle({
    requestsPerSecond: 0.45,
    promiseImplementation: Promise
});

/**
 * Fetch balances for all addresses in each category.
 * Adds a 'balance' property to each address object and a 'price' property to the category.
 */
export async function fetchBalancesForCategories(categories: Category[]): Promise<CategoryWithBalances[]> {
    const apiMap = Object.fromEntries(apis.map(api => [api.name, api]));

    let copperWalletData: Awaited<ReturnType<typeof fetchCopperWalletData>> = []
    if (categories.find(cat => cat.name === 'copper')) {
      copperWalletData = await fetchCopperWalletData()
    }

    return Promise.all(
        categories.map(async (category) => {
            if (category.name === 'copper') {
                const addressesWithBalances = await Promise.all(
                    category.addresses.map(async (addr) => {
                        const wallet = copperWalletData.find(wallet => wallet.walletId === addr.address)
                        let price = '0';
                        if (wallet?.currency === 'USD') {
                          price = '1'
                        } else {
                          // Try to find the corresponding API for the wallet's currency
                          const api = apis.find(api => api.name.toUpperCase() === wallet?.currency.toUpperCase());
                          if (api && api.name !== 'copper') {
                            price = await api.getPriceUSD();
                          }
                        }
                        return { ...addr, balance: wallet?.totalBalance ?? '0', currency: wallet?.currency ?? '0', price };
                    })
                );
                return { ...category, addresses: addressesWithBalances };
            } else {
                const api = apiMap[category.name];
                if (!api) throw new Error(`No API found for category: ${category.name}`);

                // Throttle price fetch
                const pricePromise = priceThrottle.add(api.getPriceUSD);

                const price = await pricePromise;
                const addressesWithBalances = await Promise.all(
                    category.addresses.map(async (addr) => {
                        const balance = await api.getBalance(addr.address);
                        return { ...addr, balance, price, currency: category.name };
                    })
                );
                return { ...category, addresses: addressesWithBalances };
            }
        })
    );
}
