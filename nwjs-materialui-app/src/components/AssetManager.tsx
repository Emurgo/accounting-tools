import React, { useEffect, useState } from 'react';
import { Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../db/jsonDb';
import { Category, Address } from '../types';

const AssetManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState<string>('');
    const [newAddress, setNewAddress] = useState<{ category: string; address: string }>({ category: '', address: '' });

    useEffect(() => {
        const fetchCategories = () => {
            const data = db.getData('/categories');
            setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleAddCategory = () => {
        if (newCategory) {
            db.push(`/categories/${newCategory}`, { addresses: [] });
            setCategories([...categories, { name: newCategory, addresses: [] }]);
            setNewCategory('');
        }
    };

    const handleDeleteCategory = (categoryName: string) => {
        db.delete(`/categories/${categoryName}`);
        setCategories(categories.filter(category => category.name !== categoryName));
    };

    const handleAddAddress = (categoryName: string) => {
        if (newAddress.address) {
            db.push(`/categories/${categoryName}/addresses[]`, newAddress.address);
            const updatedCategories = categories.map(category => {
                if (category.name === categoryName) {
                    return { ...category, addresses: [...category.addresses, newAddress.address] };
                }
                return category;
            });
            setCategories(updatedCategories);
            setNewAddress({ category: '', address: '' });
        }
    };

    const handleDeleteAddress = (categoryName: string, address: string) => {
        db.delete(`/categories/${categoryName}/addresses/${address}`);
        const updatedCategories = categories.map(category => {
            if (category.name === categoryName) {
                return { ...category, addresses: category.addresses.filter(addr => addr !== address) };
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
                onChange={(e) => setNewCategory(e.target.value)}
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
                            value={newAddress.category === category.name ? newAddress.address : ''}
                            onChange={(e) => setNewAddress({ category: category.name, address: e.target.value })}
                        />
                        <Button onClick={() => handleAddAddress(category.name)}>Add Address</Button>
                        <List>
                            {category.addresses.map(address => (
                                <ListItem key={address}>
                                    <ListItemText primary={address} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleDeleteAddress(category.name, address)}>
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