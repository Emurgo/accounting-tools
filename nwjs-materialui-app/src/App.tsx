import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import NavigationDrawer from './components/NavigationDrawer';
import ManageAssetsPage from './pages/ManageAssetsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import PolygonUsdtTransactionsPage from './pages/PolygonUsdtTransactionsPage';
import CardanoRewardsPage from './pages/CardanoRewardsPage';
import CardanoTransactionsPage from './pages/CardanoTransactionsPage';
import CardanoAddressDailyReportPage from './pages/CardanoAddressDailyReportPage';
import BitcoinTransactionsPage from './pages/BitcoinTransactionsPage';
import XrpTransactionsPage from './pages/XrpTransactionsPage';
import UsdcSolanaTransactionsPage from './pages/UsdcSolanaTransactionsPage';
import SolanaTransactionsPage from './pages/SolanaTransactionsPage';
import PolkadotTransactionsPage from './pages/PolkadotTransactionsPage';
import BinanceAccountsPage from './pages/BinanceAccountsPage';
import EtherAccountHistoryPage from './pages/EtherAccountHistoryPage';
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
                            <Route path="/polygon-usdt-transactions" component={PolygonUsdtTransactionsPage} />
                            <Route path="/cardano-rewards" component={CardanoRewardsPage} />
                            <Route path="/cardano-transactions" component={CardanoTransactionsPage} />
                            <Route path="/bitcoin-transactions" component={BitcoinTransactionsPage} />
                            <Route path="/xrp-transactions" component={XrpTransactionsPage} />
                            <Route path="/usdc-solana-transactions" component={UsdcSolanaTransactionsPage} />
                            <Route path="/solana-transactions" component={SolanaTransactionsPage} />
                            <Route path="/polkadot-transactions" component={PolkadotTransactionsPage} />
                            <Route path="/cardano-address-daily-report" component={CardanoAddressDailyReportPage} />
                            <Route path="/binance-accounts" component={BinanceAccountsPage} />
                            <Route path="/ether-account-history" component={EtherAccountHistoryPage} />
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
