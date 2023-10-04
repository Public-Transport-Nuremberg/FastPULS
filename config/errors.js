/*
    Define which errors should be logged to the console.
    Note, all errors will always be returned to the client.
*/
module.exports = {
    "debug_stack": (process.env.LOG_STACK == 'true') ? true : false, // If true, the stack trace will be logged
    "log_errors": {
        "TooManyRequests": {
            "enabled": true,
            "level": "warning"
        },
        "InvalidToken": {
            "enabled": true,
            "level": "warning"
        },
        "Invalid2FA": {
            "enabled": true,
            "level": "warning"
        },
        "InvalidLogin": {
            "enabled": true,
            "level": "warning"
        },
        "InvalidRouteInput": {
            "enabled": true,
            "level": "error"
        },
        "PermissionsError": {
            "enabled": true,
            "level": "warning"
        },
        "SQLError": {
            "enabled": true,
            "level": "error"
        },
        "DBError": {
            "enabled": true,
            "level": "error"
        },
        "ValidationError": {
            "enabled": true,
            "level": "warning"
        },
        "InvalidOption": {
            "enabled": true,
            "level": "warning"
        },
    }
}