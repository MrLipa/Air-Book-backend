const { Router } = require('express');
const ROLES_LIST = require('../config/rolesList');
const verifyRoles = require('../middlewares/verifyRoles');
const airportController = require('../controllers/airportController');

const router = Router();

router.get('/getAllAirports', verifyRoles(ROLES_LIST.Admin), airportController.getAllAirports);

module.exports = router;
