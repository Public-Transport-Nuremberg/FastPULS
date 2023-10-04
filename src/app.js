const HyperExpress = require('hyper-express');
const { baseHtml } = require('@lib/static/htmlstuff');
const app = new HyperExpress.Server({
    fast_buffers: process.env.HE_FAST_BUFFER == 'false' ? false : true || false,
});

const { log_errors, debug_stack } = require('@config/errors')
const apiv1 = require('@api');

app.use('/api/v1', apiv1);

// Custom 404 page (To hide our software stack)
app.get('*', (req, res) => {
    res.status(404).send(baseHtml(`404`,`<h1>File or Route Not Found</h1><hr><i>FastPULS@${process.package.version}</i>`));
});

/* Handlers */
app.set_error_handler((req, res, error) => {
    if (debug_stack) process.log.debug(error);

    if (error.name === 'TypeError') console.log(error);
    if (error.name === 'ReferenceError') console.log(error);

    const outError = {
        message: error.message || "",
        info: error.info || "",
        reason: error.reason || "",
        headers: error.headers || false,
        statusCode: error.status || 500, // Default to error 500
    }

    process.log.debug(`[${outError.statusCode} - ${error.name}] ${req.method} "${req.url}" >> ${outError.message} in "${error.path}:${error.fileline}"`);

    /* Returns 400 if the client didn´t provide all data/wrong data type*/
    if (error.name === "ValidationError" || error.name === "InvalidOption") {
        outError.message = error.name
        outError.info = error.message
        outError.reason = error.details
        outError.statusCode = 400;
    }

    /* Returns 401 if the client is not authorized*/
    if (error.message === "Token not provided" || error.message === "Token Invalid") {
        statusCode = 401;
    }

    /* Returns 403 if the client is not allowed to do something*/
    if (error.message === "NoPermissions" || error.message === "Permission Denied") {
        statusCode = 403;
    }

    /* Returns 429 if the client is ratelimited*/
    if (error.message === "Too Many Requests" || error.message === "Too Many Requests - IP Blocked") {
        statusCode = 429;
    }

    if (log_errors[error.name]?.enabled) process.log[log_errors[error.name].level](`[${outError.statusCode}] ${req.method} "${req.url}" >> ${outError.message} in "${error.path}:${error.fileline}"`);
    res.status(outError.statusCode);

    if (outError.headers) { res.header(outError.headers.name, outError.headers.value); }

    res.json({
        message: outError.message,
        info: outError.info,
        reason: outError.reason,
    });
});

module.exports = app;