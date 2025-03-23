import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(3),
  borderRadius: theme.spacing(2),
}));

const ContractResults = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractData, setContractData] = useState(null);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get the contract status
        const statusResponse = await fetch(`http://localhost:5000/api/contract/${contractId}/status`);
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to fetch contract status');
        }

        // Then, get the contract report
        const reportResponse = await fetch(`http://localhost:5000/api/contract/${contractId}/report`);
        const reportData = await reportResponse.json();

        if (!reportResponse.ok) {
          throw new Error(reportData.error || 'Failed to fetch contract report');
        }

        setContractData({
          ...statusData,
          ...reportData,
        });
      } catch (err) {
        setError(err.message);
        console.error('Error fetching contract data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContractData();
    }
  }, [contractId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The contract analysis could not be loaded. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (!contractData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No contract data found. Please check the contract ID and try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <StyledPaper>
        <Typography variant="h4" gutterBottom>
          Contract Analysis Results
        </Typography>
        
        <Grid container spacing={3}>
          {/* Contract Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contract Details
                </Typography>
                <Typography variant="body1">
                  Name: {contractData.name}
                </Typography>
                {contractData.address && (
                  <Typography variant="body1">
                    Address: {contractData.address}
                  </Typography>
                )}
                <Typography variant="body1">
                  Status: {contractData.status}
                </Typography>
                <Typography variant="body1">
                  Upload Date: {new Date(contractData.upload_date).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Vulnerability Summary */}
          {contractData.vulnerabilitySummary && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Vulnerability Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="error">
                        {contractData.vulnerabilitySummary.highSeverity}
                      </Typography>
                      <Typography variant="body2">High Severity</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="warning.main">
                        {contractData.vulnerabilitySummary.mediumSeverity}
                      </Typography>
                      <Typography variant="body2">Medium Severity</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4" color="info.main">
                        {contractData.vulnerabilitySummary.lowSeverity}
                      </Typography>
                      <Typography variant="body2">Low Severity</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h4">
                        {contractData.vulnerabilitySummary.total}
                      </Typography>
                      <Typography variant="body2">Total Issues</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Findings */}
          {contractData.findings && contractData.findings.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Findings
                  </Typography>
                  {contractData.findings.map((finding, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {finding.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Impact: {finding.impact} | Confidence: {finding.confidence}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {finding.description}
                      </Typography>
                      {finding.elements && finding.elements.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          Affected Elements: {finding.elements.length}
                        </Typography>
                      )}
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </StyledPaper>
    </Box>
  );
};

export default ContractResults;

