import React, { useState, useRef } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack } from '@mui/material';
import { getCardanoAddressDailyReport } from '../api/cardanoAccounts';

type DailyReportRow = {
    date: string;
    adaBalance: string;
    adaPriceUsd: string;
    usdBalance: string;
};

const DAYS_PER_PAGE = 10;

const CardanoAddressDailyReportPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<DailyReportRow[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const iterRef = useRef(null);

    const fetchReport = async () => {
      const iter = iterRef.current;
      for (let i = 0; i < DAYS_PER_PAGE; i++) {
        const { value, done } = await iter.next();
        if (done) {
          setHasMore(false);
          return;
        }
        setRows(rows => [...rows, value]);
      }
      setHasMore(true);
    };

    const handleQuery = async () => {
        setLoading(true);
        setRows([]);
        iterRef.current = getCardanoAddressDailyReport(address);
        await fetchReport();
        setLoading(false);
    };

    const handleLoadMore = async () => {
      setLoadingMore(true);
      await fetchReport();
      setLoadingMore(false);
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
                {hasMore && (
                    <Button
                        variant="outlined"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading more...' : 'Load more'}
                    </Button>
                )}
            </TableContainer>
        </Box>
    );
};

export default CardanoAddressDailyReportPage;
