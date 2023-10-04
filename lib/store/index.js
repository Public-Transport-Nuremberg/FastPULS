const { InvalidFunctionInput } = require('@lib/errors');

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
    }

    init = async () => {
        const vag_response = await fetch('https://start.vag.de/dm/api/v1/haltestellen/vag?name=')
        const vag_json = await vag_response.json();

        for(let i = 0; i < vag_json.Haltestellen.length; i++) {
            const station = vag_json.Haltestellen[i];
            this.set('VAG', `${station.Haltestellenname}.${station.VAGKennung}`, station);
        }
        
        const vgn_response = await fetch('https://start.vag.de/dm/api/v1/haltestellen/vgn?name=')
        const vgn_json = await vgn_response.json();

        for(let i = 0; i < vgn_json.Haltestellen.length; i++) {
            const station = vgn_json.Haltestellen[i];
            this.set('VGN', `${station.Haltestellenname}.${station.VGNKennung}`, station);
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