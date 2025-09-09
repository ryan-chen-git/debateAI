import express from 'express';
import bodyParser from 'body-parser';
import { DebateManager } from './debate/debateManager';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const debateManager = new DebateManager(180); // Set word cap as needed

app.post('/debate/submit', (req, res) => {
    const { argument, side } = req.body;
    const result = debateManager.submitArgument(argument, side);
    res.json(result);
});

app.listen(port, () => {
    console.log(`Debate app listening at http://localhost:${port}`);
});