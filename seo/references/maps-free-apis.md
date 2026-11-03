# Free Maps APIs — Query Templates (Tier 0)

Reference for `seo-maps` Tier 0 (no DataForSEO). All three are free,
OpenStreetMap-data-backed services with no API key required for Nominatim/
Overpass; Geoapify requires a free-tier API key.

## Nominatim (geocoding)

Converts an address to lat/lng, or reverse-geocodes coordinates to an
address. Public instance has a strict usage policy (max ~1 request/second,
requires a descriptive `User-Agent` header) — fine for one-off lookups during
an audit, not for bulk geocoding.

```
GET https://nominatim.openstreetmap.org/search?q=<business+address>&format=json&limit=1
```

Response includes `lat`, `lon`, and a normalized `display_name` useful for
cross-checking the address string used elsewhere.

## Overpass API (competitor/POI discovery)

Queries OpenStreetMap's tagged point-of-interest data within a radius —
used for Tier 0 competitor radius mapping. Query in Overpass QL, e.g. to find
businesses tagged as restaurants within 2 km of a point:

```
[out:json][timeout:25];
(
  node["amenity"="restaurant"](around:2000,<lat>,<lon>);
  way["amenity"="restaurant"](around:2000,<lat>,<lon>);
);
out center;
```

Swap the `amenity`/`shop` tag value to match the target vertical (e.g.
`shop=hairdresser`, `amenity=dentist`, `shop=car_repair`). Results include
`name`, `addr:*` tags, `phone`, and `website` where the OSM contributor
entered them — coverage is community-sourced and can be incomplete or stale
compared to a paid competitor's live GBP data, so present Overpass-derived
competitor lists as directional, not exhaustive.

Public Overpass endpoint: `https://overpass-api.de/api/interpreter` (POST the
query as the request body). Respect rate limits — batch multiple radius
queries with delays rather than firing them concurrently.

## Geoapify (POI search + geocoding, free tier with API key)

Alternative/supplement to Nominatim + Overpass with a more structured REST
API and a generous free tier. Requires a free API key from
`myprojects.geoapify.com`.

```
GET https://api.geoapify.com/v2/places?categories=<category>&filter=circle:<lon>,<lat>,<radius_m>&apiKey=<key>
```

Category taxonomy (e.g. `catering.restaurant`, `healthcare.dentist`) follows
Geoapify's own category tree — check their current category list rather than
guessing a category string, since an invalid category silently returns zero
results rather than an error in some cases.

## When to use which

| Need | Use |
|---|---|
| Geocode a single business address | Nominatim |
| Bulk/structured POI search with clean categories | Geoapify (needs key) |
| Free-form OSM tag query, more control over what counts as a "competitor" | Overpass |

All three are Tier 0 fallbacks. They will under-represent businesses that
aren't well-mapped in OpenStreetMap — always caveat Tier 0 competitor/POI
results as based on community map data, not live search-engine visibility,
and recommend DataForSEO (Tier 1) for a more complete picture when the
business can afford it.
