const express = require('express');
const oauth2Controller = require('../controllers/oauth2Controller');

const router = express.Router();

router.get('/api/auth/facebook/callback', oauth2Controller.facebookCallback);
router.get('/auth/linkedin/callback', oauth2Controller.linkedinCallback);
router.get('/auth/github/callback', oauth2Controller.githubCallback);
router.get('/auth/azure/callback', oauth2Controller.azureCallback);

module.exports = router;
