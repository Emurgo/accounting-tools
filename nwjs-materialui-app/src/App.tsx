import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import NavigationDrawer from './components/NavigationDrawer';
import ManageAssetsPage from './pages/ManageAssetsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
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
                            {/* Additional routes can be added here */}
                        </Switch>
                    </div>
                </Grid>
            </Grid>
        </Router>
    );
};

export default App;