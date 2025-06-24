// Core modules & packages
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./src/swagger/swagger.yaml');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Monitoring (Prometheus)
const { prometheusMiddleware, metricsEndpoint } = require('./monitoring/metrics');

// Custom config & middleware
const corsOptions = require('./config/corsOptions');
const credentials = require('./middlewares/credentials');
const { requestLogger } = require('./middlewares/logger');
const verifyJWT = require('./middlewares/verifyJWT');

// Express App
const app = express();

// Middleware
app.use(requestLogger);
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use('/api-docs', express.static(path.join(process.cwd(), 'swagger')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(prometheusMiddleware);

// Health Check
app.use('/healthCheck', require('./routes/healthCheck'));

app.get('/metrics', metricsEndpoint);

// Static Files & View Engine
app.use('/', express.static(path.join(__dirname, '/')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.get('/', (req, res) => {
  res.status(200).render('index', {
    appName: process.env.APP_AIR_BOOK_NAME || ''
  });
});

// Public Routes
app.use('/register', require('./routes/register'));
app.use('/login', require('./routes/login'));
app.use('/refreshToken', require('./routes/refreshToken'));
app.use('/logout', require('./routes/logout'));
app.use('/', require('./routes/oauth2'));

// Protected Routes
app.use('/airport', verifyJWT, require('./routes/airport'));
app.use('/flight', verifyJWT, require('./routes/flight'));
app.use('/user', verifyJWT, require('./routes/user'));

// 404 Fallback
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

module.exports = app;
