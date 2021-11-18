# ska

Lets you easily sign data, using symmetric-key algorithm encryption. Allows
you to validate signed data and identify possible validation errors. Uses
sha/hmac for signature encryption. Comes with shortcut functions for signing (and
validating) dictionaries.

[![NPM Version](https://img.shields.io/npm/v/skajs.svg)](https://www.npmjs.com/package/skajs)
[![Supported NodeJS versions](https://img.shields.io/node/v/skajs.svg)](https://www.npmjs.com/package/skajs)
[![Build Status](https://github.com/barseghyanartur/skajs/actions/workflows/node.js.yml/badge.svg)](https://github.com/barseghyanartur/skajs/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/barseghyanartur/skajs/#License)

## Key concepts

Hosts, that communicate with each other, share the Secret Key, which is used
to sign data (requests). Secret key is never sent around.

One of the cases is signing of HTTP requests. Each (HTTP) request is signed
on the sender side using the shared Secret Key and as an outcome produces the
triple (`signature`, `auth_user`, `valid_until`) which are used to sign
the requests.

-   `signature` (`string`): Signature generated.
-   `auth_user` (`string`): User making the request. Can be anything.
-   `valid_until` (`float` or `string`): Signature expiration time (Unix timestamp).

On the recipient side, (HTTP request) data is validated using the shared
Secret Key. It's being checked whether signature is valid and not expired.

```
    ┌─────────────┐           Data              ┌─────────────┐
    │   Host 1    ├────────────────────────────>│   Host 2    │
    │ ─────────── │                             │ ─────────── │
    │ secret key  │                             │ secret key  │
    │ 'my-secret' │<────────────────────────────┤ 'my-secret' │
    └─────────────┘           Data              └─────────────┘
```

## Features

-   Sign dictionaries.
-   Validate signed dictionaries.

## Installation

Latest stable version from NPM registry:

```shell
npm install skajs
```

## Usage examples

Usage example are present for both CommonJS and ESM.

### CommonJS

```shell
node examples.js
```

### ESM

```shell
node examples.mjs
```

### Basic usage

#### Sender side

Signing dictionaries is as simple as follows.

##### Required imports.

**CommonJS**

```javascript
const { signatureToDict } = require("skajs");
```

**ESM**

```javascript
import { signatureToDict } from "skajs";
```

##### Sign data

**Sample usage:**

```javascript
const signatureDict = signatureToDict("user", "your-secret_key");
```

**Sample output:**

```javascript
{
  signature: 'sf40lBWO5CquFfHr6jSXxhl2oW0=',
  auth_user: 'user',
  valid_until: '1631827551.6',
  extra: ''
}
```

**Adding of additional data to the signature works in the same way:**

```javascript
const signatureDict = signatureToDict(
    "user",
    "your-secret_key",
    {
        "email": "john.doe@mail.example.com",
        "first_name": "John",
        "last_name": "Doe",
    }
);
```

**Sample output:**

```javascript
{
  signature: 'B0sscS+xXWU+NR+9dBCoGFnDtlw=',
  auth_user: 'user',
  valid_until: '1631827551.6',
  extra: 'email,first_name,last_name',
  email: 'john.doe@mail.example.com',
  first_name: 'John',
  last_name: 'Doe',
}
```
**Options and defaults:**

The `signatureToDict` function accepts an optional `options` argument.

Default value for the `validUntil` in the `options` is 10 minutes from now. If
you want it to be different, set `validUntil` in the `options` of
the `signatureToDict` function.

Default lifetime of a signature is 10 minutes (600 seconds). If you want it
to be different, set `lifetime` in the `options` of the `signatureToDict`
function.

Default name of the (GET) param holding the generated signature value
is `signature`. If you want it to be different,set the `signatureParam`
in the `options` of the `signatureToDict` function.

Default name of the (GET) param holding the `authUser` value is
`auth_user`. If you want it to be different, set `authUserParam`
in the `options` of the `signatureToDict` function.

Default name of the (GET) param holding the `validUntil` value is
`valid_until`. If you want it to be different,  set the `validUntilParam`
in the `options` of the `signatureToDict` function.

Default name of the (GET) param holding the `extra` value is
`extra`. If you want it to be different, set the `extraParam`
in the `ooptions` of the `signatureToDict` function.

```javascript
signedData = signatureToDict(
    "user",
    "your-secret_key",
    {
        email: "john.doe@mail.example.com",
        first_name: "John",
        last_name: "Doe",
    },
    {
        authUserParam: "webshop_id",
    }
);
```

**Sample output:**

```javascript
{
    webshop_id: "user",
    email: "john.doe@mail.example.com",
    extra: "email,first_name,last_name",
    first_name: "John",
    last_name: "Doe",
    signature: "nu0Un+05z/cNOFnLwQnigoW/KmA=",
    valid_until: 1631799172.0
}
```

#### Recipient side

Validating the signed request data is as simple as follows.

##### Required imports

**CommonJS**

```javascript
const { validateSignedRequestData } = require("skajs");
```

**ESM**

```javascript
import { validateSignedRequestData } from "skajs";
```

##### Validate signed requests

Validating the signed request data. Note, that `data` value is expected to
be a dictionary; `request.GET` is given as an example.

```javascript
validationResult = validateSignedRequestData(
    request.GET, // Note, that ``request.GET`` is given as example.
    "your-secret_key"
);
```

**Options and defaults:**

Similarly to `signatureToDict` function, the `validateSignedRequestData`
also accepts a number of optional arguments (which have been described above):

- signatureParam
- authUserParam
- validUntilParam
- extraParam

With some customizations, it would look as follows:

```javascript
validationResult = validateSignedRequestData(
    request.GET,
    "your-secret_key",
    {
        authUserParam: "webshop_id",
    }
);
```

# Testing

Simply type:

```shell
npm test
```

# Code style

The `Prettier` is used.

```shell
npx prettier --write .
```

# License

MIT

# Support

For any issues contact me at the e-mail given in the [Author](#Author) section.

# Author

Artur Barseghyan <artur.barseghyan@gmail.com>
