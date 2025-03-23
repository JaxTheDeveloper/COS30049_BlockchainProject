import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Tooltip,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom Gauge component for risk score
const RiskGauge = ({ vulnerabilitySummary, riskScore, findings }) => {
  const theme = useTheme();
  
  // Calculate total findings including optimization
  const total = vulnerabilitySummary.high_severity + 
                vulnerabilitySummary.medium_severity + 
                vulnerabilitySummary.low_severity + 
                vulnerabilitySummary.informational +
                (findings?.optimization?.length || 0);

  // Determine risk level and score based on highest severity present
  let riskLevel = 'Low Risk';
  let riskColor = theme.palette.success.main;
  let calculatedRiskScore = 0;
  
  if (vulnerabilitySummary.high_severity > 0) {
    riskLevel = 'Very High Risk';
    riskColor = theme.palette.error.main;
    calculatedRiskScore = 90;
  } else if (vulnerabilitySummary.medium_severity > 0) {
    riskLevel = 'Medium Risk';
    riskColor = theme.palette.warning.main;
    calculatedRiskScore = 60;
  } else if (vulnerabilitySummary.low_severity > 0) {
    riskLevel = 'Low Risk';
    riskColor = '#FFD700';
    calculatedRiskScore = 30;
  }

  // Create SVG path for arc
  const createArc = (startAngle, endAngle, radius) => {
    const start = {
      x: Math.cos(startAngle) * radius + 100,
      y: Math.sin(startAngle) * radius + 100
    };
    const end = {
      x: Math.cos(endAngle) * radius + 100,
      y: Math.sin(endAngle) * radius + 100
    };
    const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
    
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Calculate angles for each segment
  const total360 = total > 0 ? 360 : 0;
  const highAngle = (vulnerabilitySummary.high_severity / total) * total360;
  const mediumAngle = (vulnerabilitySummary.medium_severity / total) * total360;
  const lowAngle = (vulnerabilitySummary.low_severity / total) * total360;
  const infoAngle = (vulnerabilitySummary.informational / total) * total360;
  const optAngle = ((findings?.optimization?.length || 0) / total) * total360;

  // Convert degrees to radians
  const toRadians = (degrees) => (degrees - 90) * Math.PI / 180;

  // Calculate cumulative angles
  let currentAngle = 0;
  const segments = [
    {
      angle: highAngle,
      color: theme.palette.error.main,
      count: vulnerabilitySummary.high_severity,
      label: 'High'
    },
    {
      angle: mediumAngle,
      color: theme.palette.warning.main,
      count: vulnerabilitySummary.medium_severity,
      label: 'Medium'
    },
    {
      angle: lowAngle,
      color: '#FFD700',
      count: vulnerabilitySummary.low_severity,
      label: 'Low'
    },
    {
      angle: infoAngle,
      color: theme.palette.info.main,
      count: vulnerabilitySummary.informational,
      label: 'Info'
    },
    {
      angle: optAngle,
      color: theme.palette.success.main,
      count: findings?.optimization?.length || 0,
      label: 'Optimization'
    }
  ];

  return (
    <Box sx={{ 
      position: 'relative', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      gap: 2
    }}>
      <Box sx={{ 
        position: 'relative', 
        width: 200, 
        height: 200,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={theme.palette.grey[200]}
            strokeWidth="25"
          />
          
          {/* Segments */}
          {segments.map((segment, index) => {
            if (segment.count === 0) return null;
            
            const startRad = toRadians(currentAngle);
            currentAngle += segment.angle;
            const endRad = toRadians(currentAngle);
            
            return (
              <path
                key={index}
                d={createArc(startRad, endRad, 80)}
                fill="none"
                stroke={segment.color}
                strokeWidth="25"
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <Box sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: riskColor }}>
            {calculatedRiskScore}
          </Typography>
          <Typography variant="caption" sx={{ 
            color: 'text.secondary', 
            fontSize: '0.75rem',
            lineHeight: 1
          }}>
            Risk Score
          </Typography>
        </Box>
      </Box>

      {/* Risk Score Text */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: riskColor, textAlign: 'center' }}>
        {riskLevel}
      </Typography>

      {/* Total Issues */}
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: -1 }}>
        {total} Total Issues Found
      </Typography>

      {/* Legend */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '600px',
        px: 2
      }}>
        {segments.map((segment, index) => (
          segment.count > 0 && (
            <Box key={index} sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              minWidth: 'fit-content'
            }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: segment.color,
                flexShrink: 0
              }} />
              <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                {segment.label} ({segment.count})
              </Typography>
            </Box>
          )
        ))}
      </Box>
    </Box>
  );
};

function ContractAnalyzer({ loading: externalLoading, contractData: externalData, error: externalError }) {
  const { id } = useParams();
  const [contractData, setContractData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedLines, setHighlightedLines] = useState({});
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const theme = useTheme();

  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 [DEBUG] Loading state changed:', loading);
    console.log('🔄 [DEBUG] External loading:', externalLoading);
  }, [loading, externalLoading]);

  // Debug contract data changes
  useEffect(() => {
    console.log('📦 [DEBUG] Contract data changed:', contractData);
    console.log('📦 [DEBUG] External data:', externalData);
  }, [contractData, externalData]);

  // Update internal state when external props change
  useEffect(() => {
    console.log('🔄 [DEBUG] External props changed:', {
      loading: externalLoading,
      hasData: !!externalData,
      error: externalError
    });
    
    setLoading(externalLoading);
    setError(externalError);
    
    if (externalData) {
      setContractData(externalData);
    }
  }, [externalLoading, externalData, externalError]);

  // Add component mount debug message
  useEffect(() => {
    console.log('========================');
    console.log('ContractAnalyzer Mounted');
    console.log('Initial Component State:', {
      id: id,
      loading: loading,
      hasError: !!error,
      hasData: !!contractData,
      externalLoading,
      hasExternalData: !!externalData
    });
    console.log('========================');
  }, []);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        console.log('🔍 [DEBUG] Starting contract analysis fetch...');
        console.log(`📝 Contract ID: ${id}`);
        setLoading(true);
        
        const apiUrl = `http://localhost:5000/api/contract/${id}/report`;
        console.log(`🌐 [DEBUG] API Request URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        console.log(`📥 [DEBUG] Response status:`, response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 [DEBUG] Received data:`, data);

        if (!data) {
          throw new Error('No data received from server');
        }
        
        // Ensure all required fields exist
        const processedData = {
          id: data.id,
          name: data.contract_name || 'Unnamed Contract',
          filename: data.filename || 'Unknown File',
          address: data.contract_address,
          sourceCode: data.source_code || '',
          uploadDate: data.upload_date,
          status: data.status || 'unknown',
          riskScore: data.risk_score || 0,
          vulnerability_summary: data.vulnerability_summary || {
            total: 0,
            high_severity: 0,
            medium_severity: 0,
            low_severity: 0
          },
          findings: data.findings || {
            contract_name: data.contract_name || 'Unnamed Contract',
            vulnerabilities: [],
            informational: [],
            optimization: []
          }
        };
        
        console.log(`📊 [DEBUG] Processed data:`, processedData);
        console.log(`📄 [DEBUG] Source code length:`, processedData.sourceCode.length);
        setContractData(processedData);
        setError(null);
      } catch (err) {
        console.error('❌ [DEBUG] Error fetching contract data:', err);
        setError(err.message);
      } finally {
        console.log('🏁 [DEBUG] Setting loading to false');
        setLoading(false);
      }
    };

    if (id) {
      console.log('🚀 [DEBUG] Initiating fetch for contract ID:', id);
      fetchContractData();
    } else {
      console.log('⚠️ [DEBUG] No contract ID provided');
      setLoading(false);
    }
  }, [id]);

  console.log('🎯 [DEBUG] Render state:', { loading, error, hasData: !!contractData });

  // Handle issue hover to highlight code
  const handleIssueHover = (lines) => {
    if (!lines || !Array.isArray(lines)) return;
    
    // Create a map of all lines that should be highlighted
    const lineMap = {};
    lines.forEach(line => {
      lineMap[line] = true;
    });
    
    setHighlightedLines(lineMap);
  };
  
  // Clear highlights when mouse leaves
  const handleIssueLeave = () => {
    setHighlightedLines({});
  };

  if (loading) {
    console.log('⌛ [DEBUG] Rendering loading state');
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px', py: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Contract Analysis...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Contract ID: {id}
        </Typography>
      </Box>
    );
  }

  if (error) {
    console.log('❌ [DEBUG] Rendering error state:', error);
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error: {error}
      </Alert>
    );
  }

  if (!contractData) {
    console.log('⚠️ [DEBUG] Rendering no data state');
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5">
          No contract data available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Contract ID: {id}
        </Typography>
      </Box>
    );
  }

  // Ensure vulnerability_summary exists in the current data
  const vulnerabilitySummary = {
    total: 0,
    high_severity: 0,
    medium_severity: 0,
    low_severity: 0,
    informational: 0,
    ...(contractData.vulnerability_summary || {}),
  };

  // Count vulnerabilities from findings
  if (contractData.findings) {
    // Count vulnerabilities
    vulnerabilitySummary.high_severity = contractData.findings.vulnerabilities.filter(
      v => v.severity === 'High'
    ).length;
    vulnerabilitySummary.medium_severity = contractData.findings.vulnerabilities.filter(
      v => v.severity === 'Medium'
    ).length;
    vulnerabilitySummary.low_severity = contractData.findings.vulnerabilities.filter(
      v => v.severity === 'Low'
    ).length;
    vulnerabilitySummary.informational = contractData.findings.informational.length;
    vulnerabilitySummary.total = vulnerabilitySummary.high_severity + 
                                vulnerabilitySummary.medium_severity + 
                                vulnerabilitySummary.low_severity + 
                                vulnerabilitySummary.informational;
  }

  console.log('📊 [DEBUG] Vulnerability Summary:', vulnerabilitySummary);

  // Determine risk score color and text
  const riskScoreColor = contractData.riskScore > 75 ? theme.palette.error.main :
                        contractData.riskScore > 30 ? theme.palette.warning.main :
                        theme.palette.success.main;
  
  const riskScoreText = contractData.riskScore > 75 ? 'High Risk' :
                       contractData.riskScore > 30 ? 'Medium Risk' :
                       'Low Risk';

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mt: 3, 
        p: 3, 
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Smart Contract Analysis: {contractData.name}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        {contractData.address && (
          <Box component="span" sx={{ display: 'block' }}>
            Contract Address: {contractData.address}
          </Box>
        )}
        File: {contractData.filename}
        <Box component="span" sx={{ display: 'block' }}>
          Last Uploaded: {new Date(contractData.last_upload_date || contractData.uploadDate).toLocaleString()}
        </Box>
      </Typography>

      {/* Vulnerability Summary - Moved to top */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Vulnerability Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ 
              p: 2, 
              bgcolor: theme.palette.error.main, 
              color: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {vulnerabilitySummary.high_severity}
              </Typography>
              <Typography variant="body2">High Severity</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ 
              p: 2, 
              bgcolor: theme.palette.warning.main, 
              color: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {vulnerabilitySummary.medium_severity}
              </Typography>
              <Typography variant="body2">Medium Severity</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ 
              p: 2, 
              bgcolor: '#FFD700',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)' }}>
                {vulnerabilitySummary.low_severity}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>Low Severity</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ 
              p: 2, 
              bgcolor: theme.palette.success.main, 
              color: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {vulnerabilitySummary.informational || 0}
              </Typography>
              <Typography variant="body2">Informational</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Main content grid */}
      <Grid container spacing={3}>
        {/* Left column: Code viewer */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={1}
            sx={{ 
              height: '100%', 
              bgcolor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.grey[200]}`,
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.grey[200]}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Source Code
              </Typography>
            </Box>
            
            <Box sx={{ overflow: 'auto', flexGrow: 1, maxHeight: '70vh' }}>
              {contractData.sourceCode ? (
                <SyntaxHighlighter
                  language="solidity"
                  style={tomorrow}
                  showLineNumbers={true}
                  wrapLines={true}
                  lineProps={lineNumber => {
                    const style = { display: 'block' };
                    if (highlightedLines[lineNumber]) {
                      style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                    }
                    return { style };
                  }}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    backgroundColor: theme.palette.grey[50],
                  }}
                >
                  {contractData.sourceCode}
                </SyntaxHighlighter>
              ) : (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">
                    No source code available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right column: Analysis results */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={1}
            sx={{
              height: '100%',
              borderRadius: 1,
              border: `1px solid ${theme.palette.grey[200]}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.grey[200]}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Security Analysis Results
              </Typography>
            </Box>

            <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1, maxHeight: '70vh' }}>
              {/* Risk Score */}
              <Box sx={{ mb: 3 }}>
                <RiskGauge 
                  vulnerabilitySummary={vulnerabilitySummary} 
                  riskScore={contractData.riskScore}
                  findings={contractData.findings}
                />
              </Box>

              {/* Detailed Findings */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Detailed Findings
                </Typography>

                {contractData.findings.vulnerabilities.length > 0 ? (
                  <List disablePadding>
                    {contractData.findings.vulnerabilities.map((vulnerability, index) => (
                      <Accordion 
                        key={index}
                        sx={{ 
                          mb: 2, 
                          border: `1px solid ${
                            vulnerability.severity === 'High' ? theme.palette.error.main :
                            vulnerability.severity === 'Medium' ? theme.palette.warning.main :
                            vulnerability.severity === 'Low' ? '#FFD700' :
                            theme.palette.success.main
                          }`,
                          '&:before': {
                            display: 'none',
                          },
                          boxShadow: 'none',
                        }}
                        onMouseEnter={() => handleIssueHover(vulnerability.lines)}
                        onMouseLeave={handleIssueLeave}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon sx={{ 
                            color: vulnerability.severity === 'Low' ? 'rgba(0, 0, 0, 0.87)' : 'white' 
                          }} />}
                          sx={{ 
                            bgcolor: 
                              vulnerability.severity === 'High' ? theme.palette.error.main :
                              vulnerability.severity === 'Medium' ? theme.palette.warning.main :
                              vulnerability.severity === 'Low' ? '#FFD700' :
                              theme.palette.success.main,
                            color: vulnerability.severity === 'Low' ? 'rgba(0, 0, 0, 0.87)' : 'white',
                            '& .MuiAccordionSummary-content': {
                              margin: '8px 0',
                            }
                          }}
                        >
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              {vulnerability.severity === 'High' ? (
                                <ErrorIcon sx={{ color: 'white' }} />
                              ) : vulnerability.severity === 'Medium' ? (
                                <WarningIcon sx={{ color: 'white' }} />
                              ) : vulnerability.severity === 'Low' ? (
                                <WarningIcon sx={{ color: 'rgba(0, 0, 0, 0.87)' }} />
                              ) : (
                                <InfoIcon sx={{ color: 'white' }} />
                              )}
                            </Grid>
                            <Grid item xs>
                              <Typography variant="subtitle1" sx={{ 
                                fontWeight: 600, 
                                color: vulnerability.severity === 'Low' ? 'rgba(0, 0, 0, 0.87)' : 'white'
                              }}>
                                {vulnerability.title}
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Chip 
                                size="small" 
                                label={vulnerability.severity}
                                sx={{
                                  bgcolor: 'white',
                                  color: vulnerability.severity === 'High' ? theme.palette.error.main :
                                         vulnerability.severity === 'Medium' ? theme.palette.warning.main :
                                         vulnerability.severity === 'Low' ? '#FFD700' :
                                         theme.palette.success.main,
                                  fontWeight: 500
                                }}
                              />
                            </Grid>
                          </Grid>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                          {/* Description Section */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                              Description
                            </Typography>
                            <Typography variant="body2" component="div">
                              {(() => {
                                let desc = vulnerability.description;
                                desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+-\d+\)/g, '');
                                desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+\)/g, '');
                                
                                const sections = desc.split('\n').filter(line => line.trim());
                                
                                return sections.map((section, idx) => {
                                  section = section.replace('State variables written after the call(s):', 'State Changes:');
                                  section = section.replace('External calls:', 'External Calls:');
                                  section = section.replace(/C:\/Users\/.*?\.sol#\d+/g, '');
                                  
                                  if (section.includes('State Changes:') || section.includes('External Calls:')) {
                                    return (
                                      <Box key={idx} sx={{ mt: 2, mb: 2 }}>
                                        <Typography 
                                          variant="subtitle2" 
                                          sx={{ 
                                            color: 'text.primary',
                                            fontWeight: 600,
                                            mb: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                          }}
                                        >
                                          {section.includes('External Calls:') ? (
                                            <Box component="span" sx={{ 
                                              width: 8, 
                                              height: 8, 
                                              borderRadius: '50%', 
                                              bgcolor: 'primary.main',
                                              display: 'inline-block'
                                            }} />
                                          ) : (
                                            <Box component="span" sx={{ 
                                              width: 8, 
                                              height: 8, 
                                              borderRadius: '50%', 
                                              bgcolor: 'warning.main',
                                              display: 'inline-block'
                                            }} />
                                          )}
                                          {section.split(':')[0]}
                                        </Typography>
                                        <Box sx={{ 
                                          mt: 1,
                                          p: 2,
                                          bgcolor: 'grey.50',
                                          borderRadius: 1,
                                          fontFamily: 'monospace',
                                          fontSize: '0.875rem',
                                          border: `1px solid ${theme.palette.grey[200]}`,
                                          color: 'text.primary',
                                          overflowX: 'auto',
                                          '& code': {
                                            color: 'text.primary',
                                            fontWeight: 500
                                          }
                                        }}>
                                          {section.split(':')[1].split(',').map((item, i) => (
                                            <Box key={i} sx={{ 
                                              mb: i < section.split(':')[1].split(',').length - 1 ? 1 : 0,
                                              fontWeight: 500,
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word'
                                            }}>
                                              {item.trim()}
                                            </Box>
                                          ))}
                                        </Box>
                                      </Box>
                                    );
                                  }
                                  return (
                                    <Box key={idx} sx={{ 
                                      mb: 2,
                                      color: 'text.primary',
                                      fontWeight: 400,
                                      '& code': {
                                        bgcolor: 'grey.100',
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        fontFamily: 'monospace',
                                        color: 'text.primary',
                                        fontWeight: 500
                                      }
                                    }}>
                                      {section}
                                    </Box>
                                  );
                                });
                              })()}
                            </Typography>
                          </Box>

                          {/* Impact Section */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                              Impact
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: 1,
                              p: 2,
                              bgcolor: 'grey.50',
                              borderRadius: 1,
                              border: `1px solid ${theme.palette.grey[200]}`,
                              color: 'text.primary',
                              overflowX: 'auto'
                            }}>
                              {vulnerability.severity === 'High' ? <ErrorIcon color="error" fontSize="small" /> :
                               vulnerability.severity === 'Medium' ? <WarningIcon color="warning" fontSize="small" /> :
                               vulnerability.severity === 'Low' ? <WarningIcon color="warning" fontSize="small" /> :
                               <InfoIcon color="info" fontSize="small" />}
                              <Typography variant="body2" sx={{ 
                                color: 'text.primary', 
                                fontWeight: 400,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                This is a <strong>{vulnerability.severity.toLowerCase()}</strong> severity issue 
                                with <strong>{vulnerability.confidence.toLowerCase()}</strong> confidence.
                              </Typography>
                            </Box>
                          </Box>

                          {/* Location Section */}
                          {vulnerability.lines && vulnerability.lines.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                                Affected Code Location
                              </Typography>
                              <Box sx={{ 
                                bgcolor: 'grey.50', 
                                p: 2,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                border: `1px solid ${theme.palette.grey[200]}`,
                                color: 'text.primary',
                                overflowX: 'auto'
                              }}>
                                <Typography variant="body2" sx={{ 
                                  fontFamily: 'inherit',
                                  color: 'text.primary',
                                  fontWeight: 500,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}>
                                  Lines: {vulnerability.lines.join(', ')}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </List>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    No vulnerabilities were found in this contract.
                  </Alert>
                )}

                {/* Informational Findings Section */}
                {contractData.findings.informational.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.info.main }}>
                      Informational Findings
                    </Typography>
                    <List disablePadding>
                      {contractData.findings.informational.map((finding, index) => (
                        <Accordion 
                          key={`info-${index}`}
                          sx={{ 
                            mb: 2, 
                            border: `1px solid ${theme.palette.info.main}`,
                            '&:before': {
                              display: 'none',
                            },
                            boxShadow: 'none',
                          }}
                          onMouseEnter={() => handleIssueHover(finding.lines)}
                          onMouseLeave={handleIssueLeave}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                            sx={{ 
                              bgcolor: theme.palette.info.main,
                              color: 'white',
                              '& .MuiAccordionSummary-content': {
                                margin: '8px 0',
                              }
                            }}
                          >
                            <Grid container alignItems="center" spacing={1}>
                              <Grid item>
                                <InfoIcon sx={{ color: 'white' }} />
                              </Grid>
                              <Grid item xs>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                                  {finding.title}
                                </Typography>
                              </Grid>
                              <Grid item>
                                <Chip 
                                  size="small" 
                                  label="Informational"
                                  sx={{
                                    bgcolor: 'white',
                                    color: theme.palette.info.main,
                                    fontWeight: 500
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </AccordionSummary>

                          <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                            {/* Description Section */}
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                                Description
                              </Typography>
                              <Typography variant="body2" component="div">
                                {(() => {
                                  let desc = finding.description;
                                  desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+-\d+\)/g, '');
                                  desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+\)/g, '');
                                  
                                  const sections = desc.split('\n').filter(line => line.trim());
                                  
                                  return sections.map((section, idx) => {
                                    section = section.replace('State variables written after the call(s):', 'State Changes:');
                                    section = section.replace('External calls:', 'External Calls:');
                                    section = section.replace(/C:\/Users\/.*?\.sol#\d+/g, '');
                                    
                                    if (section.includes('State Changes:') || section.includes('External Calls:')) {
                                      return (
                                        <Box key={idx} sx={{ mt: 2, mb: 2 }}>
                                          <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                              color: 'text.primary',
                                              fontWeight: 600,
                                              mb: 1,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 1
                                            }}
                                          >
                                            {section.includes('External Calls:') ? (
                                              <Box component="span" sx={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                bgcolor: 'primary.main',
                                                display: 'inline-block'
                                              }} />
                                            ) : (
                                              <Box component="span" sx={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                bgcolor: 'warning.main',
                                                display: 'inline-block'
                                              }} />
                                            )}
                                            {section.split(':')[0]}
                                          </Typography>
                                          <Box sx={{ 
                                            mt: 1,
                                            p: 2,
                                            bgcolor: 'grey.50',
                                            borderRadius: 1,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            color: 'text.primary',
                                            overflowX: 'auto',
                                            '& code': {
                                              color: 'text.primary',
                                              fontWeight: 500
                                            }
                                          }}>
                                            {section.split(':')[1].split(',').map((item, i) => (
                                              <Box key={i} sx={{ 
                                                mb: i < section.split(':')[1].split(',').length - 1 ? 1 : 0,
                                                fontWeight: 500,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                              }}>
                                                {item.trim()}
                                              </Box>
                                            ))}
                                          </Box>
                                        </Box>
                                      );
                                    }
                                    return (
                                      <Box key={idx} sx={{ 
                                        mb: 2,
                                        color: 'text.primary',
                                        fontWeight: 400,
                                        '& code': {
                                          bgcolor: 'grey.100',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          fontFamily: 'monospace',
                                          color: 'text.primary',
                                          fontWeight: 500
                                        }
                                      }}>
                                        {section}
                                      </Box>
                                    );
                                  });
                                })()}
                              </Typography>
                            </Box>

                            {/* Location Section */}
                            {finding.lines && finding.lines.length > 0 && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                                  Affected Code Location
                                </Typography>
                                <Box sx={{ 
                                  bgcolor: 'grey.50', 
                                  p: 2,
                                  borderRadius: 1,
                                  fontFamily: 'monospace',
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  color: 'text.primary',
                                  overflowX: 'auto'
                                }}>
                                  <Typography variant="body2" sx={{ 
                                    fontFamily: 'inherit',
                                    color: 'text.primary',
                                    fontWeight: 500,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}>
                                    Lines: {finding.lines.join(', ')}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Optimization Findings Section */}
                {contractData.findings.optimization.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.success.main }}>
                      Optimization Suggestions
                    </Typography>
                    <List disablePadding>
                      {contractData.findings.optimization.map((finding, index) => (
                        <Accordion 
                          key={`opt-${index}`}
                          sx={{ 
                            mb: 2, 
                            border: `1px solid ${theme.palette.success.main}`,
                            '&:before': {
                              display: 'none',
                            },
                            boxShadow: 'none',
                          }}
                          onMouseEnter={() => handleIssueHover(finding.lines)}
                          onMouseLeave={handleIssueLeave}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                            sx={{ 
                              bgcolor: theme.palette.success.main,
                              color: 'white',
                              '& .MuiAccordionSummary-content': {
                                margin: '8px 0',
                              }
                            }}
                          >
                            <Grid container alignItems="center" spacing={1}>
                              <Grid item>
                                <InfoIcon sx={{ color: 'white' }} />
                              </Grid>
                              <Grid item xs>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                                  {finding.title}
                                </Typography>
                              </Grid>
                              <Grid item>
                                <Chip 
                                  size="small" 
                                  label="Optimization"
                                  sx={{
                                    bgcolor: 'white',
                                    color: theme.palette.success.main,
                                    fontWeight: 500
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </AccordionSummary>

                          <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                            {/* Description Section */}
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                                Description
                              </Typography>
                              <Typography variant="body2" component="div">
                                {(() => {
                                  let desc = finding.description;
                                  desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+-\d+\)/g, '');
                                  desc = desc.replace(/\(C:\/Users\/.*?\.sol#\d+\)/g, '');
                                  
                                  const sections = desc.split('\n').filter(line => line.trim());
                                  
                                  return sections.map((section, idx) => {
                                    section = section.replace('State variables written after the call(s):', 'State Changes:');
                                    section = section.replace('External calls:', 'External Calls:');
                                    section = section.replace(/C:\/Users\/.*?\.sol#\d+/g, '');
                                    
                                    if (section.includes('State Changes:') || section.includes('External Calls:')) {
                                      return (
                                        <Box key={idx} sx={{ mt: 2, mb: 2 }}>
                                          <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                              color: 'text.primary',
                                              fontWeight: 600,
                                              mb: 1,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 1
                                            }}
                                          >
                                            {section.includes('External Calls:') ? (
                                              <Box component="span" sx={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                bgcolor: 'primary.main',
                                                display: 'inline-block'
                                              }} />
                                            ) : (
                                              <Box component="span" sx={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                bgcolor: 'warning.main',
                                                display: 'inline-block'
                                              }} />
                                            )}
                                            {section.split(':')[0]}
                                          </Typography>
                                          <Box sx={{ 
                                            mt: 1,
                                            p: 2,
                                            bgcolor: 'grey.50',
                                            borderRadius: 1,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            color: 'text.primary',
                                            overflowX: 'auto',
                                            '& code': {
                                              color: 'text.primary',
                                              fontWeight: 500
                                            }
                                          }}>
                                            {section.split(':')[1].split(',').map((item, i) => (
                                              <Box key={i} sx={{ 
                                                mb: i < section.split(':')[1].split(',').length - 1 ? 1 : 0,
                                                fontWeight: 500,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                              }}>
                                                {item.trim()}
                                              </Box>
                                            ))}
                                          </Box>
                                        </Box>
                                      );
                                    }
                                    return (
                                      <Box key={idx} sx={{ 
                                        mb: 2,
                                        color: 'text.primary',
                                        fontWeight: 400,
                                        '& code': {
                                          bgcolor: 'grey.100',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          fontFamily: 'monospace',
                                          color: 'text.primary',
                                          fontWeight: 500
                                        }
                                      }}>
                                        {section}
                                      </Box>
                                    );
                                  });
                                })()}
                              </Typography>
                            </Box>

                            {/* Location Section */}
                            {finding.lines && finding.lines.length > 0 && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                                  Affected Code Location
                                </Typography>
                                <Box sx={{ 
                                  bgcolor: 'grey.50', 
                                  p: 2,
                                  borderRadius: 1,
                                  fontFamily: 'monospace',
                                  border: `1px solid ${theme.palette.grey[200]}`,
                                  color: 'text.primary',
                                  overflowX: 'auto'
                                }}>
                                  <Typography variant="body2" sx={{ 
                                    fontFamily: 'inherit',
                                    color: 'text.primary',
                                    fontWeight: 500,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}>
                                    Lines: {finding.lines.join(', ')}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default ContractAnalyzer; 