const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

// Initialize Neo4j driver
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Get transaction graph data for a specific address
router.get('/wallet-graph/:address', async (req, res) => {
  const session = driver.session();
  const { address } = req.params;
  
  try {
    // Query to get transaction relationships
    const result = await session.run(
      `MATCH (w:Wallet {address: $address})-[t:TRANSFERRED]->(recipient:Wallet)
       RETURN w.address as source, 
              recipient.address as target,
              t.value as value,
              t.timestamp as timestamp
       UNION
       MATCH (sender:Wallet)-[t:TRANSFERRED]->(w:Wallet {address: $address})
       RETURN sender.address as source,
              w.address as target,
              t.value as value,
              t.timestamp as timestamp
       ORDER BY timestamp DESC
       LIMIT 100`,
      { address }
    );

    const graphData = {
      nodes: new Set(),
      edges: []
    };

    result.records.forEach(record => {
      graphData.nodes.add(record.get('source'));
      graphData.nodes.add(record.get('target'));
      graphData.edges.push({
        source: record.get('source'),
        target: record.get('target'),
        value: record.get('value'),
        timestamp: record.get('timestamp')
      });
    });

    res.json({
      nodes: Array.from(graphData.nodes).map(address => ({ id: address })),
      edges: graphData.edges
    });
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: 'Error fetching graph data' });
  } finally {
    await session.close();
  }
});

module.exports = router; 