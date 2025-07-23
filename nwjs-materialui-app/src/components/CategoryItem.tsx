import React, { useState } from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField, Button, List, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { getDb } from '../db/categories';
import { Category } from '../types';

interface CategoryItemProps {
    category: Category;
    onCategoryDeleted?: () => void;
}

const ENTITY_OPTIONS = ['EMG', 'EMC'] as const;

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onCategoryDeleted }) => {
    const [showAddressInput, setShowAddressInput] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [entity, setEntity] = useState<typeof ENTITY_OPTIONS[number]>('EMG');
    const [liquid, setLiquid] = useState<boolean>(false);

    const handleDeleteCategory = async () => {
        const db = await getDb();
        const doc = await db.categories.findOne(category.name).exec();
        if (doc) {
            await doc.remove();
            if (onCategoryDeleted) onCategoryDeleted();
        }
    };

    const handleAddAddress = async () => {
        if (newAddress) {
            const db = await getDb();
            const doc = await db.categories.findOne(category.name).exec();
            if (doc) {
                const addresses = doc.addresses || [];
                if (!addresses.find((a) => a.address === newAddress)) {
                    await doc.patch({
                        addresses: [...addresses, { address: newAddress, entity, liquid }]
                    });
                }
            }
            setNewAddress('');
            setEntity('EMG');
            setLiquid(false);
        }
    };

    const handleDeleteAddress = async (address: string) => {
        const db = await getDb();
        const doc = await db.categories.findOne(category.name).exec();
        if (doc) {
            const addresses = doc.addresses.filter((a) => a.address !== address);
            await doc.patch({
                addresses
            });
        }
    };

    const toggleAddressInput = () => {
        setShowAddressInput(v => !v);
        setNewAddress('');
        setEntity('EMG');
        setLiquid(false);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <TextField
                        label="New Address"
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                        size="small"
                    />
                    <TextField
                        select
                        label="Entity"
                        value={entity}
                        onChange={e => setEntity(e.target.value as typeof ENTITY_OPTIONS[number])}
                        size="small"
                        style={{ width: 80 }}
                    >
                        {ENTITY_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={liquid}
                                onChange={e => setLiquid(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Liquid"
                    />
                    <Button onClick={handleAddAddress} variant="contained" size="small">Add Address</Button>
                </div>
            )}
            <List>
                {(category.addresses || []).map((address: any) => (
                    <ListItem key={address.address}>
                        <ListItemText
                            primary={address.address}
                            secondary={`Entity: ${address.entity}, Liquid: ${address.liquid ? 'Yes' : 'No'}`}
                        />
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