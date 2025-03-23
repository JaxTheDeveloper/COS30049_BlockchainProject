import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Skeleton,
  Alert,
  Container,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

function Header() {
  const [marketData, setMarketData] = useState({
    price: '0.00',
    marketCap: '0.0',
    transactions: '0',
    lastBlock: '0',
    priceChange24h: '0.00',
    volume24h: '0',
    gasPrice: '0',
    priceHistory: [],
    transactionHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');

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

  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 0
      }
    }
  };

  const priceChartData = {
    labels: marketData.priceHistory?.map(point => new Date(point.timestamp).toLocaleTimeString()) || [],
    datasets: [
      {
        label: 'ETH Price',
        data: marketData.priceHistory?.map(point => point.price) || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true
      }
    ]
  };

  const transactionChartData = {
    labels: marketData.transactionHistory?.map(point => new Date(point.timestamp).toLocaleTimeString()) || [],
    datasets: [
      {
        label: 'Transactions',
        data: marketData.transactionHistory?.map(point => point.count) || [],
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        fill: true
      }
    ]
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Market Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ETHER PRICE
              </Typography>
              <Tooltip title="24h Change">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {parseFloat(marketData.priceChange24h) >= 0 ? (
                    <TrendingUpIcon sx={{ color: 'success.main' }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: 'error.main' }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      color: parseFloat(marketData.priceChange24h) >= 0 ? 'success.main' : 'error.main',
                      ml: 0.5
                    }}
                  >
                    {marketData.priceChange24h}%
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
            {loading ? (
              <Skeleton width="100%" height={32} />
            ) : error ? (
              <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                ${marketData.price} USD
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                24H VOLUME
              </Typography>
              <Tooltip title="Trading Volume">
                <IconButton size="small">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {loading ? (
              <Skeleton width="100%" height={32} />
            ) : error ? (
              <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                ${marketData.volume24h}M
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                GAS PRICE
              </Typography>
              <Tooltip title="Current Gas Price">
                <IconButton size="small">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {loading ? (
              <Skeleton width="100%" height={32} />
            ) : error ? (
              <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                {marketData.gasPrice} GWEI
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                MARKET CAP
              </Typography>
              <Tooltip title="Total Market Capitalization">
                <IconButton size="small">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {loading ? (
              <Skeleton width="100%" height={32} />
            ) : error ? (
              <Alert severity="error" sx={{ mt: 1 }}>Error loading data</Alert>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                ${marketData.marketCap}B
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Price Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                Price Chart
              </Typography>
              <Tabs
                value={timeRange}
                onChange={(e, newValue) => setTimeRange(newValue)}
                sx={{ minHeight: 'auto' }}
              >
                <Tab label="24H" value="24h" sx={{ minHeight: 'auto', py: 1 }} />
                <Tab label="7D" value="7d" sx={{ minHeight: 'auto', py: 1 }} />
                <Tab label="30D" value="30d" sx={{ minHeight: 'auto', py: 1 }} />
              </Tabs>
            </Box>
            <Box sx={{ height: 300 }}>
              {loading ? (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              ) : (
                <Line options={priceChartOptions} data={priceChartData} />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Transaction Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2.5, height: '100%', border: '1px solid #e7eaf3', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e2022' }}>
                Transaction Volume
              </Typography>
              <Tabs
                value={timeRange}
                onChange={(e, newValue) => setTimeRange(newValue)}
                sx={{ minHeight: 'auto' }}
              >
                <Tab label="24H" value="24h" sx={{ minHeight: 'auto', py: 1 }} />
                <Tab label="7D" value="7d" sx={{ minHeight: 'auto', py: 1 }} />
                <Tab label="30D" value="30d" sx={{ minHeight: 'auto', py: 1 }} />
              </Tabs>
            </Box>
            <Box sx={{ height: 300 }}>
              {loading ? (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              ) : (
                <Line options={priceChartOptions} data={transactionChartData} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Header;
