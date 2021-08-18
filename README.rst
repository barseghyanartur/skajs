===
ska
===
Lets you easily sign data, using symmetric-key algorithm encryption. Allows
you to validate signed data and identify possible validation errors. Uses
sha/hmac for signature encryption. Comes with shortcut functions for signing (and
validating) dictionaries and URLs.

Key concepts
============
Hosts, that communicate with each other, share the Secret Key, which is used
to sign data (requests). Secret key is never sent around.

One of the cases is signing of HTTP requests. Each (HTTP) request is signed
on the sender side using the shared Secret Key and as an outcome produces the
triple (``signature``, ``auth_user``, ``valid_until``) which are used to sign
the requests.

- ``signature`` (``string``): Signature generated.
- ``auth_user`` (``string``): User making the request. Can be anything.
- ``valid_until`` (``float`` or ``string``): Signature expiration time (Unix timestamp).

On the recipient side, (HTTP request) data is validated using the shared
Secret Key. It's being checked whether signature is valid and not expired.

.. code-block:: text

    ┌─────────────┐           Data              ┌─────────────┐
    │   Host 1    ├────────────────────────────>│   Host 2    │
    │ ─────────── │                             │ ─────────── │
    │ secret key  │                             │ secret key  │
    │ 'my-secret' │<────────────────────────────┤ 'my-secret' │
    └─────────────┘           Data              └─────────────┘

Features
========
- Sign dictionaries.
- Validate signed dictionaries.
- Sign URLs. Append and sign additional URL data.
- Validate URLs.

Installation
============
Latest stable version from PyPI:

.. code-block:: sh

    npm install skajs

Usage examples
==============
Basic usage
-----------
Sender side
~~~~~~~~~~~
Signing dictionaries is as simple as follows.

Required imports.

.. code-block:: javascript

    import {signatureToDict} from 'ska';

Producing a signed URL.

.. code-block:: javascript

    const signatureDict = signatureToDict(
        'user',
        'your-secret_key',
		null,
		null,
        {"1": "1", "2": "2"},
    )

.. code-block:: text

    {
        'signature': 'YlZpLFsjUKBalL4x5trhkeEgqE8=',
        'auth_user': 'user',
        'valid_until': '1378045287.0'
    }

Default lifetime of a signature is 10 minutes (600 seconds). If you want it
to be different, provide a ``lifetime`` argument to ``signUrl`` function.

Default name of the (GET) param holding the generated signature value
is ``signature``. If you want it to be different, provide a ``signatureParam``
argument to ``signatureToDict`` function.

Default name of the (GET) param holding the ``authUser`` value is
``auth_user``. If you want it to be different, provide a ``authUserParam``
argument to ``signatureToDict`` function.

Default name of the (GET) param holding the ``validUntil`` value is
`valid_until`. If you want it to be different, provide a ``validUntilParam``
argument to ``signatureToDict`` function.

Note, that by default a suffix '?' is added after the given ``url`` and
generated signature params. If you want that suffix to be custom, provide a
``suffix`` argument to the ``signatureToDict`` function. If you want it to be gone,
set its' value to empty string.

Adding of additional data to the signature works in the same way:

.. code-block:: javascript

    signature_dict = signatureToDict(
		'user',
        'your-secret_key',
		null,
		null,
        {
            'email': 'john.doe@mail.example.com',
            'first_name': 'John',
            'last_name': 'Doe'
        }
    )

.. code-block:: text

    {
        'auth_user': 'user',
        'email': 'john.doe@mail.example.com',
        'extra': 'email,first_name,last_name',
        'first_name': 'John',
        'last_name': 'Doe',
        'signature': 'cnSoU/LnJ/ZhfLtDLzab3a3gkug=',
        'valid_until': 1387616469.0
    }

Recipient side
~~~~~~~~~~~~~~
Validating the signed request data is as simple as follows.

Required imports.

.. code-block:: python

    import {validateSignedRequestData} from 'skajs'

Validating the signed request data. Note, that ``data`` value is expected to
be a dictionary; ``request.GET`` is given as an example. It will most likely
vary from what's used in your framework (unless you use Django).

.. code-block:: python

    validationResult = validateSignedRequestData(
        request.GET,  # Note, that ``request.GET`` is given as example.
        'your-secret_key'
    )

Testing
=======
Simply type:

.. code-block:: sh

    npm test

Writing documentation
=====================
Keep the following hierarchy.

.. code-block:: text

    =====
    title
    =====

    header
    ======

    sub-header
    ----------

    sub-sub-header
    ~~~~~~~~~~~~~~

    sub-sub-sub-header
    ++++++++++++++++++

    sub-sub-sub-sub-header
    ^^^^^^^^^^^^^^^^^^^^^^

    sub-sub-sub-sub-sub-header
    **************************

License
=======
MIT

Support
=======
For any issues contact me at the e-mail given in the `Author`_ section.

Author
======
Artur Barseghyan <artur.barseghyan@gmail.com>
