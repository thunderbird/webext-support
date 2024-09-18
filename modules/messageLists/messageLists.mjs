/*
 * This file is provided by the webext-support repository at
 * https://github.com/thunderbird/webext-support
 *
 * For usage descriptions, please check:
 * https://github.com/thunderbird/webext-support/tree/master/modules/messageLists
 *
 * Version 1.0
 */

export async function* getMessageIterator(list) {
    let page = await list;
    for (let message of page.messages) {
        yield message;
    }

    while (page.id) {
        page = await messenger.messages.continueList(page.id);
        for (let message of page.messages) {
            yield message;
        }
    }
}