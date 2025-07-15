import React, { useState } from 'react';
import { Button, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from '@mui/material';
import { getErc20Transactions } from '../api/fetch';

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
        }
        setLoading(false);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Polygon USDT
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
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
            </Box>
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