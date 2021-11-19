import { createHmac } from "crypto";

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
 * Convert number to hex.
 *
 * @param value
 * @returns {string}
 */
function convertNumberToHex(value) {
   return "\\u" + ("00" + value.charCodeAt(0).toString(16)).slice(-4);
}

/**
 * Encode special characters.
 *
 * @param value
 * @return {*}
 */
function encodeValue(value) {
    let encodedValue = "";
    for (let i = 0; i < value.length; i++) {
        if (value.codePointAt(i) > 127) {
            encodedValue += convertNumberToHex(value[i]);
        } else {
            encodedValue += value.charAt(i);
        }
    }
    encodedValue = encodedValue.replace("\\\\", "\\");
    return encodedValue;
}

/**
 * Default value dumper.
 *
 * @param value
 * @returns {*}
 */
function defaultValueDumper(value) {
    if (isObject(value) || Array.isArray(value)) {
        return encodeValue(JSON.stringify(value));
    }
    return value;
}

/**
 * Sorted `urlencode`.
 *
 * @param {Object} data
 * @param {boolean} quoted
 * @param {Function} valueDumper
 * @returns {string}
 */
function sortedURLEncode(data, quoted = true, valueDumper = defaultValueDumper) {
    console.log("data: ");
    console.log(data);

    let orderedData = dictToOrderedDict(data);
    console.log("orderedData: ");
    console.log(orderedData);

    let _sorted = [];
    for (const [key, value] of Object.entries(orderedData)) {
        _sorted.push(`${key}=${valueDumper(value)}`);
    }
    let _res = _sorted.join("&");
    if (quoted) {
        _res = encodeURIComponent(_res);
    }
    return _res;
    // return _res.replace("\\\\", "\\").replace("%5C%5C", "%5C");
}

/**
 * Dict to ordered dict.
 *
 * @param {Object} value
 * @param {Function} valueDumper
 * @returns {{}|*}
 */
function dictToOrderedDict(value) {
    if (typeof value !== "object" || !value) return value;
    if (Array.isArray(value)) {
        return value.map(val => dictToOrderedDict(val));
    }
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
 * ErrorCode.
 *
 * @class ErrorCode
 */
class ErrorCode {

    constructor(code, message)
    {
        this.code = code;
        this.message = message;
    }

    toString() {
        return this.message;
    }
}

const INVALID_SIGNATURE = new ErrorCode(1, "Invalid signature!");
const SIGNATURE_TIMESTAMP_EXPIRED = new ErrorCode(2, "Signature timestamp expired!");

/**
 * Signature validation result container.
 *
 * @class SignatureValidationResult
 */
class SignatureValidationResult {
    /**
     * Constructor.
     *
     * @param {boolean} result
     * @param {list} errors
     */
    constructor(result, errors) {
        this.result = result;
        this.errors = errors ?? [];
    }

    /**
     * Human readable message of all errors.
     *
     * @returns {string}
     */
    message() {
        return this.errors.join(" ");
    }
}

/**
 * Signature.
 *
 * @class AbstractSignature
 */
class AbstractSignature {
    /**
     * Constructor.
     *
     * @param {string} signature
     * @param {string} authUser
     * @param {string|number} validUntil
     * @param {Object} extra
     */
    constructor(signature, authUser, validUntil, extra) {
        if (this.constructor === AbstractSignature) {
            throw new Error("Abstract classes can't be instantiated.");
        }
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

    /**
     * Make hash.
     *
     * @param {string} authUser
     * @param {string} secretKey
     * @param {string|number} validUntil
     * @param {Object} extra
     * @param {Function} valueDumper
     * @returns {Promise<ArrayBuffer>}
     */
    static makeHash(
        authUser,
        secretKey,
        validUntil,
        extra,
        valueDumper
    ) {
        throw new Error("Method 'makeHash()' must be implemented.");
    }


}

/**
 * HMACSHA1Signature.
 *
 * @class HMACSHA1Signature
 * @extends {AbstractSignature}
 */
class HMACSHA1Signature extends AbstractSignature {

    /**
     * Make hash.
     *
     * @param {string} authUser
     * @param {string} secretKey
     * @param {string|number} validUntil
     * @param {Object} extra
     * @param {Function} valueDumper
     * @returns {Promise<ArrayBuffer>}
     */
    static makeHash(
        authUser,
        secretKey,
        validUntil,
        extra,
        valueDumper
    ) {
        return makeHash(
            authUser,
            secretKey,
            validUntil,
            extra,
            valueDumper,
            "sha1"
        )
    }
}

const Signature = HMACSHA1Signature; // For backwards compatibility

/**
 * HMACSHA256Signature.
 *
 * @class HMACSHA256Signature
 * @extends {AbstractSignature}
 */
class HMACSHA256Signature extends AbstractSignature {

    /**
     * Make hash.
     *
     * @param {string} authUser
     * @param {string} secretKey
     * @param {string|number} validUntil
     * @param {Object} extra
     * @param {Function} valueDumper
     * @returns {Promise<ArrayBuffer>}
     */
    static makeHash(
        authUser,
        secretKey,
        validUntil,
        extra,
        valueDumper
    ) {
        return makeHash(
            authUser,
            secretKey,
            validUntil,
            extra,
            valueDumper,
            "sha256"
        )
    }
}

/**
 * HMACSHA512Signature.
 *
 * @class HMACSHA512Signature
 * @extends {AbstractSignature}
 */
class HMACSHA512Signature extends AbstractSignature {

    /**
     * Make hash.
     *
     * @param {string} authUser
     * @param {string} secretKey
     * @param {string|number} validUntil
     * @param {Object} extra
     * @param {Function} valueDumper
     * @returns {Promise<ArrayBuffer>}
     */
    static makeHash(
        authUser,
        secretKey,
        validUntil,
        extra,
        valueDumper
    ) {
        return makeHash(
            authUser,
            secretKey,
            validUntil,
            extra,
            valueDumper,
            "sha512"
        )
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
 * @param {Function} valueDumper
 * @param {AbstractSignature} signatureCls
 * @returns {boolean|SignatureValidationResult}
 */
function validateSignature(
    signature,
    authUser,
    secretKey,
    validUntil,
    extra = null,
    returnObject = false,
    valueDumper = defaultValueDumper,
    signatureCls = Signature,
) {
    if (!extra) {
        extra = {};
    }

    const sig = generateSignature(
        authUser,
        secretKey,
        validUntil,
        SIGNATURE_LIFETIME,
        extra,
        valueDumper,
        signatureCls,
    );

    if (!returnObject) {
        return sig.signature === signature && !sig.isExpired();
    }

    let result = sig.signature === signature && !sig.isExpired();
    let errors = [];
    if (sig.signature !== signature) {
        errors.push(INVALID_SIGNATURE);
    }
    if (sig.isExpired()) {
        errors.push(SIGNATURE_TIMESTAMP_EXPIRED);
    }
    return new SignatureValidationResult(result, errors);
}

/**
 * *******************************************
 * ****************** Utils ******************
 * *******************************************
 */

/**
 * Request helper.
 *
 * @class RequestHelper
 */
class RequestHelper {
    /**
     * Constructor.
     *
     * @param {string} signatureParam
     * @param {string} authUserParam
     * @param {string} validUntilParam
     * @param {string} extraParam
     * @param {AbstractSignature} signatureCls
     */
    constructor(
        signatureParam = DEFAULT_SIGNATURE_PARAM,
        authUserParam = DEFAULT_AUTH_USER_PARAM,
        validUntilParam = DEFAULT_VALID_UNTIL_PARAM,
        extraParam = DEFAULT_EXTRA_PARAM,
        signatureCls = Signature,
    ) {
        this.signatureParam = signatureParam;
        this.authUserParam = authUserParam;
        this.validUntilParam = validUntilParam;
        this.extraParam = extraParam;
        this.signatureCls = signatureCls;
    }

    /**
     * Signature to dict.
     *
     * @param {AbstractSignature} signature
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
     * @param {Function} valueDumper
     */
    validateRequestData(data, secretKey, valueDumper = defaultValueDumper) {
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
            extraData,
            false,
            valueDumper,
            this.signatureCls,
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
 *
 * @param {string|number} timestamp
 * $returns {string}
 */
function normalizeUnixTimestamp(timestamp) {
    return parseFloat(timestamp).toFixed(1);
}


/**
 * Make a secret key.
 *
 * @param {string} authUser
 * @param {string|number} validUntil
 * @param {Object} extra
 * @param {Function} valueDumper
 * @returns {string}
 */
function getBase(
    authUser,
    validUntil,
    extra = null,
    valueDumper = defaultValueDumper
) {
    if (!extra) {
        extra = {};
    }

    // validUntil = parseFloat(validUntil).toFixed(1);
    validUntil = normalizeUnixTimestamp(validUntil);

    let _base = [validUntil, authUser];

    if (extra) {
        let urlencodedExtra = sortedURLEncode(extra, true, valueDumper);
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
 * @param {Function} valueDumper
 * @param {string} algorithm
 * @returns {Promise<ArrayBuffer>}
 */
function makeHash(
    authUser,
    secretKey,
    validUntil = null,
    extra = null,
    valueDumper = defaultValueDumper,
    algorithm = "sha1",
) {
    if (!extra) {
        extra = {};
    }

    let _base = getBase(authUser, validUntil, extra, valueDumper);
    let rawHmac = createHmac(algorithm, secretKey);
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
 * @param {Function} valueDumper
 * @param {AbstractSignature} signatureCls
 * @returns {null|AbstractSignature}
 */
function generateSignature(
    authUser,
    secretKey,
    validUntil = null,
    lifetime = SIGNATURE_LIFETIME,
    extra = null,
    valueDumper = defaultValueDumper,
    signatureCls = Signature
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

    let hash = signatureCls.makeHash(
        authUser,
        secretKey,
        validUntil,
        extra,
        valueDumper
    );

    let buff = Buffer.from(hash);

    let signature = buff.toString("base64");

    return new signatureCls(signature, authUser, validUntil, extra);
}


/**
 * Get defaults for signatureToDict function.
 *
 * @param {int|null} lifetime
 * @return {Object}
 */
function getSignatureToDictDefaults(lifetime = null) {
    // * @param {string|number|null} validUntil
    // * @param {number} lifetime
    // * @param {string} signatureParam
    // * @param {string} authUserParam
    // * @param {string} validUntilParam
    // * @param {string} extraParam
    // * @param {string} valueDumper
    if (!lifetime) {
        lifetime = SIGNATURE_LIFETIME;
    }
    return {
        validUntil: makeValidUntil(lifetime),
        lifetime: lifetime,
        signatureParam: DEFAULT_SIGNATURE_PARAM,
        authUserParam: DEFAULT_AUTH_USER_PARAM,
        validUntilParam: DEFAULT_VALID_UNTIL_PARAM,
        extraParam: DEFAULT_EXTRA_PARAM,
        valueDumper: defaultValueDumper,
        signatureCls: Signature,
    };
}

/**
 * Signature to dict.
 *
 * @param {string} authUser
 * @param {string} secretKey
 * @param {Object} extra
 * @param {Object} options
 * @returns {{}}
 */
function signatureToDict(
    authUser,
    secretKey,
    extra = null,
    options = {}
) {
    let lifetime = options["lifetime"] ?? SIGNATURE_LIFETIME;
    let defaults = getSignatureToDictDefaults(lifetime);
    options = {
        ...defaults,
        ...options
    };
    let validUntil = options["validUntil"];
    let signatureParam = options["signatureParam"];
    let authUserParam = options["authUserParam"];
    let validUntilParam = options["validUntilParam"];
    let extraParam = options["extraParam"];
    let valueDumper = options["valueDumper"];
    let signatureCls = options["signatureCls"];

    let signature = generateSignature(
        authUser,
        secretKey,
        validUntil,
        lifetime,
        extra,
        valueDumper,
        signatureCls,
    );

    const requestHelper = new RequestHelper(
        signatureParam,
        authUserParam,
        validUntilParam,
        extraParam,
        signatureCls
    );

    return requestHelper.signatureToDict(signature);
}

/**
 * Defaults for validateSignedRequestData function.
 */
// * @param signatureParam
// * @param authUserParam
// * @param validUntilParam
// * @param extraParam
// * @param valueDumper
// * @param signatureCls
const VALIDATE_SIGNED_REQUEST_DATA_DEFAULTS = {
    signatureParam: DEFAULT_SIGNATURE_PARAM,
    authUserParam: DEFAULT_AUTH_USER_PARAM,
    validUntilParam: DEFAULT_VALID_UNTIL_PARAM,
    extraParam: DEFAULT_EXTRA_PARAM,
    valueDumper: defaultValueDumper,
    signatureCls: Signature,
}

/**
 * Validate signed request data.
 *
 * @param data
 * @param secretKey
 * @param options
 * @param validate
 * @param failSilently
 */
function validateSignedRequestData(
    data,
    secretKey,
    options = {},
    validate = false,
    failSilently = false
) {
    options = {
        ...VALIDATE_SIGNED_REQUEST_DATA_DEFAULTS,
        ...options
    };
    let signatureParam = options["signatureParam"];
    let authUserParam = options["authUserParam"];
    let validUntilParam = options["validUntilParam"];
    let extraParam = options["extraParam"];
    let valueDumper = options["valueDumper"];
    let signatureCls = options["signatureCls"];

    const requestHelper = new RequestHelper(
        signatureParam,
        authUserParam,
        validUntilParam,
        extraParam,
        signatureCls
    );

    return requestHelper.validateRequestData(data, secretKey, valueDumper);
}

export {
    SIGNATURE_LIFETIME,
    DEFAULT_SIGNATURE_PARAM,
    DEFAULT_AUTH_USER_PARAM,
    DEFAULT_VALID_UNTIL_PARAM,
    DEFAULT_EXTRA_PARAM,
    isObject,
    toString,
    sortedURLEncode,
    convertNumberToHex,
    encodeValue,
    defaultValueDumper,
    dictToOrderedDict,
    makeValidUntil,
    dictKeys,
    extractSignedData,
    Signature,
    HMACSHA1Signature,
    HMACSHA256Signature,
    HMACSHA512Signature,
    validateSignature,
    RequestHelper,
    unixTimestampToDate,
    getBase,
    makeHash,
    generateSignature,
    signatureToDict,
    validateSignedRequestData,
    SignatureValidationResult,
    ErrorCode,
    INVALID_SIGNATURE,
    SIGNATURE_TIMESTAMP_EXPIRED,
};
