const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const cors = require('cors');

// Configure CORS
app.use(cors({
  origin: ['http://localhost:8080', 'https://candybrain-frontend.onrender.com'],
  methods: ['GET', 'POST', 'OPTIONS'], // Explicitly allow OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());
const upload = multer({ dest: 'uploads/' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/candybrain');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const dataPointSchema = new mongoose.Schema({
  locationId: String,
  itemId: String,
  timestamp: { type: Date, default: Date.now },
  temperature: Number,
  humidity: Number,
  light: Number,
  co2: Number,
  photoPaths: [String],
});
const User = mongoose.model('User', userSchema);
const DataPoint = mongoose.model('DataPoint', dataPointSchema);

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const user = new User({ email, password }); // In production, hash the password
  await user.save();
  res.json({ message: 'User registered' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password }); // In production, compare hashed password
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
  res.json({ token });
});

app.post('/api/data/upload', upload.array('photos', 5), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, 'secret_key');
    const { location, item, temperature, humidity, light, co2 } = req.body;
    const photoPaths = req.files.map(file => file.path);
    const dataPoint = new DataPoint({
      locationId: location,
      itemId: item,
      temperature,
      humidity,
      light,
      co2,
      photoPaths,
    });
    await dataPoint.save();
    res.json({ message: 'Data uploaded' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/data', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, 'secret_key');
    const data = await DataPoint.find();
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.json({ message: 'Candybrain Backend API' });
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));