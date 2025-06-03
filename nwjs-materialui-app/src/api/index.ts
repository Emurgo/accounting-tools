import BigNumber from 'bignumber.js';

interface API {
    name: string;
    getBalance: (address: string) => Promise<string>;
}

const CRYPTOAPIS_KEY = '5b8f18e02dbe444b4f86fccf2235549ec014cf82'; // Replace with your actual API key
const ETHERSCAN_KEY = '7W73YR7MHZZ9IVGRAG1UZPRPP7Q9AJVDA3';   // Replace with your actual Etherscan API key

export const apis: API[] = [
    {
        name: 'BTC',
        getBalance: async (address: string) => {
            const url = `https://rest.cryptoapis.io/blockchain-data/bitcoin/mainnet/addresses/${address}/balance`;
            const res = await fetch(url, {
                headers: {
                    'X-API-Key': CRYPTOAPIS_KEY,
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch BTC balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in satoshis, convert to BTC using BigNumber
            const satoshis = data?.data?.item?.confirmedBalance?.amount;
            if (!satoshis) return '0';
            return new BigNumber(satoshis).dividedBy(1e8).toString(10);
        },
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
    },
    {
        name: 'SOL',
        getBalance: async (address: string) => {
            // Using CryptoAPIs for Solana balance
            const url = `https://rest.cryptoapis.io/blockchain-data/solana/mainnet/addresses/${address}/balance`;
            const res = await fetch(url, {
                headers: {
                    'X-API-Key': CRYPTOAPIS_KEY,
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch SOL balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in lamports, convert to SOL (1 SOL = 1e9 lamports)
            const lamports = data?.data?.item?.confirmedBalance?.amount;
            if (!lamports) return '0';
            return new BigNumber(lamports).dividedBy(1e9).toString(10);
        },
    },
    {
        name: 'SUI',
        getBalance: async (address: string) => {
            // Using CryptoAPIs for Sui balance
            const url = `https://rest.cryptoapis.io/blockchain-data/sui/mainnet/addresses/${address}/balance`;
            const res = await fetch(url, {
                headers: {
                    'X-API-Key': CRYPTOAPIS_KEY,
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch SUI balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in MIST, convert to SUI (1 SUI = 1e9 MIST)
            const mist = data?.data?.item?.confirmedBalance?.amount;
            if (!mist) return '0';
            return new BigNumber(mist).dividedBy(1e9).toString(10);
        },
    },
    {
        name: 'XRP',
        getBalance: async (address: string) => {
            // Using CryptoAPIs for XRP balance
            const url = `https://rest.cryptoapis.io/blockchain-data/xrp-slice/mainnet/addresses/${address}/balance`;
            const res = await fetch(url, {
                headers: {
                    'X-API-Key': CRYPTOAPIS_KEY,
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch XRP balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in drops, convert to XRP (1 XRP = 1e6 drops)
            const drops = data?.data?.item?.confirmedBalance?.amount;
            if (!drops) return '0';
            return new BigNumber(drops).dividedBy(1e6).toString(10);
        },
    },
    {
        name: 'ADA',
        getBalance: async (address: string) => {
            // Using CryptoAPIs for Cardano (ADA) balance
            const url = `https://rest.cryptoapis.io/blockchain-data/cardano/mainnet/addresses/${address}/balance`;
            const res = await fetch(url, {
                headers: {
                    'X-API-Key': CRYPTOAPIS_KEY,
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch ADA balance: ${res.statusText}`);
            }
            const data = await res.json();
            // The balance is in lovelace, convert to ADA (1 ADA = 1e6 lovelace)
            const lovelace = data?.data?.item?.confirmedBalance?.amount;
            if (!lovelace) return '0';
            return new BigNumber(lovelace).dividedBy(1e6).toString(10);
        },
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
    },
];