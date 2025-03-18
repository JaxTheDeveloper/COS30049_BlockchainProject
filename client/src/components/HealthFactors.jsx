import { Grid, Paper, Typography, Box, Tooltip, IconButton, Divider } from "@mui/material"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import TimelineIcon from "@mui/icons-material/Timeline"
import BarChartIcon from "@mui/icons-material/BarChart"

// Define grade colors
const gradeColors = {
  A: "#4caf50", // Green
  B: "#cddc39", // Lime
  C: "#ffc107", // Amber
  D: "#ff9800", // Orange
  E: "#f44336", // Red
}

const GradeCircle = ({ grade }) => {
  const color = gradeColors[grade] || "#999"

  return (
    <Box
      sx={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: color,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: 36,
        fontWeight: "bold",
        mx: "auto",
        my: 2,
      }}
    >
      {grade}
    </Box>
  )
}

const HealthFactors = ({ healthData }) => {
  return (
    <Grid container spacing={2}>
      {healthData.map((factor) => (
        <Grid item xs={12} sm={6} md={true} key={factor.name}>
          <Paper
            elevation={1}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
              <Typography variant="subtitle1" component="h3">
                {factor.name}
              </Typography>
              <Tooltip title={`Information about ${factor.name}`}>
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 2 }}>
              <GradeCircle grade={factor.grade} />

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Metric trend
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                <Typography variant="body2">
                  was{" "}
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: gradeColors[factor.previousGrade] || "#999",
                      color: "white",
                      fontSize: 12,
                      fontWeight: "bold",
                      mx: 0.5,
                    }}
                  >
                    {factor.previousGrade}
                  </Box>{" "}
                  {factor.trendPeriod}
                </Typography>
              </Box>

              {factor.lowestRated && (
                <Box sx={{ mt: 2, width: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    Lowest rated projects
                  </Typography>
                  <Typography variant="body2">
                    {factor.lowestRated.count} project{factor.lowestRated.count !== 1 ? "s" : ""} in{" "}
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: gradeColors[factor.lowestRated.grade] || "#999",
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                        mx: 0.5,
                      }}
                    >
                      {factor.lowestRated.grade}
                    </Box>
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between", p: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BarChartIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">Measures</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TimelineIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">Activity</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

export default HealthFactors

