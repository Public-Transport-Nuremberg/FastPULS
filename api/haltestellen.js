const Joi = require('joi');
const HyperExpress = require('hyper-express');
const { InvalidRouteInput } = require('@lib/errors');
const { limiter } = require('@middleware/limiter');
const { convertAndRespond } = require('@middleware/accept_header_transform');
const DB_Store = require('@lib/store');
const router = new HyperExpress.Router();

/* Plugin info*/
const PluginName = 'Haltestellen'; //This plugins name
const PluginRequirements = []; //Put your Requirements and version here <Name, not file name>|Version
const PluginVersion = '0.0.1'; //This plugins version

const HaltestellenRouteSchema = Joi.object({
    'netvu': Joi.string().valid('VAG', 'vag', 'VGN', 'vgn').required(),
});

const HaltestellenSchema = Joi.object({
    'name': Joi.string().allow(null, ''),
});

router.get(':netvu', limiter(), async (req, res) => {
    try {
        const validated_p = await HaltestellenRouteSchema.validateAsync(req.params);
        const validated_q = await HaltestellenSchema.validateAsync(req.query);

        let StationName = validated_q.name || "";

        const result = DB_Store.like(validated_p.netvu.toUpperCase(), StationName)

        res.data = result;
    } catch (error) {
        throw new InvalidRouteInput(error.message);
    }
}, convertAndRespond());

const HaltestellenGeoSchema = Joi.object({
    'lon': Joi.number().min(-180).max(180).required(),
    'lat': Joi.number().min(-180).max(180).required(),
    'radius': Joi.number().min(0).max(40 * 1000 * 1000).default(1000),
});

router.get(':netvu/location', limiter(), async (req, res) => {
    try {
        const validated_p = await HaltestellenRouteSchema.validateAsync(req.params);
        const validated_q = await HaltestellenGeoSchema.validateAsync(req.query);

        const result = DB_Store.findNearbyStations(validated_p.netvu.toUpperCase(), { "Latitude": validated_q.lat, "Longitude": validated_q.lon }, validated_q.radius);

        res.data = result;
    } catch (error) {
        throw new InvalidRouteInput(error.message);
    }
}, convertAndRespond());

module.exports = {
    router: router,
    PluginName: PluginName,
    PluginRequirements: PluginRequirements,
    PluginVersion: PluginVersion,
};