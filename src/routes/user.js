const express = require('express');
const ROLES_LIST = require('../config/rolesList');
const verifyRoles = require('../middlewares/verifyRoles');
const userController = require('../controllers/userController');

const router = express.Router();

// [user]
router.get('/getAllUsers', verifyRoles(ROLES_LIST.Admin), userController.getAllUsers);
router.get('/getUserById/:userId', verifyRoles(ROLES_LIST.Admin), userController.getUserById);
router.post('/createNewUser', verifyRoles(ROLES_LIST.Admin), userController.createNewUser);
router.put('/updateUserById/:userId', verifyRoles(ROLES_LIST.Admin), userController.updateUserById);
router.patch('/patchUserById/:userId', verifyRoles(ROLES_LIST.Admin), userController.patchUserById);
router.delete('/deleteUserById/:userId', verifyRoles(ROLES_LIST.Admin), userController.deleteUserById);

// [user_notification]
router.post('/createNotification', verifyRoles(ROLES_LIST.Admin), userController.createNotification);

// [user_reservation]
router.post('/createReservation', verifyRoles(ROLES_LIST.Admin), userController.createReservation);
router.delete('/deleteReservationById/:reservationId', verifyRoles(ROLES_LIST.Admin), userController.deleteReservationById);
router.get('/getNotificationsByUserId/:userId', verifyRoles(ROLES_LIST.Admin), userController.getNotificationsByUserId);

module.exports = router;
