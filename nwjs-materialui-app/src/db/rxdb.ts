import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { Category } from '../types';

const categorySchema = {
    title: 'category schema',
    version: 0,
    description: 'describes a category',
    type: 'object',
    properties: {
        name: { type: 'string', maxLength: 50},
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
    primaryKey: 'name',
    required: ['name', 'addresses']
};

let dbPromise: Promise<any> | null = null;

export const getDb = async () => {
    if (!dbPromise) {
        dbPromise = createRxDatabase({
            name: 'assetsdb',
            storage: getRxStorageLocalstorage(),
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