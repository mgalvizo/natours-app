/* eslint-disable */
'use strict';

export const hideAlert = () => {
    const HTMLelement = document.querySelector('.alert');
    if (HTMLelement) HTMLelement.parentElement.removeChild(HTMLelement);
};

// Type will be success or error
export const showAlert = (type, message) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${message}</div>`;
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 5000);
};
