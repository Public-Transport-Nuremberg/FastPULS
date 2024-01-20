const { InvalidFunctionInput } = require('@lib/errors');

const fs = require('fs');
const { type } = require('os');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);

class DB_Store {
    constructor() {
        if (DB_Store.instance) {
            return DB_Store.instance;
        }

        DB_Store.instance = this;

        /** @constant {Object} this.data Datastrore to hold VAG and VGN Stops */
        this.data = {
            VAG: {},
            VGN: {}
        };

        /*
            We need this because Haltestellen API resolves with Plärrer (Nürnberg), but on Abfarten its called Plärrer
            While Plärrer (Schwarzenbruck) remains the same across both APIs, why? I dont know. Does this suck? Yes.
        */

        /** @constant {Object} this.translation Datastrore store the keys, because the API got random names for Stops */
        this.translation = {
            VAG: {},
            VGN: {}
        }

        this.enablePlus = process.env.ENABLE_PLUS == 'true' ? true : false || false;
        this.enableInitLog = process.env.ENABLE_INIT_LOG == 'true' ? true : false || false;
        this.parallelRequests = process.env.PARALLEL_REQUESTS || 10;
    }

    /**
     * Exports the Linien for each station
     * @param {String} company 
     */
    #exportLinien = async (company) => {
        // Create data folder if it doesn't exist (recursive)
        if (!fs.existsSync(path.join(__dirname, '../../data'))) {
            fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });
        }
        const filename = path.join(__dirname, `../../data/${company}-linien.json`);
        const data = this.data[company];
        
        const linien_data = {};

        for (const [key, value] of Object.entries(data)) {
            linien_data[key] = value.Linien;
        }
            
        await writeFile(filename, JSON.stringify(linien_data, null, 2));

        process.log.info(`Exported ${company} Linien to ${filename}`);
    }

    #processRequests = async (urls, maxConcurrentRequests, company) => {
        return new Promise((resolve, reject) => {
            let nextIndex = 0;
            let running = 0;

            const processNext = async () => {
                if (nextIndex < urls.length) {
                    const url = urls[nextIndex++];
                    let requestPromise;
                    running++;

                    const request_startTime = Date.now();
                    requestPromise = await fetch(url)
                    const response_json = await requestPromise.json();
                    const request_endTime = Date.now();

                    process.log.debug(`Updating Linien [Startup]: Processing ${url} [${nextIndex}/${urls.length}] - [${request_endTime - request_startTime}ms]`);

                    const line_numbers = [];
                    for (let i = 0; i < response_json.Abfahrten.length; i++) {
                        const line = response_json.Abfahrten[i];
                        line_numbers.push(line.Linienname);
                    }

                    let company_tracker // Fix the stupid API, in case there is a lowercase letter in the Kennung (Copilot said "stupid API", i would never say that about that magnificent API)
                    if(typeof response_json[`${company}Kennung`] === 'string') {
                        company_tracker = response_json[`${company}Kennung`].toUpperCase();
                    } else {
                        company_tracker = response_json[`${company}Kennung`];
                    }

                    this.data[company][this.translation[company][company_tracker]].Linien = [...new Set(line_numbers)];

                    running--;
                    processNext();
                }

                if (running === 0) {
                    resolve(true);
                }
            };

            for (let i = 0; i < Math.min(maxConcurrentRequests, urls.length); i++) {
                processNext();
            }
        });
    }

    init = async () => {
        if (this.enableInitLog) process.log.info('Loading VAG Data');
        const vag_startTime = Date.now();
        const vag_response = await fetch('https://start.vag.de/dm/api/v1/haltestellen.json/vag?name=')
        const vag_json = await vag_response.json();
        const vag_endTime = Date.now();

        if (this.enableInitLog) process.log.info(`VAG Data loaded in ${vag_endTime - vag_startTime}ms`);

        for (let i = 0; i < vag_json.Haltestellen.length; i++) {
            const station = vag_json.Haltestellen[i];
            this.set('VAG', `${station.Haltestellenname}.${station.VAGKennung.toUpperCase()}`, station);
            this.setTranslation('VAG', station.VAGKennung.toUpperCase(), `${station.Haltestellenname}.${station.VAGKennung.toUpperCase()}`);
        }

        if (this.enableInitLog) process.log.info('Loading VGN Data');
        const vgn_startTime = Date.now();
        const vgn_response = await fetch('https://start.vag.de/dm/api/v1/haltestellen.json/vgn?name=')
        const vgn_json = await vgn_response.json();
        const vgn_endTime = Date.now();

        if (this.enableInitLog) process.log.info(`VGN Data loaded in ${vgn_endTime - vgn_startTime}ms`);

        for (let i = 0; i < vgn_json.Haltestellen.length; i++) {
            const station = vgn_json.Haltestellen[i];
            this.set('VGN', `${station.Haltestellenname}.${station.VGNKennung}`, station);
            this.setTranslation('VGN', station.VGNKennung, `${station.Haltestellenname}.${station.VGNKennung}`);
        }

        if (this.enablePlus) {
            // Fetch all Linien for each station
            const urls_vag = [];
            for (let key in this.data.VAG) {
                const station = this.data.VAG[key];

                urls_vag.push(`https://start.vag.de/dm/api/v1/abfahrten.json/VAG/${station.VAGKennung}?timespan=1200&limitcount=5000`);
            };

            await this.#processRequests(urls_vag, this.parallelRequests, 'VAG');
            await this.#exportLinien('VAG');

            // Fetch all Linien for each station
            const urls_vgn = [];
            for (let key in this.data.VAG) {
                const station = this.data.VAG[key];

                urls_vgn.push(`https://start.vag.de/dm/api/v1/abfahrten.json/VGN/${station.VGNKennung}?timespan=1200&limitcount=5000`);
            };

            await this.#processRequests(urls_vgn, this.parallelRequests, 'VGN');
            await this.#exportLinien('VGN');
        }

        return true;
    }

    /**
     * @typedef {Object} Kooridnate
     * @property {Number} Latitude
     * @property {Number} Longitude
     */

    /**
     * @typedef {Object} Haltestelle
     * @property {String} Haltestellenname
     * @property {String} VAGKennung
     * @property {Number} VGNKennung
     * @property {Number} Longitude
     * @property {Number} Latitude
     * @property {String} Produkte
     */

    /**
     * Stores a value in the database
     * @param {String} store
     * @param {String} key
     * @param {Haltestelle} value
     */
    set(store, key, value) {
        if (!store || !key || !value) throw new InvalidFunctionInput('Missing Parameters')
        if (store !== "VAG" && store !== "VGN") throw new InvalidFunctionInput('Invalid Store')
        this.data[store][key] = value;
    }

    /**
     * Stores a value in the database
     * @param {String} store
     * @param {String} key
     * @param {String} value
     */
    setTranslation(store, key, value) {
        if (!store || !key || !value) throw new InvalidFunctionInput('Missing Parameters')
        if (store !== "VAG" && store !== "VGN") throw new InvalidFunctionInput('Invalid Store')
        // Check for collisions
        if (this.translation[store][key]) {
            console.log(`Collision detected for ${store}.${key} with ${value}`);
        }
        this.translation[store][key] = value;
    }

    /**
     * Returns all values that match the pattern
     * @param {String} store 
     * @param {String} pattern 
     * @returns {Array<Haltestelle>}
     */
    like(store, pattern) {
        const regexPattern = pattern.split('_').join('.').split('%').join('.*');
        const regex = new RegExp(regexPattern, 'i');
        let result = [];

        for (let key in this.data[store]) {
            if (regex.test(key)) {
                result.push(this.data[store][key]);
            }
        }

        return result;
    }

    /**
     * Calculates the distance using the haversine formula
     * @param {Kooridnate} coords1 
     * @param {Kooridnate} coords2 
     * @returns {Number}
     */
    haversineDistance(coords1, coords2) {
        const toRad = (value) => (value * Math.PI) / 180;

        const R = 6371000; // Earth radius in meters
        const dLat = toRad(coords2.Latitude - coords1.Latitude);
        const dLon = toRad(coords2.Longitude - coords1.Longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(coords1.Latitude)) * Math.cos(toRad(coords2.Latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * @typedef {Object} GeoHaltestelle
     * @property {String} Haltestellenname
     * @property {String} VAGKennung
     * @property {Number} VGNKennung
     * @property {Number} Longitude
     * @property {Number} Latitude
     * @property {String} Produkte
     * @property {Number} distanz
     */

    /**
     * Returns all stations in the range of the given coordinates
     * @param {String} store 
     * @param {Kooridnate} cordinates 
     * @param {*} range 
     * @returns {Array<GeoHaltestelle>}
     */
    findNearbyStations(store, cordinates, range) {
        let result = [];
        for (let key in this.data[store]) {
            const station = this.data[store][key];
            const distance = this.haversineDistance(cordinates, station);
            if (distance <= range) {
                station.distanz = distance; // Computing this anyway why not add it to the payload
                result.push(station);
            }
        }
        return result;
    }
}

module.exports = new DB_Store();