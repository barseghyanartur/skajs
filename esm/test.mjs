import test from "ava";
import {
    SIGNATURE_LIFETIME,
    getBase,
    sortedURLEncode,
    dictToOrderedDict,
    signatureToDict,
    generateSignature,
    makeHash,
    dictKeys,
    isObject,
    Signature,
    HMACSHA256Signature,
    HMACSHA512Signature,
    extractSignedData,
    makeValidUntil,
    validateSignature,
    DEFAULT_SIGNATURE_PARAM,
    validateSignedRequestData,
    defaultValueDumper,
} from "./index.js";

/**
 * Helper functions for testing.
 */

/**
 * Prepare a dictionary with data to sign.
 *
 * @param {Object} requestData
 * @returns {*}
 */
function getSignatureData(requestData) {
    let signatureData = {};
    for (const [key, value] of Object.entries(requestData)) {
        if (SIGNATURE_DATA_KEYS.includes(key)) {
            signatureData[key] = value;
        }
    }
    return signatureData;
}

/**
 * Test data.
 */
const validUntil = parseFloat(1628717009.0).toFixed(1);

/**
 * Sample payload.
 */
const PAYLOAD = {
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

const SIGNATURE_DATA = getSignatureData(PAYLOAD);

/**
 * Tests.
 */

test("Test isObject", (t) => {
    const obj = { name: "Artur", email: "me@example.com" };
    t.is(isObject(obj), true);

    const str = "skajs";
    t.is(isObject(str), false);
});

test("Test sortedURLEncode", (t) => {
    // Case 1: Encoded data quoted
    const encodedData = sortedURLEncode(SIGNATURE_DATA);
    const expectedData =
        "amount%3D491605%26billing%3D%7B%22city%22%3A%22Ospel%22%2C%22country%22%3A%22NL%22%2C%22house_number%22%3A%2235%22%2C%22postal_code%22%3A%226385%20VA%22%2C%22street%22%3A%22Pippasteeg%22%7D%26company%3D%7B%22country%22%3A%22NL%22%2C%22name%22%3A%22Siemens%22%2C%22registration_number%22%3A%22LhkvLTWNTVNxlMKfBruq%22%2C%22vat_number%22%3A%22RNQfPcPtnbDFvQRbJeNJ%22%2C%22website%22%3A%22https%3A%2F%2Fwww.nedschroef.com%2F%22%7D%26currency%3DEUR%26order_id%3DlTAGlTOHtKiBdvRvmhSw%26order_lines%3D%5B%7B%22product_description%22%3A%22Man%20movement%20another%20skill%20draw%20great%20late.%22%2C%22product_id%22%3A%228273401260171%22%2C%22product_name%22%3A%22himself%22%2C%22product_price_excl_tax%22%3A7685%2C%22product_price_incl_tax%22%3A8684%2C%22product_tax_rate_percentage%22%3A13%2C%22quantity%22%3A4%7D%2C%7B%22product_description%22%3A%22Including%20couple%20happen%20ago%20hotel%20son%20know%20list.%22%2C%22product_id%22%3A%226760122207575%22%2C%22product_name%22%3A%22someone%22%2C%22product_price_excl_tax%22%3A19293%2C%22product_price_incl_tax%22%3A20064%2C%22product_tax_rate_percentage%22%3A4%2C%22quantity%22%3A5%7D%2C%7B%22product_description%22%3A%22Simply%20reason%20bring%20manager%20with%20lot.%22%2C%22product_id%22%3A%225014352615527%22%2C%22product_name%22%3A%22able%22%2C%22product_price_excl_tax%22%3A39538%2C%22product_price_incl_tax%22%3A41910%2C%22product_tax_rate_percentage%22%3A6%2C%22quantity%22%3A1%7D%2C%7B%22product_description%22%3A%22Arrive%20government%20such%20arm%20conference%20program%20every.%22%2C%22product_id%22%3A%224666517682328%22%2C%22product_name%22%3A%22person%22%2C%22product_price_excl_tax%22%3A18794%2C%22product_price_incl_tax%22%3A18794%2C%22product_tax_rate_percentage%22%3A0%2C%22quantity%22%3A1%7D%2C%7B%22product_description%22%3A%22Ever%20campaign%20next%20store%20far%20stop%20and.%22%2C%22product_id%22%3A%223428396033957%22%2C%22product_name%22%3A%22chance%22%2C%22product_price_excl_tax%22%3A26894%2C%22product_price_incl_tax%22%3A29314%2C%22product_tax_rate_percentage%22%3A9%2C%22quantity%22%3A2%7D%2C%7B%22product_description%22%3A%22Song%20any%20season%20pick%20box%20chance.%22%2C%22product_id%22%3A%224822589619741%22%2C%22product_name%22%3A%22style%22%2C%22product_price_excl_tax%22%3A17037%2C%22product_price_incl_tax%22%3A19422%2C%22product_tax_rate_percentage%22%3A14%2C%22quantity%22%3A4%7D%5D%26shipping%3D%7B%22city%22%3A%22Noord-Sleen%22%2C%22country%22%3A%22NL%22%2C%22house_number%22%3A%227%22%2C%22postal_code%22%3A%221784KL%22%2C%22street%22%3A%22Femkeboulevard%22%7D%26user%3D%7B%22email%22%3A%22juliegoyaerts-van-waderle%40gmail.com%22%2C%22first_name%22%3A%22Noor%22%2C%22last_name%22%3A%22van%20Praagh%22%2C%22phone_number%22%3A%22%2B31475013353%22%7D%26webshop_id%3D4381a041-11cd-43fa-9fb4-c558bac1bd5e";
    t.is(encodedData, expectedData);

    // Case 2: Encoded data unquoted
    const encodedDataUnquoted = sortedURLEncode(SIGNATURE_DATA, false);
    const expectedDataUnquoted =
        'amount=491605&billing={"city":"Ospel","country":"NL","house_number":"35","postal_code":"6385 VA","street":"Pippasteeg"}&company={"country":"NL","name":"Siemens","registration_number":"LhkvLTWNTVNxlMKfBruq","vat_number":"RNQfPcPtnbDFvQRbJeNJ","website":"https://www.nedschroef.com/"}&currency=EUR&order_id=lTAGlTOHtKiBdvRvmhSw&order_lines=[{"product_description":"Man movement another skill draw great late.","product_id":"8273401260171","product_name":"himself","product_price_excl_tax":7685,"product_price_incl_tax":8684,"product_tax_rate_percentage":13,"quantity":4},{"product_description":"Including couple happen ago hotel son know list.","product_id":"6760122207575","product_name":"someone","product_price_excl_tax":19293,"product_price_incl_tax":20064,"product_tax_rate_percentage":4,"quantity":5},{"product_description":"Simply reason bring manager with lot.","product_id":"5014352615527","product_name":"able","product_price_excl_tax":39538,"product_price_incl_tax":41910,"product_tax_rate_percentage":6,"quantity":1},{"product_description":"Arrive government such arm conference program every.","product_id":"4666517682328","product_name":"person","product_price_excl_tax":18794,"product_price_incl_tax":18794,"product_tax_rate_percentage":0,"quantity":1},{"product_description":"Ever campaign next store far stop and.","product_id":"3428396033957","product_name":"chance","product_price_excl_tax":26894,"product_price_incl_tax":29314,"product_tax_rate_percentage":9,"quantity":2},{"product_description":"Song any season pick box chance.","product_id":"4822589619741","product_name":"style","product_price_excl_tax":17037,"product_price_incl_tax":19422,"product_tax_rate_percentage":14,"quantity":4}]&shipping={"city":"Noord-Sleen","country":"NL","house_number":"7","postal_code":"1784KL","street":"Femkeboulevard"}&user={"email":"juliegoyaerts-van-waderle@gmail.com","first_name":"Noor","last_name":"van Praagh","phone_number":"+31475013353"}&webshop_id=4381a041-11cd-43fa-9fb4-c558bac1bd5e';
    t.is(encodedDataUnquoted, expectedDataUnquoted);

    // Case 3: Encoded simple unicode data quoted
    const encodedData2 = sortedURLEncode({"one": "â"});
    const expectedData2 = "one%3D%C3%A2";
    t.is(encodedData2, expectedData2);

    // Case 4: Encoded simple unicode data unquoted
    const encodedDataUnquoted2 = sortedURLEncode({"one": "â"}, false);
    const expectedDataUnquoted2 = "one=â";
    t.is(encodedDataUnquoted2, expectedDataUnquoted2);

    // Case 5: Encoded simple unicode data quoted
    const encodedData3 = sortedURLEncode({"one": {"value": "â"}}, true);
    const expectedData3 = "one%3D%7B%22value%22%3A%22%5Cu00e2%22%7D";
    t.is(encodedData3, expectedData3); // failing

    // Case 6: Encoded simple unicode data unquoted
    const encodedDataUnquoted3 = sortedURLEncode({"one": {"value": "â"}}, false);
    const expectedDataUnquoted3 = 'one={"value":"\\u00e2"}';
    t.is(encodedDataUnquoted3, expectedDataUnquoted3);
});

test("Test sortedSignatureData", (t) => {
    const sortedSignatureData = dictToOrderedDict(SIGNATURE_DATA);
    const expectedSortedSignatureData = {
        amount: 491605,
        billing: {
            city: "Ospel",
            country: "NL",
            house_number: "35",
            postal_code: "6385 VA",
            street: "Pippasteeg",
        },
        company: {
            country: "NL",
            name: "Siemens",
            registration_number: "LhkvLTWNTVNxlMKfBruq",
            vat_number: "RNQfPcPtnbDFvQRbJeNJ",
            website: "https://www.nedschroef.com/",
        },
        currency: "EUR",
        order_id: "lTAGlTOHtKiBdvRvmhSw",
        order_lines: [
            {
                product_description:
                    "Man movement another skill draw great late.",
                product_id: "8273401260171",
                product_name: "himself",
                product_price_excl_tax: 7685,
                product_price_incl_tax: 8684,
                product_tax_rate_percentage: 13,
                quantity: 4,
            },
            {
                product_description:
                    "Including couple happen ago hotel son know list.",
                product_id: "6760122207575",
                product_name: "someone",
                product_price_excl_tax: 19293,
                product_price_incl_tax: 20064,
                product_tax_rate_percentage: 4,
                quantity: 5,
            },
            {
                product_description: "Simply reason bring manager with lot.",
                product_id: "5014352615527",
                product_name: "able",
                product_price_excl_tax: 39538,
                product_price_incl_tax: 41910,
                product_tax_rate_percentage: 6,
                quantity: 1,
            },
            {
                product_description:
                    "Arrive government such arm conference program every.",
                product_id: "4666517682328",
                product_name: "person",
                product_price_excl_tax: 18794,
                product_price_incl_tax: 18794,
                product_tax_rate_percentage: 0,
                quantity: 1,
            },
            {
                product_description: "Ever campaign next store far stop and.",
                product_id: "3428396033957",
                product_name: "chance",
                product_price_excl_tax: 26894,
                product_price_incl_tax: 29314,
                product_tax_rate_percentage: 9,
                quantity: 2,
            },
            {
                product_description: "Song any season pick box chance.",
                product_id: "4822589619741",
                product_name: "style",
                product_price_excl_tax: 17037,
                product_price_incl_tax: 19422,
                product_tax_rate_percentage: 14,
                quantity: 4,
            },
        ],
        shipping: {
            city: "Noord-Sleen",
            country: "NL",
            house_number: "7",
            postal_code: "1784KL",
            street: "Femkeboulevard",
        },
        user: {
            email: "juliegoyaerts-van-waderle@gmail.com",
            first_name: "Noor",
            last_name: "van Praagh",
            phone_number: "+31475013353",
        },
        webshop_id: "4381a041-11cd-43fa-9fb4-c558bac1bd5e",
    };
    t.deepEqual(sortedSignatureData, expectedSortedSignatureData);
});

test("Test dictKeys", (t) => {
    const keys = dictKeys(PAYLOAD);
    const expectedKeys = [
        "amount",
        "billing",
        "company",
        "currency",
        "order_id",
        "order_lines",
        "shipping",
        "user",
        "webshop_id",
    ];
    t.deepEqual(keys, expectedKeys);
});

test("Test makeHash", (t) => {
    // Case 1
    let _hash = makeHash(AUTH_USER, SECRET_KEY, validUntil, {"one": "â"});
    let buff = Buffer.from(_hash);
    let hash = buff.toString("base64");
    const expectedHash = "dlT2WO/jYq7+xcvDEUkCnNW5TxA=";
    t.is(hash, expectedHash);

    // Case 2
    let _hash2 = makeHash(AUTH_USER, SECRET_KEY, validUntil, {"one": {"value": "â"}});
    let buff2 = Buffer.from(_hash2);
    let hash2 = buff2.toString("base64");
    const expectedHash2 = "+pA63D4EMF2pcfIlE/dYXyNkhx4=";
    t.is(hash2, expectedHash2);
});

test("Test generateSignature", (t) => {
    // Signature test case 1
    const signature = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null
    );
    const expectedSignature = new Signature(
        "WTjN2wPENDW1gCHEVPKz3IXlE0g=",
        "me@example.com",
        "1628717009.0",
        {}
    );
    t.deepEqual(signature, expectedSignature);

    // Signature test case 2
    const signature2 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "1", "two": "2"}
    );
    const expectedSignature2 = new Signature(
        "dFqd/VbWOaY3ROlL89K6JZZsfhE=",
        "me@example.com",
        "1628717009.0",
        {"one": "1", "two": "2"}
    );
    t.deepEqual(signature2, expectedSignature2);

    // Signature test case 3
    const signature3 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        SIGNATURE_DATA
    );
    const expectedSignature3 = new Signature(
        "pHVmnlbzb0hIJ+EWcRhRA3Ajrx8=",
        "me@example.com",
        "1628717009.0",
        {
            order_lines: [
                {
                    quantity: 4,
                    product_id: "8273401260171",
                    product_name: "himself",
                    product_description:
                        "Man movement another skill draw great late.",
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
                    product_description:
                        "Simply reason bring manager with lot.",
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
                    product_description:
                        "Ever campaign next store far stop and.",
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
        }
    );
    t.deepEqual(signature3, expectedSignature3);

    // Integration tests
    // Signature test case 3a
    const signature3a = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "â"}
    );
    const expectedSignature3a = new Signature(
        "dlT2WO/jYq7+xcvDEUkCnNW5TxA=",
        "me@example.com",
        "1628717009.0",
        {"one": "â"}
    );
    t.deepEqual(signature3a, expectedSignature3a);

    // Signature test case 4
    const signature4 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": {"value": "â"}}
    );
    const expectedSignature4 = new Signature(
        "+pA63D4EMF2pcfIlE/dYXyNkhx4=",
        "me@example.com",
        "1628717009.0",
        {"one": {"value": "â"}}
    );
    t.deepEqual(signature4, expectedSignature4);

    // SHA256 signatures
    // Signature test case 11
    const signature11 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const expectedSignature11 = new HMACSHA256Signature(
        "EZ7uXeeopIxK3wL62J/9tKPXoGmNk9V3KHGgwge9/ek=",
        "me@example.com",
        "1628717009.0",
        {}
    );
    t.deepEqual(signature11, expectedSignature11);

    // Signature test case 12
    const signature12 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "1", "two": "2"},
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const expectedSignature12 = new HMACSHA256Signature(
        "Cl90LfQ2L3DW2MAhZriqCfEisPdL+1aHA/M0GPc1Yr4=",
        "me@example.com",
        "1628717009.0",
        {"one": "1", "two": "2"}
    );
    t.deepEqual(signature12, expectedSignature12);

    // Signature test case 13
    const signature13 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "â"},
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const expectedSignature13 = new HMACSHA256Signature(
        "9UpLTlFgEbCJ2C4/gC4eDogn0JiuMzo7osbMEOejwkQ=",
        "me@example.com",
        "1628717009.0",
        {"one": "â"}
    );
    t.deepEqual(signature13, expectedSignature13);

    // Signature test case 14
    const signature14 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": {"value": "â"}},
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const expectedSignature14 = new HMACSHA256Signature(
        "9Tg3PdJYm/2tKZtVU0F/5T6TtL39Rwy4Uniq36ZClMY=",
        "me@example.com",
        "1628717009.0",
        {"one": {"value": "â"}}
    );
    t.deepEqual(signature14, expectedSignature14);

    // SHA512 signatures
    // Signature test case 21
    const signature21 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const expectedSignature21 = new HMACSHA512Signature(
        "7QcInLFxLrv1TeZZY4EXbAc1YguBlcjmYfFe5J+FH4TAOquSBZvKwYLSQCS4VVmdhDDU1h1zVlPDc4MAW6SHGQ==",
        "me@example.com",
        "1628717009.0",
        {}
    );
    t.deepEqual(signature21, expectedSignature21);

    // Signature test case 22
    const signature22 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "1", "two": "2"},
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const expectedSignature22 = new HMACSHA512Signature(
        "+Bm5xtd3Cl+7VV0RM6H14z68M8vWuMP168m3UsXLP1jHTTQCg3mXxTncZ9a57AoQefh/qNmDdnD5AmFYGzJ+PQ==",
        "me@example.com",
        "1628717009.0",
        {"one": "1", "two": "2"}
    );
    t.deepEqual(signature22, expectedSignature22);

    // Signature test case 23
    const signature23 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": "â"},
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const expectedSignature23 = new HMACSHA512Signature(
        "yockrWxDncGJ2/HMEi/ma/auEmv8xlIMm5U50CuTFYSKbzrgNPh4OXgax/s2d96+paaLagwmnZK1+xUGHeArXw==",
        "me@example.com",
        "1628717009.0",
        {"one": "â"}
    );
    t.deepEqual(signature23, expectedSignature23);

    // Signature test case 14
    const signature24 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        {"one": {"value": "â"}},
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const expectedSignature24 = new HMACSHA512Signature(
        "OlFZzu/SlBQYWny3CVvP7ghiL6X8G4r/yS9yNl8N+9b1arae3AkMLCp+0MuLs2sp8qdM3j+a7MYdCQCBSOnAoQ==",
        "me@example.com",
        "1628717009.0",
        {"one": {"value": "â"}}
    );
    t.deepEqual(signature24, expectedSignature24);
});

test("Test signatureToDict", (t) => {
    // Test case 1
    const signatureDict = signatureToDict(
        PAYLOAD["webshop_id"],
        SECRET_KEY,
        SIGNATURE_DATA,
        {
            validUntil: validUntil,
            lifetime: SIGNATURE_LIFETIME,
            signatureParam: DEFAULT_SIGNATURE_PARAM,
            authUserParam: "webshop_id",
        }
    );
    const expectedSignatureDict = {
        signature: "+r9u8ztA7oEe9mTGMxKDVJ/8Sec=",
        valid_until: "1628717009.0",
        extra: "amount,billing,company,currency,order_id,order_lines,shipping,user,webshop_id",
        order_lines: [
            {
                quantity: 4,
                product_id: "8273401260171",
                product_name: "himself",
                product_description:
                    "Man movement another skill draw great late.",
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
    t.deepEqual(signatureDict, expectedSignatureDict);

    // Test case 2
    const signatureDict2 = signatureToDict(
        PAYLOAD["webshop_id"],
        SECRET_KEY,
        {"one": "1", "two": "2"},
        {
            validUntil: validUntil,
            lifetime: SIGNATURE_LIFETIME,
            signatureParam: DEFAULT_SIGNATURE_PARAM,
            authUserParam: "webshop_id",
        },
    );
    const expectedSignatureDict2 = {
        "one": "1",
        "two": "2",
        signature: "Fg4s3QErL2GySta8VhNBXaaBSDM=",
        webshop_id: "4381a041-11cd-43fa-9fb4-c558bac1bd5e",
        valid_until: "1628717009.0",
        extra: "one,two",
    };
    t.deepEqual(signatureDict2, expectedSignatureDict2);
});

test("Test getBase", (t) => {
    // Test case 1
    const base = getBase(AUTH_USER, validUntil, null);
    const expectedBase = "1628717009.0_me@example.com";
    t.is(base, expectedBase);

    // Test case 2
    const base2 = getBase(AUTH_USER, validUntil, {"one": "1", "two": "2"});
    const expectedBase2 = "1628717009.0_me@example.com_one%3D1%26two%3D2";
    t.is(base2, expectedBase2);

    // Test case 3
    const base3 = getBase(AUTH_USER, validUntil, {"one": "â"});
    const expectedBase3 = "1628717009.0_me@example.com_one%3D%C3%A2";
    t.is(base3, expectedBase3);

    // Test case 4
    const base4 = getBase(AUTH_USER, validUntil, {"one": {"value": "â"}});
    const expectedBase4 = "1628717009.0_me@example.com_one%3D%7B%22value%22%3A%22%5Cu00e2%22%7D";
    t.is(base4, expectedBase4);
});

test("Test dictToOrderedDict", (t) => {
    const orderedPayload = dictToOrderedDict(PAYLOAD);
    const expectedOrderedPayload = {
        amount: 491605,
        billing: {
            city: "Ospel",
            country: "NL",
            house_number: "35",
            postal_code: "6385 VA",
            street: "Pippasteeg",
        },
        company: {
            country: "NL",
            name: "Siemens",
            registration_number: "LhkvLTWNTVNxlMKfBruq",
            vat_number: "RNQfPcPtnbDFvQRbJeNJ",
            website: "https://www.nedschroef.com/",
        },
        currency: "EUR",
        order_id: "lTAGlTOHtKiBdvRvmhSw",
        order_lines: [
            {
                product_description:
                    "Man movement another skill draw great late.",
                product_id: "8273401260171",
                product_name: "himself",
                product_price_excl_tax: 7685,
                product_price_incl_tax: 8684,
                product_tax_rate_percentage: 13,
                quantity: 4,
            },
            {
                product_description:
                    "Including couple happen ago hotel son know list.",
                product_id: "6760122207575",
                product_name: "someone",
                product_price_excl_tax: 19293,
                product_price_incl_tax: 20064,
                product_tax_rate_percentage: 4,
                quantity: 5,
            },
            {
                product_description: "Simply reason bring manager with lot.",
                product_id: "5014352615527",
                product_name: "able",
                product_price_excl_tax: 39538,
                product_price_incl_tax: 41910,
                product_tax_rate_percentage: 6,
                quantity: 1,
            },
            {
                product_description:
                    "Arrive government such arm conference program every.",
                product_id: "4666517682328",
                product_name: "person",
                product_price_excl_tax: 18794,
                product_price_incl_tax: 18794,
                product_tax_rate_percentage: 0,
                quantity: 1,
            },
            {
                product_description: "Ever campaign next store far stop and.",
                product_id: "3428396033957",
                product_name: "chance",
                product_price_excl_tax: 26894,
                product_price_incl_tax: 29314,
                product_tax_rate_percentage: 9,
                quantity: 2,
            },
            {
                product_description: "Song any season pick box chance.",
                product_id: "4822589619741",
                product_name: "style",
                product_price_excl_tax: 17037,
                product_price_incl_tax: 19422,
                product_tax_rate_percentage: 14,
                quantity: 4,
            },
        ],
        shipping: {
            city: "Noord-Sleen",
            country: "NL",
            house_number: "7",
            postal_code: "1784KL",
            street: "Femkeboulevard",
        },
        user: {
            email: "juliegoyaerts-van-waderle@gmail.com",
            first_name: "Noor",
            last_name: "van Praagh",
            phone_number: "+31475013353",
        },
        webshop_id: "4381a041-11cd-43fa-9fb4-c558bac1bd5e",
    };
    t.deepEqual(orderedPayload, expectedOrderedPayload);
});

test("Test extractSignedData", (t) => {
    // Test case 1
    const signatureDict = signatureToDict(
        PAYLOAD["webshop_id"],
        SECRET_KEY,
        SIGNATURE_DATA,
        {
            validUntil: validUntil,
            lifetime: SIGNATURE_LIFETIME,
            signatureParam: DEFAULT_SIGNATURE_PARAM,
            authUserParam: "webshop_id",
        },

    );
    const extractedSignedData = extractSignedData(
        signatureDict,
        SIGNATURE_DATA_KEYS
    );
    const expectedExtractedSignedData = {
        order_lines: [
            {
                quantity: 4,
                product_id: "8273401260171",
                product_name: "himself",
                product_description:
                    "Man movement another skill draw great late.",
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
    t.deepEqual(extractedSignedData, expectedExtractedSignedData);
});

test("Test validateSignature", (t) => {
    // Test case 1 - valid non-expired signature
    const signature = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        makeValidUntil(),
        SIGNATURE_LIFETIME,
        null
    );
    const isValidSignature = validateSignature(
        signature.signature,
        signature.authUser,
        SECRET_KEY,
        signature.validUntil,
        signature.extra
    );
    t.is(isValidSignature, true);

    // Test case 2 - expired signature
    const signature2 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null
    );
    const isValidSignature2 = validateSignature(
        signature2.signature,
        signature2.authUser,
        SECRET_KEY,
        signature2.validUntil,
        signature2.extra
    );
    t.is(isValidSignature2, false);
    t.is(signature2.isExpired(), true);

    // Test case 21 - valid non-expired signature
    const signature21 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        makeValidUntil(),
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const isValidSignature21 = validateSignature(
        signature21.signature,
        signature21.authUser,
        SECRET_KEY,
        signature21.validUntil,
        signature21.extra,
        false,
        defaultValueDumper,
        HMACSHA256Signature,
    );
    t.is(isValidSignature21, true);

    // Test case 22 - expired signature
    const signature22 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA256Signature,
    );
    const isValidSignature22 = validateSignature(
        signature22.signature,
        signature22.authUser,
        SECRET_KEY,
        signature22.validUntil,
        signature22.extra,
        false,
        defaultValueDumper,
        HMACSHA256Signature,
    );
    t.is(isValidSignature22, false);
    t.is(signature22.isExpired(), true);

    // Test case 31 - valid non-expired signature
    const signature31 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        makeValidUntil(),
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const isValidSignature31 = validateSignature(
        signature31.signature,
        signature31.authUser,
        SECRET_KEY,
        signature31.validUntil,
        signature31.extra,
        false,
        defaultValueDumper,
        HMACSHA512Signature,
    );
    t.is(isValidSignature31, true);

    // Test case 32 - expired signature
    const signature32 = generateSignature(
        AUTH_USER,
        SECRET_KEY,
        validUntil,
        SIGNATURE_LIFETIME,
        null,
        defaultValueDumper,
        HMACSHA512Signature,
    );
    const isValidSignature32 = validateSignature(
        signature32.signature,
        signature32.authUser,
        SECRET_KEY,
        signature32.validUntil,
        signature32.extra,
        false,
        defaultValueDumper,
        HMACSHA512Signature,
    );
    t.is(isValidSignature32, false);
    t.is(signature32.isExpired(), true);
});

test("Test validateSignedRequestData", (t) => {
    // Test case 1 - valid non-expired signature
    const validSignatureDict = signatureToDict(
        PAYLOAD["webshop_id"],
        SECRET_KEY,
        SIGNATURE_DATA,
        {
            validUntil: makeValidUntil(),
            lifetime: SIGNATURE_LIFETIME,
            signatureParam: DEFAULT_SIGNATURE_PARAM,
            authUserParam: "webshop_id",
        },

    );
    let payloadCopy = JSON.parse(JSON.stringify(PAYLOAD));
    let updatedPayload = {
        ...payloadCopy,
        ...validSignatureDict,
    };
    const isValidRequestData = validateSignedRequestData(
        updatedPayload,
        SECRET_KEY,
        {
            signatureParam: DEFAULT_SIGNATURE_PARAM,
            authUserParam: "webshop_id",
        }
    );
    t.is(isValidRequestData, true);
});
