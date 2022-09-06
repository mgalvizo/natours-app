const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Set the overview as the home page
router.get(
    '/',
    // bookingController.createBookingCheckout,
    authController.isLoggedIn,
    viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/currentUser', authController.protect, viewController.getAccount);
router.get(
    '/currentUserTours',
    authController.protect,
    viewController.getCurrentUserTours
);

// Without the API
// router.post(
//     '/submit-user-data',
//     authController.protect,
//     viewController.updateUserData
// );

module.exports = router;
