import React, { useEffect, useState } from 'react';
import { Button, TextField, List, MenuItem } from '@mui/material';
import { getDb } from '../db/rxdb';
import { Category } from '../types';
import CategoryItem from './CategoryItem';
import { apis } from '../api';

const CATEGORIES = apis.map(api => api.name);

const AssetManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState<string>(CATEGORIES[0] || '');

    useEffect(() => {
        let sub: any;
        getDb().then(db => {
            sub = db.categories.find().$.subscribe((docs: any) => {
                setCategories(docs ? docs.map((doc: any) => doc.toJSON()) : []);
            });
        });
        return () => sub && sub.unsubscribe();
    }, []);

    const handleAddCategory = async () => {
        if (newCategory && !categories.find(c => c.name === newCategory)) {
            const db = await getDb();
            await db.categories.insert({ name: newCategory, addresses: [] });
            setNewCategory(CATEGORIES[0] || '');
        }
    };

    return (
        <div>
            <h2>Manage Assets</h2>
            <TextField
                label="New Category"
                select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
            >
                {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
            </TextField>
            <Button onClick={handleAddCategory}>Add Category</Button>
            <List>
                {categories.map(category => (
                    <CategoryItem
                        key={category.name}
                        category={category}
                        onCategoryDeleted={() => {}} // Optionally handle after delete
                    />
                ))}
            </List>
        </div>
    );
};

export default AssetManager;