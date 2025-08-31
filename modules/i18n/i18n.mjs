/*
 * Derived from:
 *
 * http://github.com/piroor/webextensions-lib-l10n
 * https://github.com/thunderbird/webext-support/blob/master/modules/i18n/i18n.mjs
 *
 * Original license:
 * The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 *
 * Usage:
 * 
 * Call updateDocument() to perform localization insertions/replacements in the extension root document.
 * updateAnyDocument(sourceDocument) performs the same operations against any arbitrary HTML document.
 * 
 * For a localization entry with the key "someItem" and an escaped key of __MSG_someItem__:
 * 
 * 1) Use the "data-i18n-textContent" attribute of an element to set the text, such as:
 *      <div data-i18n-textContent="someItem"></div>                OR
 *      <div data-i18n-textContent="__MSG_someItem__"></div>
 * 
 *      To set other properties or attributes of elements, use the form data-i18n-*, such as:
 *          <title data-i18n-text="someItem"></title>                   // Assigns the document title text
 *          <input type="text" data-i18n-placeholder="someItem" />      // Assigns the placeholder text for a textbox
 *      
 * 2) Use the legacy approach of directly applying escaped keys in the markup content, such as:
 *      <div>__MSG_someItem__</div>
 *      <div> 1) __MSG_someItem__: __MSG_someItemDesc__ </div>
 * 
 * 3) Use the legacy approach for element properties/attributes, such as:
 *      <img alt="__MSG_someItem__"></img>
 *  
 */

export const i18n = ((document, messenger) => {

    // Private members
    const i18nAttrRegex = /^data-i18n-(?<target>.*)/;

    const propertyMapping = new Map([
        ["textcontent", "textContent"]
    ]);

    let _extension = null;
    let _keyPrefix = "__MSG_";

    const getTranslation = (placeholder) => {
        const prefixRegex = new RegExp(_keyPrefix + "(.+?)__", "g");

        return placeholder.replace(prefixRegex, (escapedKey) => {
            const key = escapedKey.slice(_keyPrefix.length, -2);

            const result = _extension
                ? _extension.localeData.localizeMessage(key)
                : messenger.i18n.getMessage(key);

            return result || escapedKey;
        });
    };

    const updateSubtreeSet = (sourceDocument, node, selector, update) => {
        const items = sourceDocument.evaluate(
            `descendant::${selector}`,
            node,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0, count = items.snapshotLength; i < count; i++) {
            update(items.snapshotItem(i));
        }
    };

    const updateSubtree = (sourceDocument, node) => {
        // Update element properties (including textContent) or attributes based on data-i18n-* attributes assigned to the element
        updateSubtreeSet(sourceDocument, node,
            '*/@*[starts-with(name(), "data-i18n-")]',
            (attr) => {
                const key = attr.value;

                let value;

                // If using traditional i18n key placeholders of the form __MSG_*__...
                if(key.includes(_keyPrefix)) {
                    value = getTranslation(key);
                }
                // If using the direct i18n keys...
                else {
                    value = _extension
                        ? _extension.localeData.localizeMessage(key)
                        : messenger.i18n.getMessage(key);

                        if(!value) {
                            value = `** i18n error: ${key} **`;
                            console.warn(`Missing i18n entry for key "${key}".`);
                        }
                }

                const { ownerElement } = attr;
                let { target } = i18nAttrRegex.exec(attr.name).groups;

                if (propertyMapping.has(target)) {
                    target = propertyMapping.get(target);
                }

                // If the target member is a property...
                if (typeof ownerElement[target] !== undefined) {
                    ownerElement[target] = value;
                }
                // Otherwise, assume it is an attribute
                else {
                    ownerElement.setAttribute(target, value);
                }
            }
        );

        // Update text nodes containing __MSG_*__ placeholders
        updateSubtreeSet(sourceDocument, node,
            `text()[contains(self::text(), "${_keyPrefix}")]`,
            (text) => {
                if (text.nodeValue.includes(_keyPrefix))
                    text.nodeValue = getTranslation(text.nodeValue);
            }
        );

        // Update element attributes (excluding data-i18n-*) containing __MSG_*__ placeholders
        updateSubtreeSet(sourceDocument, node,
            `*/@*[not(starts-with(name(), "data-i18n-"))][contains(., "${_keyPrefix}")]`,
             (attr) => {
                if (attr.value.includes(_keyPrefix))
                    attr.value = getTranslation(attr.value);
            }
        );
    };

    // Public members
    const updateAnyDocument = (sourceDocument, options = {}) => {
        if (options) {
            if (options.extension)
                _extension = options.extension;
            if (options.keyPrefix)
                _keyPrefix = options.keyPrefix;
        }

        updateSubtree(sourceDocument, sourceDocument);
    };

    const updateDocument = (options = {}) => {
        updateAnyDocument(document, options);
    };


    return {
        updateAnyDocument: updateAnyDocument,
        updateDocument: updateDocument
    };

})(document, messenger);