import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '10s', target: 1500 },
        { duration: '30s', target: 2000 },
        { duration: '5s', target: 0 },
    ],
};

// Fast Puls: http://localhost/api/v1/haltestellen/vag/location?lon=11.0647882822154&lat=49.4480881582118&radius=500

// Puls: https://start.vag.de/dm/api/v1/haltestellen/VAG/location?lon=11.0647882822154&lat=49.4480881582118&radius=500
// Puls: https://start.vag.de/dm/api/v1/abfahrten/VAG/${station.VAGKennung}?timespan=1200&limitcount=5000

const STATIONS_API_ENDPOINT = 'https://start.vag.de/dm/api/v1/haltestellen/VAG/location?lon=11.0647882822154&lat=49.4480881582118&radius=500'; // Replace with your stations API endpoint
const ABFAHRTEN_API_BASE_URL = 'https://your.api.endpoint/abfahrten/'; // Replace with your abfahrten API base URL

export default function () {
    // Step 1: Request to get the list of stations
    let response = http.get(STATIONS_API_ENDPOINT);
    check(response, { 'status was 200': (r) => r.status === 200 });

    if (response.status === 200 && response.headers['Content-Type'].includes('application/json')) {
        try {
            let stations = JSON.parse(response.body).Haltestellen;
            stations.forEach(station => {
                // Step 2: Check if Linien data is available
                if (!station.Linien || station.Linien.length === 0) {
                    // Linien data is not available, fetch it from the 'abfahrten' endpoint
                    let abfahrtenUrl = `https://start.vag.de/dm/api/v1/abfahrten/VAG/${station.VAGKennung}?timespan=1200&limitcount=5000`;
                    let linienResponse = http.get(abfahrtenUrl);
                    check(linienResponse, { 'status was 200': (r) => r.status === 200 });
                }
            });
        } catch (e) {
            console.error(`Error parsing JSON: ${e}`);
        }
    } else {
        console.error(`Unexpected response: Status ${response.status}, Content-Type ${response.headers['Content-Type']}`);
    }
}
