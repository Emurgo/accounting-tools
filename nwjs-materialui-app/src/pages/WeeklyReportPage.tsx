import React, { useState } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { getAllCategories } from '../db/rxdb';
import { fetchBalancesForCategories, CategoryWithBalances } from '../api';

const WeeklyReportPage: React.FC = () => {
    const [report, setReport] = useState<CategoryWithBalances[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateReport = async () => {
        setLoading(true);
        const allCategories = await getAllCategories();
        const result = await fetchBalancesForCategories(allCategories);
        setReport(result);
        setLoading(false);
    };

    return (
        <div>
            <h2>Weekly Report</h2>
            <Button variant="contained" color="primary" onClick={handleGenerateReport} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {report && (
                <TableContainer component={Paper} style={{ marginTop: 32 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Entity</TableCell>
                                <TableCell>Liquid</TableCell>
                                <TableCell>Balance</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {report.flatMap(category =>
                                category.addresses.map(address => (
                                    <TableRow key={category.name + address.address}>
                                        <TableCell>{category.name}</TableCell>
                                        <TableCell>{address.address}</TableCell>
                                        <TableCell>{address.entity}</TableCell>
                                        <TableCell>{address.liquid ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>{address.balance}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default WeeklyReportPage;