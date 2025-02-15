import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Grid, 
  CircularProgress 
} from '@mui/material';

function Header() {
  const [marketData, setMarketData] = useState({
    price: '0.00',
    marketCap: '0.0',
    transactions: '0',
    lastBlock: '0'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/market-data');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch market data');
        }

        setMarketData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ bgcolor: 'grey.50', py: 3 }}>
      <Container maxWidth="lg">
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ETHER PRICE
              </Typography>
              {loading ? (
                <CircularProgress size={20} />
              ) : error ? (
                <Typography color="error">Error loading data</Typography>
              ) : (
                <Typography variant="h6">${marketData.price} USD</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                MARKET CAP
              </Typography>
              {loading ? (
                <CircularProgress size={20} />
              ) : error ? (
                <Typography color="error">Error loading data</Typography>
              ) : (
                <Typography variant="h6">${marketData.marketCap}B USD</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                TRANSACTIONS
              </Typography>
              {loading ? (
                <CircularProgress size={20} />
              ) : error ? (
                <Typography color="error">Error loading data</Typography>
              ) : (
                <Typography variant="h6">{marketData.transactions}</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                LAST BLOCK
              </Typography>
              {loading ? (
                <CircularProgress size={20} />
              ) : error ? (
                <Typography color="error">Error loading data</Typography>
              ) : (
                <Typography variant="h6">#{marketData.lastBlock}</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Header;
