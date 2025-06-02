export interface Address {
    id: string;
    address: string;
}

export interface Category {
    name: 'BTC' | 'ETH' | 'ADA' | 'SUI';
    addresses: Address[];
}