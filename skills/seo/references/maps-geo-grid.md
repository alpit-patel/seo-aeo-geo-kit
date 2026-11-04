# Geo-Grid Rank Tracking: Algorithm, SoLV, Heatmap

Reference for `seo-maps`'s geo-grid scan (Tier 1+, requires DataForSEO).

## Grid point generation (Haversine offset)

To generate an N×N grid of coordinates centered on the business, offset the
center lat/lng by fixed distances along both axes using the Haversine-based
approximation:

```
delta_lat = distance_km / 111.32
delta_lng = distance_km / (111.32 * cos(center_lat_radians))
```

For a 7×7 grid with a 5 km radius (the default): compute 7 evenly spaced
points along each axis spanning ±5 km from center, producing 49 total
coordinate pairs. Wider radius or denser grids (e.g. 9×9) trade higher
resolution for a higher DataForSEO call count (and cost) — the grid size and
radius should scale to the size of the metro area being analyzed, not stay
fixed at the default for every business.

## Share of Local Voice (SoLV)

```
SoLV = (grid_points_where_rank <= 3 / total_grid_points) * 100
```

This is the percentage of the geographic grid where the business appears in
the top 3 Maps results for the target keyword — a proxy for how much of the
service area actually "sees" the business ranking well, as opposed to a
single-point rank check which can be misleadingly good or bad depending on
where that one point happens to sit relative to the business.

Report both the SoLV percentage and the average rank across all grid points —
a business can have a mediocre SoLV but a decent average rank (ranks well
close to itself, falls off quickly with distance), which is a different
problem (proximity/coverage) than a uniformly poor average rank (broader
relevance/authority problem).

## ASCII heatmap rendering

Render the grid as a monospace character map, one row per grid row, using a
simple rank-to-symbol scale:

```
Rank 1-3   -> #
Rank 4-10  -> +
Rank 11-20 -> .
Rank 21+ / not found -> (space or -)
```

Example (7×7, business located near center):

```
. . + + + . .
. + # # # + .
+ # # # # # +
+ # # # # # +
+ # # # # # +
. + # # # + .
. . + + + . .
```

Label the business location on the grid (e.g. a distinct marker at its
coordinate cell) and include a legend beneath the map. Always pair the visual
with the numeric SoLV and average-rank figures — the ASCII map is a quick
read, not a substitute for the numbers in the report body.

## Cost awareness

Each grid point is a separate DataForSEO Maps SERP API call. A 7×7 grid = 49
calls per keyword. Always display the point count and keyword count before
running a scan and get explicit confirmation — see the Cost Warning block in
`seo-maps/SKILL.md`. Do not hardcode a specific dollar-per-call figure here;
verify current DataForSEO pricing in the user's dashboard before quoting a
cost estimate, since API pricing changes independently of this library.
