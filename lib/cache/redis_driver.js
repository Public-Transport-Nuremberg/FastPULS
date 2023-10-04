const Redis = require("ioredis");

const redis = new Redis({
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || "127.0.0.1",
    username: process.env.REDIS_USER || "default",
    password: process.env.REDIS_PASSWORD || "default",
    db: process.env.REDIS_DB || 0,
});

redis.on("error", (err) => {
    process.log.error(err);
    process.exit(2);
});

/**
 * Get memory usage of the cache
 * @returns {Number}
 */
const getMemoryUsage = () => {
    return new Promise(async (resolve, reject) => {
        let memoryArray = await redis.memory("STATS");
        resolve(memoryArray[3]);
    })
}

/**
 * Delete all keys from the cache
 * @returns {String}
 */
const CleanCache = () => {
    return new Promise(async (resolve, reject) => {
        const stream = redis.scanStream({
            match: '*'
        });
        stream.on('data', function (keys) {
            // `keys` is an array of strings representing key names
            if (keys.length) {
                var pipeline = redis.pipeline();
                keys.forEach(function (key) {
                    pipeline.del(key);
                });
                pipeline.exec();
            }
        });
        stream.on('end', function () {
            resolve('Cleaned');
        });
    })
}

/**
 * Add a PSR record to the cache
 * @param {Number} routeID 
 * @param {String} type 
 * @param {String} data 
 * @param {Number} statusCode 
 * @param {Number} maxtime
 */
const addPublicStaticResponse = (routeID, type, data, statusCode, maxtime) => {
    redis.set(`PSR_${routeID}`, JSON.stringify({ type, data, time: new Date().getTime(), statusCode }), "EX", Math.ceil(maxtime / 1000));
}

/**
 * Get a PSR record from the cache but only returns it if it is not older than maxtime
 * @param {Number} routeID 
 * @param {Number} maxtime 
 * @returns {Object|Boolean}
 */
const getPublicStaticResponseSave = (routeID, maxtime) => {
    return new Promise(async (resolve, reject) => {
        if (!routeID) return reject("No routeID provided");
        if (!maxtime) return reject("No maxtime provided");
        if (await redis.exists(`PSR_${routeID}`)) {
            // Unlike in the loval driver, we do not need to check the time here, because the redis deletes the key itself
            const storedItem = JSON.parse(await redis.get(`PSR_${routeID}`));
            resolve(storedItem);
        } else {
            resolve(false);
        }
    });
}

/**
 * Add a pSR record to the cache
 * @param {Number} routeID 
 * @param {String} webtoken 
 * @param {String} type 
 * @param {String} data 
 * @param {Number} statusCode 
 * @param {Number} maxtime
 */
const addPrivateStaticResponse = (routeID, webtoken, type, data, statusCode, maxtime) => {
    redis.set(`pSR_${routeID}_${webtoken}`, JSON.stringify({ type, data, time: new Date().getTime(), statusCode }), "EX", Math.ceil(maxtime / 1000));
}

/**
 * Get a pSR record from the cache but only returns it if it is not older than maxtime
 * @param {Number} routeID 
 * @param {String} webtoken 
 * @param {Number} maxtime 
 * @returns {Object|Boolean}
 */
const getPrivateStaticResponseSave = (routeID, webtoken, maxtime) => {
    return new Promise(async (resolve, reject) => {
        if (!routeID) return reject("No routeID provided");
        if (!maxtime) return reject("No maxtime provided");
        if (await redis.exists(`pSR_${routeID}_${webtoken}`)) {
            // Unlike in the loval driver, we do not need to check the time here, because the redis deletes the key itself
            const storedItem = JSON.parse(await redis.get(`pSR_${routeID}_${webtoken}`));
            resolve(storedItem);
        } else {
            resolve(false);
        }
    });
}

/**
 * Increase the IPs request count, or add a new entry if it does not exist
 * Returns true if the IP is blocked
 * @param {String} ip 
 * @param {Number} cost 
 */
const IPLimit = (ip, cost = 1) => {
    return new Promise(async (resolve, reject) => {
        if (typeof cost !== 'number') throw new Error('Cost must be a number');
        if (cost < 0) throw new Error('Cost must be a positive number');
        // Check if the IP is in the cache
        if (!await redis.exists(`IPL_${ip}`)) {
            await redis.set(`IPL_${ip}`, JSON.stringify({ r: 0 + cost, t: new Date().getTime() }));
            resolve({result: false});
        } else {
            // IP is in the cache, increase the request count
            const current = JSON.parse(await redis.get(`IPL_${ip}`));
            if (current.r + cost < Number(process.env.DECREASEPERMIN)) {
                const reduced = ((new Date().getTime() - current.t) / (1000 * 60)) * Number(process.env.DECREASEPERMIN);
                // Reduce requests by the time passed but make sure its not below 0 and add the cost
                const newCount = Math.max(0, current.r - reduced) + cost;
                await redis.set(`IPL_${ip}`, JSON.stringify({ r: newCount, t: new Date().getTime() }));
                resolve({result: false});
            } else {
                const reduced = ((new Date().getTime() - current.t) / (1000 * 60)) * Number(process.env.DECREASEPERMIN);
                // Reduce requests by the time passed but make sure its not below 0 and add the cost
                const newCount = Math.max(0, current.r - reduced);
                await redis.set(`IPL_${ip}`, JSON.stringify({ r: newCount, t: new Date().getTime() }));
                // Calculate the time when the next request is possible
                const time = (((newCount - (Number(process.env.DECREASEPERMIN) - 1)) / Number(process.env.DECREASEPERMIN) * 60) * 1000).toFixed(0);
                resolve({ result: true, retryIn: time });
            }
        }
    });
}

/**
 * Returns true if the IP is blocked
 * @param {String} ip 
 * @returns 
 */
const IPCheck = (ip) => {
    return new Promise(async (resolve, reject) => {
        if (!await redis.exists(`IPL_${ip}`)) {
            resolve({result: false});
        } else {
            const current = JSON.parse(await redis.get(`IPL_${ip}`));
            const reduced = ((new Date().getTime() - current.t) / (1000 * 60)) * Number(process.env.DECREASEPERMIN);
            const newCount = Math.max(0, current.r - reduced);
            await redis.set(`IPL_${ip}`, JSON.stringify({ r: newCount, t: new Date().getTime() }));
            if (newCount < Number(process.env.DECREASEPERMIN) - 1) {
                resolve({result: false});
            } else {
                // Calculate the time when the next request is possible
                const time = (((newCount - (Number(process.env.DECREASEPERMIN) - 1)) / Number(process.env.DECREASEPERMIN) * 60) * 1000).toFixed(0);
                resolve({ result: true, retryIn: time });
            }
        }
    });
}

/**
 * Increase the limiters request count, or add a new entry if it does not exist
 * Returns true if the limiter is saturated
 * @param {String} key 
 * @param {Number} cost 
 */
const LimiterMiddleware = (key, cost = 1) => {
    return new Promise(async (resolve, reject) => {
        if (typeof cost !== 'number') throw new Error('Cost must be a number');
        if (cost < 0) throw new Error('Cost must be a positive number');
        // Check if the key is in the cache
        if (!await redis.exists(`LIM_${key}`)) {
            await redis.set(`LIM_${key}`, JSON.stringify({ r: 0 + cost, t: new Date().getTime() }));
            resolve({result: false});
        } else {
            // key is in the cache, increase the request count
            const current = JSON.parse(await redis.get(`LIM_${key}`));
            const reduced = ((new Date().getTime() - current.t) / (1000 * 60)) * Number(process.env.DECREASEPERMIN);
            if ((current.r - reduced) + cost < Number(process.env.DECREASEPERMIN)) {
                // Reduce requests by the time passed but make sure its not below 0 and add the cost
                const newCount = Math.max(0, current.r - reduced) + cost;
                await redis.set(`LIM_${key}`, JSON.stringify({ r: newCount, t: new Date().getTime() }));
                resolve({result: false});
            } else {
                // Reduce requests by the time passed but make sure its not below 0 and add the cost
                const newCount = Math.max(0, current.r - reduced);
                await redis.set(`LIM_${key}`, JSON.stringify({ r: newCount, t: new Date().getTime() }));
                // Calculate the time when the next request is possible
                const time = (((newCount - (Number(process.env.DECREASEPERMIN) - 1)) / Number(process.env.DECREASEPERMIN) * 60) * 1000).toFixed(0);
                resolve({ result: true, retryIn: time });
            }
        }
    });
}

module.exports = {
    CleanCache: CleanCache,
    getMemoryUsage: getMemoryUsage,
    addPublicStaticResponse: addPublicStaticResponse,
    getPublicStaticResponseSave: getPublicStaticResponseSave,
    addPrivateStaticResponse: addPrivateStaticResponse,
    getPrivateStaticResponseSave: getPrivateStaticResponseSave,
    IPLimit: IPLimit,
    IPCheck: IPCheck,
    LimiterMiddleware: LimiterMiddleware
}