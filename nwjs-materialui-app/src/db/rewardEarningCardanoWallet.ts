import { createRxDatabase, RxDatabase, RxCollection, RxJsonSchema } from 'rxdb';
import { getDb as getCategoriesDb } from './categories';

export interface RewardEarningCardanoWallet {
    stakeAddress: string;
    annotation?: string;
}

export const rewardEarningCardanoWalletSchema: RxJsonSchema<RewardEarningCardanoWallet> = {
    title: 'rewardEarningCardanoWallet',
    description: 'Cardano stake addresses that earn rewards',
    version: 0,
    type: 'object',
    primaryKey: 'stakeAddress',
    properties: {
        stakeAddress: {
            type: 'string'
        },
        annotation: {
            type: 'string'
        }
    },
    required: ['stakeAddress']
};

type Collections = {
    rewardEarningCardanoWallet?: RxCollection<RewardEarningCardanoWallet>;
    [key: string]: RxCollection<any> | undefined;
};

let dbPromise: Promise<RxDatabase<Collections>> | null = null;

export async function getDb(): Promise<RxCollection<RewardEarningCardanoWallet>> {
    if (!dbPromise) {
        dbPromise = getCategoriesDb() as unknown as Promise<RxDatabase<Collections>>; // Reuse the same RxDB instance as categories
    }
    const db = await dbPromise;
    if (!db.collections.rewardEarningCardanoWallet) {
        await db.addCollections({
            rewardEarningCardanoWallet: {
                schema: rewardEarningCardanoWalletSchema
            }
        });
    }
    return db.collections.rewardEarningCardanoWallet!;
}

export async function getAll(): Promise<RewardEarningCardanoWallet[]> {
    const collection = await getDb();
    return collection.find().exec();
}

// Example usage to create the collection:
// db.collection({
//     name: 'rewardEarningCardanoWallet',
//     schema: rewardEarningCardanoWalletSchema
// });