import BigNumber from 'bignumber.js';
import { asyncItersMergeSort } from 'async-iters-merge-sort'
import { CARDANO_API_KEY } from './keys'

async function get(endpoint, query) {
  let search = query ? (new URLSearchParams(query)).toString() : ''
  if (search) {
    search = '?' + search
  }

  const queryString = `https://cardano-mainnet.blockfrost.io/api/v0/${endpoint}${search}`

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
  return data
}

async function* getPaged(endpoint: string, query: void | Record<string, string | number>, page: boolean | number = false): unknown {
  const pageSize = (typeof page === 'number') ? page : page ? 100 : 0
  for (let i = 1; i <=21474836; i++) {
    const q = {...query}
    if (pageSize) {
      q.count = pageSize
      q.page = i
    }
    const data = await get(endpoint, q)
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

async function* getAddressesOfAccount(stakeKey: string): AsyncIteractor<string> {
  const resp = getPaged(`accounts/${stakeKey}/addresses`, {}, true)
  for await (const a of resp) {
    yield a.address
  }
}

async function* getTransactionIdsOfAddress(address: string): AsyncIteractor<string> {
  for await (const tx of  getPaged(`addresses/${address}/transactions`, { order: 'desc' }, true)) {
    yield { txHash: tx.tx_hash, blockTime: tx.block_time }
  }
}

async function* getTransactionsOfAccount(stakeKey: string) {
  const addrs  = await Array.fromAsync(getAddressesOfAccount(stakeKey))
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

export async function getTransactionHistory(stakeAddress: string): {
  txHash: string,
  date: string,
  amount: string,
  fee: string,
  net: string,
  balance: string,
  price: string,
  netUsd: string,
  feeUsd: string,
} {
  const rows = await Array.fromAsync(getTransactionsOfAccount(stakeAddress))
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

if (require.main === module) {
  const  NodeFetchCache = require('node-fetch-cache');
  
  const fetch = NodeFetchCache.create({
    cache: new NodeFetchCache.FileSystemCache({
      cacheDirectory: '/tmp/node-fetch-cache'
    }),
  });

  global.fetch = fetch
  /*
  const addrs = await Array.fromAsync(getAddressesOfAccount('stake1ux8yprhfev3g9el7tz5n8xkl307qqmck4mzn9wlr4ps5m7qjqz8v7'))
  console.log(addrs)
  */
  /*
  const txs = await Array.fromAsync(getTransactionIdsOfAddress('addr1q8z532y9kgmjkkwu9lhfqnlpehksnk4gx6yzqpv2ss487p5wgz8wnjezstnluk9fxwddlzluqph3dtk9x2a782rpfhuqtcc4sn'))
  console.log(txs)
  */
  for (const row of await getTransactionHistory('stake1u9scmlnt6pvy9gsvm6fjfep5p8fez0wfpydlw3zmfmm2x4ckwmqhd')) {
    console.log('%s', [row.txHash, row.date, row.amount, row.fee, row.net, row.balance, row.price, row.netUsd, row.feeUsd].join('\t'))
  }
}
