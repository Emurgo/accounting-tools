import BigNumber from 'bignumber.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { bech32 } from 'bech32';
import BIP32Factory from 'bip32';
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';
import Buffer from 'buffer';
window.Buffer = Buffer;
//import bitcoin from 'bitcoinjs-lib';
import PromiseThrottle from 'promise-throttle';

interface API {
    name: string;
    getBalance: (address: string) => Promise<string>;
    getPriceUSD: () => Promise<string>;
}

const CRYPTOAPIS_KEY = '5b8f18e02dbe444b4f86fccf2235549ec014cf82';
const ETHERSCAN_KEY = '7W73YR7MHZZ9IVGRAG1UZPRPP7Q9AJVDA3';
// https://solana.com/rpc
const SOLANA_RPC_URL = 'https://white-neat-orb.solana-mainnet.quiknode.pro/01d191873234b69fde495a500fde3f65109aca8a/';
const CARDANOSCAN_KEY = '18c8265c-845b-4a8d-9ebe-b92a734edc7a';

const priceCache: Record<string, { value: string, timestamp: number }> = {};
const PRICE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes in ms

const COINGECKO_API_KEY = 'CG-qbbFhoNq7zgASQaYgchMRYnF';

// Throttle ADA balance requests to avoid rate limits (max 1 request per second)
const adaBalanceThrottle = new PromiseThrottle({
    requestsPerSecond: 1,
    promiseImplementation: Promise
});

const etherscanThrottle = new PromiseThrottle({
    requestsPerSecond: 1,
    promiseImplementation: Promise
});

// Helper to cache getPriceUSD results by api name
async function getCachedPriceUSD(apiName: string, fetchPrice: () => Promise<string>): Promise<string> {
    const now = Date.now();
    const cached = priceCache[apiName];
    if (cached && now - cached.timestamp < PRICE_CACHE_TTL) {
        return cached.value;
    }
    const value = await fetchPrice();
    priceCache[apiName] = { value, timestamp: now };
    return value;
}

// Helper to get price from CoinGecko Pro API
async function getCoinGeckoProPrice(id: string): Promise<string> {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const res = await fetch(url, {
        headers: {
            'x-cg-demo-api-key': COINGECKO_API_KEY
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${id} price from CoinGecko Pro`);
    const data = await res.json();
    return data?.[id]?.usd?.toString() ?? '0';
}

export const apis: API[] = [
    {
        name: 'BTC',
        /*
        getBalance: async (address: string) => {
            // Use blockchain.com API to get BTC balance (in satoshis)
            const url = `https://blockchain.info/rawaddr/${address}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch BTC balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in satoshis, convert to BTC using BigNumber
            const satoshis = data?.final_balance;
            if (typeof satoshis !== 'number') return '0';
            return new BigNumber(satoshis).dividedBy(1e8).toString(10);
        },
        */
    getBalance: async (address: string) => {
        // Use Blockstream API to get BTC balance (in satoshis)
        const url = `https://blockstream.info/api/address/${address}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch BTC balance: ${res.statusText}`);
        }
        const data = await res.json();
        // The confirmed balance is in data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum
        const funded = data.chain_stats?.funded_txo_sum ?? 0;
        const spent = data.chain_stats?.spent_txo_sum ?? 0;
        const satoshis = funded - spent;
        // Convert satoshis to BTC
        return new BigNumber(satoshis).dividedBy(1e8).toString(10);
    },
        getPriceUSD: async () => {
            return getCachedPriceUSD('BTC', async () => getCoinGeckoProPrice('bitcoin'));
        }
    },
    {
        name: 'API3',
        getBalance: async (address: string) => {
          return etherscanThrottle.add(async () => {
            // API3 contract address (mainnet)
            const contractAddress = '0x0b38210ea11411557c13457d4da7dc6ea731b88a';
            const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch API3 balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in wei (18 decimals)
            const wei = data?.result;
            if (!wei) return '0';
            return new BigNumber(wei).dividedBy(1e18).toString(10);
          })
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('API3', async () => getCoinGeckoProPrice('api3'));
        }
    },
    {
        name: 'ETH',
        getBalance: async (address: string) => {
          return etherscanThrottle.add(async () => {
            const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch ETH balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in wei (18 decimals)
            const wei = data?.result;
            if (!wei) return '0';
            return new BigNumber(wei).dividedBy(1e18).toString(10);
          })
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('ETH', async () => getCoinGeckoProPrice('ethereum'));
        }
    },
    {
        name: 'SOL',
        getBalance: async (address: string) => {
            // Use @solana/web3.js to get SOL balance and stake
            const connection = new Connection(SOLANA_RPC_URL);

            // Get main account balance (lamports)
            const pubkey = new PublicKey(address);
            const balanceLamports = await connection.getBalance(pubkey);

            // Get stake accounts for this address
            const stakeAccounts = await connection.getParsedProgramAccounts(
                // Stake program id
                new PublicKey('Stake11111111111111111111111111111111111111'),
                {
                    filters: [
                        {
                            memcmp: {
                                offset: 12, // Stake account's authorized staker is at offset 12
                                bytes: address
                            }
                        }
                    ]
                }
            );

            // Sum up all stake account balances (lamports)
            const stakeLamports = stakeAccounts.reduce((sum, acc) => sum + (Number(acc.account.data.parsed.info.stake.delegation.stake) || 0), 0);

            // Total lamports = balance + stake
            const totalLamports = balanceLamports + stakeLamports;

            // Convert lamports to SOL (1 SOL = 1e9 lamports)
            return new BigNumber(totalLamports).dividedBy(1e9).toString(10);
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('SOL', async () => getCoinGeckoProPrice('solana'));
        }
    },
    {
        name: 'SUI',
        getBalance: async (address: string) => {
            // Use Sui JSON-RPC API to get SUI balance
            const url = 'https://fullnode.mainnet.sui.io:443';
            const body = {
                jsonrpc: '2.0',
                id: 1,
                method: 'suix_getAllBalances',
                params: [address]
            };
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch SUI balance: ${res.statusText}`);
            }
            const data = await res.json();
            // Find the SUI coin balance (coinType === '0x2::sui::SUI')
            const suiBalance = data?.result?.find((b: any) => b.coinType === '0x2::sui::SUI');
            const amount = suiBalance?.totalBalance;
            if (!amount) return '0';
            // SUI uses 9 decimals
            return new BigNumber(amount).dividedBy(1e9).toString(10);
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('SUI', async () => getCoinGeckoProPrice('sui'));
        }
    },
    {
        name: 'XRP',
        getBalance: async (address: string) => {
            // Using xrpscan API for XRP balance
            const url = `https://api.xrpscan.com/api/v1/account/${address}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch XRP balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in drops, convert to XRP (1 XRP = 1e6 drops)
            const drops = data?.Balance;
            if (!drops) return '0';
            return new BigNumber(drops).dividedBy(1e6).toString(10);
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('XRP', async () => getCoinGeckoProPrice('ripple'));
        }
    },
    {
        name: 'ADA',
        getBalance: async (address: string) => {
            return adaBalanceThrottle.add(async () => {
                // Using cardanoscan API for Cardano (ADA) balance
                const isStakeAddress = address.startsWith('stake');
                let lovelace = '0';

                if (isStakeAddress) {
                // Convert bech32 stake address to hex for Cardanoscan API
                const { words } = bech32.decode(address);
                const hex = arrayToHexString(bech32.fromWords(words));

                const url = `https://api.cardanoscan.io/api/v1/rewardAccount?rewardAddress=${hex}`;
                    const res = await fetch(url, {
                        headers: {
                            'apiKey': CARDANOSCAN_KEY
                        }
                    });
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ADA stake balance: ${res.statusText}`);
                    }
                    const data = await res.json();
                    // Sum stake and rewardsAvailable (both in lovelace)
                    const stake = new BigNumber(data?.stake ?? '0');
                    const rewards = new BigNumber(data?.rewardsAvailable ?? '0');
                    lovelace = stake.plus(rewards).toString(10);
                } else {
                    // Get regular address balance
                    const url = `https://api.cardanoscan.io/api/v1/address/balance?address=${address}`;
                    const res = await fetch(url, {
                        headers: {
                            'apiKey': CARDANOSCAN_KEY
                        }
                    });
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ADA balance: ${res.statusText}`);
                    }
                    const data = await res.json();
                    lovelace = data?.balance ?? '0';
                }

                if (!lovelace) return '0';
                return new BigNumber(lovelace).dividedBy(1e6).toString(10);
            });
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('ADA', async () => getCoinGeckoProPrice('cardano'));
        }
    },
    {
        name: 'stETH',
        getBalance: async (address: string) => {
          return etherscanThrottle.add(async () => {
            // stETH contract address (mainnet)
            const contractAddress = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
            const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch stETH balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in wei (18 decimals)
            const wei = data?.result;
            if (!wei) return '0';
            return new BigNumber(wei).dividedBy(1e18).toString(10);
          })
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('stETH', async () => getCoinGeckoProPrice('staked-ether'));
        }
    },
    {
        name: 'USDT',
        getBalance: async (address: string) => {
          return etherscanThrottle.add(async () => {
            // USDT (Tether) ERC20 contract address (mainnet)
            const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
            const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch USDT balance: ${res.statusText}`);
            }
            const data = await res.json();
            // USDT uses 6 decimals
            const raw = data?.result;
            if (!raw) return '0';
            return new BigNumber(raw).dividedBy(1e6).toString(10);
          })
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('USDT', async () => getCoinGeckoProPrice('tether'));
        }
    },
    {
        name: 'USDC',
        getBalance: async (address: string) => {
          return etherscanThrottle.add(async () => {
            // USDC (USD Coin) ERC20 contract address (mainnet)
            const contractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
            const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch USDC balance: ${res.statusText}`);
            }
            const data = await res.json();
            // USDC uses 6 decimals
            const raw = data?.result;
            if (!raw) return '0';
            return new BigNumber(raw).dividedBy(1e6).toString(10);
          })
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('USDC', async () => getCoinGeckoProPrice('usd-coin'));
        }
    },
    // placeholder so that the user can add copper wallets
    {
        name: 'copper',
        getBalance: async (address: string) => {
            throw new Error('Copper wallet balance is fetched via a separate API endpoint');
        },
        getPriceUSD: async () => {
            throw new Error('Copper wallet does not have a price, it is a wallet service');
        },
    },
    {
      name: 'Ledger wallet BTC',
      getBalance: async (xpub: string) => {
        const bitcoin = require('bitcoinjs-lib');
        const bip32 = BIP32Factory(ecc);
        const node = bip32.fromBase58(xpub);
        
        let total = new BigNumber('0');
        let holeSize = 0;
        for (let i = 0; i < 100; i++) {
          const child = node.derivePath(`0/${i}`);
          /*
            // blockstream does not support bech32 btc address
          const publicKeyHash160 = bitcoin.crypto.hash160(Buffer.from(child.publicKey));
          const words = bech32.toWords(publicKeyHash160);
          words.unshift(0x00);
          const address = bech32.encode('bc', words);
          */
          // blockstream only support base58 adddress
          const network = bitcoin.networks.bitcoin;

          const { address } = bitcoin.payments.p2pkh({
            pubkey: Buffer.from(child.publicKey), //https://github.com/bitcoinjs/bitcoinjs-lib/issues/2209
            network: network,
          });

          const url = `https://blockstream.info/api/address/${address}`;
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Failed to fetch BTC balance: ${res.statusText}`);
          }
          const data = await res.json();

          if (data.chain_stats.funded_txo_count === 0) {
            holeSize += 1;
            if (holeSize === 1) {
              break;
            }
          } else {
            holeSize = 0;
          }
          total = total.plus(data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
        }
        return total.toString();
      },
      getPriceUSD: async () => {
        return await apis.find(({ name }) => name === 'BTC').getPriceUSD();
      },
    },
    {
        name: 'CTRL',
        getBalance: async (address: string) => {
            return etherscanThrottle.add(async () => {
                // CTRL (ERC20) contract address (mainnet)
                const contractAddress = '0xe50E009Ddb1A4d8Ec668EAc9D8b2dF1F96348707'; // Replace with actual CTRL contract address if different
                const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Failed to fetch CTRL balance: ${res.statusText}`);
                }
                const data = await res.json();
                // CTRL uses 18 decimals (most ERC20 tokens)
                const raw = data?.result;
                if (!raw) return '0';
                return new BigNumber(raw).dividedBy(1e18).toString(10);
            });
        },
        getPriceUSD: async () => {
            return getCachedPriceUSD('CTRL', async () => getCoinGeckoProPrice('ctrl-wallet'));
        }
    },
];

// I can't believe I have to write this utility function, but here we are.
function arrayToHexString(arr: number[]): string {
  return arr.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

interface CopperWalletData {
  walletId: string,
  portfolioId: string,
  currency: 'ADA'|'API3'|'BTC'|'DOT'|'ETH'|'ETHW'|'SOL'|'STETH'|'SUI'|'USD'|'USDC'|'USDT'|'XRP' /*|  ... */, 
  //mainCurrency: string,
  //balance: string,
  //stakeBalance: string,
  totalBalance: string,
  /*
  "rebateBalance": "0",
  "sharedRewardBalance": "0",
  "reserve": "0.000000",
  "locked": "0",
  "available": "0.290000",
  "secured": "0",
  "createdAt": "1624416439812",
  "createdBy": "10e33f41-930d-4bca-ab9c-5d2575914179",
  "updatedAt": "1678700371945",
  "extra": {},
  "accountId": "8527ba9c-ea75-4969-81c0-303951872602",
  "organizationId": "EMUR",
  "portfolioType": "trading",
  "_embedded": {
    "depositTargets": [
      {
        "targetType": "crypto",
        "depositTargetId": "suSb8IOCYtdZf2sf1YeV0YNp-ETH-ETH",
        "mainCurrency": "ETH",
        "address": "0xb7e4234faea27d3d00eb7d6bb22b0ccfaf328bec",
        "status": "enabled"
      }
    ],
    "pendingDepositTargets": []
  },
  */
}

export async function fetchCopperWalletData(): Promise<CopperWalletData[]> {
  const resp = await fetch('/copperWalletDataProxy')
  return resp.json()
}
