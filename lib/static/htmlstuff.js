/**
 * Generates a base html page with the given title and body
 * @param {String} title 
 * @param {String} body 
 * @returns 
 */
const baseHtml = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="icon" href="data:image/x-icon;,">
</head>
<body>
    ${body}
</body>
</html>
`

module.exports = {
    baseHtml
}