import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageLocalStorage } from 'rxdb/plugins/storage-localstorage';
import { Category } from '../types';

const categorySchema = {
    title: 'category schema',
    version: 0,
    description: 'describes a category',
    type: 'object',
    properties: {
        name: { type: 'string', primary: true },
        addresses: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    address: { type: 'string' }
                }
            }
        }
    },
    required: ['name', 'addresses']
};

let dbPromise: Promise<any> | null = null;

export const getDb = async () => {
    if (!dbPromise) {
        dbPromise = createRxDatabase({
            name: 'assetsdb',
            storage: getRxStorageLocalStorage(),
            ignoreDuplicate: true,
        }).then(async db => {
            await db.addCollections({
                categories: {
                    schema: categorySchema
                }
            });
            return db;
        });
    }
    return dbPromise;
};