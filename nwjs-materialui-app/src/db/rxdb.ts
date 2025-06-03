import { createRxDatabase, RxDatabase, RxCollection, RxJsonSchema, ExtractDocumentTypeFromTypedRxJsonSchema } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// Strongly-typed schema
const categorySchema = {
    title: 'category schema',
    version: 0,
    description: 'describes a category',
    type: 'object',
    properties: {
        name: { type: 'string', maxLength: 50 },
        addresses: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    address: { type: 'string' },
                    entity: { type: 'string', enum: ['EMG', 'EMC'] },
                    liquid: { type: 'boolean' }
                },
                required: ['address', 'entity', 'liquid']
            }
        }
    },
    primaryKey: 'name',
    required: ['name', 'addresses']
} as const;

export type CategoryDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof categorySchema>;

export interface CategoryCollection {
    categories: RxCollection<CategoryDocType>;
}

let dbPromise: Promise<RxDatabase<CategoryCollection>> | null = null;

export const getDb = async (): Promise<RxDatabase<CategoryCollection>> => {
    if (!dbPromise) {
        dbPromise = createRxDatabase<CategoryCollection>({
            name: 'assetsdb',
            storage: getRxStorageLocalstorage(),
        }).then(async db => {
            await db.addCollections({
                categories: {
                    schema: categorySchema as RxJsonSchema<CategoryDocType>
                }
            });
            return db;
        });
    }
    return dbPromise;
};