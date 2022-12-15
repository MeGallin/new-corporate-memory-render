require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
//Routes
app.use('/api/', require('./routes/ContactFormRoute'));
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`App is listening on port ${PORT}!`));
