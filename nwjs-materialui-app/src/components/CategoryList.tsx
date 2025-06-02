import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Button, TextField, Box } from '@mui/material';
import { db } from '../db/jsonDb';
import { Category, Address } from '../types';

const categoriesList = ['BTC', 'ETH', 'ADA', 'SUI'];

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [addressInput, setAddressInput] = useState('');

    useEffect(() => {
        const fetchCategories = () => {
            const data = db.getData('/categories') || {};
            setCategories(Object.entries(data).map(([name, addresses]) => ({
                name,
                addresses
            })));
        };
        fetchCategories();
    }, []);

    const handleAddCategory = (category: string) => {
        if (!categories.find(cat => cat.name === category)) {
            db.push(`/categories/${category}`, []);
            setCategories([...categories, { name: category, addresses: [] }]);
        }
    };

    const handleDeleteCategory = (category: string) => {
        db.delete(`/categories/${category}`);
        setCategories(categories.filter(cat => cat.name !== category));
    };

    const handleAddAddress = (category: string) => {
        if (addressInput) {
            db.push(`/categories/${category}/[]`, addressInput);
            setCategories(categories.map(cat => 
                cat.name === category 
                ? { ...cat, addresses: [...cat.addresses, addressInput] } 
                : cat
            ));
            setAddressInput('');
        }
    };

    const handleDeleteAddress = (category: string, address: string) => {
        db.delete(`/categories/${category}/[]`, address);
        setCategories(categories.map(cat => 
            cat.name === category 
            ? { ...cat, addresses: cat.addresses.filter(addr => addr !== address) } 
            : cat
        ));
    };

    return (
        <Box>
            <List>
                {categoriesList.map(category => (
                    <ListItem key={category}>
                        <ListItemText primary={category} />
                        <Button onClick={() => handleAddCategory(category)}>Add Category</Button>
                        <Button onClick={() => handleDeleteCategory(category)}>Delete Category</Button>
                        <TextField 
                            value={selectedCategory === category ? addressInput : ''} 
                            onChange={(e) => setAddressInput(e.target.value)} 
                            placeholder="Add Address" 
                        />
                        <Button onClick={() => handleAddAddress(category)}>Add Address</Button>
                        <List>
                            {categories.find(cat => cat.name === category)?.addresses.map((address, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={address} />
                                    <Button onClick={() => handleDeleteAddress(category, address)}>Delete</Button>
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