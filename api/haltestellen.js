const Joi = require('joi');
const HyperExpress = require('hyper-express');
const { InvalidRouteInput } = require('@lib/errors');
const { limiter } = require('@middleware/limiter');
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

        res.json(result);

        console.log(validated_p, validated_q);
    } catch (error) {
        throw new InvalidRouteInput(error.message);
    }
});

module.exports = {
    router: router,
    PluginName: PluginName,
    PluginRequirements: PluginRequirements,
    PluginVersion: PluginVersion,
};