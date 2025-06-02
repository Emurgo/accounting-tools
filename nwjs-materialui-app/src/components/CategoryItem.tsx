import React, { useState } from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, Button, List } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { getDb } from '../db/rxdb';
import { Category } from '../types';

interface CategoryItemProps {
    category: Category;
    onCategoryDeleted?: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onCategoryDeleted }) => {
    const [showAddressInput, setShowAddressInput] = useState(false);
    const [newAddress, setNewAddress] = useState('');

    const handleDeleteCategory = async () => {
        const db = await getDb();
        const doc = await db.categories.findOne(category.name).exec();
        if (doc) {
            await doc.remove();
            if (onCategoryDeleted) onCategoryDeleted();
        }
    };

    const handleAddAddress = async () => {
        debugger
        if (newAddress) {
            const db = await getDb();
            const doc = await db.categories.findOne(category.name).exec();
            if (doc) {
                const addresses = doc.addresses || [];
                if (!addresses.find((a: any) => a.address === newAddress)) {
                    await doc.patch({
                        addresses: [...addresses, { address: newAddress }]
                    });
                }
            }
            setNewAddress('');
        }
    };

    const handleDeleteAddress = async (address: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(category.name).exec();
        if (doc) {
            const addresses = doc.addresses.filter((a: any) => a.address !== address);
            await doc.patch({
                addresses
            });
        }
    };

    const toggleAddressInput = () => {
        setShowAddressInput(v => !v);
        setNewAddress('');
    };

    return (
        <div>
            <ListItem sx={{ bgcolor: 'action.selected' }}>
                <ListItemText primary={category.name} />
                <IconButton
                    edge="end"
                    onClick={toggleAddressInput}
                    aria-label={showAddressInput ? 'Hide address input' : 'Show address input'}
                >
                    {showAddressInput ? <RemoveIcon /> : <AddIcon />}
                </IconButton>
                <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={handleDeleteCategory}>
                        <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
            {showAddressInput && (
                <>
                    <TextField
                        label="New Address"
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                    />
                    <Button onClick={handleAddAddress}>Add Address</Button>
                </>
            )}
            <List>
                {(category.addresses || []).map((address: any) => (
                    <ListItem key={address.address}>
                        <ListItemText primary={address.address} />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleDeleteAddress(address.address)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </div>
    );
};

export default CategoryItem;