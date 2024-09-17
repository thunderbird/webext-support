/*
 * This file is provided by the webext-support repository at
 * https://github.com/thunderbird/webext-support
 *
 * For usage descriptions, please check:
 * https://github.com/thunderbird/webext-support/tree/master/modules/i18n
 *
 * Version 1.2
 *
 * Derived from:
 * http://github.com/piroor/webextensions-lib-l10n
 *
 * Original license:
 * The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 *
 */

const keyPrefix = "__MSG_";

function updateString(string) {
  let re = new RegExp(keyPrefix + "(.+?)__", "g");
  return string.replace(re, (matched) => {
    const key = matched.slice(keyPrefix.length, -2);
    let rv = messenger.i18n.getMessage(key);
    return rv || matched;
  });
};

function updateSubtree(node) {
  const texts = document.evaluate(
    'descendant::text()[contains(self::text(), "' + keyPrefix + '")]',
    node,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
    const text = texts.snapshotItem(i);
    if (text.nodeValue.includes(keyPrefix))
      text.nodeValue = updateString(text.nodeValue);
  }

  const attributes = document.evaluate(
    'descendant::*/attribute::*[contains(., "' + keyPrefix + '")]',
    node,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
    const attribute = attributes.snapshotItem(i);
    if (attribute.value.includes(keyPrefix))
      attribute.value = updateString(attribute.value);
  }
};

export function localizeDocument() {
  updateSubtree(document);
};
