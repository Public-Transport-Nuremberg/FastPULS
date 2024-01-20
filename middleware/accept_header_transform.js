const { HaltestellenobjectToXml } = require('@lib/transformer/xml');

/**
 * Generate a Timestamp in the format of ISO 8601
 * @returns {String}
 */
const getFormattedTimestamp = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Zeitzone in Stunden und Minuten
    const timezoneOffsetInMinutes = date.getTimezoneOffset();
    const sign = timezoneOffsetInMinutes > 0 ? "-" : "+";
    const absoluteOffset = Math.abs(timezoneOffsetInMinutes);
    const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
    const offsetMinutes = String(absoluteOffset % 60).padStart(2, '0');
    const timezone = `${sign}${offsetHours}:${offsetMinutes}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
}

/**
 * Middleware to transform the response to the requested format
 */
const convertAndRespond = () => {
    return async (req, res) => {
        try {
            const acceptHeader = req.headers.accept || '';
            const Medatdata = {
                'Version': `FastPuls-API-v${process.package.version}`,
                'Timestamp': getFormattedTimestamp(),
            }
            
            if (!res.data) return res.status(404).send('Not Found');

            if (acceptHeader.includes('application/json') || acceptHeader.includes('text/json') || acceptHeader.includes('*/*')) {
                res.header('Content-Type', 'application/json');
                return res.json({ 'Metadata': Medatdata, 'Haltestellen': res.data });
            } else if (acceptHeader.includes('application/xml') || acceptHeader.includes('text/xml')) {
                res.header('Content-Type', 'application/xml');
                return res.send(HaltestellenobjectToXml({ 'Metadata': Medatdata, 'Haltestellen': res.data }));
            } else {
                return res.json({ 'Metadata': Medatdata, 'Haltestellen': res.data });
            }

            res.status(406).send('Not Acceptable');
        } catch (error) {
            return (error);
        }
    }
}

module.exports = {
    convertAndRespond: convertAndRespond,
};