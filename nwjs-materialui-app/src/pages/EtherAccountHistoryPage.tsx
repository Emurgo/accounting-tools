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
import { getEtherAccountHistory, EtherAccountHistoryRow } from '../api/etherAccountHistory';

const EtherAccountHistoryPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<EtherAccountHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuery = async () => {
        setLoading(true);
        setError('');
        setRows([]);
        try {
            const data = await getEtherAccountHistory(address.trim());
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
                Ether Account History
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Ethereum Address"
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
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Amount (ETH)</TableCell>
                            <TableCell>Fee (ETH)</TableCell>
                            <TableCell>Balance (ETH)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={`${row.txId}-${idx}`}>
                                <TableCell>{row.timestamp}</TableCell>
                                <TableCell>{row.txId}</TableCell>
                                <TableCell>{row.amount}</TableCell>
                                <TableCell>{row.fee}</TableCell>
                                <TableCell>{row.balance}</TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>No transactions to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default EtherAccountHistoryPage;
