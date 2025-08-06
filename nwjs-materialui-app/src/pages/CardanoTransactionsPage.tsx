import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack } from '@mui/material';
import ExcelJS from 'exceljs';
import fileDownload from 'js-file-download';
import { getTransactionHistory } from '../api/cardanoAccounts';

const CardanoTransactionsPage: React.FC = () => {
    const [stakeAddress, setStakeAddress] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleQuery = async () => {
        setLoading(true);
        try {
            const txs = await getTransactionHistory(stakeAddress);
            setTransactions(txs);
        } catch (e) {
            setTransactions([]);
        }
        setLoading(false);
    };

    const handleDownloadXLSX = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Cardano Transactions');
        // Add header
        sheet.addRow(['Tx Hash', 'Date', 'Type', 'Amount', 'Epoch', 'Slot']);
        transactions.forEach(tx => {
            sheet.addRow([
                tx.hash,
                tx.date,
                tx.type,
                tx.amount,
                tx.epoch,
                tx.slot
            ]);
        });
        sheet.columns = [
            { width: 48 },
            { width: 16 },
            { width: 10 },
            { width: 16 },
            { width: 10 },
            { width: 10 }
        ];
        const buffer = await workbook.xlsx.writeBuffer();
        fileDownload(buffer, 'cardano_transactions.xlsx');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Cardano Transactions
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Stake Address"
                    value={stakeAddress}
                    onChange={e => setStakeAddress(e.target.value)}
                    size="small"
                    sx={{ minWidth: 400 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading || !stakeAddress}>
                    {loading ? 'Querying...' : 'Query Transactions'}
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleDownloadXLSX}
                    disabled={transactions.length === 0}
                >
                    Download XLSX
                </Button>
            </Stack>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Tx Hash</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Epoch</TableCell>
                            <TableCell>Slot</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((tx, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{tx.hash}</TableCell>
                                <TableCell>{tx.date}</TableCell>
                                <TableCell>{tx.type}</TableCell>
                                <TableCell>{tx.amount}</TableCell>
                                <TableCell>{tx.epoch}</TableCell>
                                <TableCell>{tx.slot}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default CardanoTransactionsPage;