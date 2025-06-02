import React, { useEffect, useState } from 'react';
import { Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../db/jsonDb';
import { Category, Address } from '../types';

const AssetManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState<Category['name']>('BTC');
    const [newAddress, setNewAddress] = useState<string>('');

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await db.getData('/categories');
            setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleAddCategory = () => {
        if (newCategory) {
            db.push(`/categories/${newCategory}`, { addresses: [] });
            setCategories([...categories, { name: newCategory, addresses: [] }]);
            setNewCategory('BTC');
        }
    };

    const handleDeleteCategory = (categoryName: string) => {
        db.delete(`/categories/${categoryName}`);
        setCategories(categories.filter(category => category.name !== categoryName));
    };

    const handleAddAddress = (categoryName: Category['name']) => {
        if (newAddress) {
            db.push(`/categories/${categoryName}/addresses[]`, newAddress);
            const updatedCategories = categories.map(category => {
                if (category.name === categoryName) {
                    return { ...category, addresses: [...category.addresses, { address: newAddress, id: newAddress/*fixme*/ }] };
                }
                return category;
            });
            setCategories(updatedCategories);
            setNewAddress('');
        }
    };

    const handleDeleteAddress = (addressCategory: Category, address: Address) => {
        db.delete(`/categories/${addressCategory.name}/addresses/${address}`);
        const updatedCategories = categories.map(category => {
            if (category === addressCategory) {
                return { ...category, addresses: category.addresses.filter(addr => addr.address !== address.address) };
            }
            return category;
        });
        setCategories(updatedCategories);
    };

    return (
        <div>
            <h2>Manage Assets</h2>
            <TextField
                label="New Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Category['name']/* fixme */)}
            />
            <Button onClick={handleAddCategory}>Add Category</Button>
            <List>
                {categories.map(category => (
                    <div key={category.name}>
                        <ListItem>
                            <ListItemText primary={category.name} />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" onClick={() => handleDeleteCategory(category.name)}>
                                    <DeleteIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <TextField
                            label="New Address"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                        />
                        <Button onClick={() => handleAddAddress(category.name)}>Add Address</Button>
                        <List>
                            {category.addresses.map(address => (
                                <ListItem key={address.address}>
                                    <ListItemText primary={address} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleDeleteAddress(category, address)}>
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