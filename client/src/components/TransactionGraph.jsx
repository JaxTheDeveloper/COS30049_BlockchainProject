import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import * as d3 from 'd3';

function TransactionGraph({ data, walletAddress }) {
    const svgRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState(null);

    useEffect(() => {
        if (!data || !data.nodes || !data.edges) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        const width = 800;
        const height = 600;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        const container = svg.append('g');

        // Updated node radius
        const NODE_RADIUS = 40;  // Increased from 30 to 40

        // Adjust arrow marker refX for larger nodes
        svg.append('defs').selectAll('marker')
            .data(['end'])
            .enter().append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', NODE_RADIUS + 15)  // Adjusted for larger nodes
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#666');

        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.edges)
                .id(d => d.id)
                .distance(200))  // Increased distance for larger nodes
            .force('charge', d3.forceManyBody().strength(-600))  // Adjusted strength
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(NODE_RADIUS + 10));  // Adjusted collision

        // Links with straight lines
        const links = container.selectAll('.link')
            .data(data.edges)
            .enter()
            .append('g')
            .attr('class', 'link')
            .on('click', (event, d) => {
                try {
                    console.log('Link clicked:', d);
                    setSelectedElement({
                        type: 'link',
                        data: {
                            hash: d.hash || 'Unknown',
                            value: formatEthValue(d.value),
                            source: typeof d.source === 'object' ? d.source.id : d.source,
                            target: typeof d.target === 'object' ? d.target.id : d.target,
                            timeStamp: toNumber(d.timeStamp),
                            gasPrice: toNumber(d.gasPrice),
                            gasUsed: toNumber(d.gasUsed),
                            blockNumber: toNumber(d.blockNumber),
                            functionName: d.functionName || 'Unknown'
                        }
                    });
                    event.stopPropagation();
                } catch (error) {
                    console.error('Error in link click handler:', error, 'Link data:', d);
                }
            });

        // Straight lines with arrows
        const lines = links.append('line')  // Changed back to line from path
            .style('stroke', '#999')
            .style('stroke-width', 1.5)
            .attr('marker-end', 'url(#arrow)');

        // Transaction values
        links.append('text')
            .attr('class', 'link-label')
            .text(d => `${formatEthValue(d.value)} ETH`)
            .style('font-size', '12px')
            .style('fill', '#666')
            .style('pointer-events', 'none');

        // Updated nodes with internal labels
        const nodes = container.selectAll('.node')
            .data(data.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Larger circles
        nodes.append('circle')
            .attr('r', NODE_RADIUS)
            .style('fill', d => {
                try {
                    const normalizedAddress = d.id?.toLowerCase();
                    const normalizedWallet = walletAddress?.toLowerCase();
                    return normalizedAddress === normalizedWallet ? '#4CAF50' : '#e6a8d7';
                } catch (error) {
                    console.error('Error in node coloring:', error, 'Data:', d);
                    return '#e6a8d7'; // fallback color
                }
            })
            .on('click', (event, d) => {
                try {
                    console.log('Node clicked, raw data:', d);
                    const cleanData = extractNodeData(d);
                    console.log('Cleaned node data:', cleanData);
                    setSelectedElement({
                        type: 'node',
                        data: cleanData
                    });
                    event.stopPropagation();
                } catch (error) {
                    console.error('Error in node click handler:', error, 'Node data:', d);
                }
            });

        // Add internal labels (two lines)
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .style('font-size', '12px')
            .style('fill', '#000')
            .style('pointer-events', 'none')
            .text(d => `0x${d.id.substring(2, 6)}`);

        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .style('font-size', '12px')
            .style('fill', '#000')
            .style('pointer-events', 'none')
            .text(d => `${d.id.substring(38, 42)}`);

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        // Updated tick function for straight lines
        simulation.on('tick', () => {
            lines
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            links.selectAll('text')
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2 - 10);

            nodes.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        svg.on('click', () => setSelectedElement(null));

    }, [data, walletAddress]);

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
            if (typeof value === 'object' && 'low' in value) {
                value = value.low;
            }
            const ethValue = parseFloat(value) / 1e18; // Convert from Wei to ETH
            return ethValue.toFixed(4);
        } catch (error) {
            console.error('Error formatting ETH value:', error);
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

    return (
        <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            height: '100%', 
            position: 'relative'  // Added for absolute positioning of sidebar
        }}>
            {/* Graph */}
            <Box sx={{ flexGrow: 1, height: '100%' }}>
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
            </Box>

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
                    {selectedElement.type === 'node' ? (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Node Details
                            </Typography>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Address
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        wordBreak: 'break-all',
                                        bgcolor: 'grey.100',
                                        p: 1,
                                        borderRadius: 1,
                                        fontFamily: 'monospace'
                                    }}
                                >
                                    {String(selectedElement.data.id)}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Balance
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {String(selectedElement.data.balance)} ETH
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Transaction Count
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {String(selectedElement.data.transactionCount)}
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Transaction Details
                            </Typography>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Hash
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        wordBreak: 'break-all',
                                        bgcolor: 'grey.100',
                                        p: 1,
                                        borderRadius: 1,
                                        fontFamily: 'monospace'
                                    }}
                                >
                                    {selectedElement.data.hash}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Value
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {selectedElement.data.value} ETH
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    From
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace'
                                    }}
                                >
                                    {selectedElement.data.source}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    To
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace'
                                    }}
                                >
                                    {selectedElement.data.target}
                                </Typography>
                            </Box>

                            {selectedElement.data.timeStamp && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Time
                                    </Typography>
                                    <Typography variant="body1">
                                        {new Date(parseInt(selectedElement.data.timeStamp) * 1000).toLocaleString()}
                                    </Typography>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
}

export default TransactionGraph; 