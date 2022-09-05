// Require express
const express = require('express');
// Import user controllers
const userController = require('../controllers/userController');
// require authcontroller
const authController = require('../controllers/authController');
// Create router for users
const router = express.Router();

// Create a different post route for the signup
router.post('/signup', authController.signup);
// Create a post route for the login
router.post('/login', authController.login);
// Create a get route for the logout
router.get('/logout', authController.logout);
// Create route for forgot password
router.post('/forgotPassword', authController.forgotPassword);
// Create route to reset password
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes from this point on using the protect middleware
// since middleware runs in sequence
router.use(authController.protect);

// Create route to update password when logged in, using protect to add the user to the req object
router.patch('/updateCurrentPassword', authController.updatePassword);
// Create route to retrieve current user data when logged in, using protect to add the user to the req object
// then setting the params id to the user id and finally retrieving the user.
router.get(
    '/currentUser',
    userController.getCurrentUser,
    userController.getUser
);
// Create route to update current user data when logged in, using protect to add the user to the req object
// Add multer middleware with the field name that holds the user's photo
router.patch(
    '/updateCurrentUser',
    userController.uploadUserPhoto,
    // Resize the photo after upload
    userController.resizeUserPhoto,
    userController.updateCurrentUser
);
// Create route to "delete" (mark an account as inactive) the current user data when logged in, using protect to add the user to the req object
router.delete('/deleteCurrentUser', userController.deleteCurrentUser);

// Restrict all routes from this point on using the restrictTo middleware
// since middleware runs in sequence
router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);
router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
