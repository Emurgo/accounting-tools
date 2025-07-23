import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { getDb, getAll, RewardEarningCardanoWallet } from '../db/rewardEarningCardanoWallet';
import { getEpochsForMonth, getRewardHistory } from '../api/cardanoRewards';
import { getCachedPriceUSD, getCoinGeckoProPrice } from '../api/fetch';
import BigNumber from 'bignumber.js';

const CardanoRewardsPage: React.FC = () => {
    const [wallets, setWallets] = useState<RewardEarningCardanoWallet[]>([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editWallet, setEditWallet] = useState<RewardEarningCardanoWallet | null>(null);
    const [stakeAddress, setStakeAddress] = useState('');
    const [annotation, setAnnotation] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [month, setMonth] = useState<Dayjs>(dayjs().subtract(1, 'month'));
    const [rewards, setRewards] = useState<any[]>([]);
    const [queryLoading, setQueryLoading] = useState(false);

    const fetchWallets = async () => {
        setLoading(true);
        const all = await getAll();
        setWallets(all);
        // Default all selected
        const sel: Record<string, boolean> = {};
        all.forEach(w => { sel[w.stakeAddress] = true; });
        setSelected(sel);
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

    const handleSelect = (stakeAddress: string, checked: boolean) => {
        setSelected(prev => ({ ...prev, [stakeAddress]: checked }));
    };

    const handleSelectAll = (checked: boolean) => {
        const sel: Record<string, boolean> = {};
        wallets.forEach(w => { sel[w.stakeAddress] = checked; });
        setSelected(sel);
    };

    const handleQueryRewards = async () => {
        setQueryLoading(true);
        setRewards([]);
        try {
            const { firstEpoch, lastEpoch } = await getEpochsForMonth(month.year(), month.month() + 1); // month is 0-based
            const adaPrice = await getCachedPriceUSD('ADA', async () => getCoinGeckoProPrice('cardano'));
            const selectedAddresses = wallets.filter(w => selected[w.stakeAddress]).map(w => w.stakeAddress);

            let allRewards: any[] = [];
            for (const stakeAddress of selectedAddresses) {
                const history = await getRewardHistory(stakeAddress);
                // Filter by epoch
                const filtered = history.filter((r: any) => r.epoch >= firstEpoch && r.epoch <= lastEpoch);
                filtered.forEach((r: any) => {
                    allRewards.push({
                        stakeAddress,
                        epoch: r.epoch,
                        amountADA: new BigNumber(r.amount).dividedBy(1e6).toString(10),
                        amountUSD: new BigNumber(r.amount).dividedBy(1e6).multipliedBy(adaPrice).toFixed(2)
                    });
                });
            }
            setRewards(allRewards);
        } catch (e) {
            setRewards([]);
        }
        setQueryLoading(false);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
                <Typography variant="h5" gutterBottom>
                    Cardano Rewards
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <DatePicker
                        views={['year', 'month']}
                        label="Select Month"
                        value={month}
                        onChange={val => val && setMonth(val)}
                        disableFuture
                    />
                    <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
                        Add Reward Wallet
                    </Button>
                    <Button variant="contained" color="secondary" onClick={handleQueryRewards} disabled={queryLoading}>
                        {queryLoading ? 'Querying...' : 'Query'}
                    </Button>
                </Stack>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={wallets.length > 0 && wallets.every(w => selected[w.stakeAddress])}
                                        indeterminate={wallets.some(w => selected[w.stakeAddress]) && !wallets.every(w => selected[w.stakeAddress])}
                                        onChange={e => handleSelectAll(e.target.checked)}
                                    />
                                    <Button size="small" onClick={() => handleSelectAll(true)}>All</Button>
                                    <Button size="small" onClick={() => handleSelectAll(false)}>None</Button>
                                </TableCell>
                                <TableCell>Stake Address</TableCell>
                                <TableCell>Annotation</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wallets.map(wallet => (
                                <TableRow key={wallet.stakeAddress}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={!!selected[wallet.stakeAddress]}
                                            onChange={e => handleSelect(wallet.stakeAddress, e.target.checked)}
                                        />
                                    </TableCell>
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
                <Typography variant="h6" gutterBottom>
                    Rewards by Epoch
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Stake Address</TableCell>
                                <TableCell>Epoch</TableCell>
                                <TableCell>ADA</TableCell>
                                <TableCell>USD</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rewards.map((r, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{r.stakeAddress}</TableCell>
                                    <TableCell>{r.epoch}</TableCell>
                                    <TableCell>{r.amountADA}</TableCell>
                                    <TableCell>{r.amountUSD}</TableCell>
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
        </LocalizationProvider>
    );
};

export default CardanoRewardsPage;