import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Stack,
  TablePagination
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

function ContractHistory() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    totalVulnerabilities: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    analyzed: 0,
    pending: 0
  });

  useEffect(() => {
    loadContractHistory();
  }, []);

  const loadContractHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/contracts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contract history');
      }

      setContracts(data);
      
      // Calculate metrics
      const newMetrics = {
        totalContracts: data.length,
        totalVulnerabilities: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        analyzed: 0,
        pending: 0
      };

      data.forEach(contract => {
        if (contract.vulnerabilities) {
          contract.vulnerabilities.forEach(vuln => {
            newMetrics.totalVulnerabilities++;
            switch (vuln.severity.toLowerCase()) {
              case 'high':
                newMetrics.highSeverity++;
                break;
              case 'medium':
                newMetrics.mediumSeverity++;
                break;
              case 'low':
                newMetrics.lowSeverity++;
                break;
            }
          });
        }
        if (contract.status === 'completed') {
          newMetrics.analyzed++;
        } else {
          newMetrics.pending++;
        }
      });

      setMetrics(newMetrics);
    } catch (err) {
      console.error('Error loading contract history:', err);
      setError(err.message || 'Error loading contract history');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'pending':
        return <PendingIcon />;
      case 'failed':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ color: '#1e2022', fontWeight: 600, mb: 1 }}>
          Contract History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and analyze your uploaded smart contracts
        </Typography>
      </Box>

      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Contracts
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.totalContracts}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Vulnerabilities
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.totalVulnerabilities}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              High Severity Issues
            </Typography>
            <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 600 }}>
              {metrics.highSeverity}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Analysis Status
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.analyzed}/{metrics.totalContracts}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Contracts Table */}
      <TableContainer component={Paper} sx={{ 
        borderRadius: 2,
        border: '1px solid #e7eaf3',
        overflow: 'hidden'
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022', width: '70px' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Contract Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Upload Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Vulnerabilities</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((contract) => (
                <TableRow 
                  key={contract.id}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: '#f8f9fa',
                      '& .action-button': {
                        opacity: 1
                      }
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#77838f', fontFamily: 'monospace' }}>
                      {contract.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e2022' }}>
                      {contract.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(contract.upload_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(contract.status)}
                      label={contract.status}
                      color={getStatusColor(contract.status)}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        '& .MuiChip-icon': { 
                          fontSize: 16,
                          mr: 0.5 
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {contract.vulnerabilities?.map((vuln, index) => (
                        <Chip
                          key={`${contract.id}-${index}`}
                          icon={<SecurityIcon sx={{ fontSize: 16 }} />}
                          label={vuln.severity}
                          color={getSeverityColor(vuln.severity)}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            '& .MuiChip-icon': { mr: 0.5 }
                          }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      className="action-button"
                      onClick={() => navigate(`/contract/${contract.id}`)}
                      size="small"
                      sx={{ 
                        color: 'primary.main',
                        opacity: 0.7,
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'primary.lighter',
                          opacity: 1
                        }
                      }}
                    >
                      <VisibilityIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #e7eaf3',
          bgcolor: '#fff'
        }}>
          <TablePagination
            component="div"
            count={contracts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              '.MuiTablePagination-select': {
                borderRadius: 1,
                '&:focus': {
                  bgcolor: 'transparent'
                }
              },
              '.MuiTablePagination-selectIcon': {
                color: '#77838f'
              }
            }}
          />
        </Box>
      </TableContainer>
    </Box>
  );
}

export default ContractHistory; 