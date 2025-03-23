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
  Button
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
      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Contracts
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.totalContracts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Vulnerabilities
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.totalVulnerabilities}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High Severity Issues
              </Typography>
              <Typography variant="h4" component="div" color="error">
                {metrics.highSeverity}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Analysis Status
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.analyzed}/{metrics.totalContracts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contracts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contract Name</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Vulnerabilities</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell>{contract.name}</TableCell>
                <TableCell>
                  {new Date(contract.upload_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(contract.status)}
                    label={contract.status}
                    color={getStatusColor(contract.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {contract.vulnerabilities?.map((vuln, index) => (
                      <Chip
                        key={index}
                        icon={<SecurityIcon />}
                        label={vuln.severity}
                        color={getSeverityColor(vuln.severity)}
                        size="small"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => navigate(`/contract/${contract.id}`)}
                    size="small"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default ContractHistory; 