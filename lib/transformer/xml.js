/**
 * Transforms a Haltestellenobject to XML
 * @param {Object} obj 
 * @returns 
 */
const HaltestellenobjectToXml = (obj) => {
    let xml = '';

    // Spezialbehandlung für Arrays (z.B. "Haltestellen")
    if (Array.isArray(obj)) {
        for (const item of obj) {
            xml += `<Haltestelle>${HaltestellenobjectToXml(item)}</Haltestelle>`;
        }
        return xml;
    }

    for (const prop in obj) {
        // Wert kann eine Zahl, ein String oder ein anderes Objekt sein
        let value = typeof obj[prop] === 'object' ? HaltestellenobjectToXml(obj[prop]) : obj[prop];
        xml += `<${prop}>${value}</${prop}>`;
    }

    return xml;
}

module.exports = {
    HaltestellenobjectToXml: HaltestellenobjectToXml,
};