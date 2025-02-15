import React, { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import './TransactionGraph.css';

function TransactionGraph({ walletData, onNodeClick }) {
  const [error, setError] = useState(null);
  const fgRef = useRef();
  const containerRef = useRef();

  // Process the graph data
  const processGraphData = () => {
    try {
      const nodes = new Map();
      const links = [];

      if (!walletData) return { nodes: [], links: [] };

      // Add main wallet node
      nodes.set(walletData.address, {
        id: walletData.address,
        name: walletData.address,
        balance: walletData.balance,
        isMain: true
      });

      // First pass: collect all nodes
      if (Array.isArray(walletData.recentTransactions)) {
        walletData.recentTransactions.forEach(tx => {
          if (!nodes.has(tx.from)) {
            nodes.set(tx.from, {
              id: tx.from,
              name: tx.from,
              isConnected: true
            });
          }
          if (!nodes.has(tx.to)) {
            nodes.set(tx.to, {
              id: tx.to,
              name: tx.to,
              isConnected: true
            });
          }
        });

        // Second pass: create links
        walletData.recentTransactions.forEach(tx => {
          links.push({
            source: tx.from,
            target: tx.to,
            value: tx.value,
            hash: tx.hash,
            timestamp: tx.timestamp,
            isOutgoing: tx.from === walletData.address
          });
        });
      }

      return {
        nodes: Array.from(nodes.values()),
        links
      };
    } catch (err) {
      console.error('Error processing graph data:', err);
      setError(err.message);
      return { nodes: [], links: [] };
    }
  };

  const graphData = processGraphData();

  useEffect(() => {
    try {
      if (fgRef.current && containerRef.current && graphData.nodes.length > 0) {
        const fg = fgRef.current;
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = 500; // Fixed height

        // Center force
        fg.d3Force('center', d3.forceCenter(width / 2, height / 2));

        // Charge force (repulsion)
        fg.d3Force('charge', d3.forceManyBody()
          .strength(node => node.isMain ? -1000 : -300)
        );

        // Link force
        fg.d3Force('link', d3.forceLink(graphData.links)
          .id(d => d.id)
          .distance(100)
        );

        // Collision force
        fg.d3Force('collision', d3.forceCollide(30));

        // Initial zoom
        setTimeout(() => {
          fg.zoomToFit(400);
        }, 100);
      }
    } catch (err) {
      console.error('Error setting up graph:', err);
      setError(err.message);
    }
  }, [graphData]);

  const handleNodeClick = useCallback(node => {
    if (onNodeClick && !node.isMain) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    try {
      const label = `${node.name.substring(0, 6)}...${node.name.substring(node.name.length - 4)}`;
      const fontSize = node.isMain ? 16 : 14;
      const nodeSize = node.isMain ? 20 : 15;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = node.isMain ? '#3498db' : '#95a5a6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(label, node.x, node.y + nodeSize + 10);

      // Draw balance for main wallet
      if (node.isMain && node.balance) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`${node.balance} ETH`, node.x, node.y + nodeSize + 30);
      }
    } catch (err) {
      console.error('Error drawing node:', err);
    }
  }, []);

  if (error) {
    return (
      <div className="graph-container">
        <h3>Transaction Graph</h3>
        <div className="graph-error">
          <p>Error loading graph: {error}</p>
        </div>
      </div>
    );
  }

  if (!walletData) return null;

  return (
    <div className="graph-container">
      <h3>Transaction Graph</h3>
      <div className="graph-wrapper" ref={containerRef}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={node => `${node.name}\n${node.balance ? `${node.balance} ETH` : ''}`}
          linkLabel={link => `${link.value} ETH`}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.2}
          linkColor={link => link.isOutgoing ? '#e74c3c' : '#2ecc71'}
          linkWidth={2}
          backgroundColor="#ffffff"
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.5}
          maxZoom={4}
          height={500}
          width={containerRef.current?.clientWidth}
        />
      </div>
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot main"></span>
          <span>Current Wallet</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot connected"></span>
          <span>Connected Wallets</span>
        </div>
        <div className="legend-item">
          <span className="legend-arrow outgoing"></span>
          <span>Outgoing Transaction</span>
        </div>
        <div className="legend-item">
          <span className="legend-arrow incoming"></span>
          <span>Incoming Transaction</span>
        </div>
      </div>
    </div>
  );
}

export default TransactionGraph; 