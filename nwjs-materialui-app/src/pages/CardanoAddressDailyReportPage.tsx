import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack } from '@mui/material';
import { getCardanoAddressDailyReport } from '../api/cardanoAccounts';

type DailyReportRow = {
    date: string;
    adaBalance: string;
    adaPriceUsd: string;
    usdBalance: string;
};

const DAYS_PER_PAGE = 100;

const CardanoAddressDailyReportPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<DailyReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [daysToShow, setDaysToShow] = useState(DAYS_PER_PAGE);
    const [hasMore, setHasMore] = useState(false);

    const fetchReport = async (days: number) => {
        setLoading(true);
        try {
            const result = await getCardanoAddressDailyReport(address, days);
            setRows(result.rows);
            setHasMore(result.hasMore);
        } catch (e) {
            setRows([]);
            setHasMore(false);
        }
        setLoading(false);
    };

    const handleQuery = async () => {
        const nextDays = DAYS_PER_PAGE;
        setDaysToShow(nextDays);
        await fetchReport(nextDays);
    };

    const handleLoadMore = async () => {
        const nextDays = daysToShow + DAYS_PER_PAGE;
        setDaysToShow(nextDays);
        await fetchReport(nextDays);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Cardano Address Daily Report
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Cardano Address"
                    value={address}
                    onChange={e => {
                        setAddress(e.target.value);
                        setHasMore(false);
                    }}
                    size="small"
                    sx={{ minWidth: 420 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading || !address}>
                    {loading ? 'Querying...' : 'Query Report'}
                </Button>
                {hasMore && (
                    <Button
                        variant="outlined"
                        onClick={handleLoadMore}
                        disabled={loading || rows.length === 0}
                    >
                        Load more (100 days)
                    </Button>
                )}
            </Stack>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>ADA Balance</TableCell>
                            <TableCell>ADA Price (USD)</TableCell>
                            <TableCell>USD Balance</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={`${row.date}-${idx}`}>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>{row.adaBalance}</TableCell>
                                <TableCell>{row.adaPriceUsd}</TableCell>
                                <TableCell>{row.usdBalance}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default CardanoAddressDailyReportPage;
