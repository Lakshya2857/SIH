const express = require('express');
const cors = require('cors');
const path = require('path');

const { authRouter } = require('./routes/auth');
const evidenceRouter = require('./routes/evidence');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/evidence', evidenceRouter);

app.get('/', (req, res) => {
    res.send('Trace Vault API is running');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
