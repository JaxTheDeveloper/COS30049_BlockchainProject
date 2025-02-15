import React from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Grid, 
  Divider 
} from '@mui/material';

function WalletInfo({ loading, error, walletData }) {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Error</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!walletData) return null;

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: 4,
        height: '100%',
        overflowY: 'auto'  // Allow scrolling within the container
      }}
    >
      <Paper elevation={2}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>Wallet Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" p={2}>
                <Typography color="textSecondary">Address:</Typography>
                <Typography>{walletData.address}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" p={2}>
                <Typography color="textSecondary">Balance:</Typography>
                <Typography>{walletData.balance} ETH</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" p={2}>
                <Typography color="textSecondary">Transaction Count:</Typography>
                <Typography>{walletData.transactionCount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" p={2}>
                <Typography color="textSecondary">Last Updated:</Typography>
                <Typography>{formatDate(walletData.lastUpdated)}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        <Box p={3}>
          <Typography variant="h5" gutterBottom>Recent Transactions</Typography>
          {walletData.recentTransactions.length > 0 ? (
            walletData.recentTransactions.map((tx) => (
              <Paper key={tx.hash} elevation={1} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Hash:</Typography>
                      <Typography>{formatAddress(tx.hash)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">From:</Typography>
                      <Typography>{formatAddress(tx.from)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">To:</Typography>
                      <Typography>{formatAddress(tx.to)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Value:</Typography>
                      <Typography>{tx.value} ETH</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Time:</Typography>
                      <Typography>{formatDate(tx.timestamp)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="textSecondary">Status:</Typography>
                      <Typography color={tx.isError ? 'error' : 'success'}>
                        {tx.isError ? 'Failed' : 'Success'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            ))
          ) : (
            <Typography color="textSecondary" align="center">
              No transactions found
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default WalletInfo; 