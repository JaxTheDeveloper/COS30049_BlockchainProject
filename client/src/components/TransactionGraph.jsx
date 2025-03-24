import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Tooltip, Chip, IconButton, Button, Divider, Menu, MenuItem } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import * as d3 from 'd3';

function TransactionGraph({ data: propData, walletAddress }) {
    const svgRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const zoomRef = useRef(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [data, setData] = useState(propData || { nodes: [], edges: [] });
    
    // Variables to break circular dependencies between functions
    const [expandNodeState, setExpandNodeState] = useState({
        isExpanding: false
    });

    // Function to get currency colors based on transaction value
    const getValueColor = useCallback((value) => {
        const numericValue = parseFloat(formatEthValue(value));
        if (numericValue > 10) return '#FF5722'; // High value (orange-red)
        if (numericValue > 1) return '#FF9800';  // Medium-high value (orange)
        if (numericValue > 0.1) return '#FFC107'; // Medium value (amber)
        return '#8BC34A'; // Low value (light green)
    }, []);

    // Reset zoom function
    const resetZoom = useCallback(() => {
        const svg = d3.select(svgRef.current);
        const width = parseInt(svg.style('width'), 10);
        const height = parseInt(svg.style('height'), 10);
        
        svg.transition()
           .duration(750)
           .call(
               zoomRef.current.transform,
               d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
           );
           
        setZoomLevel(1);
    }, []);

    // Zoom in function
    const zoomIn = useCallback(() => {
        const newZoom = Math.min(zoomLevel + 0.5, 4);
        setZoomLevel(newZoom);
        
        const svg = d3.select(svgRef.current);
        const width = parseInt(svg.style('width'), 10);
        const height = parseInt(svg.style('height'), 10);
        
        svg.transition()
           .duration(300)
           .call(
               zoomRef.current.transform,
               d3.zoomIdentity.translate(width / 2, height / 2).scale(newZoom)
           );
    }, [zoomLevel]);

    // Zoom out function
    const zoomOut = useCallback(() => {
        const newZoom = Math.max(zoomLevel - 0.5, 0.5);
        setZoomLevel(newZoom);
        
        const svg = d3.select(svgRef.current);
        const width = parseInt(svg.style('width'), 10);
        const height = parseInt(svg.style('height'), 10);
        
        svg.transition()
           .duration(300)
           .call(
               zoomRef.current.transform,
               d3.zoomIdentity.translate(width / 2, height / 2).scale(newZoom)
           );
    }, [zoomLevel]);

    // Helper function to safely convert Neo4j Ints to numbers
    const toNumber = (value) => {
        if (!value) return 0;
        if (typeof value === 'object' && 'low' in value && 'high' in value) {
            return value.low;
        }
        return Number(value) || 0;
    };

    // Helper function to format ETH value
    const formatEthValue = (value) => {
        try {
            if (!value) return '0';
            
            // Handle Neo4j serialized strings - if it's already a string with ETH value
            if (typeof value === 'string') {
                // Remove any non-numeric characters except decimal point
                const numValue = value.replace(/[^0-9.]/g, '');
                // Try to parse it as a float
                const parsed = parseFloat(numValue);
                if (!isNaN(parsed)) {
                    return parsed.toFixed(5);
                }
            }
            
            // Handle Neo4j Int objects
            if (typeof value === 'object' && 'low' in value) {
                value = value.low;
            }
            
            // Standard conversion from Wei to ETH
            const ethValue = parseFloat(value) / 1e18;
            return ethValue.toFixed(5);
        } catch (error) {
            console.error('Error formatting ETH value:', error, 'Value type:', typeof value, 'Value:', value);
            return '0';
        }
    };

    // Helper function to safely extract node data
    const extractNodeData = (node) => {
        try {
            return {
                id: node.id || 'Unknown',
                balance: formatEthValue(node.balance),
                transactionCount: toNumber(node.transactionCount)
            };
        } catch (error) {
            console.error('Error extracting node data:', error, node);
            return {
                id: 'Unknown',
                balance: '0',
                transactionCount: 0
            };
        }
    };

    // Get etherscan links
    const getEtherscanLink = (type, value) => {
        const baseUrl = 'https://etherscan.io';
        switch (type) {
            case 'address':
                return `${baseUrl}/address/${value}`;
            case 'tx':
                return `${baseUrl}/tx/${value}`;
            default:
                return baseUrl;
        }
    };

    // Format timestamp to readable date
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown';
        try {
            return new Date(parseInt(timestamp) * 1000).toLocaleString();
        } catch (e) {
            return 'Invalid timestamp';
        }
    };

    // Handle right-click on nodes to show context menu
    const handleNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        
        // Set the position of the context menu
        setContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            nodeId: node.id
        });
    }, []);
    
    // Handle closing the context menu
    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);
    
    // Variables to break circular dependencies between functions
    let renderGraphFunction = null;
    
    // Function to initialize and render the graph
    const renderGraph = useCallback(() => {
        // Safety checks to prevent rendering with invalid data
        if (!data || !data.nodes || !data.edges || data.nodes.length === 0 || !svgRef.current) {
            console.log("Cannot render graph - missing data or SVG ref");
            return;
        }

        console.log(`Rendering graph with ${data.nodes.length} nodes and ${data.edges.length} edges`);
        
        // Clear previous graph
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Get dimensions
        const width = parseInt(svg.style('width'), 10) || 800;
        const height = parseInt(svg.style('height'), 10) || 600;
        const g = svg.append("g");

        // Create a zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                setZoomLevel(event.transform.k);
            });

        // Store the zoom for later use
        zoomRef.current = zoom;

        // Apply the zoom behavior
        svg.call(zoom);

        // Initial transform to center the graph
        svg.call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
        );

        // Check if it's initial load (only one main wallet node)
        const isInitialLoad = data.nodes.length === 1 && data.nodes[0].id === walletAddress;

        // Pre-process data to ensure all nodes have positions
        data.nodes.forEach(node => {
            // If node already has position, keep it
            if (typeof node.x === 'number' && typeof node.y === 'number') {
                // Fix node position to prevent them from moving around
                node.fx = node.x;
                node.fy = node.y;
                return;
            }
            
            // For nodes without position, set initial positions
            if (node.id === walletAddress) {
                // Main wallet in the center
                node.x = width / 2;
                node.y = height / 2;
                node.fx = width / 2; // Fixed position
                node.fy = height / 2; // Fixed position
            } else {
                // Random positions for other nodes, will be adjusted by force
                node.x = width / 2 + (Math.random() - 0.5) * 300;
                node.y = height / 2 + (Math.random() - 0.5) * 300;
            }
        });

        // Pre-process edges to ensure valid source and target
        const validEdges = data.edges.filter(edge => {
            // Convert string IDs to objects with references to actual nodes
            if (typeof edge.source === 'string') {
                const sourceNode = data.nodes.find(n => n.id === edge.source);
                if (!sourceNode) return false;
                edge.source = sourceNode;
            }
            
            if (typeof edge.target === 'string') {
                const targetNode = data.nodes.find(n => n.id === edge.target);
                if (!targetNode) return false;
                edge.target = targetNode;
            }
            
            return true;
        });

        // Create a force simulation with improved physics
        const simulation = d3.forceSimulation(data.nodes)
            .alpha(0.5)
            .alphaDecay(0.05)
            .velocityDecay(0.4)
            .force("link", d3.forceLink(validEdges)
                .id(d => d.id)
                .distance(150)
                .strength(0.3))
            .force("charge", d3.forceManyBody()
                .strength(-500)
                .distanceMax(800))
            .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
            .force("collision", d3.forceCollide().radius(50).strength(0.7));

        // Store simulation reference on the SVG element for access from other functions
        svg.property("__simulation__", simulation);

        // Don't fix node positions except initially for the main wallet
        data.nodes.forEach(node => {
            if (node.id === walletAddress) {
                node.x = width / 2;
                node.y = height / 2;
                node.fx = width / 2;
                node.fy = height / 2;
                
                // Release after initial stabilization
                setTimeout(() => {
                    node.fx = null;
                    node.fy = null;
                }, 2000);
            } else {
                // Random initial positions throughout graph area
                node.x = Math.random() * width;
                node.y = Math.random() * height;
                node.fx = null;
                node.fy = null;
            }
        });

        // Add gradient definitions for a more polished look
        const defs = svg.append("defs");

        // Add drop shadow for nodes
        defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%")
            .append("feDropShadow")
            .attr("dx", 0)
            .attr("dy", 3)
            .attr("stdDeviation", 3)
            .attr("flood-color", "rgba(0, 0, 0, 0.3)");

        // Create gradient for main wallet
        const mainWalletGradient = defs.append("radialGradient")
            .attr("id", "main-wallet-gradient")
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", "50%");

        mainWalletGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#3f51b5");

        mainWalletGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#283593");

        // Create gradient for expanded nodes
        const expandedNodeGradient = defs.append("radialGradient")
            .attr("id", "expanded-node-gradient")
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", "50%");

        expandedNodeGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#9c27b0");

        expandedNodeGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#6a1b9a");

        // Create gradient for regular nodes
        const regularNodeGradient = defs.append("radialGradient")
            .attr("id", "regular-node-gradient")
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", "50%");

        regularNodeGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#4caf50");

        regularNodeGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#2e7d32");

        // Process the links/edges with animated curves
        const link = g.append("g")
            .attr("class", "links")
            .selectAll("path")
            .data(validEdges)
            .enter()
            .append("path")
            .attr("stroke-width", d => {
                const value = parseFloat(formatEthValue(d.value));
                return Math.max(1, Math.min(4, Math.log10(value + 1))); // Thickness based on value
            })
            .attr("stroke", d => getValueColor(d.value))
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead)")
            .attr("opacity", 0.7)
            .attr("stroke-dasharray", 5)
            .attr("stroke-linecap", "round")
            .on("click", (event, d) => {
                event.stopPropagation();
                setSelectedElement({
                    type: 'transaction',
                    hash: d.hash,
                    from: d.source.id || d.source,
                    to: d.target.id || d.target,
                    value: formatEthValue(d.value),
                    timeStamp: formatTimestamp(d.timeStamp),
                    gasPrice: formatEthValue(d.gasPrice),
                    gasUsed: toNumber(d.gasUsed),
                    blockNumber: toNumber(d.blockNumber),
                    link: getEtherscanLink('tx', d.hash)
                });
            })
            .on("mouseover", function() {
                d3.select(this)
                    .attr("stroke-width", d => {
                        const value = parseFloat(formatEthValue(d.value));
                        const baseWidth = Math.max(1, Math.min(4, Math.log10(value + 1)));
                        return baseWidth + 1; // Slightly thicker on hover
                    })
                    .attr("opacity", 1);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", d => {
                        const value = parseFloat(formatEthValue(d.value));
                        return Math.max(1, Math.min(4, Math.log10(value + 1)));
                    })
                    .attr("opacity", 0.7);
            });

        // Add animation to the paths
        link.each(function() {
            const totalLength = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(1000)
                .attr("stroke-dashoffset", 0);
        });

        // Add arrowhead marker with better styling
        defs.append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "-10 -10 20 20")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M -10,-5 L 0,0 L -10,5 Z")
            .attr("fill", "#888");

        // Process the nodes with enhanced styling
        const node = g.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(data.nodes)
            .enter()
            .append("g")
            .attr("class", "node-group")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", function(event, d) {
                // Highlight the node on hover
                d3.select(this).select("circle")
                    .transition()
                    .duration(300)
                    .attr("r", d => {
                        if (d.id === walletAddress) return 35;
                        if (expandedNodes.has(d.id)) return 25;
                        return 20;
                    });
                    
                // Show node address on hover
                d3.select(this).select("text.node-label")
                    .transition()
                    .duration(300)
                    .attr("opacity", 1);
                    
                // Highlight connected edges
                link.each(function(l) {
                    if (l.source.id === d.id || l.target.id === d.id) {
                        d3.select(this)
                            .transition()
                            .duration(300)
                            .attr("opacity", 1)
                            .attr("stroke-width", d => {
                                const value = parseFloat(formatEthValue(d.value));
                                const baseWidth = Math.max(1, Math.min(4, Math.log10(value + 1)));
                                return baseWidth + 1;
                            });
                    }
                });
            })
            .on("mouseout", function(event, d) {
                // Restore normal size
                d3.select(this).select("circle")
                    .transition()
                    .duration(300)
                    .attr("r", d => {
                        if (d.id === walletAddress) return 30;
                        if (expandedNodes.has(d.id)) return 20;
                        return 15;
                    });
                    
                // Hide node address on mouse out (except for main wallet)
                d3.select(this).select("text.node-label")
                    .transition()
                    .duration(300)
                    .attr("opacity", d => d.id === walletAddress ? 1 : 0.7);
                    
                // Restore normal edge appearance
                link.each(function(l) {
                    if (l.source.id === d.id || l.target.id === d.id) {
                        d3.select(this)
                            .transition()
                            .duration(300)
                            .attr("opacity", 0.7)
                            .attr("stroke-width", d => {
                                const value = parseFloat(formatEthValue(d.value));
                                return Math.max(1, Math.min(4, Math.log10(value + 1)));
                            });
                    }
                });
            });

        // Node circles with gradient fills and glowing effect
        node.append("circle")
            .attr("r", d => {
                // Main wallet is bigger
                if (d.id === walletAddress) return 30;
                // Expanded nodes are medium size
                if (expandedNodes.has(d.id)) return 20;
                // Regular nodes are small
                return 15;
            })
            .attr("fill", d => {
                // Use gradients for more appealing visuals
                if (d.id === walletAddress) return "url(#main-wallet-gradient)";
                // Expanded nodes are purple
                if (expandedNodes.has(d.id)) return "url(#expanded-node-gradient)";
                // Regular nodes are green
                return "url(#regular-node-gradient)";
            })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("filter", "url(#drop-shadow)")
            .on("click", (event, d) => {
                event.stopPropagation();
                setSelectedElement({
                    type: 'wallet',
                    id: d.id,
                    balance: formatEthValue(d.balance),
                    transactionCount: toNumber(d.transactionCount),
                    link: getEtherscanLink('address', d.id),
                    isMainWallet: d.id === walletAddress,
                    isExpanded: expandedNodes.has(d.id)
                });
            })
            .on("contextmenu", handleNodeContextMenu);

        // Add pulsing animation to expandable nodes
        node.filter(d => !expandedNodes.has(d.id) && d.id !== walletAddress)
            .select("circle")
            .each(function() {
                const circle = d3.select(this);
                
                // Create subtle pulse animation
                function pulse() {
                    circle.transition()
                        .duration(1000)
                        .attr("stroke-width", 3)
                        .attr("stroke-opacity", 0.8)
                        .transition()
                        .duration(1000)
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", 1)
                        .on("end", pulse);
                }
                
                pulse();
            });

        // Add labels for nodes
        node.append("text")
            .attr("class", "node-label")
            .attr("dx", 0)
            .attr("dy", d => d.id === walletAddress ? 45 : 25)
            .attr("text-anchor", "middle")
            .text(d => `${d.id.substring(0, 4)}...${d.id.substring(d.id.length - 4)}`)
            .attr("fill", "#000")
            .attr("font-size", d => d.id === walletAddress ? "12px" : "10px")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("opacity", d => d.id === walletAddress ? 1 : 0.7);

        // Add a plus icon to indicate expandable nodes
        node.filter(d => !expandedNodes.has(d.id) && d.id !== walletAddress)
            .append("text")
            .attr("class", "expand-icon")
            .attr("dx", 0)
            .attr("dy", 4)
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "#fff")
            .attr("pointer-events", "none") // Pass through to the circle
            .text("+");

        // Update positions in the simulation loop
        simulation.on("tick", () => {
            // Calculate path for links with simple curves
            link.attr("d", d => {
                // Safety check for missing coordinates
                if (!d.source || !d.target || 
                    typeof d.source.x !== 'number' || 
                    typeof d.source.y !== 'number' || 
                    typeof d.target.x !== 'number' || 
                    typeof d.target.y !== 'number') {
                    return "M0,0 L0,0"; // Return empty path if invalid
                }
                
                const sourceX = d.source.x;
                const sourceY = d.source.y;
                const targetX = d.target.x;
                const targetY = d.target.y;
                
                // Calculate the midpoint
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                
                // Simple curve with minimal offset
                const offsetX = (targetY - sourceY) * 0.1;
                const offsetY = (sourceX - targetX) * 0.1;
                
                return `M${sourceX},${sourceY} Q${midX + offsetX},${midY + offsetY} ${targetX},${targetY}`;
            });

            // Update node positions with boundary constraints
            node.attr("transform", d => {
                // Constrain to graph boundaries with padding
                const padding = 30;
                d.x = Math.max(padding, Math.min(width - padding, d.x));
                d.y = Math.max(padding, Math.min(height - padding, d.y));
                
                return `translate(${d.x},${d.y})`;
            });
        });

        // Helper functions for drag behavior
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            // Constrain to graph boundaries
            const padding = 30;
            d.fx = Math.max(padding, Math.min(width - padding, event.x));
            d.fy = Math.max(padding, Math.min(height - padding, event.y));
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            // Keep fixed position after drag
        }

        // Clear selection when clicking on the background
        svg.on("click", () => {
            setSelectedElement(null);
            setContextMenu(null);
        });

        // For initial load, don't stop the simulation immediately
        // Instead, let it run for a bit with a callback to transition to fixed positions
        if (isInitialLoad) {
            simulation.alpha(0.5).restart();
            
            // After 3 seconds of animation, gradually fix node positions
            setTimeout(() => {
                data.nodes.forEach(node => {
                    // Smoothly transition to fixed positions
                    d3.select(svgRef.current)
                        .selectAll('.node-group')
                        .filter(d => d.id === node.id)
                        .each(d => {
                            // Fix the node position where it has settled
                            d.fx = d.x;
                            d.fy = d.y;
                        });
                });
            }, 3000);
        } else {
            // For complex graphs, allow longer animation
            simulation.alpha(1).restart();
        }
    }, [data, walletAddress, expandedNodes, getValueColor, svgRef, handleNodeContextMenu, formatEthValue, formatTimestamp, toNumber, getEtherscanLink, setSelectedElement, setZoomLevel, setContextMenu]);

    // Define expandNode with useCallback to handle dependencies properly
    const expandNode = useCallback(async (nodeId) => {
        if (isLoading || expandedNodes.has(nodeId) || expandNodeState.isExpanding) {
            console.log(`Node ${nodeId} is already expanded or loading in progress`);
            return;
        }
        
        setIsLoading(true);
        setExpandNodeState(prev => ({ ...prev, isExpanding: true }));
        console.log(`Expanding node: ${nodeId}`);
        
        try {
            // Get SVG dimensions for positioning
            const svg = d3.select(svgRef.current);
            const width = parseInt(svg.style('width'), 10) || 800;
            const height = parseInt(svg.style('height'), 10) || 600;
            
            // Provide visual feedback that this node is being expanded
            const nodeElement = d3.select(svgRef.current)
                .selectAll('.node-group')
                .filter(d => d.id === nodeId)
                .select('circle');
                
            if (!nodeElement.empty()) {
                nodeElement
                    .transition()
                    .duration(300)
                    .attr("fill", "url(#expanded-node-gradient)")
                    .attr("r", d => d.id === walletAddress ? 35 : 25);
            }
            
            const response = await fetch(`http://localhost:5000/api/graph/node-transactions/${nodeId}?limit=10`);
            if (!response.ok) {
                throw new Error(`Failed to fetch additional transactions: ${response.status} ${response.statusText}`);
            }
            
            const newData = await response.json();
            console.log("Received transaction data:", newData);
            
            if (!newData || !Array.isArray(newData.nodes) || !Array.isArray(newData.edges)) {
                console.error("Invalid response format:", newData);
                throw new Error("Server returned invalid data format");
            }
            
            // If no new data, mark as expanded and exit
            if (newData.nodes.length === 0 && newData.edges.length === 0) {
                console.log("No new nodes or edges found for this node");
                setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.add(nodeId);
                    return newSet;
                });
                return;
            }
            
            // Get the parent node to organize expansion around it
            const parentNode = data.nodes.find(n => n.id === nodeId);
            const parentX = parentNode ? parentNode.x : width / 2;
            const parentY = parentNode ? parentNode.y : height / 2;
            
            // Filter new nodes to exclude existing ones and the parent
            const existingNodeIds = new Set(data.nodes.map(n => n.id));
            const newNodes = newData.nodes
                .filter(n => !existingNodeIds.has(n.id) && n.id !== nodeId)
                .map((node, index, array) => {
                    // Position new nodes in a circle around the parent node
                    // This creates a clean, organized expansion pattern
                    const angleStep = (2 * Math.PI) / array.length;
                    const angle = index * angleStep;
                    
                    // Use a larger distance to separate nodes better
                    const distance = 200 + (Math.random() * 50); // Add some randomness to the distance
                    
                    // Calculate initial position based on angle and distance from parent
                    const initialX = parentX + distance * Math.cos(angle);
                    const initialY = parentY + distance * Math.sin(angle);
                    
                    return {
                        ...node,
                        x: initialX,
                        y: initialY
                        // No fixed position - let force layout arrange them
                    };
                });
            
            // Filter new edges to exclude existing ones
            const existingEdgeHashes = new Set(data.edges.map(e => e.hash));
            const newEdges = newData.edges.filter(e => !existingEdgeHashes.has(e.hash));
            
            console.log(`Adding ${newNodes.length} new nodes and ${newEdges.length} new edges`);
            
            // Update data with new nodes and edges
            setData({
                nodes: [...data.nodes, ...newNodes],
                edges: [...data.edges, ...newEdges]
            });
            
            // Mark this node as expanded
            setExpandedNodes(prev => {
                const newSet = new Set(prev);
                newSet.add(nodeId);
                return newSet;
            });
            
            // Restart the simulation using the current graph if it exists
            const d3Simulation = d3.select(svgRef.current).property("__simulation__");
            if (d3Simulation) {
                d3Simulation.alpha(0.8).restart();
            }
            
        } catch (error) {
            console.error("Error expanding node:", error);
        } finally {
            setIsLoading(false);
            setExpandNodeState(prev => ({ ...prev, isExpanding: false }));
        }
    }, [data, expandedNodes, isLoading, expandNodeState, walletAddress]);

    // Helper function to handle node expansion
    const handleExpandNode = useCallback((nodeId) => {
        expandNode(nodeId);
        handleCloseContextMenu();
    }, [expandNode, handleCloseContextMenu]);

    // Use the initial load endpoint with simpler loading and better error handling
    useEffect(() => {
        if (walletAddress) {
            setIsLoading(true);
            
            // Clear any existing data first
            setData({ nodes: [], edges: [] });
            setSelectedElement(null);
            setExpandedNodes(new Set());
            
            console.log(`Loading initial wallet data for ${walletAddress}`);
            
            fetch(`http://localhost:5000/api/graph/initial/${walletAddress}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(initialData => {
                    console.log("Initial wallet data loaded:", initialData);
                    
                    if (!initialData || !initialData.nodes || !initialData.edges) {
                        console.error("Invalid data format received from server:", initialData);
                        return;
                    }
                    
                    // Set initial data with main wallet node
                    setData(initialData);
                    
                    // Allow a brief moment for the initial render to complete
                    setTimeout(() => {
                        // Auto-expand the main wallet node for initial visualization
                        if (svgRef.current) {
                            expandNode(walletAddress);
                        }
                    }, 1500);
                })
                .catch(error => {
                    console.error("Error loading initial wallet data:", error);
                    setData({ nodes: [], edges: [] });
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [walletAddress, expandNode]); // Include expandNode to properly handle dependencies

    // Effect to re-render graph when data changes
    useEffect(() => {
        if (data && data.nodes && data.edges) {
            renderGraph();
        }
    }, [data, renderGraph]);

    // Function to display node or transaction details
    const renderDetails = () => {
        if (!selectedElement) return null;

        if (selectedElement.type === 'wallet') {
            return (
                <Box sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Wallet Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Address:
                        </Typography>
                        <Typography variant="body2" sx={{ overflowWrap: 'break-word' }}>
                            {selectedElement.id}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Balance:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.balance} ETH
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Transactions:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.transactionCount}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            href={selectedElement.link} 
                            target="_blank"
                            size="small"
                            startIcon={<OpenInNewIcon />}
                        >
                            View on Etherscan
                        </Button>
                        
                        {!selectedElement.isMainWallet && !selectedElement.isExpanded && (
                            <Button 
                                variant="outlined" 
                                color="secondary" 
                                onClick={() => expandNode(selectedElement.id)}
                                disabled={isLoading}
                                size="small"
                                startIcon={<NetworkCheckIcon />}
                            >
                                Expand Transactions
                            </Button>
                        )}
                    </Box>
                </Box>
            );
        } else if (selectedElement.type === 'transaction') {
            return (
                <Box sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Transaction Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Hash:
                        </Typography>
                        <Typography variant="body2" sx={{ overflowWrap: 'break-word' }}>
                            {selectedElement.hash}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            From:
                        </Typography>
                        <Typography variant="body2" sx={{ overflowWrap: 'break-word' }}>
                            {selectedElement.from}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            To:
                        </Typography>
                        <Typography variant="body2" sx={{ overflowWrap: 'break-word' }}>
                            {selectedElement.to}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Value:
                        </Typography>
                        <Typography variant="body1" sx={{ color: getValueColor(selectedElement.value) }}>
                            {selectedElement.value} ETH
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Time:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.timeStamp}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Gas Price:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.gasPrice} ETH
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Gas Used:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.gasUsed}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
                            Block:
                        </Typography>
                        <Typography variant="body1">
                            {selectedElement.blockNumber}
                        </Typography>
                    </Box>
                    
                    <Button 
                        variant="contained" 
                        color="primary" 
                        href={selectedElement.link} 
                        target="_blank"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                    >
                        View on Etherscan
                    </Button>
                </Box>
            );
        }
        
        return null;
    };

    // Render a loading state or empty state if needed
    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    zIndex: 10
                }}>
                    <Typography variant="h6" color="primary.main">
                        Loading transaction graph...
                    </Typography>
                </Box>
            );
        }
        
        if (!data || !data.nodes || data.nodes.length === 0) {
            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10
                }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No wallet transactions found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Try a different wallet address or check your connection
                    </Typography>
                </Box>
            );
        }
        
        return null;
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            height: '100%', 
            position: 'relative'  // Added for absolute positioning of sidebar
        }}>
            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
                }
            >
                <MenuItem onClick={() => expandNode(contextMenu?.nodeId)} disabled={isLoading}>
                    <NetworkCheckIcon fontSize="small" sx={{ mr: 1 }} />
                    Expand Next 10 Transactions
                </MenuItem>
                <MenuItem onClick={() => {
                    const node = data.nodes.find(n => n.id === contextMenu?.nodeId);
                    if (node) {
                        setSelectedElement({
                            type: 'wallet',
                            id: node.id,
                            balance: formatEthValue(node.balance),
                            transactionCount: toNumber(node.transactionCount),
                            link: getEtherscanLink('address', node.id),
                            isMainWallet: node.id === walletAddress,
                            isExpanded: expandedNodes.has(node.id)
                        });
                    }
                    handleCloseContextMenu();
                }}>
                    <AccountBalanceWalletIcon fontSize="small" sx={{ mr: 1 }} />
                    View Wallet Details
                </MenuItem>
                <MenuItem onClick={() => {
                    window.open(getEtherscanLink('address', contextMenu?.nodeId), '_blank');
                    handleCloseContextMenu();
                }}>
                    <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
                    View on Etherscan
                </MenuItem>
            </Menu>

            {/* Controls */}
            <Box sx={{ 
                position: 'absolute', 
                top: 10, 
                left: 10, 
                zIndex: 1000, 
                display: 'flex',
                gap: 1,
                bgcolor: 'rgba(255,255,255,0.8)',
                p: 1,
                borderRadius: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <Tooltip title="Zoom in">
                    <IconButton size="small" onClick={zoomIn} color="primary">
                        <ZoomInIcon />
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="Zoom out">
                    <IconButton size="small" onClick={zoomOut} color="primary">
                        <ZoomOutIcon />
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="Reset view">
                    <IconButton size="small" onClick={resetZoom} color="primary">
                        <RestartAltIcon />
                    </IconButton>
                </Tooltip>
                
                <Typography variant="caption" sx={{ ml: 1, alignSelf: 'center' }}>
                    Zoom: {Math.round(zoomLevel * 100)}%
                </Typography>
            </Box>
            
            {/* Legend */}
            <Box sx={{ 
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                zIndex: 1000,
                bgcolor: 'rgba(255,255,255,0.9)',
                p: 1.5,
                borderRadius: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                maxWidth: 220
            }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Node Types
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <svg width="20" height="20">
                        <circle cx="10" cy="10" r="8" fill="url(#main-wallet-gradient)" stroke="#fff" strokeWidth="1" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>Current wallet</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <svg width="20" height="20">
                        <circle cx="10" cy="10" r="8" fill="url(#regular-node-gradient)" stroke="#fff" strokeWidth="1" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>Connected wallet</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <svg width="20" height="20">
                        <circle cx="10" cy="10" r="8" fill="url(#expanded-node-gradient)" stroke="#fff" strokeWidth="1" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>Expanded wallet</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Transaction Value
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <svg width="22" height="10">
                        <line x1="1" y1="5" x2="21" y2="5" stroke="#FF5722" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>High value (&gt;10 ETH)</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <svg width="22" height="10">
                        <line x1="1" y1="5" x2="21" y2="5" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>Medium (1-10 ETH)</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <svg width="22" height="10">
                        <line x1="1" y1="5" x2="21" y2="5" stroke="#8BC34A" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <Typography variant="caption" sx={{ ml: 1 }}>Low value (&lt;1 ETH)</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Interactions
                </Typography>
                
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    • <b>Hover</b>: Highlight connections
                </Typography>
                
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    • <b>Left Click</b>: View details
                </Typography>
                
                <Typography variant="caption" display="block">
                    • <b>Right Click</b>: Expand transactions
                </Typography>
            </Box>

            {/* Graph */}
            <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
                <svg ref={svgRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
            </Box>

            {/* Loading indicator */}
            {isLoading && (
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    zIndex: 1001,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    <Typography variant="body2">Loading transactions...</Typography>
                </Box>
            )}

            {/* Right Sidebar */}
            {selectedElement && (
                <Box sx={{ 
                    width: 300,
                    height: '100%',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bgcolor: 'background.paper',
                    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                    borderLeft: '1px solid rgba(0,0,0,0.12)',
                    overflow: 'auto',
                    p: 3,
                    zIndex: 1000
                }}>
                    {renderDetails()}
                </Box>
            )}

            {/* Empty State */}
            {renderEmptyState()}
        </Box>
    );
}

export default TransactionGraph; 