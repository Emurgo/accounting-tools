import React, { useState } from 'react';
import { Button, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Stack } from '@mui/material';
import { getErc20Transactions } from '../api/fetch';
import ExcelJS from 'exceljs';
import fileDownload from 'js-file-download';

const DEFAULT_ADDRESS = '0x378b6f2610526217122eced61f9d64097eb58010';
const TOKEN_ADDRESS = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'; // Polygon USDT
const CHAIN_ID = '137';

function formatDate(timestamp: string | number) {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

const TransactionsPage: React.FC = () => {
    const [address, setAddress] = useState(DEFAULT_ADDRESS);
    const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof getErc20Transactions>>>([]);
    const [loading, setLoading] = useState(false);

    const handleQuery = async () => {
        setLoading(true);
        try {
            const txs = await getErc20Transactions(CHAIN_ID, TOKEN_ADDRESS, address);
            setTransactions(txs);
        } catch (e) {
            setTransactions([]);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transactions');

        // No header row, but add column headers for clarity
        worksheet.addRow([
            'Hash', 'Date', 'Value', 'Fee', 'Net Value', 'Wallet Balance', 'Price', 'Value (USD)', 'Fee (USD)'
        ]);

        transactions.forEach(tx => {
            const decimals = Number(tx.tokenDecimal ?? 6);
            const value = (Number(tx.value) / Math.pow(10, decimals)).toLocaleString();
            let displayValue = '?';
            let isRed = false;
            if (tx.from?.toLowerCase() === address.toLowerCase()) {
                displayValue = `(${value})`;
                isRed = true;
            } else if (tx.to?.toLowerCase() === address.toLowerCase()) {
                displayValue = value;
            }
            const fee = tx.fee ? (Number(tx.fee) / Math.pow(10, decimals)).toLocaleString() : '';
            const netValue = tx.netValue ? (Number(tx.netValue) / Math.pow(10, decimals)).toLocaleString() : '';
            const walletBalance = tx.walletBalance ? (Number(tx.walletBalance) / Math.pow(10, decimals)).toLocaleString() : '';
            const price = tx.price ?? '';
            const valueUSD = tx.value && tx.price ? (Number(tx.value) / Math.pow(10, decimals) * Number(tx.price)).toFixed(2) : '';
            const feeUSD = tx.fee && tx.price ? (Number(tx.fee) / Math.pow(10, decimals) * Number(tx.price)).toFixed(2) : '';

            const row = worksheet.addRow([
                tx.hash,
                formatDate(tx.timestamp),
                displayValue,
                fee,
                netValue,
                walletBalance,
                price,
                valueUSD,
                feeUSD
            ]);
            if (isRed) {
                row.getCell(3).font = { color: { argb: 'FFFF0000' } }; // Value column
            }
        });

        worksheet.columns = [
            { width: 48 }, // Hash
            { width: 12 }, // Date
            { width: 18 }, // Value
            { width: 12 }, // Fee
            { width: 14 }, // Net Value
            { width: 16 }, // Wallet Balance
            { width: 10 }, // Price
            { width: 14 }, // Value (USD)
            { width: 14 }, // Fee (USD)
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        fileDownload(buffer, 'polygon_usdt_transactions.xlsx');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Polygon USDT
            </Typography>
            <Stack direction="row" spacing={2} mb={2}>
                <TextField
                    label="Address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    size="small"
                    sx={{ minWidth: 400 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading}>
                    {loading ? 'Querying...' : 'Query Transactions'}
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleDownload}
                    disabled={transactions.length === 0}
                >
                    Download
                </Button>
            </Stack>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Hash</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Value</TableCell>
                            <TableCell>Fee</TableCell>
                            <TableCell>Net Value</TableCell>
                            <TableCell>Wallet Balance</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Value (USD)</TableCell>
                            <TableCell>Fee (USD)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map(tx => {
                            const decimals = Number(tx.tokenDecimal ?? 6);
                            const value = (Number(tx.value) / Math.pow(10, decimals)).toLocaleString();
                            let displayValue = '?';
                            let style: React.CSSProperties = {};
                            let isRed = false;
                            if (tx.from?.toLowerCase() === address.toLowerCase()) {
                                displayValue = `(${value})`;
                                style = { color: 'red' };
                                isRed = true;
                            } else if (tx.to?.toLowerCase() === address.toLowerCase()) {
                                displayValue = value;
                                style = { color: 'black' };
                            }
                            const fee = tx.fee ? (Number(tx.fee) / Math.pow(10, decimals)).toLocaleString() : '';
                            const netValue = tx.netValue ? (Number(tx.netValue) / Math.pow(10, decimals)).toLocaleString() : '';
                            const walletBalance = tx.walletBalance ? (Number(tx.walletBalance) / Math.pow(10, decimals)).toLocaleString() : '';
                            const price = tx.price ?? '';
                            const valueUSD = tx.value && tx.price ? (Number(tx.value) / Math.pow(10, decimals) * Number(tx.price)).toFixed(2) : '';
                            const feeUSD = tx.fee && tx.price ? (Number(tx.fee) / Math.pow(10, decimals) * Number(tx.price)).toFixed(2) : '';

                            return (
                                <TableRow key={tx.hash}>
                                    <TableCell>{tx.hash}</TableCell>
                                    <TableCell>{formatDate(tx.timestamp)}</TableCell>
                                    <TableCell style={style}>{displayValue}</TableCell>
                                    <TableCell>{fee}</TableCell>
                                    <TableCell>{netValue}</TableCell>
                                    <TableCell>{walletBalance}</TableCell>
                                    <TableCell>{price}</TableCell>
                                    <TableCell>{valueUSD}</TableCell>
                                    <TableCell>{feeUSD}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TransactionsPage;