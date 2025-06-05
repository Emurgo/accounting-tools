import BigNumber from 'bignumber.js';
import { Connection, PublicKey } from '@solana/web3.js';

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

export const apis: API[] = [
    {
        name: 'BTC',
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
        getPriceUSD: async () => {
            // Using CoinGecko public API for price
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch BTC price');
            const data = await res.json();
            return data?.bitcoin?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'API3',
        getBalance: async (address: string) => {
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
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=api3&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch API3 price');
            const data = await res.json();
            return data?.api3?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'ETH',
        getBalance: async (address: string) => {
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
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch ETH price');
            const data = await res.json();
            return data?.ethereum?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'SOL',
        getBalance: async (address: string) => {
            // Use @solana/web3.js to get SOL balance
            const connection = new Connection(SOLANA_RPC_URL);
            const pubkey = new PublicKey(address);
            const lamports = await connection.getBalance(pubkey);
            // Convert lamports to SOL (1 SOL = 1e9 lamports)
            return new BigNumber(lamports).dividedBy(1e9).toString(10);
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch SOL price');
            const data = await res.json();
            return data?.solana?.usd?.toString() ?? '0';
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
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch SUI price');
            const data = await res.json();
            return data?.sui?.usd?.toString() ?? '0';
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
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch XRP price');
            const data = await res.json();
            return data?.ripple?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'ADA',
        getBalance: async (address: string) => {
            // Using cardanoscan API for Cardano (ADA) balance
            // If address starts with "stake", treat as stake address and use stake key details endpoint
            const isStakeAddress = address.startsWith('stake');
            let lovelace = '0';

            if (isStakeAddress) {
                // Convert bech32 stake address to hex for Cardanoscan API
                const bech32 = await import('bech32');
                const { words } = bech32.decode(address);
                const hex = Buffer.from(bech32.fromWords(words)).toString('hex');

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

            // The balance is in lovelace, convert to ADA (1 ADA = 1e6 lovelace)
            if (!lovelace) return '0';
            return new BigNumber(lovelace).dividedBy(1e6).toString(10);
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch ADA price');
            const data = await res.json();
            return data?.cardano?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'stETH',
        getBalance: async (address: string) => {
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
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=staked-ether&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch stETH price');
            const data = await res.json();
            return data?.['staked-ether']?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'USDT',
        getBalance: async (address: string) => {
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
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch USDT price');
            const data = await res.json();
            return data?.tether?.usd?.toString() ?? '0';
        }
    },
    {
        name: 'USDC',
        getBalance: async (address: string) => {
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
        },
        getPriceUSD: async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd');
            if (!res.ok) throw new Error('Failed to fetch USDC price');
            const data = await res.json();
            return data?.['usd-coin']?.usd?.toString() ?? '0';
        }
    },
];
