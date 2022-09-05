/* eslint-disable */
'use strict';
import mapboxgl from 'mapbox-gl';

export const displayMap = locations => {
    // Get the info from the mapbox website
    const MAPBOX_ACCESS_TOKEN =
        'pk.eyJ1IjoieGVwaGlvcyIsImEiOiJjbDdjb2xlZzEwbnAwM25ydXpqbnh1OXN1In0.yVIxBI8sUZyUz13RxUIzZg';

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
        container: 'map',
        // Create a style then on the share modal copy the style url
        style: 'mapbox://styles/xephios/cl7cooyh9000614jswc99qbtk',
        scrollZoom: false,
    });

    // Create bounding box
    const bounds = new mapboxgl.LngLatBounds();

    // Loop locations and create a marker for each of them
    locations.forEach(location => {
        // The class marker is a background with a custom image NOT from mapbox
        const markerElement = document.createElement('div');
        markerElement.className = 'marker';

        // Create marker
        const marker = new mapboxgl.Marker({
            element: markerElement,
            anchor: 'bottom',
        });

        // Set the position of the marker
        marker.setLngLat(location.coordinates).addTo(map);

        // Create popup
        const popup = new mapboxgl.Popup({
            offset: 40,
        });

        // Set the position, html and add the popup to the map
        popup
            .setLngLat(location.coordinates)
            .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
            .addTo(map);

        // Extend map bounds to include current location
        bounds.extend(location.coordinates);
    });

    map.fitBounds(bounds, {
        // Add padding to the bounds
        padding: {
            top: 200,
            right: 200,
            down: 200,
            left: 200,
        },
    });
};
