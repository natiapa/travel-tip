import { utilService } from './util.service.js'
import { storageService } from './async-storage.service.js'

// const sampleLoc = {
//     id: 'GEouN',
//     name: 'Dahab, Egypt',
//     rate: 5,
//     geo: {
//         address: 'Dahab, South Sinai, Egypt',
//         lat: 28.5096676,
//         lng: 34.5165187,
//         zoom: 11
//     },
//     createdAt: 1706562160181,
//     updatedAt: 1706562160181
// }

const PAGE_SIZE = 5
const DB_KEY = 'locs'
var gSortBy = { rate: -1 }
var gFilterBy = { txt: '', minRate: 0 }
var gPageIdx

_createLocs()

export const locService = {
    query,
    getById,
    remove,
    save,
    setFilterBy,
    setSortBy,
    getLocCountByRateMap,
    getLocCountBylastUpdated,
}

function query() {
    return storageService.query(DB_KEY)
        .then(locs => {
            console.log('locs:', locs)
            if (gFilterBy.txt) {
                const regex = new RegExp(gFilterBy.txt, 'i')
                locs = locs.filter(loc => regex.test(loc.name) || regex.test(loc.geo.address))
            }
            if (gFilterBy.minRate) {
                locs = locs.filter(loc => loc.rate >= gFilterBy.minRate)
            }

            // No paging (unused)
            if (gPageIdx !== undefined) {
                const startIdx = gPageIdx * PAGE_SIZE
                locs = locs.slice(startIdx, startIdx + PAGE_SIZE)
            }

            if (gSortBy.rate !== undefined) {
                locs.sort((p1, p2) => (p1.rate - p2.rate) * gSortBy.rate)

            } else if (gSortBy.name !== undefined) {
                locs.sort((p1, p2) => p1.name.localeCompare(p2.name) * gSortBy.name)

            } else if (gSortBy.CreationTime !== undefined) {
                locs.sort((p1, p2) => (p2.createdAt - p1.createdAt) * gSortBy.CreationTime)
            }

            return locs
        })
}

function getById(locId) {
    return storageService.get(DB_KEY, locId)
}

function remove(locId) {
    return storageService.remove(DB_KEY, locId)
}

function save(loc) {
    if (loc.id) {
        loc.updatedAt = Date.now()
        return storageService.put(DB_KEY, loc)
    } else {
        loc.createdAt = loc.updatedAt = Date.now()
        return storageService.post(DB_KEY, loc)
    }
}

function setFilterBy(filterBy = {}) {
    if (filterBy.txt !== undefined) gFilterBy.txt = filterBy.txt
    if (filterBy.minRate !== undefined && !isNaN(filterBy.minRate)) gFilterBy.minRate = filterBy.minRate
    return gFilterBy
}

function getLocCountByRateMap() {
    return storageService.query(DB_KEY)
        .then(locs => {
            const locCountByRateMap = locs.reduce((map, loc) => {
                if (loc.rate > 4) map.high++
                else if (loc.rate >= 3) map.medium++
                else map.low++
                return map
            }, { high: 0, medium: 0, low: 0 })
            locCountByRateMap.total = locs.length
            return locCountByRateMap
        })
}

function getLocCountBylastUpdated() {
    return storageService.query(DB_KEY)
        .then(locs => {
            const locCountByUpdate = locs.reduce((map, loc) => {
                if (utilService.elapsedTime(loc.updatedAt) === 'just now') map['just Now']++
                else if (utilService.elapsedTime(loc.updatedAt) === 'last hour') map['last Hour']++
                else if (utilService.elapsedTime(loc.updatedAt) === 'today') map.today++
                else map['more then a day']++
                return map
            }, { "just Now": 0, "last Hour": 0, today: 0, "more then a day": 0 })
            locCountByUpdate.total = locs.length
            return locCountByUpdate
        })
}

function setSortBy(sortBy = {}) {
    gSortBy = sortBy
}

function _createLocs() {
    const locs = utilService.loadFromStorage(DB_KEY)
    if (!locs || !locs.length) {
        _createDemoLocs()
    }
}

function _createDemoLocs() {
    var locs = [
        _createLoc('Ben Gurion Airport', 2, { 
            lat: 32.0004465,
            lng: 34.8706095,
            zoom: 12,
            address: "Ben Gurion Airport, 7015001, Israel"
        }),
        _createLoc('Dekel Beach', 4, {
            lat: 29.5393848,
            lng: 34.9457792,
            zoom: 15,
            address: "Derekh Mitsrayim 1, Eilat, 88000, Israel"
        }),
        _createLoc('Dahab, Egypt', 5, {
            lat: 28.5096676,
            lng: 34.5165187,
            zoom: 11,
            address: "Dahab, South Sinai, Egypt"
        })
    ];

    console.log('locs1', locs);
    utilService.saveToStorage(DB_KEY, locs);
}


function _createLoc(name = '', rate = 3, geoData, updatedAt = Date.now()) {

    return {
        id: utilService.makeId(),
        name,
        rate,
        updatedAt,
        createdAt: updatedAt = utilService.randomPastTime(),
        geo: {
            lat: geoData.lat || 0,
            lng: geoData.lng || 0,
            zoom: geoData.zoom || 0,
            address: geoData.address || ''
        }
    }
}

