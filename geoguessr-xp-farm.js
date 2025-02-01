// ==UserScript==
// @name         GeoGuessr XP Farm
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Use this script in single-player mode to quickly earn XP in GeoGuessr!
// @match        *://*.geoguessr.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const tastenAbfolge = [' ', '2', ' ', ' ', '2', ' '];
    let isRunning = false;
    let timeoutId = null;

    function tasteDrücken(taste) {
        const eventOptions = {
            key: taste,
            code: taste === ' ' ? 'Space' : taste,
            keyCode: taste === ' ' ? 32 : taste.charCodeAt(0),
            bubbles: true,
            cancelable: true
        };

        document.activeElement?.blur();
        document.body.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
        document.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
    }

    function zufälligeVerzögerung() {
        return Math.random() * (500 - 100) + 100;
    }

    function tastenAbfolgeStarten(index = 0) {
        if (!isRunning) return;
        tasteDrücken(tastenAbfolge[index]);
        timeoutId = setTimeout(() => tastenAbfolgeStarten((index + 1) % tastenAbfolge.length), zufälligeVerzögerung());
    }

    function startAutomation() {
        if (isRunning) return;
        isRunning = true;
        tastenAbfolgeStarten();
    }

    function stopAutomation() {
        if (!isRunning) return;
        isRunning = false;
        clearTimeout(timeoutId);
        timeoutId = null;
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F8') startAutomation();
        if (e.key === 'F9') stopAutomation();
    });

    let globalCoordinates = { lat: 0, lng: 0 };
    const originalOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (method, url) {
        if (method.toUpperCase() === 'POST' &&
            (url.includes('GetMetadata') || url.includes('SingleImageSearch'))) {
            this.addEventListener('load', function () {
                let match = this.responseText.match(/-?\d+\.\d+,-?\d+\.\d+/g)?.[0];
                if (match) {
                    let [lat, lng] = match.split(",").map(parseFloat);
                    globalCoordinates = { lat, lng };
                }
            });
        }
        return originalOpen.apply(this, arguments);
    };

    function placeMarker() {
        let { lat, lng } = globalCoordinates;
        let element = document.querySelector('[class^="guess-map_canvas__"]');
        if (!element) return;

        const latLngFns = { latLng: { lat: () => lat, lng: () => lng } };
        const reactKey = Object.keys(element).find(key => key.startsWith("__reactFiber$"));
        const mapClickProps = element[reactKey]?.return?.return?.memoizedProps.map.__e3_.click;
        const propKey = Object.keys(mapClickProps)[0];

        Object.values(mapClickProps[propKey]).forEach(fn => {
            if (typeof fn === 'function') fn(latLngFns);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === '2') {
            e.stopImmediatePropagation();
            placeMarker();
        }
    });
})();