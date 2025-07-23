import { apis, fetchCopperWalletData } from './fetch';
import type { Category } from '../types';
import PromiseThrottle from 'promise-throttle';
import monthlyReportTemplateXlsxUrl from '../../secrets/monthly-report-template.xlsx'
import Excel from 'exceljs'
import fileDownload from 'js-file-download'
import BigNumber from 'bignumber.js'

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
    requestsPerSecond: 0.2,
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

const coinCol = 'F'
const addrCol = 'J'
const balanceCol = 'G'
const priceCol = 'H'
const valueCol = 'I'
const updateTsCol = 'A'

/* sheetjs does not preserve style
export async function generateMonthlyReport() {
  const file = await (await fetch(monthlyReportTemplateXlsxUrl)).arrayBuffer()
  const workbook = await XLSX.read(file)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const lastUpdateTsValue = (new Date()).toISOString()

  for (let row = 1; row < 100; row++) {
    function setValue(col, value) {
      sheet[`${col}${row}`] = { v: value, t: 'n' }
    }

    const coin = sheet[`${coinCol}${row}`]?.v
    const addr = sheet[`${addrCol}${row}`]?.v

    const api = apis.find(({ name }) => name === coin)
    if (!api) {
      continue
    }
    if (!(typeof addr === 'string' && /^\w+$/.test(addr))) {
      continue
    }

    try {
      const balance = '1'
      const price = '1'
      const value = '1'

      setValue(balanceCol, balance)
      setValue(priceCol, price)
      setValue(valueCol, value)
      setValue(updateTsCol, lastUpdateTsValue)
    } catch {
    }

    if (coin === undefined && addr === undefined) {
      break
    }
  }

  XLSX.writeFile(workbook, 'monthly-report.xlsx')
}
*/

export async function generateMonthlyReport() {
  const data = await (await fetch(monthlyReportTemplateXlsxUrl)).arrayBuffer()

  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0]

  const lastUpdateTsValue = (new Date()).toISOString()

  for (let row = 1; row < 100; row++) {
    const getCell = (col: string) => {
      const cell = sheet.getRow(row).getCell(col)
      return cell
    }
    const coin = getCell(coinCol)?.value
    const addr = getCell(addrCol)?.value

    const api = apis.find(({ name }) => name === coin)
    if (!api) {
      continue
    }
    if (!(typeof addr === 'string' && /^\w+$/.test(addr))) {
      continue
    }


    const balance = await api.getBalance(addr)
    const price = await priceThrottle.add(api.getPriceUSD)
    const value = (new BigNumber(balance)).multipliedBy(price).toString()

    getCell(balanceCol).value = balance
    getCell(priceCol).value = price
    getCell(valueCol).value = value
    getCell(updateTsCol).value = lastUpdateTsValue


    if (coin === null && addr === null) {
      break
    }
  }

  fileDownload(await workbook.xlsx.writeBuffer(),'monthly-report.xlsx')
}
