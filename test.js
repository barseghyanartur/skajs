import test from 'ava';
import {
    isObject,
} from './index.js';

test('Test isObject', t => {
	const obj = {name: "Artur", email: "me@example.com"};
	t.is(isObject(obj), true);

	const str = "skajs";
	t.is(isObject(str), false);
});


