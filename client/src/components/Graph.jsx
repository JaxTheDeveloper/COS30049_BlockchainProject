import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import TransactionGraph from './TransactionGraph';

function Graph({ address }) {
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                // Reset state when address changes
                setLoading(true);
                setError(null);
                setGraphData(null);
                
                // Fetch only the main wallet node initially
                const response = await fetch(`http://localhost:5000/api/graph/initial/${address}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch graph data');
                }
                const data = await response.json();
                setGraphData(data);
            } catch (error) {
                console.error('Error fetching graph data:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        if (address) {
            fetchGraphData();
        }
    }, [address]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Error loading graph: {error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '600px' }}>
            {graphData ? (
                <TransactionGraph data={graphData} walletAddress={address} />
            ) : (
                <Box sx={{ p: 3 }}>
                    <Typography>No graph data available for this wallet.</Typography>
                </Box>
            )}
        </Box>
    );
}

export default Graph; 