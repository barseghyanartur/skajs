const { createHmac } = require("crypto");

/**
 * *******************************************
 * *************** Constants *****************
 * *******************************************
 */

/**
 * Signature lifetime in seconds.
 */
const SIGNATURE_LIFETIME = 600;

/**
 * Default name of the REQUEST param holding the generated signature value.
 */
const DEFAULT_SIGNATURE_PARAM = "signature";

/**
 * Default auth_user param.
 */
const DEFAULT_AUTH_USER_PARAM = "auth_user";

/**
 * Default name of the REQUEST param holding the ``valid_until`` value.
 */
const DEFAULT_VALID_UNTIL_PARAM = "valid_until";

/**
 * Default name of the REQUEST param holding the ``extra`` value.
 */
const DEFAULT_EXTRA_PARAM = "extra";

/**
 * *******************************************
 * *************** Helpers *****************
 * *******************************************
 */

/**
 * Check if value is an object.
 *
 * @param {Object} value
 * @returns {boolean}
 */
function isObject(value) {
    return value && typeof value === "object" && value.constructor === Object;
}

/**
 * Convert value to string.
 *
 * @param {Object} value
 * @returns {string}
 */
function toString(value) {
    return (
        Object.entries(value)
            .reduce((a, e) => {
                if (typeof e[1] != "function") {
                    a += `'${e[0]}': '${e[1]}', `;
                }
                return a;
            }, "{")
            .slice(1, -2) + "}"
    );
}

/**
 * Sorted urlencode.
 *
 * @param {Object} data
 * @param {boolean} quoted
 * @returns {string}
 */
function sortedURLEncode(data, quoted = true) {
    let orderedData = dictToOrderedDict(data);
    let _sorted = [];
    for (const [key, value] of Object.entries(orderedData)) {
        if (isObject(value) || Array.isArray(value)) {
            _sorted.push(`${key}=${JSON.stringify(value)}`);
        } else {
            _sorted.push(`${key}=${value}`);
        }
    }
    let _res = _sorted.join("&");
    if (quoted) {
        _res = encodeURIComponent(_res);
    }
    return _res;
}

/**
 * Dict to ordered dict.
 *
 * @param {Object} value
 * @returns {{}|*}
 */
function dictToOrderedDict(value) {
    if (typeof value !== "object" || !value) return value;
    if (Array.isArray(value)) return value.map(dictToOrderedDict);
    return Object.keys(value)
        .sort()
        .reduce(
            (o, k) => ({
                ...o,
                [k]: dictToOrderedDict(value[k]),
            }),
            {}
        );
}

/**
 * Make a validUntil.
 *
 * @param {number} lifetime
 * @returns {string}
 */
function makeValidUntil(lifetime = SIGNATURE_LIFETIME) {
    let validUntil = new Date();
    validUntil.setSeconds(validUntil.getSeconds() + lifetime);
    return (validUntil / 1000).toFixed(1);
}

/**
 * Get sorted keys from dictionary given.
 *
 * @param {Object} dict
 * @param {boolean} returnString
 * @returns {string|string[]}
 */
function dictKeys(dict, returnString = false) {
    let keys = Object.keys(dict);
    keys.sort();
    if (returnString) {
        return keys.join(",");
    }
    return keys;
}

/**
 * Filters out non-white-listed items from the ``extra`` array given.
 *
 * @param {Object} data
 * @param {Array} extra
 * @returns {Object}
 */
function extractSignedData(data, extra) {
    let dataCopy = JSON.parse(JSON.stringify(data));
    for (const [key, value] of Object.entries(dataCopy)) {
        if (extra.indexOf(key) < 0) {
            delete dataCopy[key];
        }
    }
    return dataCopy;
}

/**
 * *******************************************
 * ****************** Base *******************
 * *******************************************
 */

/**
 * Signature.
 */
class Signature {
    /**
     * Constructor.
     *
     * @param {string} signature
     * @param {string} authUser
     * @param {string|number} validUntil
     * @param {Object} extra
     */
    constructor(signature, authUser, validUntil, extra) {
        this.signature = signature;
        this.authUser = authUser;
        this.validUntil = validUntil;
        this.extra = extra ? extra : {};
    }

    /**
     * Check if signature is expired.
     *
     * @returns {boolean}
     */
    isExpired() {
        let now = new Date();
        let validUntil = unixTimestampToDate(this.validUntil);
        let res = validUntil > now;
        return !res;
    }
}

/**
 * Validate signature.
 *
 * @param {string} signature
 * @param {string} authUser
 * @param {string} secretKey
 * @param {string|number} validUntil
 * @param {Object} extra
 * @param {boolean} returnObject
 * @returns {boolean}
 */
function validateSignature(
    signature,
    authUser,
    secretKey,
    validUntil,
    extra = null,
    returnObject = false
) {
    if (!extra) {
        extra = {};
    }

    const sig = generateSignature(
        authUser,
        secretKey,
        validUntil,
        SIGNATURE_LIFETIME,
        extra
    );

    if (!returnObject) {
        return sig.signature === signature && !sig.isExpired();
    }
}

/**
 * *******************************************
 * ****************** Utils ******************
 * *******************************************
 */

/**
 * Request helper.
 */
class RequestHelper {
    /**
     * Constructor.
     *
     * @param {string} signatureParam
     * @param {string} authUserParam
     * @param {string} validUntilParam
     * @param {string} extraParam
     */
    constructor(
        signatureParam = DEFAULT_SIGNATURE_PARAM,
        authUserParam = DEFAULT_AUTH_USER_PARAM,
        validUntilParam = DEFAULT_VALID_UNTIL_PARAM,
        extraParam = DEFAULT_EXTRA_PARAM
    ) {
        this.signatureParam = DEFAULT_SIGNATURE_PARAM;
        this.authUserParam = authUserParam;
        this.validUntilParam = validUntilParam;
        this.extraParam = extraParam;
    }

    /**
     * Signature to dict.
     *
     * @param {Signature} signature
     * @returns {{}}
     */
    signatureToDict(signature) {
        let data = {};

        data[this.signatureParam] = signature.signature;
        data[this.authUserParam] = signature.authUser;
        data[this.validUntilParam] = signature.validUntil;
        data[this.extraParam] = dictKeys(signature.extra, true);

        let combined = {
            ...data,
            ...signature.extra,
        };

        return combined;
    }

    /**
     * Validate request data.
     * @param {Object} data
     * @param {string} secretKey
     */
    validateRequestData(data, secretKey) {
        const signature = data[this.signatureParam];
        const authUser = data[this.authUserParam];
        const validUntil = data[this.validUntilParam];
        let _extra = data[this.extraParam];
        let extraData = {};
        if (_extra) {
            _extra = _extra.split(",");
            extraData = extractSignedData(data, _extra);
        }

        return validateSignature(
            signature,
            authUser,
            secretKey,
            validUntil,
            extraData
        );
    }
}

/**
 * *******************************************
 * ************* Borrowed from classes *******
 * *******************************************
 */

/**
 * Convert unix timestamp to date.
 *
 * @param {string|number} validUntil
 * @returns {Date}
 */
function unixTimestampToDate(validUntil) {
    return new Date(validUntil * 1000);
}

/**
 * Make a secret key.
 *
 * @param {string} authUser
 * @param {string|number} validUntil
 * @param {Object} extra
 * @returns {string}
 */
function getBase(authUser, validUntil, extra = null) {
    if (!extra) {
        extra = {};
    }

    validUntil = parseFloat(validUntil).toFixed(1);

    let _base = [validUntil, authUser];

    if (extra) {
        let urlencodedExtra = sortedURLEncode(extra);
        if (urlencodedExtra) {
            _base.push(urlencodedExtra);
        }
    }

    return _base.join("_");
}

/**
 * Make hash.
 *
 * @param {string} authUser
 * @param {string} secretKey
 * @param {string|number} validUntil
 * @param {Object} extra
 * @returns {Promise<ArrayBuffer>}
 */
function makeHash(authUser, secretKey, validUntil = null, extra = null) {
    if (!extra) {
        extra = {};
    }

    let _base = getBase(authUser, validUntil, (extra = extra));
    let rawHmac = createHmac("sha1", secretKey);
    rawHmac.update(_base);
    return rawHmac.digest();
}

/**
 * Generate signature.
 *
 * @param {string} authUser
 * @param {string} secretKey
 * @param {string|number} validUntil
 * @param {number} lifetime
 * @param {Object} extra
 * @returns {null|Signature}
 */
function generateSignature(
    authUser,
    secretKey,
    validUntil = null,
    lifetime = SIGNATURE_LIFETIME,
    extra = null
) {
    if (!extra) {
        extra = {};
    }

    if (!validUntil) {
        validUntil = makeValidUntil(lifetime);
    } else {
        try {
            unixTimestampToDate(validUntil);
        } catch (err) {
            return null;
        }
    }

    let hash = makeHash(authUser, secretKey, validUntil, extra);

    let buff = new Buffer(hash);

    let signature = buff.toString("base64");

    return new Signature(signature, authUser, validUntil, extra);
}

/**
 * Signature to dict.
 *
 * @param {string} authUser
 * @param {string} secretKey
 * @param {string|number|null} validUntil
 * @param {number} lifetime
 * @param {Object} extra
 * @param {string} signatureParam
 * @param {string} authUserParam
 * @param {string} validUntilParam
 * @param {string} extraParam
 * @returns {{}}
 */
function signatureToDict(
    authUser,
    secretKey,
    validUntil = null,
    lifetime = SIGNATURE_LIFETIME,
    extra = null,
    signatureParam = DEFAULT_SIGNATURE_PARAM,
    authUserParam = DEFAULT_AUTH_USER_PARAM,
    validUntilParam = DEFAULT_VALID_UNTIL_PARAM,
    extraParam = DEFAULT_EXTRA_PARAM
) {
    let signature = generateSignature(
        authUser,
        secretKey,
        validUntil,
        lifetime,
        extra
    );

    const requestHelper = new RequestHelper(
        signatureParam,
        authUserParam,
        validUntilParam,
        extraParam
    );

    return requestHelper.signatureToDict(signature);
}

/**
 * Validate signed request data.
 *
 * @param data
 * @param secretKey
 * @param signatureParam
 * @param authUserParam
 * @param validUntilParam
 * @param extraParam
 * @param validate
 * @param failSilently
 */
function validateSignedRequestData(
    data,
    secretKey,
    signatureParam = DEFAULT_SIGNATURE_PARAM,
    authUserParam = DEFAULT_AUTH_USER_PARAM,
    validUntilParam = DEFAULT_VALID_UNTIL_PARAM,
    extraParam = DEFAULT_EXTRA_PARAM,
    validate = false,
    failSilently = false
) {
    const requestHelper = new RequestHelper(
        signatureParam,
        authUserParam,
        validUntilParam,
        extraParam
    );

    return requestHelper.validateRequestData(data, secretKey);
}

exports.SIGNATURE_LIFETIME = SIGNATURE_LIFETIME;
exports.DEFAULT_SIGNATURE_PARAM = DEFAULT_SIGNATURE_PARAM;
exports.DEFAULT_AUTH_USER_PARAM = DEFAULT_AUTH_USER_PARAM;
exports.DEFAULT_VALID_UNTIL_PARAM = DEFAULT_VALID_UNTIL_PARAM;
exports.DEFAULT_EXTRA_PARAM = DEFAULT_EXTRA_PARAM;
exports.isObject = isObject;
exports.toString = toString;
exports.sortedURLEncode = sortedURLEncode;
exports.dictToOrderedDict = dictToOrderedDict;
exports.makeValidUntil = makeValidUntil;
exports.dictKeys = dictKeys;
exports.extractSignedData = extractSignedData;
exports.Signature = Signature;
exports.validateSignature = validateSignature;
exports.RequestHelper = RequestHelper;
exports.unixTimestampToDate = unixTimestampToDate;
exports.getBase = getBase;
exports.makeHash = makeHash;
exports.generateSignature = generateSignature;
exports.signatureToDict = signatureToDict;
exports.validateSignedRequestData = validateSignedRequestData;
