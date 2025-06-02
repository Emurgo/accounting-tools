import React from 'react';
import { Drawer, List, ListItem, ListItemText, AppBar, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const NavigationDrawer: React.FC = () => {
    return (
        <Drawer variant="permanent" anchor="left">
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">Asset Manager</Typography>
                </Toolbar>
            </AppBar>
            <List>
                <ListItem button component={Link} to="/manage-assets">
                    <ListItemText primary="Manage Assets" />
                </ListItem>
            </List>
        </Drawer>
    );
};

export default NavigationDrawer;