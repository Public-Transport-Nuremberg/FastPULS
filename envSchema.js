module.exports = {
    "APPLICATION": {
        "type": "string",
        "validation": "min:0||max:24"
    },
    "LOG_LEVEL": {
        "section": "Logging",
        "type": "number",
        "validation": "required||min:0||max:4",
        "default": 3,
        "discription": "0 = error, 1 = warning, 2 = info, 3 = debug, 4 = system"
    },
    "LOG_TYPE": {
        "type": "string",
        "validation": "required||custom_list:console,stdout",
        "default": "console",
        "discription": "console or stdout"
    },
    "LOG_COLOR": {
        "type": "string",
        "validation": "required||custom_list:true,false",
        "default": "true",
        "discription": "true or false"
    },
    "LOG_TEMPLATE": {
        "type": "string",
        "validation": "min:0||max:255",
        "default": "",
        "discription": "leave empty for default or enter a custom template"
    },
    "LOG_STACK": {
        "type": "string",
        "validation": "required||custom_list:true,false",
        "default": "false",
    },
    "REDIS_USER": {
        "section": "Database Redis (Cache)",
        "type": "string",
        "validation": "min:0||max:255",
    },
    "REDIS_PASSWORD": {
        "type": "string",
        "validation": "min:0||max:255",
    },
    "REDIS_HOST": {
        "type": "string",
        "validation": "ipv4",
    },
    "REDIS_PORT": {
        "type": "number",
        "validation": "min:0||max:65535",
    },
    "REDIS_DB": {
        "type": "string",
        "validation": "min:0||max:255",
    },
    "BALANCER_PORT": {
        "section": "Balancer",
        "type": "number",
        "validation": "required||min:0||max:65535",
        "default": 8080
    },
    "CACHE_DRIVER": {
        "section": "Cache",
        "type": "string",
        "validation": "required||custom_list:local,redis",
        "default": "local"
    },
    "DECREASEPERMIN": {
        "type": "number",
        "validation": "required||min:0||max:1000000",
        "default": 30
    },
    "HE_FAST_BUFFER": {
        "section": "Hyper Express",
        "type": "string",
        "validation": "required||custom_list:true,false",
        "default": "false",
        "discription": "Set to true to use fast buffers"
    },
}