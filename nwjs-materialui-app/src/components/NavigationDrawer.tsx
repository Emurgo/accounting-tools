import React from 'react';
import { Drawer, List, ListItem, ListItemText, AppBar, Toolbar, Typography } from '@mui/material';
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
                    to="/manage-assets"
                    sx={isActive('/manage-assets') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Manage Assets" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/weekly-report"
                    sx={isActive('/weekly-report') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Weekly report" />
                </ListItem>
                <ListItem
                    button
                    component={Link}
                    to="/monthly-report"
                    sx={isActive('/monthly-report') ? { bgcolor: 'action.selected' } : {}}
                >
                    <ListItemText primary="Monthly report" />
                </ListItem>
                {/* Additional navigation items can be added here */}
            </List>
        </Drawer>
    );
};

export default NavigationDrawer;