const { Router } = require('express');
const ROLES_LIST = require('../config/rolesList');
const verifyRoles = require('../middlewares/verifyRoles');
const flightController = require('../controllers/flightController');

const router = Router();

router.get('/getAllFlights', verifyRoles(ROLES_LIST.Admin), flightController.getAllFlights);
router.post('/searchFlights', flightController.searchFlights);
router.post('/getFlightsByIds', verifyRoles(ROLES_LIST.Admin), flightController.getFlightsByIds);
router.get('/getFlightsByUserId/:userId', verifyRoles(ROLES_LIST.Admin), flightController.getFlightsByUserId);
router.patch('/patchFlightById/:flightId', verifyRoles(ROLES_LIST.Admin), flightController.patchFlightById);

module.exports = router;
