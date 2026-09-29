# Private Chinese family viewer

This repository contains a read-only static viewer. It contains no plaintext itinerary, access keys, booking numbers, or personal photographs. The site receives AES-256-GCM encrypted snapshots; its key is supplied only in the recipient's private URL fragment and remembered on that device after successful decryption.

A GitHub Actions workflow checks the encrypted source every five minutes and publishes a Pages artifact. GitHub may delay scheduled jobs; the viewer displays the last successful sync and warns when it is over an hour old. It refreshes on open, return, and a manual button, without a recurring browser timer. A failed export never replaces the last successful publication. Scheduled public-repository workflows can be disabled after 60 days without repository activity; this must be checked before extending use beyond the current trip.

Chinese translations are matched to the original English source. Changed English remains visible and marked as awaiting translation. This viewer has no write API or editing controls. Existing editors continue using the original application.

The browser caches encrypted snapshots and photos for offline use. Anyone with the full private link can read the itinerary. Rotating the source key prevents the old link from reading future snapshots; it cannot erase copies already downloaded.

Map: Leaflet (BSD-2-Clause, see LEAFLET-LICENSE.txt); Natural Earth 1:110m land (public domain). Route markers and educational photos are supplied only inside encrypted data. No third-party map tiles, fonts, analytics, or original-app requests are made by the reader.

The public connection test used before setup is preserved at `connection-test.html`.
