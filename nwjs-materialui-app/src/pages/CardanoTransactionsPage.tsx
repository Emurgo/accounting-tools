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
        sheet.addRow([
            'Tx Hash', 'Date', 'Amount', 'Fee', 'Net', 'Balance', 'Price', 'Net (USD)', 'Fee (USD)'
        ]);
        transactions.forEach(tx => {
            sheet.addRow([
                tx.txHash,
                tx.date,
                tx.amount,
                tx.fee,
                tx.net,
                tx.balance,
                tx.price,
                tx.netUsd,
                tx.feeUsd
            ]);
        });
        sheet.columns = [
            { width: 48 }, // Tx Hash
            { width: 16 }, // Date
            { width: 16 }, // Amount
            { width: 12 }, // Fee
            { width: 14 }, // Net
            { width: 16 }, // Balance
            { width: 10 }, // Price
            { width: 14 }, // Net (USD)
            { width: 14 }, // Fee (USD)
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
                            <TableCell>Amount</TableCell>
                            <TableCell>Fee</TableCell>
                            <TableCell>Net</TableCell>
                            <TableCell>Balance</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Net (USD)</TableCell>
                            <TableCell>Fee (USD)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((tx, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{tx.txHash}</TableCell>
                                <TableCell>{tx.date}</TableCell>
                                <TableCell>{tx.amount}</TableCell>
                                <TableCell>{tx.fee}</TableCell>
                                <TableCell>{tx.net}</TableCell>
                                <TableCell>{tx.balance}</TableCell>
                                <TableCell>{tx.price}</TableCell>
                                <TableCell>{tx.netUsd}</TableCell>
                                <TableCell>{tx.feeUsd}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default CardanoTransactionsPage;