import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Skeleton,
  Alert,
  Container
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
    <Box 
      sx={{ 
        py: 3,
        width: '100%',
        textAlign: 'center'
      }}
    >
      <Container 
        maxWidth={false}
        sx={{ 
          maxWidth: '1400px !important'
        }}
      >
        <Grid 
          container 
          spacing={3} 
          sx={{ 
            mx: 'auto',
            alignItems: 'stretch'
          }}
        >
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #e7eaf3',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Typography 
                variant="subtitle2" 
                color="text.secondary" 
                gutterBottom
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                ETHER PRICE
              </Typography>
              {loading ? (
                <Skeleton width="100%" height={32} />
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
              ) : (
                <Typography 
                  variant="h6"
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e2022'
                  }}
                >
                  ${marketData.price} USD
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #e7eaf3',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Typography 
                variant="subtitle2" 
                color="text.secondary" 
                gutterBottom
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                MARKET CAP
              </Typography>
              {loading ? (
                <Skeleton width="100%" height={32} />
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
              ) : (
                <Typography 
                  variant="h6"
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e2022'
                  }}
                >
                  ${marketData.marketCap}B USD
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #e7eaf3',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Typography 
                variant="subtitle2" 
                color="text.secondary" 
                gutterBottom
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                TRANSACTIONS
              </Typography>
              {loading ? (
                <Skeleton width="100%" height={32} />
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
              ) : (
                <Typography 
                  variant="h6"
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e2022'
                  }}
                >
                  {marketData.transactions}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #e7eaf3',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Typography 
                variant="subtitle2" 
                color="text.secondary" 
                gutterBottom
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                LAST BLOCK
              </Typography>
              {loading ? (
                <Skeleton width="100%" height={32} />
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
              ) : (
                <Typography 
                  variant="h6"
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e2022'
                  }}
                >
                  #{marketData.lastBlock}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Header;
