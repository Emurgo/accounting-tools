import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
} from '@mui/material';
import { getXrpTransactionHistory, XrpTransactionRow } from '../api/xrpAccounts';

const XrpTransactionsPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<XrpTransactionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuery = async () => {
        setLoading(true);
        setError('');
        setRows([]);
        try {
            const data = await getXrpTransactionHistory(address.trim());
            setRows(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
        setLoading(false);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                XRP Transactions
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="XRP Address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    size="small"
                    sx={{ minWidth: 420 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading || !address.trim()}>
                    {loading ? 'Querying...' : 'Query'}
                </Button>
            </Stack>
            {error && (
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Amount (XRP)</TableCell>
                            <TableCell>XRP Price (USD)</TableCell>
                            <TableCell>Amount (USD)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={`${row.date}-${idx}`}>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>{row.amount}</TableCell>
                                <TableCell>{row.priceUsd}</TableCell>
                                <TableCell>{row.amountUsd}</TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>No transactions to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default XrpTransactionsPage;
