import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import NavigationDrawer from './components/NavigationDrawer';
import ManageAssetsPage from './pages/ManageAssetsPage';

const App: React.FC = () => {
    return (
        <Router>
            <NavigationDrawer />
            <Switch>
                <Route path="/manage-assets" component={ManageAssetsPage} />
                {/* Additional routes can be added here */}
            </Switch>
        </Router>
    );
};

export default App;