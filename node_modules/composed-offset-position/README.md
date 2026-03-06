# `composed-offset-position`

This provides a set of ponyfills to achieve the same behavior of `offsetParent`, `offsetLeft` and `offsetTop` before the [`offsetParent` spec was changed](https://github.com/w3c/csswg-drafts/issues/159).

## Installation

Using npm:

```npm
$ npm i --save-dev composed-offset-position
```

## Usage

```js
import { offsetLeft, offsetParent, offsetTop } from "composed-offset-position";

console.log(offsetLeft(element));
// ➡️ 0
console.log(offsetTop(element));
// ➡️ 20

console.log(offsetParent(element));
// ➡️ [object HTMLDivElement]
```

## Notes

- Based on <https://github.com/josepharhar/offsetparent-polyfills/> (many thanks to @josepharhar)
