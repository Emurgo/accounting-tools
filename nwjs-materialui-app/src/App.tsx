import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import NavigationDrawer from './components/NavigationDrawer';
import ManageAssetsPage from './pages/ManageAssetsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import TransactionsPage from './pages/TransactionsPage';
import CardanoRewardsPage from './pages/CardanoRewardsPage';
import CardanoTransactionsPage from './pages/CardanoTransactionsPage';
import { Grid } from '@mui/material';

const drawerWidth = 240;

const App: React.FC = () => {
    return (
        <Router>
            <Grid container>
                <Grid item style={{ width: drawerWidth, flexShrink: 0 }}>
                    <NavigationDrawer />
                </Grid>
                <Grid item xs style={{ marginLeft: drawerWidth }}>
                    <div style={{ padding: 24 }}>
                        <Switch>
                            <Route path="/manage-assets" component={ManageAssetsPage} />
                            <Route path="/weekly-report" component={WeeklyReportPage} />
                            <Route path="/monthly-report" component={MonthlyReportPage} />
                            <Route path="/transactions" component={TransactionsPage} />
                            <Route path="/cardano-rewards" component={CardanoRewardsPage} />
                            <Route path="/cardano-transactions" component={CardanoTransactionsPage} />
                            {/* Additional routes can be added here */}
                        </Switch>
                    </div>
                </Grid>
            </Grid>
        </Router>
    );
};

export default App;

const SIDEBAR_ITEMS = [
    // ...other sidebar items...
    { label: 'Transactions', path: '/transactions' },
    { label: 'Cardano Rewards', path: '/cardano-rewards' },
    { label: 'Cardano Transactions', path: '/cardano-transactions' },
];

// In your router or sidebar rendering logic, add:
// <Route path="/transactions" element={<TransactionsPage />} />
// <Route path="/cardano-rewards" element={<CardanoRewardsPage />} />
// <Route path="/cardano-transactions" element={<CardanoTransactionsPage />} />

// And in your sidebar/menu component, add:
// {SIDEBAR_ITEMS.map(item => (
//     <ListItem button key={item.path} component={Link} to={item.path}>
//         <ListItemText primary={item.label} />
//     </ListItem>
// ))}