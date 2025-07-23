import type { CategoryDocType } from '../db/categories';

// Category is the document type from the schema
export type Category = CategoryDocType;

// Address is the type of an element in the addresses array of Category
export type Address = Category['addresses'][number];