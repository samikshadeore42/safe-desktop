import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config';
import safeRoutes from './routes/safe.routes.js';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/', (req, res) => res.send('Safe Server is alive'));

app.use('/safe', safeRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Safe server listening on http://localhost:${port}`);
});
