import http from 'k6/http';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: '10s', target: 1500 },
        { duration: '30s', target: 2000 },
        { duration: '5s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(99)<1500'], // global http request duration threshold
    },
};

const BASE_URL = 'https://start.vag.de/dm/api/v1/haltestellen/VAG/location?lon=11.0647882822154&lat=49.4480881582118&radius=500'; // replace with your app's URL

export default function () {
    let responses = http.batch([
        ['GET', `${BASE_URL}`]
    ]);

    for (let response of responses) {
      check(response, {
        'got 200': (r) => r.status === 200
      });
    }

    //sleep(1);
}