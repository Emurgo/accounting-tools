import React, { useState } from 'react';
import { Button, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Stack } from '@mui/material';
import { getErc20Transactions } from '../api/fetch';
import * as XLSX from 'xlsx';

const DEFAULT_ADDRESS = '0x378b6f2610526217122eced61f9d64097eb58010';
const TOKEN_ADDRESS = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'; // Polygon USDT
const CHAIN_ID = '137';

function formatDate(timestamp: string | number) {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

const TransactionsPage: React.FC = () => {
    const [address, setAddress] = useState(DEFAULT_ADDRESS);
    const [transactions, setTransactions] = useState<any[]>([]);
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

    const handleDownload = () => {
        // Prepare rows without header
        const rows = transactions.map(tx => {
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
            return [tx.hash, formatDate(tx.timeStamp), displayValue, isRed];
        });

        // Create worksheet without header
        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        // Apply red color to value cells with parenthesis
        rows.forEach((row, i) => {
            if (row[3]) {
                const cellRef = XLSX.utils.encode_cell({ c: 2, r: i }); // value column
                if (!worksheet[cellRef]) return;
                worksheet[cellRef].s = {
                    font: { color: { rgb: "FF0000" } }
                };
            }
        });

        // Remove the 4th column (isRed) from the worksheet
        Object.keys(worksheet)
            .filter(key => key[0] !== '!' && XLSX.utils.decode_cell(key).c === 3)
            .forEach(key => delete worksheet[key]);

        worksheet['!cols'] = [{}, {}, {}]; // Only 3 columns

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        XLSX.writeFile(workbook, 'polygon_usdt_transactions.xlsx');
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map(tx => {
                            const decimals = Number(tx.tokenDecimal ?? 6);
                            const value = (Number(tx.value) / Math.pow(10, decimals)).toLocaleString();
                            let displayValue = '?';
                            let style: React.CSSProperties = {};
                            if (tx.from?.toLowerCase() === address.toLowerCase()) {
                                displayValue = `(${value})`;
                                style = { color: 'red' };
                            } else if (tx.to?.toLowerCase() === address.toLowerCase()) {
                                displayValue = value;
                                style = { color: 'black' };
                            }
                            return (
                                <TableRow key={tx.hash}>
                                    <TableCell>{tx.hash}</TableCell>
                                    <TableCell>{formatDate(tx.timeStamp)}</TableCell>
                                    <TableCell style={style}>{displayValue}</TableCell>
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