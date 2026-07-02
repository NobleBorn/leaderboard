const express = require('express');
const cors = require('cors');
require('./db'); // initialise DB & seed games on startup

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/participants',     require('./routes/participants'));
app.use('/api/games',            require('./routes/games'));
app.use('/api/submissions',      require('./routes/submissions'));
app.use('/api/leaderboard',      require('./routes/leaderboard'));
app.use('/api/tournament-config', require('./routes/tournament'));

// Simple health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Leaderboard API running on http://localhost:${PORT}`));
