/* eslint-disable */
'use strict';

// index.js handles all the UI Front end stuff
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { displayUserPhoto } from './displayUserPhoto';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

// DOM ELEMENTS
const mapBox = document.querySelector('#map');
const loginForm = document.querySelector('.form--login');
const settingsForm = document.querySelector('.form-user-data');
const passwordForm = document.querySelector('.form-user-password');
const email = document.querySelector('#email');
// Works as the password required for the login and the new password in the update password form
const password = document.querySelector('#password');
const passwordCurrent = document.querySelector('#password-current');
const passwordConfirm = document.querySelector('#password-confirm');
const name = document.querySelector('#name');
const photo = document.querySelector('#photo');
const userPhoto = document.querySelector('.form__user-photo');
const logOutButton = document.querySelector('.nav__el--logout');
const savePasswordButton = document.querySelector('.btn--save-password');
const bookTourButton = document.querySelector('#book-tour');
const alertMessage = document.querySelector('body').dataset.alert;

// DELEGATION
if (mapBox) {
    // Get the locations exposed data from the HTML and convert it to JSON
    const locations = JSON.parse(mapBox.dataset.locations);

    displayMap(locations);
}

if (loginForm) {
    loginForm.addEventListener('submit', event => {
        event.preventDefault();

        login(email.value, password.value);
    });
}

if (logOutButton) {
    logOutButton.addEventListener('click', logout);
}

if (settingsForm) {
    settingsForm.addEventListener('submit', event => {
        event.preventDefault();
        // Programatically create multipart/form-data
        const form = new FormData();
        // Name of the field and value
        form.append('name', name.value);
        form.append('email', email.value);
        form.append('photo', photo.files[0]);
        // Check in the console the form values
        // for (const value of form.values()) {
        //     console.log(value);
        // }
        // Send the form
        updateSettings(form, 'data');
    });

    // Handle the image display
    photo.addEventListener('change', event => {
        displayUserPhoto(userPhoto, photo);
    });
}

if (passwordForm) {
    passwordForm.addEventListener('submit', async event => {
        event.preventDefault();
        savePasswordButton.textContent = 'Updating password...';

        await updateSettings(
            {
                passwordCurrent: passwordCurrent.value,
                // This is the new password value
                password: password.value,
                passwordConfirm: passwordConfirm.value,
            },
            'password'
        );

        savePasswordButton.textContent = 'Save password';
        password.value = '';
        passwordCurrent.value = '';
        passwordConfirm.value = '';
    });
}

if (bookTourButton) {
    bookTourButton.addEventListener('click', event => {
        event.target.textContent = 'Processing...';
        // Whenever there is a dash e.g. data-tour-id, JavaScript will convert
        // it to camel case notarion tourId
        // Use destructuring to get the value since tourId has the same name as the property event.target.dataset.tourId
        const { tourId } = event.target.dataset;
        bookTour(tourId);
    });
}

if (alertMessage) {
    showAlert('success', alertMessage, 20);
}
