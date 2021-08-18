import {
    SIGNATURE_LIFETIME,
    getBase,
    sortedURLEncode,
    dictToOrderedDict,
    signatureToDict,
    generateSignature,
    makeHash,
    dictKeys,
} from "./index.js";

/**
 * Prepare a dictionary with data to sign.
 *
 * @param {Object} requestData
 * @returns {*}
 */
export function getSignatureData(requestData) {
    let signatureData = {};
    for (const [key, value] of Object.entries(requestData)) {
        if (SIGNATURE_DATA_KEYS.includes(key)) {
            signatureData[key] = value;
        }
    }
    return signatureData;
}

/**
 * Sample payload.
 */
const payload = {
    order_lines: [
        {
            quantity: 4,
            product_id: "8273401260171",
            product_name: "himself",
            product_description: "Man movement another skill draw great late.",
            product_price_excl_tax: 7685,
            product_price_incl_tax: 8684,
            product_tax_rate_percentage: 13,
        },
        {
            quantity: 5,
            product_id: "6760122207575",
            product_name: "someone",
            product_description:
                "Including couple happen ago hotel son know list.",
            product_price_excl_tax: 19293,
            product_price_incl_tax: 20064,
            product_tax_rate_percentage: 4,
        },
        {
            quantity: 1,
            product_id: "5014352615527",
            product_name: "able",
            product_description: "Simply reason bring manager with lot.",
            product_price_excl_tax: 39538,
            product_price_incl_tax: 41910,
            product_tax_rate_percentage: 6,
        },
        {
            quantity: 1,
            product_id: "4666517682328",
            product_name: "person",
            product_description:
                "Arrive government such arm conference program every.",
            product_price_excl_tax: 18794,
            product_price_incl_tax: 18794,
            product_tax_rate_percentage: 0,
        },
        {
            quantity: 2,
            product_id: "3428396033957",
            product_name: "chance",
            product_description: "Ever campaign next store far stop and.",
            product_price_excl_tax: 26894,
            product_price_incl_tax: 29314,
            product_tax_rate_percentage: 9,
        },
        {
            quantity: 4,
            product_id: "4822589619741",
            product_name: "style",
            product_description: "Song any season pick box chance.",
            product_price_excl_tax: 17037,
            product_price_incl_tax: 19422,
            product_tax_rate_percentage: 14,
        },
    ],
    webshop_id: "4381a041-11cd-43fa-9fb4-c558bac1bd5e",
    order_id: "lTAGlTOHtKiBdvRvmhSw",
    amount: 491605,
    currency: "EUR",
    company: {
        name: "Siemens",
        registration_number: "LhkvLTWNTVNxlMKfBruq",
        vat_number: "RNQfPcPtnbDFvQRbJeNJ",
        website: "https://www.nedschroef.com/",
        country: "NL",
    },
    user: {
        first_name: "Noor",
        last_name: "van Praagh",
        email: "juliegoyaerts-van-waderle@gmail.com",
        phone_number: "+31475013353",
    },
    shipping: {
        street: "Femkeboulevard",
        house_number: "7",
        city: "Noord-Sleen",
        postal_code: "1784KL",
        country: "NL",
    },
    billing: {
        street: "Pippasteeg",
        house_number: "35",
        city: "Ospel",
        postal_code: "6385 VA",
        country: "NL",
    },
};

/**
 * *******************************************
 * *************** App specific **************
 * *******************************************
 */

/**
 * Shared secret
 */
const SECRET_KEY = "UxuhnPaO4vKA";

/**
 * Auth user.
 */
const AUTH_USER = "me@example.com";

/**
 * Fields to sign
 */
const SIGNATURE_DATA_KEYS = [
    "webshop_id",
    "order_id",
    "company",
    "order_lines",
    "amount",
    "currency",
    "user",
    "shipping",
    "billing",
];

/**
 * *******************************************
 * *************** Usage examples ************
 * *******************************************
 */

/**
 * Signature data
 */
const signatureData = getSignatureData(payload);

console.log("\n === \n signatureData \n === \n");
console.log(signatureData);

const sortedSignatureData = dictToOrderedDict(signatureData);

console.log("\n === \n sortedSignatureData \n === \n");
console.log(sortedSignatureData);

let validUntil = parseFloat(1628717009.0).toFixed(1);
console.log("\n === \n validUntil \n === \n");
console.log(validUntil);

const keys = dictKeys(payload);

console.log("\n === \n keys \n === \n");
console.log(keys);

let hash = makeHash(
    AUTH_USER,
    SECRET_KEY,
    validUntil, // makeValidUntil(),
    sortedSignatureData
);

console.log("\n === \n hash \n === \n");
console.log(hash);

const hash2 = makeHash(
    AUTH_USER,
    SECRET_KEY,
    validUntil, // makeValidUntil(),
    null
);

console.log("\n === \n hash2 \n === \n");
console.log(hash2);

const hash3 = makeHash(
    AUTH_USER,
    SECRET_KEY,
    validUntil, // makeValidUntil(),
    { 1: "1", 2: "2" }
);

console.log("\n === \n hash3 \n === \n");
console.log(hash3);

// var validUntil = makeValidUntil();

// console.log(validUntil);

let signature = generateSignature(
    AUTH_USER,
    SECRET_KEY,
    validUntil,
    SIGNATURE_LIFETIME,
    null
);

console.log("\n === \n signature \n === \n");
console.log(signature);

const signature2 = generateSignature(
    AUTH_USER,
    SECRET_KEY,
    validUntil,
    SIGNATURE_LIFETIME,
    { 1: "1", 2: "2" }
);

console.log("\n === \n signature2 \n === \n");
console.log(signature2);

const signature3 = generateSignature(
    AUTH_USER,
    SECRET_KEY,
    validUntil,
    SIGNATURE_LIFETIME,
    signatureData
);

console.log("\n === \n signature3 \n === \n");
console.log(signature3);

const signatureDict = signatureToDict(
    payload["webshop_id"],
    SECRET_KEY,
    validUntil,
    SIGNATURE_LIFETIME,
    signatureData,
    "webshop_id"
);

console.log("\n === \n signatureDict \n === \n");
console.log(signatureDict);

const signatureDict2 = signatureToDict(
    payload["webshop_id"],
    SECRET_KEY,
    validUntil,
    SIGNATURE_LIFETIME,
    { 1: "1", 2: "2" },
    "webshop_id"
);

console.log("\n === \n signatureDict2 \n === \n");
console.log(signatureDict2);

const base = getBase(AUTH_USER, validUntil, null);

console.log("\n === \n base \n === \n");
console.log(base);

const base2 = getBase(AUTH_USER, validUntil, { 1: "1", 2: "2" });

console.log("\n === \n base2 \n === \n");
console.log(base2);

const encodedData = sortedURLEncode(signatureData);
console.log("\n === \n encodedData \n === \n");
console.log(encodedData);

const encodedData2 = sortedURLEncode(signatureData, false);
console.log("\n === \n encodedData2 \n === \n");
console.log(encodedData2);

const orderedPayload = dictToOrderedDict(payload);
console.log("\n === \n orderedPayload \n === \n");
console.log(orderedPayload);
