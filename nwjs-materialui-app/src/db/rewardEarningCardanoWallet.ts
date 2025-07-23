import { RxJsonSchema } from 'rxdb';

export interface RewardEarningCardanoWallet {
    stakeAddress: string;
    annotation?: string;
}

export const rewardEarningCardanoWalletSchema: RxJsonSchema<RewardEarningCardanoWallet> = {
    title: 'rewardEarningCardanoWallet',
    description: 'Cardano stake addresses that earn rewards',
    version: 0,
    type: 'object',
    properties: {
        stakeAddress: {
            type: 'string',
            primary: true
        },
        annotation: {
            type: 'string'
        }
    },
    required: ['stakeAddress']
};

// Example usage to create the collection:
// db.collection({
//     name: 'rewardEarningCardanoWallet',
//     schema: rewardEarningCardanoWalletSchema
// });