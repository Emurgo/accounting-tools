import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Button, TextField, Box } from '@mui/material';
import { getDb } from '../db/rxdb';
import { Category, Address } from '../types';

const categoriesList = ['BTC', 'ETH', 'ADA', 'SUI'];

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [addressInput, setAddressInput] = useState('');

    useEffect(() => {
        let sub: any;
        getDb().then(db => {
            sub = db.categories.find().$.subscribe((docs: any) => {
                setCategories(docs ? docs.map((doc: any) => doc.toJSON()) : []);
            });
        });
        return () => sub && sub.unsubscribe();
    }, []);

    const handleAddCategory = async (category: string) => {
        if (!categories.find(cat => cat.name === category)) {
            const db = await getDb();
            await db.categories.insert({ name: category, addresses: [] });
        }
    };

    const handleDeleteCategory = async (category: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(category).exec();
        if (doc) await doc.remove();
    };

    const handleAddAddress = async (category: string) => {
        if (addressInput) {
            const db = await getDb();
            const doc = await db.categories.findOne(category).exec();
            if (doc) {
                const addresses = doc.addresses || [];
                if (!addresses.includes(addressInput)) {
                    await doc.atomicPatch({ addresses: [...addresses, addressInput] });
                }
            }
            setAddressInput('');
        }
    };

    const handleDeleteAddress = async (category: string, address: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(category).exec();
        if (doc) {
            const addresses = (doc.addresses || []).filter((addr: string) => addr !== address);
            await doc.atomicPatch({ addresses });
        }
    };

    return (
        <Box>
            <List>
                {categoriesList.map(category => (
                    <ListItem key={category} alignItems="flex-start">
                        <ListItemText primary={category} />
                        <Button onClick={() => handleAddCategory(category)}>Add Category</Button>
                        <Button onClick={() => handleDeleteCategory(category)}>Delete Category</Button>
                        <TextField
                            value={selectedCategory === category ? addressInput : ''}
                            onFocus={() => setSelectedCategory(category)}
                            onChange={(e) => setAddressInput(e.target.value)}
                            placeholder="Add Address"
                        />
                        <Button onClick={() => handleAddAddress(category)}>Add Address</Button>
                        <List>
                            {(categories.find(cat => cat.name === category)?.addresses || []).map((address: Address, index: number) => (
                                <ListItem key={index}>
                                    <ListItemText primary={address.address} />
                                    <Button onClick={() => handleDeleteAddress(category, address.address)}>Delete</Button>
                                </ListItem>
                            ))}
                        </List>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default CategoryList;