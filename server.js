const express = require('express');
require('dotenv').config();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const oauthRoutes = require('./routes/oauth');
const formRoutes = require('./routes/form');
const approvalRoutes = require('./routes/approval');

const app = express();

app.use(express.static('public'));

app.use('/oauth', oauthRoutes);
app.use('/api', formRoutes);
app.use('/api', approvalRoutes);

app.get('/api/config', (req, res) => {
  res.json({ calculatorUrl: process.env.CALCULATOR_URL });
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));