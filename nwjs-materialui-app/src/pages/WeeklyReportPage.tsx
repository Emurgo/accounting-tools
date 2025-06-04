import React, { useState } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { getAllCategories } from '../db/rxdb';
import { fetchBalancesForCategories, CategoryWithBalances } from '../api';
import BigNumber from 'bignumber.js';

const ENTITY_OPTIONS = ['EMG', 'EMC'] as const;
const LIQUID_OPTIONS = [true, false] as const;

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

    // Helper to filter addresses by entity and liquid
    const getAddressesByEntityAndLiquid = (
        report: CategoryWithBalances[],
        entity: string,
        liquid: boolean
    ) => {
        return report
            .flatMap(category =>
                category.addresses
                    .filter(address => address.entity === entity && address.liquid === liquid)
                    .map(address => ({
                        ...address,
                        category: category.name,
                        price: category.price
                    }))
            );
    };

    return (
        <div>
            <h2>Weekly Report</h2>
            <Button variant="contained" color="primary" onClick={handleGenerateReport} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {report &&
                ENTITY_OPTIONS.map(entity =>
                    LIQUID_OPTIONS.map(liquid => {
                        const addresses = getAddressesByEntityAndLiquid(report, entity, liquid);
                        if (addresses.length === 0) return null;
                        return (
                            <div key={`${entity}-${liquid}`} style={{ marginTop: 32 }}>
                                <Typography variant="h6" gutterBottom>
                                    {entity} - {liquid ? 'Liquid' : 'Non-Liquid'}
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Address</TableCell>
                                                <TableCell>Entity</TableCell>
                                                <TableCell>Liquid</TableCell>
                                                <TableCell>Balance</TableCell>
                                                <TableCell>Price (USD)</TableCell>
                                                <TableCell>Total Value (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {addresses.map(address => {
                                                const price = new BigNumber(address.price || '0');
                                                const balance = new BigNumber(address.balance || '0');
                                                const totalValue = balance.multipliedBy(price).toFixed(2);
                                                return (
                                                    <TableRow key={address.category + address.address}>
                                                        <TableCell>{address.category}</TableCell>
                                                        <TableCell>{address.address}</TableCell>
                                                        <TableCell>{address.entity}</TableCell>
                                                        <TableCell>{address.liquid ? 'Yes' : 'No'}</TableCell>
                                                        <TableCell>{address.balance}</TableCell>
                                                        <TableCell>{price.toString()}</TableCell>
                                                        <TableCell>{totalValue}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </div>
                        );
                    })
                )
            }
        </div>
    );
};

export default WeeklyReportPage;