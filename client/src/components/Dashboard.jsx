"use client"

import { useState, useEffect } from "react"
import { AppBar, Toolbar, Typography, Box, Button, IconButton } from "@mui/material"
import HealthFactors from "./HealthFactors"
import ContractsTable from "./ContractsTable"

function Dashboard({ files }) {
    const [analysisData, setAnalysisData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
    // This would be replaced with your actual API call to the backend
    // For now, we'll simulate loading and then create empty data structures
    const fetchData = async () => {
        setLoading(true)

      // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

      // This is where you would fetch real data from your backend
      // const response = await fetch('/api/analysis-results');
      // const data = await response.json();

      // For now, create empty placeholder data
        setAnalysisData({
            healthFactors: [
            {
                name: "Releasability",
                grade: "A",
                previousGrade: "B",
                trendPeriod: "2 years ago",
            },
            {
                name: "Reliability",
                grade: "B",
                previousGrade: "A",
                trendPeriod: "3 years ago",
                lowestRated: {
                count: 1,
                grade: "D",
                },
            },
            {
                name: "Security Vulnerabilities",
                grade: "A",
                previousGrade: "B",
                trendPeriod: "6 months ago",
            },
            {
                name: "Security Review",
                grade: "C",
                previousGrade: "B",
                trendPeriod: "3 months ago",
                lowestRated: {
                count: 4,
                grade: "E",
                },
            },
            {
                name: "Maintainability",
                grade: "A",
                previousGrade: "A",
                trendPeriod: "always been",
            },
            ],
            contracts: [], // This would be populated from your backend
        })

        setLoading(false)
        }

        if (files.length > 0) {
        fetchData()
        }
    }, [files])


    if (loading) {
        return (
        <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h5">Analyzing smart contracts...</Typography>
        </Box>
        )
    }

    if (!analysisData) {
        return null
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" color="default" elevation={1}>
        </AppBar>

        <Box sx={{ mt: 4, px: 3, width: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                Portfolio health factors
            </Typography>
            <Button variant="outlined" size="small">
                Portfolio PDF Report
            </Button>
            </Box>

            <HealthFactors healthData={analysisData.healthFactors} />


            <Box sx={{ mt: 4 }}>
            <ContractsTable contracts={analysisData.contracts} />
            </Box>
        </Box>
        </Box>
    )
    }

    export default Dashboard

