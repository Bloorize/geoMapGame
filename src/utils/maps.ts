import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export type Region = 'global' | 'europe' | 'north-america' | 'south-america' | 'US' | string; // string for state names

export const loadGoogleMaps = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google?.maps) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=streetView,places&callback=initMaps`;
        script.async = true;
        script.defer = true;

        (window as any).initMaps = () => {
            resolve();
        };

        script.onerror = (err) => {
            console.error('Script Load Error:', err);
            reject(err);
        };

        document.head.appendChild(script);
    });
};

const regionBounds: Record<string, { latRange: [number, number], lngRange: [number, number] }> = {
    global: { latRange: [-40, 60], lngRange: [-180, 180] },
    europe: { latRange: [36, 60], lngRange: [-10, 30] },
    'north-america': { latRange: [25, 49], lngRange: [-125, -70] },
    'south-america': { latRange: [-35, 10], lngRange: [-75, -45] },
    'US': { latRange: [25, 49], lngRange: [-125, -70] },
    // US States
    'Alabama': { latRange: [30.2, 35.0], lngRange: [-88.5, -84.9] },
    'Alaska': { latRange: [51.2, 71.4], lngRange: [-179.1, -129.9] },
    'Arizona': { latRange: [31.3, 37.0], lngRange: [-114.8, -109.0] },
    'Arkansas': { latRange: [33.0, 36.5], lngRange: [-94.6, -89.6] },
    'California': { latRange: [32.5, 42.0], lngRange: [-124.4, -114.1] },
    'Colorado': { latRange: [37.0, 41.0], lngRange: [-109.0, -102.0] },
    'Connecticut': { latRange: [41.0, 42.1], lngRange: [-73.7, -71.8] },
    'Delaware': { latRange: [38.4, 39.8], lngRange: [-75.8, -75.0] },
    'Florida': { latRange: [24.4, 31.0], lngRange: [-87.6, -80.0] },
    'Georgia': { latRange: [30.3, 35.0], lngRange: [-85.6, -80.8] },
    'Hawaii': { latRange: [18.9, 22.2], lngRange: [-160.2, -154.8] },
    'Idaho': { latRange: [42.0, 49.0], lngRange: [-117.2, -111.0] },
    'Illinois': { latRange: [36.9, 42.5], lngRange: [-91.5, -87.5] },
    'Indiana': { latRange: [37.8, 41.8], lngRange: [-88.1, -84.8] },
    'Iowa': { latRange: [40.4, 43.5], lngRange: [-96.6, -90.1] },
    'Kansas': { latRange: [37.0, 40.0], lngRange: [-102.0, -94.6] },
    'Kentucky': { latRange: [36.5, 39.1], lngRange: [-89.5, -82.0] },
    'Louisiana': { latRange: [28.9, 33.0], lngRange: [-94.0, -88.8] },
    'Maine': { latRange: [43.1, 47.5], lngRange: [-71.1, -66.9] },
    'Maryland': { latRange: [37.9, 39.7], lngRange: [-79.5, -75.0] },
    'Massachusetts': { latRange: [41.2, 42.9], lngRange: [-73.5, -69.9] },
    'Michigan': { latRange: [41.7, 48.3], lngRange: [-90.4, -82.4] },
    'Minnesota': { latRange: [43.5, 49.4], lngRange: [-97.2, -89.5] },
    'Mississippi': { latRange: [30.2, 35.0], lngRange: [-91.7, -88.1] },
    'Missouri': { latRange: [36.0, 40.6], lngRange: [-95.8, -89.1] },
    'Montana': { latRange: [44.4, 49.0], lngRange: [-116.1, -104.0] },
    'Nebraska': { latRange: [40.0, 43.0], lngRange: [-104.0, -95.3] },
    'Nevada': { latRange: [35.0, 42.0], lngRange: [-120.0, -114.0] },
    'New Hampshire': { latRange: [42.7, 45.3], lngRange: [-72.6, -70.6] },
    'New Jersey': { latRange: [38.9, 41.4], lngRange: [-75.6, -73.9] },
    'New Mexico': { latRange: [31.3, 37.0], lngRange: [-109.0, -103.0] },
    'New York': { latRange: [40.5, 45.0], lngRange: [-79.8, -71.8] },
    'North Carolina': { latRange: [33.8, 36.6], lngRange: [-84.3, -75.4] },
    'North Dakota': { latRange: [45.9, 49.0], lngRange: [-104.0, -96.6] },
    'Ohio': { latRange: [38.4, 42.3], lngRange: [-84.8, -80.5] },
    'Oklahoma': { latRange: [33.6, 37.0], lngRange: [-103.0, -94.4] },
    'Oregon': { latRange: [42.0, 46.3], lngRange: [-124.6, -116.5] },
    'Pennsylvania': { latRange: [39.7, 42.3], lngRange: [-80.5, -74.7] },
    'Rhode Island': { latRange: [41.1, 42.0], lngRange: [-71.9, -71.1] },
    'South Carolina': { latRange: [32.0, 35.2], lngRange: [-83.4, -78.5] },
    'South Dakota': { latRange: [42.5, 46.0], lngRange: [-104.1, -96.4] },
    'Tennessee': { latRange: [35.0, 36.7], lngRange: [-90.3, -81.6] },
    'Texas': { latRange: [25.8, 36.5], lngRange: [-106.6, -93.5] },
    'Utah': { latRange: [37.0, 42.0], lngRange: [-114.0, -109.0] },
    'Vermont': { latRange: [42.7, 45.0], lngRange: [-73.4, -71.5] },
    'Virginia': { latRange: [36.5, 39.5], lngRange: [-83.7, -75.2] },
    'Washington': { latRange: [45.5, 49.0], lngRange: [-124.8, -116.9] },
    'West Virginia': { latRange: [37.2, 40.6], lngRange: [-82.6, -77.7] },
    'Wisconsin': { latRange: [42.5, 47.1], lngRange: [-92.9, -86.8] },
    'Wyoming': { latRange: [41.0, 45.0], lngRange: [-111.1, -104.0] },
};

export const getRandomLocation = async (sv: google.maps.StreetViewService, region: Region = 'global'): Promise<{ lat: number, lng: number, panoramaData: google.maps.StreetViewPanoramaData }> => {
    const selectedRegion = regionBounds[region] || regionBounds['global'];

    const tryFind = async (): Promise<{ lat: number, lng: number, panoramaData: google.maps.StreetViewPanoramaData } | null> => {
        const lat = selectedRegion.latRange[0] + Math.random() * (selectedRegion.latRange[1] - selectedRegion.latRange[0]);
        const lng = selectedRegion.lngRange[0] + Math.random() * (selectedRegion.lngRange[1] - selectedRegion.lngRange[0]);
        const latLng = { lat, lng };

        try {
            const result = await sv.getPanorama({
                location: latLng,
                radius: 100000,
                source: google.maps.StreetViewSource.OUTDOOR
            });
            return {
                lat: result.data.location?.latLng?.lat() || lat,
                lng: result.data.location?.latLng?.lng() || lng,
                panoramaData: result.data
            };
        } catch (e) {
            return null;
        }
    };

    let location = null;
    while (!location) {
        location = await tryFind();
    }
    return location;
};
