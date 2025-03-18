    import {
        Paper,
        Table,
        TableBody,
        TableCell,
        TableContainer,
        TableHead,
        TableRow,
        Box,
        Typography,
        Chip,
    } from "@mui/material"
    import FolderIcon from "@mui/icons-material/Folder"

    // Define grade colors
    const gradeColors = {
        A: "#4caf50", // Green
        B: "#cddc39", // Lime
        C: "#ffc107", // Amber
        D: "#ff9800", // Orange
        E: "#f44336", // Red
    }

    const GradeCell = ({ grade }) => {
        if (grade === "-") {
        return <Typography variant="body2">-</Typography>
        }

        const color = gradeColors[grade] || "#999"

        return (
        <Box
            sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: color,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: 14,
            fontWeight: "bold",
            }}
        >
            {grade}
        </Box>
        )
    }

    const ContractsTable = ({ contracts }) => {
        if (!contracts || contracts.length === 0) {
        return (
            <Paper elevation={1} sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
                No contract data available yet. Analysis results will appear here.
            </Typography>
            </Paper>
        )
        }

        return (
        <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Name</TableCell>
                <TableCell align="center">Releasability</TableCell>
                <TableCell align="center">Reliability</TableCell>
                <TableCell align="center">Security Vulnerabilities</TableCell>
                <TableCell align="center">Security Review</TableCell>
                <TableCell align="center">Maintainability</TableCell>
                <TableCell align="right">Lines of Code</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {contracts.map((contract, index) => (
                <TableRow key={contract.id || index} hover>
                    <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <FolderIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2">{contract.name}</Typography>
                    </Box>
                    </TableCell>
                    <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        {contract.releasability === "Passed" ? (
                        <Chip
                            label="Passed"
                            size="small"
                            sx={{
                            backgroundColor: "#4caf50",
                            color: "white",
                            fontSize: "0.75rem",
                            height: 24,
                            }}
                        />
                        ) : (
                        <Chip
                            label="Failed"
                            size="small"
                            sx={{
                            backgroundColor: "#f44336",
                            color: "white",
                            fontSize: "0.75rem",
                            height: 24,
                            }}
                        />
                        )}
                    </Box>
                    </TableCell>
                    <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <GradeCell grade={contract.reliability} />
                    </Box>
                    </TableCell>
                    <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <GradeCell grade={contract.securityVulnerabilities} />
                    </Box>
                    </TableCell>
                    <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <GradeCell grade={contract.securityReview} />
                    </Box>
                    </TableCell>
                    <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <GradeCell grade={contract.maintainability} />
                    </Box>
                    </TableCell>
                    <TableCell align="right">
                    <Typography variant="body2">
                        {contract.linesOfCode}
                        {contract.hasProgressBar && (
                        <Box
                            component="span"
                            sx={{
                            display: "inline-block",
                            width: 50,
                            height: 8,
                            backgroundColor: "#3f51b5",
                            ml: 1,
                            borderRadius: 4,
                            verticalAlign: "middle",
                            }}
                        />
                        )}
                    </Typography>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </TableContainer>
        )
    }

    export default ContractsTable

