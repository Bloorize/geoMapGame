import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export type Region = 'global' | 'europe' | 'north-america' | 'south-america' | 'US';

export const loadGoogleMaps = async (apiKey: string): Promise<void> => {
    if (window.google?.maps) return;

    setOptions({
        key: apiKey,
        v: 'weekly'
    });

    await importLibrary('streetView');
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
            const isRegional = region !== 'global';
            const result = await sv.getPanorama({
                location: latLng,
                radius: isRegional ? 50000 : 10000, // Increase radius for regional searches
                source: google.maps.StreetViewSource.OUTDOOR
            });

            const description = result.data.location?.description || '';
            let isMatch = true;

            if (region === 'US') {
                isMatch = description.includes('USA') || description.includes('United States');
            } else if (region === 'europe') {
                // For continents, we rely on bounds + broad country check if possible, 
                // but usually bounds are enough. Let's just avoid searching for the string "europe"
                isMatch = true;
            } else if (region === 'north-america' || region === 'south-america') {
                isMatch = true;
            }

            if (!isMatch) return null;

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
    let attempts = 0;
    while (!location && attempts < 50) {
        attempts++;
        location = await tryFind();
    }

    if (!location) {
        // Fallback to global if regional search fails after 50 attempts
        return getRandomLocation(sv, 'global');
    }

    return location;
};
