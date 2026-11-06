const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// Called by server.js after MongoDB connects
function startHealthWorker() {
  console.log('Health worker started');
}

module.exports = { router, startHealthWorker };