import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom Gauge component for risk score
const RiskGauge = ({ score }) => {
  const theme = useTheme();
  
  // Determine color based on score
  let color = theme.palette.success.main; // Low risk (green)
  if (score > 75) {
    color = theme.palette.error.main; // High risk (red)
  } else if (score > 30) {
    color = theme.palette.warning.main; // Medium risk (orange/yellow)
  }
  
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          width: 200,
          height: 200,
        }}
      >
        <CircularProgress
          variant="determinate"
          value={100}
          size={200}
          thickness={10}
          sx={{ color: theme.palette.grey[200], position: 'absolute' }}
        />
        <CircularProgress
          variant="determinate"
          value={score}
          size={200}
          thickness={10}
          sx={{ color: color, position: 'absolute' }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h3" component="div">{score}</Typography>
          <Typography variant="body1" component="div">Risk Score</Typography>
        </Box>
      </Box>
    </Box>
  );
};

function ContractAnalyzer({ contractData, loading }) {
  const [highlightedLines, setHighlightedLines] = useState({});
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const theme = useTheme();

  // Handle issue hover to highlight code
  const handleIssueHover = (elements) => {
    if (!elements) return;
    
    // Create a map of all lines that should be highlighted
    const lines = {};
    elements.forEach(element => {
      if (element.source_mapping && element.source_mapping.lines) {
        element.source_mapping.lines.forEach(line => {
          lines[line] = true;
        });
      }
    });
    
    setHighlightedLines(lines);
    setHoveredIssue(elements);
  };
  
  // Clear highlights when mouse leaves
  const handleIssueLeave = () => {
    setHighlightedLines({});
    setHoveredIssue(null);
  };

  // Calculate risk score based on vulnerabilities
  const calculateRiskScore = () => {
    if (!contractData || !contractData.analysis) return 0;
    
    const { highSeverity, mediumSeverity, lowSeverity } = contractData.analysis.vulnerabilitySummary;
    
    // Weighted calculation: high = 10 points, medium = 3 points, low = 1 point
    const score = (highSeverity * 10) + (mediumSeverity * 3) + lowSeverity;
    
    // Cap at 100 and scale appropriately
    return Math.min(100, score);
  };

  // Format code with line numbers
  const codeWithLineNumbers = () => {
    if (!contractData || !contractData.sourceCode) return '';
    return contractData.sourceCode;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Analyzing contract...
        </Typography>
      </Box>
    );
  }

  if (!contractData) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5">
          Upload a smart contract to see analysis results
        </Typography>
      </Box>
    );
  }

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
      </Typography>

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
                Code Viewer
              </Typography>
            </Box>
            
            <Box sx={{ overflow: 'auto', flexGrow: 1, maxHeight: '70vh' }}>
              <SyntaxHighlighter
                language="javascript"
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
                {codeWithLineNumbers()}
              </SyntaxHighlighter>
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
                Security Analysis
              </Typography>
            </Box>

            <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1, maxHeight: '70vh' }}>
              {/* Risk Score Gauge */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <RiskGauge score={calculateRiskScore()} />
              </Box>

              {/* AI-Generated Security Assessment */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  AI Security Assessment
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.grey[50],
                    border: `1px solid ${theme.palette.grey[200]}`,
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {contractData.aiRecommendation || "No AI recommendation available."}
                  </Typography>
                </Paper>
              </Box>

              {/* Security Issues List */}
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Security Issues
              </Typography>

              {contractData.analysis && contractData.analysis.findings && 
               contractData.analysis.findings.length > 0 ? (
                <List disablePadding>
                  {contractData.analysis.findings.map((issue, index) => (
                    <Accordion 
                      key={index} 
                      sx={{ mb: 1 }}
                      onMouseEnter={() => handleIssueHover(issue.elements)}
                      onMouseLeave={handleIssueLeave}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {issue.impact === 'High' ? (
                              <ErrorIcon color="error" />
                            ) : issue.impact === 'Medium' ? (
                              <WarningIcon color="warning" />
                            ) : (
                              <InfoIcon color="info" />
                            )}
                          </ListItemIcon>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {issue.name}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={issue.impact} 
                            sx={{ 
                              ml: 'auto',
                              bgcolor: issue.impact === 'High' 
                                ? theme.palette.error.light 
                                : issue.impact === 'Medium'
                                  ? theme.palette.warning.light
                                  : theme.palette.info.light,
                              color: issue.impact === 'High' 
                                ? theme.palette.error.contrastText 
                                : issue.impact === 'Medium'
                                  ? theme.palette.warning.contrastText
                                  : theme.palette.info.contrastText,
                            }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2">{issue.description}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          Confidence: {issue.confidence}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No security issues found.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default ContractAnalyzer; 