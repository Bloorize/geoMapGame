import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export type Region = 'global' | 'europe' | 'north-america' | 'south-america' | 'US';

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
                radius: 10000,
                source: google.maps.StreetViewSource.OUTDOOR
            });

            // If a specific state/region is selected, verify it's in the description
            const description = result.data.location?.description || '';
            let isStateMatch = true;

            if (region === 'US') {
                isStateMatch = description.includes('USA') || description.includes('United States');
            } else if (region !== 'global' && regionBounds[region]) {
                isStateMatch = description.includes(region);
            }

            if (!isStateMatch) return null;

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
