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

        this.linienTracker = {
            VAG: {},
            VGN: {}
        }

        this.enablePlus = process.env.ENABLE_PLUS == 'true' ? true : false || false;
        this.enableInitLog = process.env.ENABLE_INIT_LOG == 'true' ? true : false || false;
        this.maxLineAgeDays = process.env.MAX_LINE_AGE || 14;
        this.parallelRequests = process.env.PARALLEL_REQUESTS || 10;
        this.automaticBackroudUpdate = process.env.AUTOMATIC_BACKGROUND_UPDATE || 6

        this.backround_task = setInterval(async () => {
            process.log.info('Starting Backround Task');
            if (this.enablePlus) {
                // Fetch all Linien for each station
                const urls_vag = [];
                for (let key in this.data.VAG) {
                    const station = this.data.VAG[key];

                    urls_vag.push(`https://start.vag.de/dm/api/v1/abfahrten.json/VAG/${station.VAGKennung}?timespan=1200&limitcount=5000`);
                };

                await this.#processRequests(urls_vag, this.parallelRequests, 'VAG', this.automaticBackroudUpdate);
                await this.#exportLinien('VAG');

                // Fetch all Linien for each station
                const urls_vgn = [];
                for (let key in this.data.VAG) {
                    const station = this.data.VAG[key];

                    urls_vgn.push(`https://start.vag.de/dm/api/v1/abfahrten.json/VGN/${station.VGNKennung}?timespan=1200&limitcount=5000`);
                };

                await this.#processRequests(urls_vgn, this.parallelRequests, 'VGN', this.automaticBackroudUpdate);
                await this.#exportLinien('VGN');
            }
        }, this.automaticBackroudUpdate * 3600000) // 6 hours

    }

    /**
     * Imports the Linien for each station, so we have more data that isn´t currently available in the API so we can filter out old Linien in a later step
     * @param {String} company 
     * @returns 
     */
    #importLinien = async (company) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (fs.existsSync(path.join(__dirname, `../../data/${company}-linien.json`))) {
                    const filename = path.join(__dirname, `../../data/${company}-linien.json`);
                    const data = require(filename);

                    this.linienTracker[company] = data;

                    process.log.info(`Imported ${company} Linien from ${filename}`);
                    resolve(true);
                } else {
                    process.log.info(`No ${company} Linien found`);
                    resolve(false);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Exports the Linien for each station
     * @param {String} company 
     * @returns {Promise<Boolean>}
     */
    #exportLinien = async (company) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Create data folder if it doesn't exist (recursive)
                if (!fs.existsSync(path.join(__dirname, '../../data'))) {
                    fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });
                }
                const filename = path.join(__dirname, `../../data/${company}-linien.json`);
                const data = this.linienTracker[company];

                await writeFile(filename, JSON.stringify(data, null, 2));

                process.log.info(`Exported ${company} Linien to ${filename}`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Process a list of requests in parallel
     * @param {Array} urls 
     * @param {Number} maxConcurrentRequests 
     * @param {String} company 
     * @param {Boolean|Number} processSlow
     * @returns {Promise<Boolean>}
     */
    #processRequests = async (urls, maxConcurrentRequests, company, processSlow = false) => {
        return new Promise((resolve, reject) => {
            try {
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

                        const processType = processSlow ? 'Backround' : 'Startup';

                        process.log.debug(`Updating Linien [${processType}]: Processing ${url} [${nextIndex}/${urls.length}] - [${request_endTime - request_startTime}ms]`);

                        let company_tracker // Fix the stupid API, in case there is a lowercase letter in the Kennung (Copilot said "stupid API", i would never say that about this magnificent API)
                        if (typeof response_json[`${company}Kennung`] === 'string') {
                            company_tracker = response_json[`${company}Kennung`].toUpperCase();
                        } else {
                            company_tracker = response_json[`${company}Kennung`];
                        }

                        if (!this.linienTracker[company][this.translation[company][company_tracker]]) this.linienTracker[company][this.translation[company][company_tracker]] = {};

                        // Add Linien to tracker, with the timestamp of the expected departure
                        for (let i = 0; i < response_json.Abfahrten.length; i++) {
                            const line = response_json.Abfahrten[i].Linienname;
                            const time = response_json.Abfahrten[i].AbfahrtszeitSoll;
                            this.linienTracker[company][this.translation[company][company_tracker]][line] = new Date(time).getTime();
                        }

                        this.data[company][this.translation[company][company_tracker]].Linien = [];

                        // Filter out old Linien
                        for (const [key, value] of Object.entries(this.linienTracker[company][this.translation[company][company_tracker]])) {
                            if (Date.now() - value < this.maxLineAgeDays * 24 * 60 * 60 * 1000) {
                                this.data[company][this.translation[company][company_tracker]].Linien.push(key);
                            }
                        }

                        running--;
                        if (processSlow) {
                            // Delay the next recursive call to spread all calls across the given time
                            let numberOfBatches = Math.ceil(urls.length / maxConcurrentRequests);
                            let timePerBatch = (processSlow * 3600000) / numberOfBatches;
                            setTimeout(processNext, timePerBatch);

                        } else {
                            processNext();
                        }
                    }

                    if (running === 0) {
                        resolve(true);
                    }
                };

                for (let i = 0; i < Math.min(maxConcurrentRequests, urls.length); i++) {
                    processNext();
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Initializes the Database
     * @returns {Promise<Boolean>}
     */
    init = async () => {
        try {
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

                await this.#importLinien('VAG');
                // Fetch all Linien for each station
                const urls_vag = [];
                for (let key in this.data.VAG) {
                    const station = this.data.VAG[key];

                    urls_vag.push(`https://start.vag.de/dm/api/v1/abfahrten.json/VAG/${station.VAGKennung}?timespan=1200&limitcount=5000`);
                };

                await this.#processRequests(urls_vag, this.parallelRequests, 'VAG');
                await this.#exportLinien('VAG');

                await this.#importLinien('VGN');
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
        } catch (error) {
            throw error;
        }
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