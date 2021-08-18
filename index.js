// const crypto = require('crypto');
import { createHmac } from "crypto";

/**
 * *******************************************
 * *************** Constants *****************
 * *******************************************
 */

/**
 * Signature lifetime in seconds.
 */
export const SIGNATURE_LIFETIME = 600;

/**
 * Default name of the REQUEST param holding the generated signature value.
 */
export const DEFAULT_SIGNATURE_PARAM = "signature";

/**
 * Default auth_user param.
 */
export const DEFAULT_AUTH_USER_PARAM = "auth_user";

/**
 * Default name of the REQUEST param holding the ``valid_until`` value.
 */
export const DEFAULT_VALID_UNTIL_PARAM = "valid_until";

/**
 * Default name of the REQUEST param holding the ``extra`` value.
 */
export const DEFAULT_EXTRA_PARAM = "extra";

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
export function isObject(value) {
    return value && typeof value === "object" && value.constructor === Object;
}

/**
 * Convert value to string.
 *
 * @param {Object} value
 * @returns {string}
 */
export function toString(value) {
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
export function sortedURLEncode(data, quoted = true) {
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
export function dictToOrderedDict(value) {
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
 * @returns {number}
 */
export function makeValidUntil(lifetime = SIGNATURE_LIFETIME) {
    let validUntil = new Date();
    validUntil.setSeconds(validUntil.getSeconds() + lifetime);
    return validUntil / 1000;
}

/**
 * Get sorted keys from dictionary given.
 *
 * @param {Object} dict
 * @param {boolean} returnString
 * @returns {string|string[]}
 */
export function dictKeys(dict, returnString = false) {
    let keys = Object.keys(dict);
    keys.sort();
    if (returnString) {
        return keys.join(",");
    }
    return keys;
}

/**
 * *******************************************
 * ****************** Base *******************
 * *******************************************
 */

/**
 * Signature.
 */
export class Signature {
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
 * *******************************************
 * ****************** Utils ******************
 * *******************************************
 */

/**
 * Request helper.
 */
export class RequestHelper {
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
export function unixTimestampToDate(validUntil) {
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
export function getBase(authUser, validUntil, extra = null) {
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
export function makeHash(authUser, secretKey, validUntil = null, extra = null) {
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
export function generateSignature(
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
export function signatureToDict(
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
