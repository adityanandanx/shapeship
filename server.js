const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Read scores utility
const readScores = () => {
    try {
        if (!fs.existsSync(SCORES_FILE)) {
            return [];
        }
        const data = fs.readFileSync(SCORES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading scores:', err);
        return [];
    }
};

// Write scores utility
const writeScores = (scores) => {
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
    } catch (err) {
        console.error('Error writing scores:', err);
    }
};

// GET: Fetch top 10 leaderboard
app.get('/api/scores', (req, res) => {
    const scores = readScores();
    res.json(scores);
});

// POST: Add new score
app.post('/api/scores', (req, res) => {
    const { name, score } = req.body;
    
    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Name and score are required, score must be a number.' });
    }

    const scores = readScores();
    scores.push({ name: name.substring(0, 10), score });
    
    // Sort descending and keep top 10
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);
    
    writeScores(topScores);
    res.status(201).json(topScores);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
