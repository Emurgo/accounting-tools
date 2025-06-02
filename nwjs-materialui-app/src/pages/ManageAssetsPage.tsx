import React from 'react';
import { Container, Typography } from '@mui/material';
import AssetManager from '../components/AssetManager';

const ManageAssetsPage: React.FC = () => {
    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Manage Assets
            </Typography>
            <AssetManager />
        </Container>
    );
};

export default ManageAssetsPage;