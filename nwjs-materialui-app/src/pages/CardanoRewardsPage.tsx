import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { getDb, getAll, RewardEarningCardanoWallet } from '../db/rewardEarningCardanoWallet';

const CardanoRewardsPage: React.FC = () => {
    const [wallets, setWallets] = useState<RewardEarningCardanoWallet[]>([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editWallet, setEditWallet] = useState<RewardEarningCardanoWallet | null>(null);
    const [stakeAddress, setStakeAddress] = useState('');
    const [annotation, setAnnotation] = useState('');

    const fetchWallets = async () => {
        setLoading(true);
        const all = await getAll();
        setWallets(all);
        setLoading(false);
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    const handleOpenDialog = (wallet?: RewardEarningCardanoWallet) => {
        if (wallet) {
            setEditWallet(wallet);
            setStakeAddress(wallet.stakeAddress);
            setAnnotation(wallet.annotation || '');
        } else {
            setEditWallet(null);
            setStakeAddress('');
            setAnnotation('');
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSave = async () => {
        const collection = await getDb();
        if (editWallet) {
            await collection.upsert({ stakeAddress, annotation });
        } else {
            await collection.insert({ stakeAddress, annotation });
        }
        setOpenDialog(false);
        fetchWallets();
    };

    const handleDelete = async (stakeAddress: string) => {
        const collection = await getDb();
        await collection.findOne(stakeAddress).remove();
        fetchWallets();
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Cardano Rewards
            </Typography>
            <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} sx={{ mb: 2 }}>
                Add Reward Wallet
            </Button>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Stake Address</TableCell>
                            <TableCell>Annotation</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {wallets.map(wallet => (
                            <TableRow key={wallet.stakeAddress}>
                                <TableCell>{wallet.stakeAddress}</TableCell>
                                <TableCell>{wallet.annotation}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleOpenDialog(wallet)}><Edit /></IconButton>
                                    <IconButton onClick={() => handleDelete(wallet.stakeAddress)}><Delete /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>{editWallet ? 'Edit Reward Wallet' : 'Add Reward Wallet'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Stake Address"
                            value={stakeAddress}
                            onChange={e => setStakeAddress(e.target.value)}
                            fullWidth
                            disabled={!!editWallet}
                        />
                        <TextField
                            label="Annotation"
                            value={annotation}
                            onChange={e => setAnnotation(e.target.value)}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CardanoRewardsPage;