'use strict';

var env = require('../config/env.json').current;
var configGeneral = require('../config/general.json')[env];
var configErrors = require('../config/errors.json');
var helpers = require('./helpers');

var DigiTrustCommunication = {};

DigiTrustCommunication.iframe = null;

DigiTrustCommunication._messageHandler = function (evt) {
    if (evt.origin !== location.protocol + configGeneral.iframe.postMessageOrigin) {
        throw new Error(configErrors.en.postMessageOrigin);
    } else {
        switch (evt.data.type) {
            case 'DigiTrust.iframe.ready':
                helpers.MinPubSub.publish('DigiTrust.pubsub.iframe.ready', [true]);
                break;
            case 'DigiTrust.identity.response':
                helpers.MinPubSub.publish('DigiTrust.pubsub.identity.response', [evt.data.value]);
                break;
            case 'DigiTrust.identity.response.syncOnly':
                helpers.MinPubSub.publish('DigiTrust.pubsub.identity.response.syncOnly', [evt.data.value]);
                break;
        }
    }
};

DigiTrustCommunication.startConnection = function (loadSuccess) {
    /*
        If there is a connection problem, or if adblocker blocks the request,
        start a 10 second timeout to notify the caller. Clear the timeout upon
        successful connection to the iframe

        Note: onload is executed even on non 2XX HTTP STATUSES (e.g. 404, 500)
              for cross-domain iframe requests
    */
    var iframeLoadErrorTimeout = setTimeout(function () {
        loadSuccess(false);
    }, configGeneral.iframe.timeoutDuration);

    helpers.MinPubSub.subscribe('DigiTrust.pubsub.iframe.ready', function (iframeReady) {
        clearTimeout(iframeLoadErrorTimeout);
        loadSuccess(true);
    });

    // Add postMessage listeners
    if (window.addEventListener) {
        window.addEventListener('message', DigiTrustCommunication._messageHandler, false);
    } else {
        window.attachEvent('onmessage', DigiTrustCommunication._messageHandler);
    }

    DigiTrustCommunication.iframe = document.createElement('iframe');
    DigiTrustCommunication.iframe.style.display = 'none';
    DigiTrustCommunication.iframe.src = location.protocol + configGeneral.urls.digitrustIframe;
    document.head.appendChild(DigiTrustCommunication.iframe);
};

DigiTrustCommunication.getIdentity = function (options) {
    options = options ? options : {};

    var identityRequest = {
        version: 1,
        type: 'DigiTrust.identity.request',
        syncOnly: options.syncOnly ? options.syncOnly : false,
        value: {}
    };
    DigiTrustCommunication.iframe.contentWindow.postMessage(identityRequest, DigiTrustCommunication.iframe.src);
};

module.exports = {
    getIdentity: DigiTrustCommunication.getIdentity,
    startConnection: DigiTrustCommunication.startConnection
};