if (process.env.CACHE_DRIVER === "local") {
    process.log.system("Using local cache driver");
    const local = require("./local_driver");
    module.exports = {
        CleanCache: local.CleanCache,
        getMemoryUsage: local.getMemoryUsage,
        addPublicStaticResponse: local.addPublicStaticResponse,
        getPublicStaticResponseSave: local.getPublicStaticResponseSave,
        addPrivateStaticResponse: local.addPrivateStaticResponse,
        getPrivateStaticResponseSave: local.getPrivateStaticResponseSave,
        IPLimit: local.IPLimit,
        IPCheck: local.IPCheck,
        LimiterMiddleware: local.LimiterMiddleware
    };
} else if (process.env.CACHE_DRIVER === "redis") {
    const redis = require("./redis_driver");
    process.log.system("Using redis cache driver");
    module.exports = {
        CleanCache: redis.CleanCache,
        getMemoryUsage: redis.getMemoryUsage,
        addPublicStaticResponse: redis.addPublicStaticResponse,
        getPublicStaticResponseSave: redis.getPublicStaticResponseSave,
        addPrivateStaticResponse: redis.addPrivateStaticResponse,
        getPrivateStaticResponseSave: redis.getPrivateStaticResponseSave,
        IPLimit: redis.IPLimit,
        IPCheck: redis.IPCheck,
        LimiterMiddleware: redis.LimiterMiddleware
    };
} else {
    process.log.error("Only local and redis cache drivers are supported");
    process.exit(1);
}