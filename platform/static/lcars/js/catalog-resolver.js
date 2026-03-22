// ═══ Catalog Resolver ═══════════════════════════════════════
// Fetches /api/catalog once, caches it, resolves dataset URLs
// by name. Stations call lcars.catalog.fetch() instead of
// hardcoding endpoint URLs.
//
// Pattern: lcars-data-architecture.md §7.1

var lcars = lcars || {};

lcars.catalog = (function () {
    "use strict";

    var _catalog = null;
    var _loading = null;
    var _baseUrl = "";

    // Load catalog from agentd — called once on startup
    function load(baseUrl) {
        _baseUrl = baseUrl || "";
        if (_loading) return _loading;
        _loading = window.fetch(_baseUrl + "/api/catalog", {
            signal: AbortSignal.timeout(5000)
        })
        .then(function (resp) {
            if (!resp.ok) throw new Error("Catalog fetch failed: " + resp.status);
            return resp.json();
        })
        .then(function (data) {
            _catalog = {};
            var datasets = data.dataset || [];
            for (var i = 0; i < datasets.length; i++) {
                var ds = datasets[i];
                _catalog[ds.name] = ds;
                // Also index by @id for direct path lookup
                if (ds["@id"]) _catalog[ds["@id"]] = ds;
            }
            return _catalog;
        })
        .catch(function (err) {
            console.warn("[catalog] Load failed:", err.message);
            _catalog = {};
            return _catalog;
        });
        return _loading;
    }

    // Fetch a dataset by name (e.g., "Operational Health") or
    // by path (e.g., "/api/agent/state/operational-health").
    // Returns parsed JSON. Rejects if dataset unknown or fetch fails.
    function fetchDataset(nameOrPath, options) {
        var opts = options || {};
        var timeout = opts.timeout || 8000;

        if (!_catalog) {
            return load(_baseUrl).then(function () {
                return fetchDataset(nameOrPath, options);
            });
        }

        var entry = _catalog[nameOrPath];
        if (!entry) {
            return Promise.reject(new Error("[catalog] Unknown dataset: " + nameOrPath));
        }

        var url = _baseUrl + entry.distribution.contentUrl;
        return window.fetch(url, {
            signal: AbortSignal.timeout(timeout)
        })
        .then(function (resp) {
            if (!resp.ok) throw new Error("Fetch " + url + " failed: " + resp.status);
            return resp.json();
        });
    }

    // Get dataset metadata without fetching the data
    function getEntry(nameOrPath) {
        if (!_catalog) return null;
        return _catalog[nameOrPath] || null;
    }

    // Get the URL for a dataset (for SSE or direct use)
    function getUrl(nameOrPath) {
        var entry = getEntry(nameOrPath);
        if (!entry) return null;
        return _baseUrl + entry.distribution.contentUrl;
    }

    // List all datasets for a given station
    function forStation(stationName) {
        if (!_catalog) return [];
        var result = [];
        var seen = {};
        for (var key in _catalog) {
            var ds = _catalog[key];
            if (ds.station === stationName && !seen[ds["@id"]]) {
                seen[ds["@id"]] = true;
                result.push(ds);
            }
        }
        return result;
    }

    return {
        load: load,
        fetch: fetchDataset,
        get: getEntry,
        url: getUrl,
        forStation: forStation
    };
})();
