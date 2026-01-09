import React from 'react';
import { Drawer, List, AppBar, Toolbar, Typography } from '@mui/material';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { Link, useLocation } from 'react-router-dom';

const NavigationDrawer: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <Drawer variant="permanent" anchor="left">
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">Asset Manager</Typography>
                </Toolbar>
            </AppBar>
            <List>
                <ListItem
                    button
                    component={Link}
                    to="/weekly-report"
                    sx={isActive('/weekly-report') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Weekly Report" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/monthly-report"
                    sx={isActive('/monthly-report') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Monthly report" />
                </ListItem>
                <ListItem button component={Link} to="/cardano-rewards">
                    <ListItemText primary="Cardano Rewards" />
                </ListItem>
                <ListItem button component={Link} to="/cardano-transactions">
                    <ListItemText primary="Cardano Transactions" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/bitcoin-transactions"
                    sx={isActive('/bitcoin-transactions') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Bitcoin Transaction" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/cardano-address-daily-report"
                    sx={isActive('/cardano-address-daily-report') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Cardano Address Daily Report" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/binance-accounts"
                    sx={isActive('/binance-accounts') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Binance Accounts" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/ether-account-history"
                    sx={isActive('/ether-account-history') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Ethereum Transactions" />
                </ListItem>
                <ListItem button component={Link} to="/polygon-usdt-transactions">
                    <ListItemText primary="USDT(Polygon) Transactions" />
                </ListItem>
                {/* Additional navigation items can be added here */}
            </List>
        </Drawer>
    );
};

export default NavigationDrawer;
