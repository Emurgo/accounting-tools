import React, { useEffect, useState } from 'react';
import { Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getDb } from '../db/rxdb';
import { Category } from '../types';

const CATEGORIES = ['BTC', 'ETH', 'ADA', 'SUI'];

const AssetManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState<string>('BTC');
    const [newAddress, setNewAddress] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

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
            setNewCategory('BTC');
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(categoryName).exec();
        if (doc) await doc.remove();
    };

    const handleAddAddress = async (categoryName: string) => {
        if (newAddress) {
            const db = await getDb();
            const doc = await db.categories.findOne(categoryName).exec();
            if (doc) {
                const addresses = doc.addresses || [];
                if (!addresses.find((a: any) => a.address === newAddress)) {
                    await doc.patch({ addresses: [...addresses, { address: newAddress }] });
                }
            }
            setNewAddress('');
        }
    };

    const handleDeleteAddress = async (categoryName: string, address: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(categoryName).exec();
        if (doc) {
            const addresses = doc.addresses.filter((a: any) => a.address !== address);
            await doc.patch({ addresses });
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
                    <div key={category.name}>
                        <ListItem
                            sx={{ bgcolor: 'action.selected' }}
                        >
                            <ListItemText primary={category.name} />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" onClick={() => handleDeleteCategory(category.name)}>
                                    <DeleteIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <TextField
                            label="New Address"
                            value={selectedCategory === category.name ? newAddress : ''}
                            onFocus={() => setSelectedCategory(category.name)}
                            onChange={e => setNewAddress(e.target.value)}
                        />
                        <Button onClick={() => handleAddAddress(category.name)}>Add Address</Button>
                        <List>
                            {(category.addresses || []).map((address: any) => (
                                <ListItem key={address.address}>
                                    <ListItemText primary={address.address} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleDeleteAddress(category.name, address.address)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </div>
                ))}
            </List>
        </div>
    );
};

export default AssetManager;