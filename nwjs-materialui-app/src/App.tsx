import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import NavigationDrawer from './components/NavigationDrawer';
import ManageAssetsPage from './pages/ManageAssetsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';

const App: React.FC = () => {
    return (
        <Router>
            <NavigationDrawer />
            <Switch>
                <Route path="/manage-assets" component={ManageAssetsPage} />
                <Route path="/weekly-report" component={WeeklyReportPage} />
                {/* Additional routes can be added here */}
            </Switch>
        </Router>
    );
};

export default App;