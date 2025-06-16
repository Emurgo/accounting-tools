import React, { useState } from 'react';
import { Button, Typography, CircularProgress, Box } from '@mui/material';
import { generateMonthlyReport } from '../api';

const MonthlyReportPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const report = await generateMonthlyReport();
            setResult(report);
        } catch (e) {
            console.error(e);
            setResult({ error: (e as Error).message });
        }
        setLoading(false);
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Monthly Report
            </Typography>
            <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateReport}
                disabled={loading}
            >
                {loading ? <CircularProgress size={24} /> : 'Generate Monthly Report'}
            </Button>
            <Box mt={3}>
                {result && (
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                )}
            </Box>
        </Box>
    );
};

export default MonthlyReportPage;