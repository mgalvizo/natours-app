/* eslint-disable */
'use strict';

export const displayUserPhoto = (imgElement, photoInput) => {
    // Use the optional chaining operator to check if there is a file
    const imgFile = event.target.files?.[0];

    // Check if the mimetype is an image
    if (!imgFile?.type.startsWith('image/')) {
        return;
    }

    // Create file reader
    const reader = new FileReader();

    reader.addEventListener('load', event => {
        imgElement.setAttribute('src', reader.result);
    });

    reader.readAsDataURL(imgFile);
};
