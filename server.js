require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());
//Routes
app.use('/api/', require('./routes/PageHitsRoute'));
app.use('/api/', require('./routes/UserRoutes'));
app.use('/api/', require('./routes/MemoriesRoute'));
app.use('/api/', require('./routes/ContactFormRoute'));
app.use('/api/', require('./routes/ConfirmationLinkRoute'));
app.use('/api/', require('./routes/MemoryUploadImageRoutes'));
app.use('/api/', require('./routes/AdminRoute'));

const PORT = process.env.PORT || 5000;

// Connect DB
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
