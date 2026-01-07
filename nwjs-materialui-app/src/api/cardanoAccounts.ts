import BigNumber from 'bignumber.js';
import { asyncItersMergeSort } from 'async-iters-merge-sort'
import { CARDANO_API_KEY } from '../../secrets';

const DB_NAME = 'BlockfrostCache';
const STORE_NAME = 'responses';
const adaPriceCache: Record<string, string> = {};

type AmountEntry = { unit: string; quantity: string };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let enableIndexedDbCache = true;

async function getFromCache(url: string): Promise<any | null> {
  if (!enableIndexedDbCache) {
    return null;
  }
  const db = await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function setInCache(url: string, data: any): Promise<void> {
  if (!enableIndexedDbCache) {
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, url);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function get(endpoint: string, query: void | Record<string, string>, options?: { noCache?: boolean }) {
  let search = query ? (new URLSearchParams(query)).toString() : ''
  if (search) {
    search = '?' + search
  }

  const queryString = `https://cardano-mainnet.blockfrost.io/api/v0/${endpoint}${search}`
  // Check cache first
  if (!options?.noCache) {
    const cached = await getFromCache(queryString);
    if (cached !== null) {
      return cached;
    }
  }
  //console.error(`requesting ${queryString} ...`)
  const resp = await fetch(
    queryString,
    {
      headers: {
        'Project_id': CARDANO_API_KEY,
      }
    }
  )
  if (!resp.ok) {
    throw new Error(`error when querying ${queryString}`)
  }
  const data = await resp.json()

  if (!options?.noCache) {
    // Cache the response
    await setInCache(queryString, data);
  }
  return data
}

async function* getPaged(endpoint: string, query: void | Record<string, string>, page: boolean | number = false, options?: { noCache?: boolean }): AsyncIterable<unknown> {
  const pageSize = (typeof page === 'number') ? page : page ? 100 : 0
  for (let i = 1; i <=21474836; i++) {
    const q: Record<string, string> = {...query}
    if (pageSize) {
      q.count = String(pageSize)
      q.page = String(i)
    }
    const data = await get(endpoint, q, options)
    yield* data
    if (pageSize) {
      if (!Array.isArray(data)) {
        throw new Error(`return value of query is not array`)
      }
      if (data.length < pageSize) {
        break;
      }
    } else {
      break;
    }
  }
}

async function* getAddressesOfAccount(stakeKey: string): AsyncIterable<string> {
  const resp = getPaged(`accounts/${stakeKey}/addresses`, {}, true, { noCache: true })
  for await (const a of resp) {
    yield a.address
  }
}

function getDayKey(date: Date): string {
  return date.toLocaleDateString('en-SG');
}

function getLovelaceAmount(amounts: AmountEntry[] | undefined): BigNumber {
  const lovelace = amounts?.find((amount) => amount.unit === 'lovelace')?.quantity ?? '0';
  return new BigNumber(lovelace);
}

async function getWalletAddresses(stakeOrBaseAddress: string): Promise<string[]> {
  if (stakeOrBaseAddress.startsWith('stake')) {
    return Array.fromAsync(getAddressesOfAccount(stakeOrBaseAddress));
  }
  if (stakeOrBaseAddress.startsWith('addr1')) {
    return [stakeOrBaseAddress];
  }
  throw new Error('unexpected address prefix');
}

async function getWalletBalanceLovelace(stakeOrBaseAddress: string): Promise<BigNumber> {
  if (stakeOrBaseAddress.startsWith('stake')) {
    const resp = await get(`accounts/${stakeOrBaseAddress}`, { noCache: true });
    return new BigNumber(resp.controlled_amount ?? '0');
  }
  if (stakeOrBaseAddress.startsWith('addr1')) {
    const resp = await get(`addresses/${stakeOrBaseAddress}`, { noCache: true });
    return getLovelaceAmount(resp.amount as AmountEntry[]);
  }
  throw new Error('unexpected address prefix');
}

async function* getTransactionIdsOfAddress(address: string): AsyncIterable<{txHash: string, blockTime: number}> {
  for await (const tx of  getPaged(`addresses/${address}/transactions`, { order: 'desc' }, true, { noCache: true })) {
    yield { txHash: tx.tx_hash, blockTime: tx.block_time }
  }
}

async function* getTransactions(stakeOrBaseAddress: string) {
  let addrs;
  if (stakeOrBaseAddress.startsWith('stake')) {
    addrs = await Array.fromAsync(getAddressesOfAccount(stakeOrBaseAddress));
  } else if (stakeOrBaseAddress.startsWith('addr1')) {
    addrs = [stakeOrBaseAddress];
  } else {
    throw new Error('unexpected address prefix');
  }

  const addrSet = new Set(addrs)
  const txs = asyncItersMergeSort(addrs.map(getTransactionIdsOfAddress), ({blockTime}) => -blockTime)

  function labelFunds (ios) {
    let internal = new BigNumber('0')
    let external = new BigNumber('0')
    ios.forEach(({ address, amount}) => {
      const ada = new BigNumber(
        amount.find(a => a.unit === 'lovelace')?.quantity ?? '0'
      )
      if (addrSet.has(address)) {
        internal = internal.plus(ada)
      } else {
        external = external.plus(ada)
      }
    })
    return [internal, external]
  }
  let prevTxHash
  for await (const { txHash, blockTime } of txs) {
    if (txHash === prevTxHash) {
      continue
    }
    prevTxHash = txHash

    const date = new Date(blockTime * 1000)
    const utxosResp = await get(`txs/${txHash}/utxos`)
    /*
    if (txHash === '5a5621b73053ddc4c7eb6721a833b74d58bb0a46af9d6473d834ded7fc9b20ff') {
      console.log(JSON.stringify(utxosResp, null, 2))
    }
    */
    const [fromWallet, fromExternal] = labelFunds(utxosResp.inputs)
    const [toWallet, toExternal] = labelFunds(utxosResp.outputs)
    const fee = fromWallet.plus(fromExternal).minus(toWallet).minus(toExternal)
    // accounting, don't ask why
    let amount
    let accountingFee

    if (toWallet.isGreaterThan(fromWallet)) {
      amount = toWallet.minus(fromWallet)
      accountingFee = new BigNumber('0')
    } else {
      amount = fromExternal.minus(toExternal)
      accountingFee = fee.negated()
    }

    const priceResp = await fetch(`https://api.yoroiwallet.com/api/price/ADA/${date.valueOf()}`)
    const priceRespContent = await priceResp.json()
    const price = priceRespContent.tickers[0].prices.USD

    const net = amount.plus(accountingFee)
    yield {
      amount,
      fee: accountingFee,
      date: date.toLocaleDateString('en-SG'),
      txHash,
      net,
      price,
      netUsd: net.multipliedBy(price),
      feeUsd: accountingFee.multipliedBy(price),
    }
  }
}

async function getAdaPriceUsd(date: Date): Promise<string> {
  const key = getDayKey(date);
  if (adaPriceCache[key]) {
    return adaPriceCache[key];
  }
  const priceResp = await fetch(`https://api.yoroiwallet.com/api/price/ADA/${date.valueOf()}`);
  if (!priceResp.ok) {
    throw new Error('error when querying ADA price');
  }
  const priceRespContent = await priceResp.json();
  const price = priceRespContent.tickers[0].prices.USD?.toString() ?? '0';
  adaPriceCache[key] = price;
  return price;
}

async function getCurrentAdaPriceUsd(): Promise<string> {
  const priceResp = await fetch(`https://api.yoroiwallet.com/api/price/ADA/current`);
  if (!priceResp.ok) {
    throw new Error('error when querying ADA price');
  }
  const priceRespContent = await priceResp.json();
  const price = priceRespContent.ticker.prices.USD?.toString() ?? '0';
  return price;
}

export async function getTransactionHistory(stakeOrBaseAddress: string): Promise<{
  txHash: string,
  date: string,
  amount: string,
  fee: string,
  net: string,
  balance: string,
  price: string,
  netUsd: string,
  feeUsd: string,
}[]> {
  const rows = await Array.fromAsync(getTransactions(stakeOrBaseAddress))
  rows.reverse()
  let balance = new BigNumber('0')
  for (const row of rows) {
    balance = balance.plus(row.net)
    row.balance = balance
    for (const key in row) {
      if (row[key] instanceof BigNumber) {
        row[key] = row[key].shiftedBy(-6).toString()
      }
    }
  }
  return rows
}

export async function* getCardanoAddressDailyReport(
  stakeOrBaseAddress: string,
): AsyncGenerator<{
  date: string,
  adaBalance: string,
  adaPriceUsd: string,
  usdBalance: string,
}> {
  const addrs = await getWalletAddresses(stakeOrBaseAddress);
  const addrSet = new Set(addrs);
  const currentBalance = new BigNumber(
    await getWalletBalanceLovelace(stakeOrBaseAddress)
  ).shiftedBy(-6);
  const today = new Date();

  const currentPrice = String(await getCurrentAdaPriceUsd());
  yield {
    date: today.toLocaleDateString('en-SG'),
    adaBalance: currentBalance.toString(),
    adaPriceUsd: currentPrice,
    usdBalance: currentBalance.multipliedBy(currentPrice).toString(),
  };

  const txs = asyncItersMergeSort(addrs.map(getTransactionIdsOfAddress), ({blockTime}) => -blockTime);
  let earliestTxBlockTime = 0;
  async function* txsIter() {
    let blockTime = Math.floor(Date.now() / 1000);
    for await (const tx of txs) {
      blockTime = tx.blockTime;
      yield tx;
    }
    earliestTxBlockTime = blockTime;
  }
  function* genDayBoundaries() {
    // start of today
    let i = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (;;) {
      const blockTime = Math.floor(i.valueOf() / 1000);
      if (blockTime < earliestTxBlockTime) {
        return;
      }
      yield { txHash: null, blockTime};
      i = new Date(i.valueOf() - 24*60*60*1000);
    }
  }
  const pointsInTime = asyncItersMergeSort([txsIter(), genDayBoundaries()], ({blockTime}) => -blockTime);

  let balance = currentBalance;

  for await (const { txHash, blockTime } of pointsInTime) {
    if (txHash === null) {
      // this is an inserted day boundary
      const adaPriceUsd = await getAdaPriceUsd(new Date(blockTime * 1000));
      yield {
        date: new Date(blockTime * 1000 - 1).toLocaleDateString('en-SG'),
        adaBalance: balance.toString(),
        adaPriceUsd,
        usdBalance: balance.multipliedBy(adaPriceUsd).toString(),
      }
    } else {
      // this is a tx
      const utxosResp = await get(`txs/${txHash}/utxos`);
      const filterInputs = inputs => inputs.filter(input => !input.collateral && !input.reference);
      const fromWallet = (filterInputs(utxosResp.inputs) as { address: string; amount: AmountEntry[] }[])
                           .reduce((sum, input) => {
                             if (!addrSet.has(input.address)) {
                               return sum;
                             }
                             return sum.plus(getLovelaceAmount(input.amount));
                           }, new BigNumber('0'));
      const filterOutputs = outputs => outputs.filter(input => !input.collateral);
      const toWallet = (filterOutputs(utxosResp.outputs) as { address: string; amount: AmountEntry[] }[])
                         .reduce((sum, output) => {
                           if (!addrSet.has(output.address)) {
                             return sum;
                           }
                           return sum.plus(getLovelaceAmount(output.amount));
                         }, new BigNumber('0'));
      balance = balance.plus(fromWallet.shiftedBy(-6)).minus(toWallet.shiftedBy(-6));
      //console.log('%s', JSON.stringify(utxosResp, null, 2));
      //console.log('tx', txHash, (new Date(blockTime*1000))*1000, 'from', fromWallet.toString(), 'to', toWallet.toString());
    }
  }
}

if (require.main === module) {
  const  NodeFetchCache = require('node-fetch-cache');
  
  const fetch = NodeFetchCache.create({
    cache: new NodeFetchCache.FileSystemCache({
      cacheDirectory: '/tmp/node-fetch-cache'
    }),
  });

  global.fetch = fetch
  enableIndexedDbCache = false;
  /*
  const addrs = await Array.fromAsync(getAddressesOfAccount('stake1ux8yprhfev3g9el7tz5n8xkl307qqmck4mzn9wlr4ps5m7qjqz8v7'))
  console.log(addrs)
  */
  /*
  const txs = await Array.fromAsync(getTransactionIdsOfAddress('addr1q8z532y9kgmjkkwu9lhfqnlpehksnk4gx6yzqpv2ss487p5wgz8wnjezstnluk9fxwddlzluqph3dtk9x2a782rpfhuqtcc4sn'))
  console.log(txs)
  */
  /*
  for (const row of await getTransactionHistory('stake1u9scmlnt6pvy9gsvm6fjfep5p8fez0wfpydlw3zmfmm2x4ckwmqhd')) {
    console.log('%s', [row.txHash, row.date, row.amount, row.fee, row.net, row.balance, row.price, row.netUsd, row.feeUsd].join('\t'))
  }
  */
  /*
  const price = await getAdaPriceUsd(new Date());
  console.log('price', price);
  */
  let i = 0;
  for await (const d of getCardanoAddressDailyReport('addr1qyx9dx3hhsrtt8p6m7ar076zl6pfj9lnudkplmd69g87yzrekjkpkn09av5l63z6kpr3akd0ueh84czwycjzwzvenweqv5tfu8')) {
    console.log(d);
    i++;
    if (i === 100) break;
  }
}
