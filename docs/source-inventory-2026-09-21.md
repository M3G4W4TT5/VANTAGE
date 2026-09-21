# Provider source inventory — 2026-09-21

> Reference inventory supplied by the user. These entries are not approved connectors or implementation requirements.

All **896 rows** are preserved below in supplied order, without deduplication. The two original columns and their wording are retained; row numbers are added for reference. The [original tab-separated attachment](sources/2026-09-21-provider-inventory.txt) is preserved byte-for-byte.

See the [assessment and proposed spec additions](source-inventory-review-2026-09-21.md), the [current specification](../PROTOTYPE_SPEC.md), and the [earlier source review](source-candidate-review.md).

## Provenance and limits

- Received and reviewed on 2026-09-21. The attachment did not identify an originating repository URL, commit, extraction date or extraction method.
- Code paths refer to a World Monitor tree that was not supplied or independently audited. Paths and counts such as `+N more` are preserved claims from the attachment.
- `Observed surface` is the supplied classification, not a verified API, licence or successful live request. A domain can represent content, a CDN, authentication, telemetry, a schema or a test fixture.
- Provider names and domains are not executable configuration. Resolve exact products, owners, endpoints, terms, coverage and credentials before adoption.
- All rows were considered for source-role triage; selected promising providers received documentation checks. This is not a live availability or rights audit of all 896 rows.

## Supplied classifications

| Label | Rows |
| --- | ---: |
| feed | 446 |
| structured | 338 |
| feed+structured | 64 |
| feed+structured (syndication transport) | 2 |
| operational-status | 30 |
| Excluded / candidate | 16 |
| **Total** | **896** |

## Complete inventory

| Row | Provider (as supplied) | Observed surface (as supplied) |
| ---: | --- | --- |
| 1 | +972 Magazine (www.972mag.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 2 | 14ymedio (www.14ymedio.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 3 | 24.hu (24.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 4 | 247preview.foxnews.com (247preview.foxnews.com) | feed — src/services/live-channels.ts |
| 5 | 36kr.com (36kr.com) | feed — src/config/feeds.ts |
| 6 | 444.hu (444.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 7 | a16z.com (a16z.com) | feed — src/config/feeds.ts |
| 8 | abacus.worldmonitor.app (abacus.worldmonitor.app) | structured — scripts/check-analytics-collector.mjs, src/services/analytics.ts |
| 9 | abc-iview-mediapackagestreams-2.akamaized.net (abc-iview-mediapackagestreams-2.akamaized.net) | feed — src/services/live-channels.ts |
| 10 | abplivetv.pc.cdn.bitgravity.com (abplivetv.pc.cdn.bitgravity.com) | feed — src/services/live-channels.ts |
| 11 | acleddata.com (acleddata.com) | structured — scripts/seed-conflict-intel.mjs, scripts/seed-unrest-events.mjs, scripts/shared/acled-oauth.mjs, server/_shared/acled-auth.ts, +1 more |
| 12 | actualite.cd (actualite.cd) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 13 | ActuNiger (actuniger.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 14 | adsb.fi Open Data (opendata.adsb.fi) | structured — scripts/seed-military-flights.mjs, src/components/MapPopup.ts |
| 15 | adsb.lol (api.adsb.lol) | structured — scripts/ais-relay.cjs, scripts/seed-military-flights.mjs, src/components/MapPopup.ts |
| 16 | ae.usembassy.gov (ae.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 17 | aerotime.aero (aerotime.aero) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 18 | agentskills.io (agentskills.io) | structured — api/skills/fetch-agentskills.ts |
| 19 | agsi.gie.eu (agsi.gie.eu) | structured — scripts/seed-gas-storage-countries.mjs, scripts/seed-gie-gas-storage.mjs |
| 20 | Aïr Info (airinfoagadez.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 21 | airlinegeeks.com (airlinegeeks.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 22 | airplanes.live (api.airplanes.live) | structured — scripts/seed-military-flights.mjs, src/components/MapPopup.ts |
| 23 | Alberta 511 (511.alberta.ca) | structured — scripts/lib/provincial-511.mjs |
| 24 | Alberta Emergency Alert (www.alberta.ca) | structured — scripts/lib/alberta-emergency-alert.mjs, scripts/source-attribution.mjs |
| 25 | Alternative.me Fear & Greed Index (api.alternative.me) | structured — scripts/seed-economy.mjs |
| 26 | Alwihda Info (www.alwihdainfo.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 27 | amdlive-ch01-ctnd-com.akamaized.net (amdlive-ch01-ctnd-com.akamaized.net) | feed — src/services/live-channels.ts |
| 28 | amg00106-france24-france24-samsunguk-qvpp8.amagi.tv (amg00106-france24-france24-samsunguk-qvpp8.amagi.tv) | feed — src/services/live-channels.ts |
| 29 | amna.gr (amna.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 30 | Amu TV (amu.tv) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 31 | angellist.com (angellist.com) | feed — src/config/feeds.ts |
| 32 | Annahar (annahar.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 33 | api.abuseipdb.com (api.abuseipdb.com) | structured — scripts/ais-relay.cjs, scripts/seed-cyber-threats.mjs |
| 34 | api.aviationstack.com (api.aviationstack.com) | structured — scripts/ais-relay.cjs, scripts/seed-aviation.mjs |
| 35 | api.axios.com (api.axios.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 36 | api.cloudflare.com (api.cloudflare.com) | structured — scripts/_kv-storage.mjs, scripts/_r2-storage.mjs, scripts/cloudflare-cache-rule.mjs, scripts/seed-internet-outages.mjs, +1 more |
| 37 | api.coingecko.com (api.coingecko.com) | structured — scripts/ais-relay.cjs |
| 38 | api.data.gov.my (api.data.gov.my) | structured — scripts/backfill-fuel-prices-prev.mjs, scripts/seed-fuel-prices.mjs |
| 39 | api.datos.gob.mx (api.datos.gob.mx) | structured — scripts/backfill-fuel-prices-prev.mjs |
| 40 | api.eia.gov (api.eia.gov) | structured — scripts/backfill-fuel-prices-prev.mjs, scripts/seed-economy.mjs, scripts/seed-eia-petroleum.mjs, scripts/seed-electricity-prices.mjs, +1 more |
| 41 | api.exa.ai (api.exa.ai) | structured — scripts/ais-relay.cjs, scripts/lib/company-monitoring-exa.mjs, scripts/seed-bigmac.mjs, scripts/seed-grocery-basket.mjs, +1 more |
| 42 | api.fiscaldata.treasury.gov (api.fiscaldata.treasury.gov) | structured — scripts/seed-national-debt.mjs, scripts/seed-supply-chain-trade.mjs |
| 43 | api.gdeltproject.org (api.gdeltproject.org) | structured — scripts/seed-gdelt-intel.mjs, scripts/seed-unrest-events.mjs |
| 44 | api.github.com (api.github.com) | structured — api/_github-release.js, scripts/dispatch-stale-railway-reconcile.mjs, scripts/freeze-github-stars.mjs, scripts/resolve-railway-reconcile-control.mjs, +1 more |
| 45 | api.groq.com (api.groq.com) | structured — shared/llm-health-providers.js |
| 46 | api.iea.org (api.iea.org) | structured — scripts/seed-iea-oil-stocks.mjs |
| 47 | api.imf.org (api.imf.org) | structured — scripts/_seed-utils.mjs, scripts/seed-gold-cb-reserves.mjs |
| 48 | api.indexnow.org (api.indexnow.org) | structured — scripts/seo-indexnow-submit.mjs |
| 49 | api.ossinsight.io (api.ossinsight.io) | structured — scripts/seed-research.mjs |
| 50 | api.planespotters.net (api.planespotters.net) | structured — server/worldmonitor/military/v1/get-wingbits-live-flight.ts |
| 51 | api.rainviewer.com (api.rainviewer.com) | structured — src/components/DeckGLMap.ts |
| 52 | api.sam.gov (api.sam.gov) | structured — scripts/seed-global-tenders.mjs |
| 53 | api.scrapecreators.com (api.scrapecreators.com) | structured — scripts/ais-relay.cjs |
| 54 | api.spdrgoldshares.com (api.spdrgoldshares.com) | structured — scripts/seed-gold-etf-flows.mjs |
| 55 | api.stlouisfed.org (api.stlouisfed.org) | structured — scripts/seed-economic-calendar.mjs |
| 56 | api.ted.europa.eu (api.ted.europa.eu) | structured — scripts/seed-global-tenders.mjs |
| 57 | api.telegram.org (api.telegram.org) | structured — scripts/notification-relay.cjs, scripts/seed-digest-notifications.mjs |
| 58 | api.tzevaadom.co.il (api.tzevaadom.co.il) | structured — scripts/ais-relay.cjs |
| 59 | api.unhcr.org (api.unhcr.org) | structured — scripts/seed-displacement-summary.mjs |
| 60 | api.usaspending.gov (api.usaspending.gov) | structured — scripts/ais-relay.cjs, scripts/seed-usa-spending.mjs |
| 61 | api.weather.gov (api.weather.gov) | structured — scripts/_weather-alert-select.mjs |
| 62 | api.windy.com (api.windy.com) | structured — scripts/seed-webcams.mjs, server/worldmonitor/webcam/v1/get-webcam-image.ts |
| 63 | api.wto.org (api.wto.org) | structured — scripts/seed-supply-chain-trade.mjs, server/worldmonitor/trade/v1/_shared.ts |
| 64 | apnews.com (apnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 65 | arabianbusiness.com (arabianbusiness.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 66 | arabnews.com (arabnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 67 | archive-api.open-meteo.com (archive-api.open-meteo.com) | structured — scripts/_open-meteo-archive.mjs |
| 68 | arctictoday.com (arctictoday.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 69 | armenpress.am (armenpress.am) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 70 | armscontrol.org (armscontrol.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 71 | arxiv.org (arxiv.org) | structured — scripts/seed-research.mjs |
| 72 | asharq.com (asharq.com) | feed — src/config/feeds.ts |
| 73 | asharqbusiness.com (asharqbusiness.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 74 | asia.nikkei.com (asia.nikkei.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 75 | asianews.it (asianews.it) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 76 | astanatimes.com (astanatimes.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 77 | AusTender (www.tenders.gov.au) | structured — scripts/seed-global-tenders.mjs |
| 78 | av.alarabiya.net (av.alarabiya.net) | feed — src/services/live-channels.ts |
| 79 | Axiom telemetry (api.axiom.co) | structured — api/_usage-telemetry.js, scripts/lib/llm-telemetry.cjs, scripts/seed-forecasts.mjs, server/_shared/usage.ts |
| 80 | AyiboPost (ayibopost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 81 | azertag.az (azertag.az) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 82 | azure.status.microsoft (azure.status.microsoft) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 83 | B.C. Evacuation Orders and Alerts (catalogue.data.gov.bc.ca) | structured — scripts/lib/bc-emergency-info.mjs |
| 84 | B.C. Evacuation Orders and Alerts (services6.arcgis.com) | structured — scripts/lib/bc-emergency-info.mjs |
| 85 | balkaninsight.com (balkaninsight.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 86 | bangkokpost.com (bangkokpost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 87 | Bank of Canada (www.bankofcanada.ca) | structured — scripts/lib/boc-valet.mjs |
| 88 | Barchart (www.barchart.com) | structured — scripts/seed-fear-greed.mjs |
| 89 | basemaps.cartocdn.com (basemaps.cartocdn.com) | structured — src/config/basemap-styles.ts |
| 90 | BBC (feeds.bbci.co.uk) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 91 | BBC (www.bbc.com) | feed — src/config/feeds.ts |
| 92 | BC Open511 (api.open511.gov.bc.ca) | structured — scripts/lib/open511.mjs |
| 93 | BC Wildfire Service (OpenMaps) (openmaps.gov.bc.ca) | structured — scripts/wildfire/bc-fire-points.mjs |
| 94 | bcovlive-a.akamaihd.net (bcovlive-a.akamaihd.net) | feed — src/services/live-channels.ts |
| 95 | bd.usembassy.gov (bd.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 96 | bellingcat.com (bellingcat.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 97 | bihus.info (bihus.info) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 98 | Binance (binance.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 99 | bitbucket.status.atlassian.com (bitbucket.status.atlassian.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 100 | bitcoinmagazine.com (bitcoinmagazine.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 101 | bloomberg.com (bloomberg.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/services/live-channels.ts |
| 102 | bothsidesofthetable.com (bothsidesofthetable.com) | structured — src/config/variants/tech.ts |
| 103 | Brave Search API (api.search.brave.com) | structured — scripts/ais-relay.cjs, server/worldmonitor/market/v1/stock-news-search.ts |
| 104 | breakingdefense.com (breakingdefense.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 105 | British Geological Survey World Mineral Statistics (ogcapi.bgs.ac.uk) | structured — scripts/seed-mineral-production.mjs |
| 106 | British Geological Survey World Mineral Statistics (www.bgs.ac.uk) | structured — scripts/seed-supply-vulnerability.mjs |
| 107 | brookings.edu (brookings.edu) | feed — src/config/feeds.ts |
| 108 | budgetlab.yale.edu (budgetlab.yale.edu) | structured — scripts/_trade-parse-utils.mjs |
| 109 | Business Insider (www.businessinsider.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 110 | Business Wire (feed.businesswire.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 111 | calgaryherald.com (calgaryherald.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 112 | canadabuys.canada.ca (canadabuys.canada.ca) | structured — scripts/seed-global-tenders.mjs |
| 113 | Caracas Chronicles (www.caracaschronicles.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 114 | carnegieendowment.org (carnegieendowment.org) | feed — src/config/feeds.ts |
| 115 | cbcnewshd-f.akamaihd.net (cbcnewshd-f.akamaihd.net) | feed — src/services/live-channels.ts |
| 116 | cbinsights.com (cbinsights.com) | feed — src/config/feeds.ts |
| 117 | cbsn-us.cbsnstream.cbsnews.com (cbsn-us.cbsnstream.cbsnews.com) | feed — src/services/live-channels.ts |
| 118 | cdc.gov (cdc.gov) | feed — src/config/feeds.ts |
| 119 | cdn-ca2-na.lncnetworks.host (cdn-ca2-na.lncnetworks.host) | Excluded / candidate — No current fetch observed |
| 120 | cdn.debugbear.com (cdn.debugbear.com) | structured — src/bootstrap/debugbear-rum.ts |
| 121 | cdnlive.presstv.ir (cdnlive.presstv.ir) | feed — src/services/live-channels.ts |
| 122 | celestrak.org (celestrak.org) | structured — scripts/ais-relay.cjs |
| 123 | CFTC Commitments of Traders (publicreporting.cftc.gov) | structured — scripts/seed-cot.mjs |
| 124 | CFTC public notices (www.cftc.gov) | structured — scripts/seed-regulatory-actions.mjs |
| 125 | Chainwire (chainwire.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 126 | challenges.cloudflare.com (challenges.cloudflare.com) | structured — server/_shared/turnstile.ts |
| 127 | changelog.com (changelog.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 128 | chathamhouse.org (chathamhouse.org) | feed — src/config/feeds.ts |
| 129 | citinewsroom.com (citinewsroom.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 130 | City of Toronto Open Data (ckan0.cf.opendata.inter.prod-toronto.ca) | structured — scripts/lib/tps-open-data.mjs |
| 131 | City of Toronto Open Data (open.toronto.ca) | structured — scripts/lib/tps-open-data.mjs |
| 132 | City of Toronto Open Data (secure.toronto.ca) | structured — scripts/lib/toronto-road-restrictions.mjs |
| 133 | civil.ge (civil.ge) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 134 | Clerk identity service (api.clerk.com) | structured — api/user/passkey-offer.ts, server/auth-session.ts |
| 135 | climate.copernicus.eu (climate.copernicus.eu) | structured — scripts/seed-climate-news.mjs |
| 136 | Cloudflare Browser MCP (browser.mcp.cloudflare.com) | structured — src/services/mcp-store.ts |
| 137 | Cloudflare Radar MCP (radar.mcp.cloudflare.com) | structured — src/services/mcp-store.ts |
| 138 | cloudflare-dns.com (cloudflare-dns.com) | structured — api/_notification-webhook-ssrf.ts, api/mcp-proxy.ts, server/_shared/email-validation.ts, server/worldmonitor/shipping/v2/webhook-shared.ts |
| 139 | cnas.org (cnas.org) | feed — src/config/feeds.ts |
| 140 | cnbc.com (cnbc.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 141 | cnn.com (cnn.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 142 | cnn.gr (cnn.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 143 | co.usembassy.gov (co.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 144 | Coinbase (coinbase.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 145 | CoinPaprika (api.coinpaprika.com) | structured — scripts/_seed-utils.mjs, scripts/ais-relay.cjs, server/worldmonitor/market/v1/_shared.ts |
| 146 | cointelegraph.com (cointelegraph.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/finance.ts |
| 147 | collisionconf.com (collisionconf.com) | structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts |
| 148 | commodity.worldmonitor.app (commodity.worldmonitor.app) | structured — src/app/panel-layout.ts, src/config/variant-meta.ts |
| 149 | comtradeapi.un.org (comtradeapi.un.org) | structured — scripts/seed-comtrade-bilateral-hs4.mjs, scripts/seed-recovery-import-hhi.mjs, scripts/seed-recovery-reexport-share.mjs, scripts/seed-supply-vulnerability.mjs, +2 more |
| 150 | confluence.status.atlassian.com (confluence.status.atlassian.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 151 | conservationoptimism.org (conservationoptimism.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 152 | contxto.com (contxto.com) | structured — src/config/variants/tech.ts |
| 153 | correctiv.org (correctiv.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 154 | corridorrisk.io (corridorrisk.io) | structured — scripts/ais-relay.cjs |
| 155 | cp24.com (cp24.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 156 | cryptoslate.com (cryptoslate.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 157 | csis.org (csis.org) | feed — src/config/feeds.ts |
| 158 | ctvnews.ca (ctvnews.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 159 | customer.dodopayments.com (customer.dodopayments.com) | structured — src/services/billing.ts |
| 160 | CWFIS / CWFIF (NRCan) (geoserver.cwfif.nrcan.gc.ca) | structured — scripts/wildfire/cwfis-wfs.mjs |
| 161 | dai2.xumo.com (dai2.xumo.com) | feed — src/services/live-channels.ts |
| 162 | Daily Nation (nation.africa) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 163 | dailytrust.com (dailytrust.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 164 | dash4.antik.sk (dash4.antik.sk) | feed — src/services/live-channels.ts |
| 165 | data-api.ecb.europa.eu (data-api.ecb.europa.eu) | structured — scripts/seed-ecb-fx-rates.mjs, scripts/seed-ecb-short-rates.mjs, scripts/seed-yield-curve-eu.mjs |
| 166 | data.ecb.europa.eu (data.ecb.europa.eu) | structured — scripts/seed-fsi-eu.mjs |
| 167 | data.humdata.org (data.humdata.org) | structured — scripts/_conflict-hapi.mjs, scripts/benchmark-resilience-external.mjs, scripts/seed-resilience-static.mjs |
| 168 | data.weather.gov.hk (data.weather.gov.hk) | structured — scripts/natural/western-pacific-cyclones.mjs |
| 169 | data.worldbank.org (data.worldbank.org) | structured — scripts/seed-education-attainment.mjs, scripts/seed-wb-external-debt.mjs |
| 170 | datalab.wto.org (datalab.wto.org) | structured — scripts/seed-hormuz.mjs |
| 171 | dataservices.icao.int (dataservices.icao.int) | structured — scripts/ais-relay.cjs, scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/_shared.ts |
| 172 | de.euronews.com (de.euronews.com) | feed — src/config/feeds.ts |
| 173 | de.usembassy.gov (de.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 174 | decrypt.co (decrypt.co) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 175 | defense.gov (defense.gov) | Excluded / candidate — No current fetch observed |
| 176 | dev.events (dev.events) | structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts, src/config/variants/tech.ts |
| 177 | dev.to (dev.to) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 178 | devops.com (devops.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 179 | dfrlab.org (dfrlab.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 180 | Dhaka Tribune (dhakatribune.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 181 | dhs.gov (dhs.gov) | feed — src/config/feeds.ts |
| 182 | discord.com (discord.com) | structured — api/discord/oauth/callback.ts, api/discord/oauth/start.ts |
| 183 | discord.gg (discord.gg) | Excluded / candidate — No current fetch observed |
| 184 | discordstatus.com (discordstatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 185 | disrupt-africa.com (disrupt-africa.com) | structured — src/config/variants/tech.ts |
| 186 | dlnews.com (dlnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 187 | do.usembassy.gov (do.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 188 | drmkc.jrc.ec.europa.eu (drmkc.jrc.ec.europa.eu) | structured — scripts/benchmark-resilience-external.mjs |
| 189 | dw.com (dw.com) | feed — src/config/feeds.ts |
| 190 | dwamdstream103.akamaized.net (dwamdstream103.akamaized.net) | feed — src/services/live-channels.ts |
| 191 | dwamdstream104.akamaized.net (dwamdstream104.akamaized.net) | feed — src/services/live-channels.ts |
| 192 | e00-elmundo.uecdn.es (e00-elmundo.uecdn.es) | feed — src/config/feeds.ts |
| 193 | earthobservatory.nasa.gov (earthobservatory.nasa.gov) | structured — scripts/seed-climate-news.mjs |
| 194 | earthquake.usgs.gov (earthquake.usgs.gov) | structured — api/mcp/skill-extension/generated.ts, scripts/seed-earthquakes.mjs |
| 195 | Earthquakes Canada (NRCan) (www.earthquakescanada.nrcan.gc.ca) | structured — scripts/seismology/nrcan-atom.mjs |
| 196 | ec.europa.eu (ec.europa.eu) | feed+structured — scripts/_eurostat-utils.mjs, scripts/seed-economic-calendar.mjs, scripts/seed-eurostat-country-data.mjs, scripts/seed-resilience-static.mjs, +2 more |
| 197 | ecfr.eu (ecfr.eu) | feed — src/config/feeds.ts |
| 198 | edmontonjournal.com (edmontonjournal.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 199 | Efecto Cocuyo (efectococuyo.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 200 | eff.org (eff.org) | feed — src/config/feeds.ts |
| 201 | Egypt Independent (www.egyptindependent.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 202 | eia.gov (eia.gov) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 203 | Element84 Earth Search STAC (earth-search.aws.element84.com) | structured — server/worldmonitor/imagery/v1/search-imagery.ts |
| 204 | Ember electricity data (storage.googleapis.com) | structured — scripts/_conflict-gdelt-bulk.mjs, scripts/_gdelt-bulk-materializer.mjs, scripts/seed-ember-electricity.mjs |
| 205 | en.irna.ir (en.irna.ir) | feed — src/config/feeds.ts |
| 206 | en.mehrnews.com (en.mehrnews.com) | feed — src/config/feeds.ts |
| 207 | en.sge.com.cn (en.sge.com.cn) | structured — scripts/seed-physical-premiums.mjs |
| 208 | en.sse.net.cn (en.sse.net.cn) | structured — scripts/seed-supply-chain-trade.mjs |
| 209 | en.wikipedia.org (en.wikipedia.org) | structured — scripts/seed-sovereign-wealth.mjs, server/worldmonitor/intelligence/v1/get-country-facts.ts |
| 210 | Enab Baladi English (english.enabbaladi.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 211 | energy.ec.europa.eu (energy.ec.europa.eu) | structured — scripts/backfill-fuel-prices-prev.mjs, scripts/seed-fuel-prices.mjs |
| 212 | energy.worldmonitor.app (energy.worldmonitor.app) | structured — src/app/panel-layout.ts, src/config/variant-meta.ts |
| 213 | eng.lsm.lv (eng.lsm.lv) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 214 | english.alarabiya.net (english.alarabiya.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 215 | english.customs.gov.cn (english.customs.gov.cn) | structured — scripts/china-macro/source-contracts.mjs |
| 216 | english.nv.ua (english.nv.ua) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 217 | ENTSO-E Transparency Platform (web-api.tp.entsoe.eu) | structured — scripts/seed-electricity-prices.mjs |
| 218 | Environment and Climate Change Canada (ECCC) (api.weather.gc.ca) | structured — scripts/_weather-alert-select.mjs |
| 219 | eonet.gsfc.nasa.gov (eonet.gsfc.nasa.gov) | structured — scripts/seed-natural-events.mjs |
| 220 | EPA RadNet (radnet.epa.gov) | structured — scripts/seed-radiation-watch.mjs |
| 221 | ert.gr (ert.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 222 | ertflix.ascdn.broadpeak.io (ertflix.ascdn.broadpeak.io) | feed — src/services/live-channels.ts |
| 223 | es.euronews.com (es.euronews.com) | feed — src/config/feeds.ts |
| 224 | eu-startups.com (eu-startups.com) | feed — src/config/feeds.ts |
| 225 | euractiv.com (euractiv.com) | feed — src/config/feeds.ts |
| 226 | eurasianet.org (eurasianet.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 227 | euromaidanpress.com (euromaidanpress.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 228 | Example domain placeholder (example.com) | structured — scripts/mcp-live-smoke.mjs, scripts/openapi-inject-examples.mjs, src/services/mcp-store.ts, src/utils/sanitize.ts |
| 229 | export.arxiv.org (export.arxiv.org) | feed+structured — scripts/seed-research.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 230 | fao.org (fao.org) | feed — src/config/feeds.ts |
| 231 | FAOSTAT (api.data.apps.fao.org) | structured — scripts/seed-food-stocks.mjs |
| 232 | FAOSTAT (data.apps.fao.org) | structured — scripts/seed-food-stocks.mjs |
| 233 | FAOSTAT (fenixservices.fao.org) | Excluded / candidate — No current fetch observed |
| 234 | farsnews.ir (farsnews.ir) | feed — src/config/feeds.ts |
| 235 | fas.org (fas.org) | feed — src/config/feeds.ts |
| 236 | fc.yahoo.com (fc.yahoo.com) | structured — scripts/_yahoo-sector-valuations.cjs |
| 237 | feed.infoq.com (feed.infoq.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 238 | feeds.abcnews.com (feeds.abcnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 239 | feeds.arstechnica.com (feeds.arstechnica.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 240 | feeds.content.dowjones.io (feeds.content.dowjones.io) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 241 | feeds.elpais.com (feeds.elpais.com) | feed — src/config/feeds.ts |
| 242 | feeds.feedburner.com (feeds.feedburner.com) | feed+structured (syndication transport) — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 243 | feeds.folha.uol.com.br (feeds.folha.uol.com.br) | feed — src/config/feeds.ts |
| 244 | feeds.megaphone.fm (feeds.megaphone.fm) | feed — src/config/feeds.ts |
| 245 | feeds.nbcnews.com (feeds.nbcnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 246 | feeds.news24.com (feeds.news24.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 247 | feeds.nos.nl (feeds.nos.nl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 248 | feeds.npr.org (feeds.npr.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 249 | fema.gov (fema.gov) | feed — src/config/feeds.ts |
| 250 | feodotracker.abuse.ch (feodotracker.abuse.ch) | structured — scripts/seed-cyber-threats.mjs |
| 251 | finance.worldmonitor.app (finance.worldmonitor.app) | structured — src/app/panel-layout.ts, src/config/variant-meta.ts |
| 252 | finance.yahoo.com (finance.yahoo.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/finance.ts, src/config/variants/tech.ts |
| 253 | Financial Action Task Force (FATF) (www.fatf-gafi.org) | structured — scripts/seed-fatf-listing.mjs |
| 254 | financialpost.com (financialpost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 255 | finnhub.io (finnhub.io) | structured — api/symbol-search.ts, scripts/ais-relay.cjs, scripts/seed-earnings-calendar.mjs, scripts/seed-economy.mjs, +4 more |
| 256 | FINRA (feeds.finra.org) | structured — scripts/seed-regulatory-actions.mjs |
| 257 | Fintraffic Digitraffic (not-currently-wired) | Excluded / candidate — No current fetch observed |
| 258 | Firecrawl (api.firecrawl.dev) | structured — scripts/seed-grocery-basket.mjs |
| 259 | focustaiwan.tw (focustaiwan.tw) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 260 | fonts.googleapis.com (fonts.googleapis.com) | structured — server/_shared/brief-render.js |
| 261 | foreignpolicy.com (foreignpolicy.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 262 | Fox Business (moxie.foxbusiness.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 263 | fr.africanews.com (fr.africanews.com) | feed — src/config/feeds.ts |
| 264 | fr.euronews.com (fr.euronews.com) | feed — src/config/feeds.ts |
| 265 | freeipapi.com (freeipapi.com) | structured — scripts/seed-cyber-threats.mjs |
| 266 | ft.com (ft.com) | feed — src/config/feeds.ts |
| 267 | fxempire.com (fxempire.com) | feed — src/config/feeds.ts |
| 268 | gain.nd.edu (gain.nd.edu) | structured — scripts/benchmark-resilience-external.mjs |
| 269 | gamma-api.polymarket.com (gamma-api.polymarket.com) | structured — scripts/_forecast-market-settlements.mjs, scripts/ais-relay.cjs, scripts/seed-prediction-markets.mjs |
| 270 | Gazeta Wyborcza (wyborcza.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 271 | gcaptain.com (gcaptain.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 272 | geo.tv (geo.tv) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 273 | geospatial-usace.opendata.arcgis.com (geospatial-usace.opendata.arcgis.com) | structured — scripts/fetch-mirta-bases.mjs |
| 274 | ghoapi.azureedge.net (ghoapi.azureedge.net) | structured — scripts/seed-resilience-static.mjs |
| 275 | github.blog (github.blog) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 276 | github.com (github.com) | structured — api/download.js, scripts/build-accuracy-page.mjs, scripts/build-crawlable-corpus.mjs, scripts/generate-airline-codes.mjs, +4 more |
| 277 | Global Affairs Canada (SEMA consolidated sanctions) (www.international.gc.ca) | structured — scripts/_sema-sanctions.mjs |
| 278 | Global Energy Monitor (globalenergymonitor.org) | structured — scripts/import-gem-pipelines.mjs, src/components/PipelineStatusPanel.ts, src/components/StorageFacilityMapPanel.ts |
| 279 | globalinitiative.net (globalinitiative.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 280 | globalnews.ca (globalnews.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 281 | GlobeNewswire (www.globenewswire.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 282 | gmfus.org (gmfus.org) | feed — src/config/feeds.ts |
| 283 | gml.noaa.gov (gml.noaa.gov) | structured — scripts/seed-co2-monitoring.mjs |
| 284 | goldsilverworlds.com (goldsilverworlds.com) | feed — src/config/feeds.ts |
| 285 | Google account sign-in (accounts.google.com) | feed — src/components/LiveNewsPanel.ts |
| 286 | gpsjam.org (gpsjam.org) | structured — scripts/fetch-gpsjam.mjs |
| 287 | gr.euronews.com (gr.euronews.com) | feed — src/config/feeds.ts |
| 288 | greatergood.berkeley.edu (greatergood.berkeley.edu) | feed — src/config/feeds.ts |
| 289 | GTA Update (gtaupdate.com) | structured — scripts/lib/gta-update.mjs |
| 290 | haaretz.com (haaretz.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 291 | hacker-news.firebaseio.com (hacker-news.firebaseio.com) | structured — scripts/seed-research.mjs |
| 292 | hai.stanford.edu (hai.stanford.edu) | feed — src/config/feeds.ts |
| 293 | HaitiLibre English (www.haitilibre.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 294 | Handelsblatt (www.handelsblatt.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 295 | hapi.humdata.org (hapi.humdata.org) | structured — scripts/_conflict-hapi.mjs |
| 296 | happy.worldmonitor.app (happy.worldmonitor.app) | structured — src/config/variant-meta.ts |
| 297 | Havana Times (havanatimes.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 298 | health.aws.amazon.com (health.aws.amazon.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 299 | hiiraan.com (hiiraan.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 300 | hirado.hu (hirado.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 301 | hnrss.org (hnrss.org) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 302 | hromadske.ua (hromadske.ua) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 303 | humanprogress.org (humanprogress.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 304 | hvg.hu (hvg.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 305 | Hyperliquid (api.hyperliquid.xyz) | structured — scripts/seed-hyperliquid-flow.mjs |
| 306 | ici.radio-canada.ca (ici.radio-canada.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 307 | iea.org (iea.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 308 | ILOSTAT (sdmx.ilo.org) | structured — scripts/_demographics-capability-source.mjs |
| 309 | in.usembassy.gov (in.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 310 | inc42.com (inc42.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 311 | index.hu (index.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 312 | India Meteorological Department (api.imd.gov.in) | structured — scripts/lib/imd-cyclone-marine.mjs, src/app/data-loader.ts |
| 313 | India Meteorological Department (mausam.imd.gov.in) | structured — scripts/lib/imd-cyclone-marine.mjs |
| 314 | India Meteorological Department (rsmcnewdelhi.imd.gov.in) | structured — scripts/lib/imd-cyclone-marine.mjs |
| 315 | indianexpress.com (indianexpress.com) | feed — src/config/feeds.ts |
| 316 | indiatodaylive.akamaized.net (indiatodaylive.akamaized.net) | feed — src/services/live-channels.ts |
| 317 | insideclimatenews.org (insideclimatenews.org) | Excluded / candidate — No current fetch observed |
| 318 | insightcrime.org (insightcrime.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 319 | Interfax (interfax.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 320 | Interfax (www.interfax.ru) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 321 | Internal example placeholder (internal.example.com) | structured — api/notification-channels.ts |
| 322 | International Forum of Sovereign Wealth Funds (www.ifswf.org) | structured — scripts/seed-sovereign-wealth.mjs |
| 323 | investing.com (investing.com) | feed — src/config/feeds.ts |
| 324 | ipinfo.io (ipinfo.io) | structured — scripts/seed-cyber-threats.mjs |
| 325 | iranintl.com (iranintl.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 326 | iseas.edu.sg (iseas.edu.sg) | feed — src/config/feeds.ts |
| 327 | islandtimes.org (islandtimes.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 328 | iss.europa.eu (iss.europa.eu) | feed — src/config/feeds.ts |
| 329 | it.euronews.com (it.euronews.com) | feed — src/config/feeds.ts |
| 330 | it.usembassy.gov (it.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 331 | jam-news.net (jam-news.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 332 | jamestown.org (jamestown.org) | feed — src/config/feeds.ts |
| 333 | janes.com (janes.com) | feed — src/config/feeds.ts |
| 334 | japantoday.com (japantoday.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 335 | Jin10 (jin10.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 336 | jira-software.status.atlassian.com (jira-software.status.atlassian.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 337 | jmespath.org (jmespath.org) | structured — api/mcp/constants.ts |
| 338 | jsDelivr asset CDN (cdn.jsdelivr.net) | structured — scripts/ais-relay.cjs, server/_shared/brief-carousel-render.ts |
| 339 | justice.gov (justice.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 340 | Kalshi (api.elections.kalshi.com) | structured — scripts/_forecast-market-settlements.mjs, scripts/seed-prediction-markets.mjs |
| 341 | kalshi.com (kalshi.com) | structured — scripts/_bet-templates-markets.mjs, scripts/seed-prediction-markets.mjs |
| 342 | kan11.media.kan.org.il (kan11.media.kan.org.il) | feed — src/services/live-channels.ts |
| 343 | kathimerini.gr (kathimerini.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 344 | kitco.com (kitco.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 345 | kr-asia.com (kr-asia.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 346 | krebsonsecurity.com (krebsonsecurity.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 347 | kyivindependent.com (kyivindependent.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 348 | L’Orient Today (lorientlejour.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 349 | lavca.org (lavca.org) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 350 | leFaso.net (lefaso.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 351 | lequotidien.sn (lequotidien.sn) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 352 | liberal.gr (liberal.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 353 | Libya Herald (libyaherald.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 354 | Linear MCP (mcp.linear.app) | structured — src/services/mcp-store.ts |
| 355 | linear901-oo-hls0-prd-gtm.delivery.skycdp.com (linear901-oo-hls0-prd-gtm.delivery.skycdp.com) | feed — src/services/live-channels.ts |
| 356 | linearstatus.com (linearstatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 357 | live-gbnews.simplestreamcdn.com (live-gbnews.simplestreamcdn.com) | feed — src/services/live-channels.ts |
| 358 | live-hls-apps-aje-fa.getaj.net (live-hls-apps-aje-fa.getaj.net) | feed — src/services/live-channels.ts |
| 359 | live-hls-web-aja.getaj.net (live-hls-web-aja.getaj.net) | feed — src/services/live-channels.ts |
| 360 | live-hls-web-ajb.getaj.net (live-hls-web-ajb.getaj.net) | feed — src/services/live-channels.ts |
| 361 | live-hls-web-ajm.getaj.net (live-hls-web-ajm.getaj.net) | feed — src/services/live-channels.ts |
| 362 | live-stream.skynewsarabia.com (live-stream.skynewsarabia.com) | feed — src/services/live-channels.ts |
| 363 | live.alarabiya.net (live.alarabiya.net) | feed — src/services/live-channels.ts |
| 364 | live.dodopayments.com (live.dodopayments.com) | structured — api/product-catalog.js, scripts/ais-relay.cjs |
| 365 | liveedge-arisenews.visioncdn.com (liveedge-arisenews.visioncdn.com) | feed — src/services/live-channels.ts |
| 366 | livenewschat.eu (livenewschat.eu) | Excluded / candidate — No current fetch observed |
| 367 | lnc-abc-news.tubi.video (lnc-abc-news.tubi.video) | feed — src/services/live-channels.ts |
| 368 | lobste.rs (lobste.rs) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 369 | Local development transport (localhost) | feed+structured — scripts/ais-relay.cjs, server/worldmonitor/research/v1/list-tech-events.ts, src/components/LiveNewsPanel.ts, src/services/desktop-runtime.ts, +1 more |
| 370 | Local loopback transport (127.0.0.1) | feed+structured — scripts/measure-trade-animation-rebuild.mjs, scripts/profile-news-hybrid-clustering-7782-dashboard.mjs, src/components/LiveNewsPanel.ts, src/services/runtime.ts |
| 371 | lowyinstitute.org (lowyinstitute.org) | feed — src/config/feeds.ts |
| 372 | macleans.ca (macleans.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 373 | Mada Masr (madamasr.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 374 | Manitoba 511 (www.manitoba511.ca) | structured — scripts/lib/provincial-511.mjs |
| 375 | maps.worldmonitor.app (maps.worldmonitor.app) | structured — src/services/country-geometry.ts |
| 376 | mapservices.weather.noaa.gov (mapservices.weather.noaa.gov) | structured — scripts/seed-natural-events.mjs |
| 377 | marketwatch.com (marketwatch.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 378 | meduza.io (meduza.io) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 379 | mei.edu (mei.edu) | feed — src/config/feeds.ts |
| 380 | mempool.space (mempool.space) | structured — scripts/seed-economy.mjs |
| 381 | messari.io (messari.io) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 382 | mexiconewsdaily.com (mexiconewsdaily.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 383 | miit.gov.cn (miit.gov.cn) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 384 | mining-journal.com (mining-journal.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 385 | miningweekly.com (miningweekly.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 386 | mm.usembassy.gov (mm.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 387 | mofcom.gov.cn (mofcom.gov.cn) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 388 | montrealgazette.com (montrealgazette.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 389 | moxie.foxnews.com (moxie.foxnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 390 | mshibanami.github.io (mshibanami.github.io) | feed — src/config/feeds.ts |
| 391 | msi.nga.mil (msi.nga.mil) | structured — server/worldmonitor/infrastructure/v1/get-cable-health.ts, server/worldmonitor/maritime/v1/list-navigational-warnings.ts |
| 392 | mx.usembassy.gov (mx.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 393 | n1info.hr (n1info.hr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 394 | Naharnet Lebanon (www.naharnet.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 395 | NASA FIRMS (firms.modaps.eosdis.nasa.gov) | structured — scripts/wildfire/firms-area.mjs |
| 396 | NASA FIRMS (firms2.modaps.eosdis.nasa.gov) | Excluded / candidate — No current fetch observed |
| 397 | nasstatus.faa.gov (nasstatus.faa.gov) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/_shared.ts |
| 398 | nationalpost.com (nationalpost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 399 | ndtvindiaelemarchana.akamaized.net (ndtvindiaelemarchana.akamaized.net) | feed — src/services/live-channels.ts |
| 400 | news.cgtn.com (news.cgtn.com) | feed — src/services/live-channels.ts |
| 401 | news.crunchbase.com (news.crunchbase.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 402 | news.err.ee (news.err.ee) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 403 | news.google.com (news.google.com) | feed+structured (syndication transport) — scripts/source-catalog-identity.mjs, scripts/validate-rss-feeds.mjs, server/worldmonitor/intelligence/v1/_country-coverage-feeds.ts, server/worldmonitor/market/v1/stock-news-search.ts, +5 more |
| 404 | news.mit.edu (news.mit.edu) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 405 | news.mongabay.com (news.mongabay.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 406 | news.tuoitre.vn (news.tuoitre.vn) | feed — src/config/feeds.ts |
| 407 | news.un.org (news.un.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 408 | news.usni.org (news.usni.org) | feed+structured — scripts/ais-relay.cjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 409 | news.ycombinator.com (news.ycombinator.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 410 | newsfeed.zeit.de (newsfeed.zeit.de) | feed — src/config/feeds.ts |
| 411 | newsmaker.md (newsmaker.md) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 412 | nhkwlive-ojp.akamaized.net (nhkwlive-ojp.akamaized.net) | feed — src/services/live-channels.ts |
| 413 | nominatim.openstreetmap.org (nominatim.openstreetmap.org) | structured — api/reverse-geocode.js, server/worldmonitor/infrastructure/v1/reverse-geocode.ts |
| 414 | northernminer.com (northernminer.com) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 415 | novayagazeta.eu (novayagazeta.eu) | feed — src/config/feeds.ts |
| 416 | nrk-nrk1.akamaized.net (nrk-nrk1.akamaized.net) | feed — src/services/live-channels.ts |
| 417 | NSIDC (noaadata.apps.nsidc.org) | structured — scripts/seed-climate-ocean-ice.mjs |
| 418 | nti.org (nti.org) | feed — src/config/feeds.ts |
| 419 | oauth.reddit.com (oauth.reddit.com) | structured — scripts/ais-relay.cjs |
| 420 | oc-media.org (oc-media.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 421 | oecd.org (oecd.org) | feed — src/config/feeds.ts |
| 422 | Office of the U.S. Trade Representative (ustr.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 423 | oglobo.globo.com (oglobo.globo.com) | feed — src/config/feeds.ts |
| 424 | oilprice.com (oilprice.com) | feed+structured — scripts/seed-energy-intelligence.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 425 | OKO.press (oko.press) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 426 | onemileatatime.com (onemileatatime.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 427 | Onet (wiadomosci.onet.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 428 | Ontario 511 (511on.ca) | structured — scripts/lib/provincial-511.mjs |
| 429 | open.alberta.ca (open.alberta.ca) | Excluded / candidate — No current fetch observed |
| 430 | OpenAQ (api.openaq.org) | structured — scripts/seed-health-air-quality.mjs |
| 431 | openrouter.ai (openrouter.ai) | structured — scripts/eval-classify-labels.mjs, scripts/lib/brief-dedup-consts.mjs, scripts/lib/company-monitoring-classifier-client.mjs, scripts/regional-snapshot/weekly-brief.mjs |
| 432 | OpenSanctions (api.opensanctions.org) | structured — server/worldmonitor/sanctions/v1/lookup-entity.ts |
| 433 | opensky-network.org (auth.opensky-network.org) | structured — scripts/seed-military-flights.mjs |
| 434 | opensky-network.org (opensky-network.org) | structured — scripts/ais-relay.cjs, scripts/seed-military-flights.mjs, server/worldmonitor/military/v1/list-military-flights.ts, src/components/MapPopup.ts |
| 435 | openstreetmap.org (openstreetmap.org) | structured — src/config/basemap-styles.ts |
| 436 | ott.tv5monde.com (ott.tv5monde.com) | feed — src/services/live-channels.ts |
| 437 | ottawacitizen.com (ottawacitizen.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 438 | otx.alienvault.com (otx.alienvault.com) | structured — scripts/seed-cyber-threats.mjs |
| 439 | Our World in Data (ourworldindata.org) | structured — scripts/seed-low-carbon-generation.mjs, server/worldmonitor/resilience/v1/_dimension-scorers.ts, server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 440 | Our World in Data (owid-public.owid.io) | structured — scripts/seed-owid-energy-mix.mjs |
| 441 | outbreaknewstoday.com (outbreaknewstoday.com) | structured — scripts/seed-disease-outbreaks.mjs |
| 442 | overpass-api.de (overpass-api.de) | structured — scripts/fetch-osm-bases.mjs |
| 443 | Pajhwok Afghan News (pajhwok.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 444 | PAP (pap.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 445 | Parallel Search MCP (search.parallel.ai) | structured — src/services/mcp-store.ts |
| 446 | patents.google.com (patents.google.com) | structured — scripts/_defense-patents-source.mjs |
| 447 | pe-fa-lp02a.9c9media.com (pe-fa-lp02a.9c9media.com) | feed — src/services/live-channels.ts |
| 448 | phys.org (phys.org) | structured — scripts/seed-climate-news.mjs |
| 449 | pitchbook.com (pitchbook.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 450 | pk.usembassy.gov (pk.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 451 | pl.usembassy.gov (pl.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 452 | Polityka (polityka.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 453 | polymarket.com (polymarket.com) | structured — api/mcp/skill-extension/generated.ts, scripts/_bet-templates-markets.mjs, scripts/seed-prediction-markets.mjs |
| 454 | portfolio.hu (portfolio.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 455 | portwatch.imf.org (portwatch.imf.org) | structured — scripts/build-chokepoint-transit-snapshot.mjs |
| 456 | PR Newswire (prnewswire.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 457 | pravda.com.ua (pravda.com.ua) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 458 | pro-api.coingecko.com (pro-api.coingecko.com) | structured — scripts/ais-relay.cjs |
| 459 | production.dataviz.cnn.io (production.dataviz.cnn.io) | structured — scripts/seed-fear-greed.mjs |
| 460 | protomaps.com (protomaps.com) | structured — src/config/basemap-styles.ts |
| 461 | protothema.gr (protothema.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 462 | Proxy URL placeholder (user) | structured — scripts/_proxy-utils.cjs, scripts/ais-relay.cjs |
| 463 | pt.euronews.com (pt.euronews.com) | feed — src/config/feeds.ts |
| 464 | public.govdelivery.com (public.govdelivery.com) | structured — scripts/seed-regulatory-actions.mjs |
| 465 | publicacionexterna.azurewebsites.net (publicacionexterna.azurewebsites.net) | structured — scripts/seed-fuel-prices.mjs |
| 466 | PURL namespace (purl.org) | structured — src/services/rss.ts |
| 467 | qevdnlpgjxpwusesmtpx.supabase.co (qevdnlpgjxpwusesmtpx.supabase.co) | structured — scripts/fetch-pizzint-bases.mjs |
| 468 | query.sse.com.cn (query.sse.com.cn) | structured — scripts/china-corporate-disclosures/adapters.mjs |
| 469 | query1.finance.yahoo.com (query1.finance.yahoo.com) | structured — scripts/_seed-utils.mjs, scripts/_yahoo-fetch.mjs, scripts/_yahoo-sector-valuations.cjs, scripts/ais-relay.cjs, +10 more |
| 470 | radar.cloudflare.com (radar.cloudflare.com) | structured — server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 471 | Radio Ndeke Luka (www.radiondekeluka.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 472 | railway.instatus.com (railway.instatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 473 | rakuten-guardian-1-ie.samsung.wurl.tv (rakuten-guardian-1-ie.samsung.wurl.tv) | feed — src/services/live-channels.ts |
| 474 | raw.githubusercontent.com (raw.githubusercontent.com) | structured — scripts/ais-relay.cjs, scripts/fetch-country-boundary-overrides.mjs, scripts/generate-airline-codes.mjs, scripts/generate-oref-locations.mjs, +2 more |
| 475 | reasonstobecheerful.world (reasonstobecheerful.world) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 476 | reddit.com (reddit.com) | structured — scripts/ais-relay.cjs, src/services/story-share.ts |
| 477 | registry.modelcontextprotocol.io (registry.modelcontextprotocol.io) | structured — scripts/publish-mcp-registry.mjs |
| 478 | ReliefWeb (UN OCHA) (api.reliefweb.int) | structured — scripts/seed-climate-disasters.mjs |
| 479 | reliefweb.int (reliefweb.int) | structured — scripts/seed-climate-news.mjs |
| 480 | renaissancecapital.com (renaissancecapital.com) | feed — src/config/feeds.ts |
| 481 | Reporters Without Borders (RSF) (rsf.org) | structured — scripts/seed-resilience-static.mjs |
| 482 | Resend email service (api.resend.com) | structured — server/worldmonitor/leads/v1/register-interest.ts, server/worldmonitor/leads/v1/submit-contact.ts |
| 483 | responsiblestatecraft.org (responsiblestatecraft.org) | feed — src/config/feeds.ts |
| 484 | restcountries.com (restcountries.com) | Excluded / candidate — No current fetch observed |
| 485 | reuters-reutersnow-1-eu.rakuten.wurl.tv (reuters-reutersnow-1-eu.rakuten.wurl.tv) | feed — src/services/live-channels.ts |
| 486 | reuters.com (reuters.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 487 | review.firstround.com (review.firstround.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 488 | rferl.org (rferl.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 489 | rieti.go.jp (rieti.go.jp) | feed — src/config/feeds.ts |
| 490 | Robtex MCP (mcp.robtex.com) | structured — src/services/mcp-store.ts |
| 491 | rss.art19.com (rss.art19.com) | feed — src/config/feeds.ts |
| 492 | rss.dw.com (rss.dw.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 493 | rss.libsyn.com (rss.libsyn.com) | feed — src/config/feeds.ts |
| 494 | rss.politico.com (rss.politico.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 495 | rt-arb.rttv.com (rt-arb.rttv.com) | feed — src/services/live-channels.ts |
| 496 | rt-esp.rttv.com (rt-esp.rttv.com) | feed — src/services/live-channels.ts |
| 497 | rt-glb.rttv.com (rt-glb.rttv.com) | feed — src/services/live-channels.ts |
| 498 | ru.euronews.com (ru.euronews.com) | feed — src/config/feeds.ts |
| 499 | rudaw.net (rudaw.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 500 | rusi.org (rusi.org) | feed — src/config/feeds.ts |
| 501 | sabconetanw.cdn.mangomolo.com (sabconetanw.cdn.mangomolo.com) | feed — src/services/live-channels.ts |
| 502 | Safecast (api.safecast.org) | structured — scripts/seed-radiation-watch.mjs |
| 503 | Sana’a Center (sanaacenter.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 504 | sanctionslistservice.ofac.treas.gov (sanctionslistservice.ofac.treas.gov) | structured — scripts/seed-sanctions-pressure.mjs |
| 505 | SaskAlert (emergencyalert.saskatchewan.ca) | structured — scripts/lib/saskalert.mjs, scripts/source-attribution.mjs |
| 506 | schema.org (schema.org) | structured — api/ask.ts, scripts/build-accuracy-page.mjs, scripts/build-crawlable-corpus.mjs, scripts/build-use-cases.mjs, +1 more |
| 507 | schemas.agentskills.io (schemas.agentskills.io) | structured — scripts/build-agent-skills-index.mjs |
| 508 | scmp.com (scmp.com) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 509 | sealevel.nasa.gov (sealevel.nasa.gov) | structured — scripts/seed-climate-ocean-ice.mjs |
| 510 | search.seznam.cz (search.seznam.cz) | structured — scripts/seo-indexnow-submit.mjs |
| 511 | search.worldbank.org (search.worldbank.org) | structured — scripts/seed-global-tenders.mjs |
| 512 | search.yahoo.com (search.yahoo.com) | structured — src/services/rss.ts |
| 513 | searchadvisor.naver.com (searchadvisor.naver.com) | structured — scripts/seo-indexnow-submit.mjs |
| 514 | SEC (www.sec.gov) | feed+structured — scripts/openapi-inject-examples.mjs, scripts/seed-regulatory-actions.mjs, scripts/seed-sec-8k-stream.mjs, scripts/seed-sec-cik-map.mjs, +3 more |
| 515 | SEC EDGAR (data.sec.gov) | structured — server/_shared/sec-edgar.ts |
| 516 | SEC EDGAR Full-Text Search (efts.sec.gov) | structured — server/_shared/sec-edgar.ts |
| 517 | sedeaplicaciones.minetur.gob.es (sedeaplicaciones.minetur.gob.es) | structured — scripts/backfill-fuel-prices-prev.mjs, scripts/seed-fuel-prices.mjs |
| 518 | seekingalpha.com (seekingalpha.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/finance.ts, src/config/variants/tech.ts |
| 519 | semianalysis.com (semianalysis.com) | feed — src/config/feeds.ts |
| 520 | Sentry error tracking (us.sentry.io) | structured — scripts/audit-sentry-resolve-pins.mjs, scripts/sync-sentry-convex-probe-filters.mjs |
| 521 | sequoiacap.com (sequoiacap.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 522 | SerpAPI (serpapi.com) | structured — server/worldmonitor/market/v1/stock-news-search.ts |
| 523 | services7.arcgis.com (services7.arcgis.com) | structured — scripts/fetch-mirta-bases.mjs |
| 524 | services9.arcgis.com (services9.arcgis.com) | structured — scripts/build-chokepoint-transit-snapshot.mjs, scripts/seed-portwatch-chokepoints-ref.mjs, scripts/seed-portwatch-disruptions.mjs, scripts/seed-portwatch-port-activity.mjs, +1 more |
| 525 | severeweather.wmo.int (severeweather.wmo.int) | structured — scripts/_weather-alert-select.mjs |
| 526 | sifted.eu (sifted.eu) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 527 | simpleflying.com (simpleflying.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 528 | singularityhub.com (singularityhub.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 529 | SIPRI Arms Transfers Database (atbackend.sipri.org) | structured — scripts/_defense-industrial-source.mjs |
| 530 | slack-status.com (slack-status.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 531 | slack.com (slack.com) | structured — api/slack/oauth/callback.ts, api/slack/oauth/start.ts |
| 532 | slidstvo.info (slidstvo.info) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 533 | spglobal.com (spglobal.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 534 | state.gov (state.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 535 | Statistics Canada (www150.statcan.gc.ca) | structured — scripts/lib/statcan-wds.mjs, server/worldmonitor/resilience/v1/_canada-national-overlay.ts, server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 536 | stats.bis.org (stats.bis.org) | structured — scripts/seed-bis-data.mjs, scripts/seed-bis-extended.mjs, scripts/seed-bis-lbs.mjs, server/worldmonitor/economic/v1/_bis-shared.ts |
| 537 | status.circleci.com (status.circleci.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 538 | status.claude.com (status.claude.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 539 | status.cloud.google.com (status.cloud.google.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 540 | status.datadoghq.com (status.datadoghq.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 541 | status.digitalocean.com (status.digitalocean.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 542 | status.gitlab.com (status.gitlab.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 543 | status.npmjs.org (status.npmjs.org) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 544 | status.openai.com (status.openai.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 545 | status.render.com (status.render.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 546 | status.sentry.io (status.sentry.io) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 547 | status.stripe.com (status.stripe.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 548 | status.supabase.com (status.supabase.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 549 | status.twilio.com (status.twilio.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 550 | stratechery.com (stratechery.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 551 | stream.ads.ottera.tv (stream.ads.ottera.tv) | feed — src/services/live-channels.ts |
| 552 | streaming-live.rtp.pt (streaming-live.rtp.pt) | feed — src/services/live-channels.ts |
| 553 | Studio Tamani (www.studiotamani.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 554 | suspilne.media (suspilne.media) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 555 | svs.itworkscdn.net (svs.itworkscdn.net) | feed — src/services/live-channels.ts |
| 556 | SWF Institute (www.swfinstitute.org) | structured — scripts/seed-sovereign-wealth.mjs |
| 557 | Syria Direct (syriadirect.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 558 | t.me (t.me) | structured — api/telegram-feed.js, scripts/ais-relay.cjs, server/worldmonitor/leads/v1/register-interest.ts, src/services/story-share.ts, +1 more |
| 559 | tagesschau.akamaized.net (tagesschau.akamaized.net) | feed — src/services/live-channels.ts |
| 560 | taipeitimes.com (taipeitimes.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 561 | taiwannews.com.tw (taiwannews.com.tw) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 562 | taskandpurpose.com (taskandpurpose.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 563 | tass.com (tass.com) | feed — src/config/feeds.ts |
| 564 | Tchadinfos (tchadinfos.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 565 | tech.eu (tech.eu) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 566 | tech.worldmonitor.app (tech.worldmonitor.app) | structured — src/app/panel-layout.ts, src/config/variant-meta.ts |
| 567 | techcabal.com (techcabal.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 568 | techcrunch.com (techcrunch.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 569 | techinasia.com (techinasia.com) | feed — src/config/feeds.ts |
| 570 | TeleGeography Submarine Cable Map (www.submarinecablemap.com) | structured — scripts/seed-submarine-cables.mjs |
| 571 | telegraaf.nl (telegraaf.nl) | feed — src/config/feeds.ts |
| 572 | telex.hu (telex.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 573 | test (test) | structured — scripts/seed-forecasts.mjs |
| 574 | test.dodopayments.com (test.dodopayments.com) | structured — api/product-catalog.js, scripts/ais-relay.cjs |
| 575 | th.usembassy.gov (th.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 576 | The Daily Star (thedailystar.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 577 | The Guardian Post (theguardianpostcameroon.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 578 | The Telegraph (www.telegraph.co.uk) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 579 | thebetterindia.com (thebetterindia.com) | feed — src/config/feeds.ts |
| 580 | theblock.co (theblock.co) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 581 | thebulletin.org (thebulletin.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 582 | thedefiant.io (thedefiant.io) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 583 | thediplomat.com (thediplomat.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 584 | thehill.com (thehill.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 585 | theinformation.com (theinformation.com) | feed — src/config/feeds.ts |
| 586 | thejakartapost.com (thejakartapost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 587 | thenarwhal.ca (thenarwhal.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 588 | thenationalnews.com (thenationalnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 589 | thenewstack.io (thenewstack.io) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 590 | thenextweb.com (thenextweb.com) | feed — src/config/feeds.ts |
| 591 | thepointsguy.com (thepointsguy.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 592 | theprovince.com (theprovince.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 593 | thesentry.org (thesentry.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 594 | thestar.com.my (thestar.com.my) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 595 | thetyee.ca (thetyee.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 596 | thinkglobalhealth.github.io (thinkglobalhealth.github.io) | structured — scripts/seed-disease-outbreaks.mjs, scripts/seed-vpd-tracker.mjs |
| 597 | tiles.openfreemap.org (tiles.openfreemap.org) | structured — src/config/basemap.ts |
| 598 | Times of India (timesofindia.indiatimes.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 599 | timesca.com (timesca.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 600 | tools.cdc.gov (tools.cdc.gov) | structured — scripts/seed-disease-outbreaks.mjs |
| 601 | Toronto Fire Services (www.toronto.ca) | structured — scripts/lib/toronto-official-cad.mjs |
| 602 | Toronto Police Service (services.arcgis.com) | structured — scripts/lib/toronto-official-cad.mjs, scripts/lib/tps-open-data.mjs |
| 603 | Toronto Police Service Open Data (data.tps.ca) | structured — scripts/lib/tps-open-data.mjs |
| 604 | Toronto Police Service Open Data (www.tps.ca) | structured — scripts/lib/tps-open-data.mjs |
| 605 | Toronto Transit Commission (TTC) GTFS-RT (gtfsrt.ttc.ca) | structured — scripts/seed-ttc-alerts.mjs |
| 606 | TradingView (scanner.tradingview.com) | structured — scripts/_sp500-breadth.mjs |
| 607 | travel.state.gov (travel.state.gov) | structured — scripts/seed-security-advisories.mjs |
| 608 | Travelpayouts flight-price data (api.travelpayouts.com) | structured — server/worldmonitor/aviation/v1/_providers/travelpayouts_data.ts |
| 609 | treasury.gov (treasury.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 610 | trumpstruth.org (trumpstruth.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 611 | tts.baidu.com (tts.baidu.com) | structured — src/main.ts |
| 612 | tuoitrenews.vn (tuoitrenews.vn) | Excluded / candidate — No current fetch observed |
| 613 | turnerlive.warnermediacdn.com (turnerlive.warnermediacdn.com) | Excluded / candidate — No current fetch observed |
| 614 | tv-trtworld.medya.trt.com.tr (tv-trtworld.medya.trt.com.tr) | feed — src/services/live-channels.ts |
| 615 | tvn24.pl (tvn24.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 616 | TVP Info (tvp.info) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 617 | twitter.com (twitter.com) | structured — src/services/story-share.ts |
| 618 | ua.usembassy.gov (ua.usembassy.gov) | structured — scripts/seed-security-advisories.mjs |
| 619 | ucdpapi.pcr.uu.se (ucdpapi.pcr.uu.se) | structured — scripts/ais-relay.cjs, scripts/seed-ucdp-events.mjs |
| 620 | uis.unesco.org (uis.unesco.org) | structured — server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 621 | ukrinform.net (ukrinform.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 622 | ukrinform.ua (ukrinform.ua) | feed — src/config/feeds.ts |
| 623 | unchainedcrypto.com (unchainedcrypto.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 624 | understandingwar.org (understandingwar.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 625 | UNDP Human Development Report (hdr.undp.org) | structured — scripts/benchmark-resilience-external.mjs |
| 626 | unhcr.org (unhcr.org) | feed — src/config/feeds.ts |
| 627 | United Nations Population Division (population.un.org) | structured — scripts/_demographics-capability-source.mjs |
| 628 | urlhaus-api.abuse.ch (urlhaus-api.abuse.ch) | structured — scripts/ais-relay.cjs, scripts/seed-cyber-threats.mjs |
| 629 | USDA FAS PSD (api.fas.usda.gov) | structured — scripts/seed-food-stocks.mjs |
| 630 | USDA FAS PSD (apps.fas.usda.gov) | Excluded / candidate — No current fetch observed |
| 631 | USGS ScienceBase (Mineral Commodity Summaries) (www.sciencebase.gov) | structured — scripts/seed-mineral-production.mjs, scripts/seed-supply-vulnerability.mjs |
| 632 | USPTO Open Data Portal (api.uspto.gov) | structured — scripts/_defense-patents-source.mjs |
| 633 | USPTO Open Data Portal (data.uspto.gov) | structured — scripts/_defense-patents-source.mjs |
| 634 | vancouversun.com (vancouversun.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 635 | venturebeat.com (venturebeat.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 636 | VIA Rail Tracker (unofficial) (tsimobile.viarail.ca) | structured — scripts/viarail-live.mjs |
| 637 | viewfromthewing.com (viewfromthewing.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 638 | Vision of Humanity / Global Peace Index (www.visionofhumanity.org) | structured — scripts/seed-resilience-static.mjs |
| 639 | vnexpress.net (vnexpress.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 640 | vs-hls-push-uk.live.fastly.md.bbci.co.uk (vs-hls-push-uk.live.fastly.md.bbci.co.uk) | feed — src/services/live-channels.ts |
| 641 | vsquare.org (vsquare.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 642 | W3C schema reference (www.w3.org) | structured — api/fwdstart.js, src/embed/panels/fear-greed.ts |
| 643 | wa.me (wa.me) | structured — server/worldmonitor/leads/v1/register-interest.ts, src/services/story-share.ts |
| 644 | wabi-europe-north-b-api.analysis.windows.net (wabi-europe-north-b-api.analysis.windows.net) | structured — scripts/seed-hormuz.mjs |
| 645 | WAFA English (english.wafa.ps) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 646 | warontherocks.com (warontherocks.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 647 | web.archive.org (web.archive.org) | structured — scripts/seed-fatf-listing.mjs |
| 648 | web.cbr.ru (web.cbr.ru) | structured — scripts/seed-cbr-rates.mjs |
| 649 | webcams.windy.com (webcams.windy.com) | structured — shared/pinned-webcams.ts |
| 650 | websummit.com (websummit.com) | structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts |
| 651 | Welt (www.welt.de) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 652 | whitehouse.gov (whitehouse.gov) | Excluded / candidate — No current fetch observed |
| 653 | Wikidata (query.wikidata.org) | structured — scripts/freeze-resilience-ranking.mjs, server/worldmonitor/intelligence/v1/get-country-facts.ts |
| 654 | wilsoncenter.org (wilsoncenter.org) | feed — src/config/feeds.ts |
| 655 | wingbits.com (customer-api.wingbits.com) | structured — scripts/ais-relay.cjs, scripts/seed-military-flights.mjs, server/worldmonitor/military/v1/_wingbits-aircraft-details.ts |
| 656 | wingbits.com (ecs-api.wingbits.com) | structured — server/worldmonitor/military/v1/get-wingbits-live-flight.ts |
| 657 | wingbits.com (wingbits.com) | structured — src/components/MapPopup.ts |
| 658 | Wired (www.wired.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 659 | workos.com (workos.com) | structured — api/oauth-authorization-server.ts |
| 660 | World Air Quality Index (WAQI) (api.waqi.info) | structured — scripts/seed-health-air-quality.mjs |
| 661 | World Bank Open Data (api.worldbank.org) | structured — scripts/_defense-industrial-source.mjs, scripts/_demographics-capability-source.mjs, scripts/ais-relay.cjs, scripts/seed-bis-lbs.mjs, +12 more |
| 662 | World Monitor hosted API (api.worldmonitor.app) | structured — api/a2a.ts, api/internal/mcp-grant-mint.ts, api/mcp/downstream.ts, api/mcp/skill-extension/generated.ts, +19 more |
| 663 | World Monitor proxy (proxy.worldmonitor.app) | structured — api/widget-agent.ts, scripts/seed-security-advisories.mjs, src/utils/proxy.ts |
| 664 | World Monitor web app (worldmonitor.app) | feed+structured — api/_agent-metadata.ts, api/a2a.ts, api/ask.ts, api/fwdstart.js, +45 more |
| 665 | World Monitor web app (www.worldmonitor.app) | structured — api/_cors.js, api/a2a.ts, api/ask.ts, api/mcp/skill-extension/generated.ts, +31 more |
| 666 | WorldMonitor test origin (worldmonitor.invalid) | structured — src/shared/public-rpc-cache.ts |
| 667 | worldmonitor.mintlify.dev (worldmonitor.mintlify.dev) | structured — api/docs-mcp.ts, src/config/docs-locale-seo.ts |
| 668 | wublockchain.com (wublockchain.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 669 | www.a16z.news (www.a16z.news) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/variants/tech.ts |
| 670 | www.aaii.com (www.aaii.com) | structured — scripts/seed-aaii-sentiment.mjs, scripts/seed-fear-greed.mjs |
| 671 | www.aajtak.in (www.aajtak.in) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 672 | www.aaronsw.com (www.aaronsw.com) | structured — src/config/variants/tech.ts |
| 673 | www.abc.net.au (www.abc.net.au) | feed — src/config/feeds.ts |
| 674 | www.africanews.com (www.africanews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 675 | www.afro.who.int (www.afro.who.int) | structured — scripts/seed-security-advisories.mjs |
| 676 | www.aftenposten.no (www.aftenposten.no) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 677 | www.alarabiya.net (www.alarabiya.net) | feed — src/config/feeds.ts |
| 678 | www.aljazeera.com (www.aljazeera.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 679 | www.aljazeera.net (www.aljazeera.net) | feed — src/config/feeds.ts |
| 680 | www.alphavantage.co (www.alphavantage.co) | structured — scripts/_shared-av.mjs, server/worldmonitor/market/v1/_quote-provider.ts |
| 681 | www.amarujala.com (www.amarujala.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 682 | www.ansa.it (www.ansa.it) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 683 | www.asahi.com (www.asahi.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 684 | www.atlanticcouncil.org (www.atlanticcouncil.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 685 | www.atv.hu (www.atv.hu) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 686 | www.australianmining.com.au (www.australianmining.com.au) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 687 | www.aviationpros.com (www.aviationpros.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 688 | www.aviationweek.com (www.aviationweek.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 689 | www.bild.de (www.bild.de) | feed — src/config/feeds.ts |
| 690 | www.bing.com (www.bing.com) | structured — scripts/seo-indexnow-submit.mjs |
| 691 | www.brasilparalelo.com.br (www.brasilparalelo.com.br) | feed — src/config/feeds.ts |
| 692 | www.cac.gov.cn (www.cac.gov.cn) | structured — scripts/china-policy/adapters.mjs |
| 693 | www.carbonbrief.org (www.carbonbrief.org) | structured — scripts/seed-climate-news.mjs |
| 694 | www.cbc.ca (www.cbc.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 695 | www.cbinsights.com (www.cbinsights.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 696 | www.cbr.ru (www.cbr.ru) | structured — scripts/seed-cbr-rates.mjs |
| 697 | www.cbsnews.com (www.cbsnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 698 | www.channelnewsasia.com (www.channelnewsasia.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 699 | www.channelstv.com (www.channelstv.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 700 | www.chinamoney.com.cn (www.chinamoney.com.cn) | structured — scripts/china-macro/calendar.mjs |
| 701 | www.chosun.com (www.chosun.com) | feed — src/config/feeds.ts |
| 702 | www.cisa.gov (www.cisa.gov) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 703 | www.clarin.com (www.clarin.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 704 | www.climatecentral.org (www.climatecentral.org) | structured — scripts/seed-climate-news.mjs |
| 705 | www.cloudflarestatus.com (www.cloudflarestatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 706 | www.cnbc.com (www.cnbc.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/finance.ts, src/config/variants/tech.ts |
| 707 | www.cnn.gr (www.cnn.gr) | Excluded / candidate — No current fetch observed |
| 708 | www.coindesk.com (www.coindesk.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/finance.ts |
| 709 | www.contractsfinder.service.gov.uk (www.contractsfinder.service.gov.uk) | structured — scripts/seed-global-tenders.mjs |
| 710 | www.corriere.it (www.corriere.it) | feed — src/config/feeds.ts |
| 711 | www.crisisgroup.org (www.crisisgroup.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 712 | www.csis.org (www.csis.org) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 713 | www.dabangasudan.org (www.dabangasudan.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 714 | www.dailygood.org (www.dailygood.org) | feed — src/config/feeds.ts |
| 715 | www.dailysabah.com (www.dailysabah.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 716 | www.darkreading.com (www.darkreading.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 717 | www.dawn.com (www.dawn.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 718 | www.defensenews.com (www.defensenews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 719 | www.defenseone.com (www.defenseone.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 720 | www.digi24.ro (www.digi24.ro) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 721 | www.dn.se (www.dn.se) | feed — src/config/feeds.ts |
| 722 | www.dnevnik.bg (www.dnevnik.bg) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 723 | www.dockerstatus.com (www.dockerstatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 724 | www.dr.dk (www.dr.dk) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 725 | www.ecb.europa.eu (www.ecb.europa.eu) | structured — scripts/seed-economic-calendar.mjs |
| 726 | www.ecdc.europa.eu (www.ecdc.europa.eu) | structured — scripts/seed-security-advisories.mjs |
| 727 | www.eia.gov (www.eia.gov) | feed — src/config/feeds.ts |
| 728 | www.eltiempo.com (www.eltiempo.com) | feed — src/config/feeds.ts |
| 729 | www.eluniverso.com (www.eluniverso.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 730 | www.engadget.com (www.engadget.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 731 | www.ethiopia-insight.com (www.ethiopia-insight.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 732 | www.eu-startups.com (www.eu-startups.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/variants/tech.ts |
| 733 | www.euronews.com (www.euronews.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/main.ts |
| 734 | www.facebook.com (www.facebook.com) | structured — src/services/story-share.ts |
| 735 | www.fao.org (www.fao.org) | feed+structured — scripts/seed-fao-food-price-index.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 736 | www.federalreserve.gov (www.federalreserve.gov) | feed+structured — scripts/seed-economic-calendar.mjs, scripts/seed-regulatory-actions.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, +1 more |
| 737 | www.flightglobal.com (www.flightglobal.com) | structured — scripts/seed-aviation.mjs, server/worldmonitor/aviation/v1/list-aviation-news.ts |
| 738 | www.foreignaffairs.com (www.foreignaffairs.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 739 | www.fpri.org (www.fpri.org) | feed — src/config/feeds.ts |
| 740 | www.france24.com (www.france24.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 741 | www.ft.com (www.ft.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 742 | www.fwdstart.me (www.fwdstart.me) | structured — api/fwdstart.js |
| 743 | www.g4media.ro (www.g4media.ro) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 744 | www.gdacs.org (www.gdacs.org) | structured — scripts/seed-natural-events.mjs |
| 745 | www.gets.govt.nz (www.gets.govt.nz) | structured — scripts/seed-global-tenders.mjs |
| 746 | www.gitex.com (www.gitex.com) | structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts |
| 747 | www.githubstatus.com (www.githubstatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 748 | www.goldseek.com (www.goldseek.com) | feed — src/config/feeds.ts |
| 749 | www.good.is (www.good.is) | feed — src/config/feeds.ts |
| 750 | www.goodgoodgood.co (www.goodgoodgood.co) | feed — src/config/feeds.ts |
| 751 | www.goodnewsnetwork.org (www.goodnewsnetwork.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 752 | www.google.com (www.google.com) | structured — scripts/ais-relay.cjs, src/components/AviationCommandBar.ts, src/components/MapPopup.ts |
| 753 | www.gov.br (www.gov.br) | structured — scripts/seed-fuel-prices.mjs |
| 754 | www.gov.uk (www.gov.uk) | feed+structured — scripts/seed-fuel-prices.mjs, scripts/seed-security-advisories.mjs, src/config/feeds.ts |
| 755 | www.handybulk.com (www.handybulk.com) | structured — scripts/seed-supply-chain-trade.mjs |
| 756 | www.hotnews.ro (www.hotnews.ro) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 757 | www.hurriyet.com.tr (www.hurriyet.com.tr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 758 | www.iaea.org (www.iaea.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 759 | www.iea.org (www.iea.org) | structured — scripts/seed-energy-intelligence.mjs, src/components/EnergyCrisisPanel.ts |
| 760 | www.iefimerida.gr (www.iefimerida.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 761 | www.in.gr (www.in.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 762 | www.index.hr (www.index.hr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 763 | www.infobae.com (www.infobae.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 764 | www.ipolitics.ca (www.ipolitics.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 765 | www.irrawaddy.com (www.irrawaddy.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 766 | www.jeuneafrique.com (www.jeuneafrique.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 767 | www.jodidata.org (api.publisher.jodidata.org) | structured — scripts/seed-jodi-gas.mjs |
| 768 | www.jodidata.org (www.jodidata.org) | structured — scripts/seed-jodi-gas.mjs, scripts/seed-jodi-oil.mjs |
| 769 | www.jpost.com (www.jpost.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 770 | www.jutarnji.hr (www.jutarnji.hr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 771 | www.lapresse.ca (www.lapresse.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 772 | www.lasillavacia.com (www.lasillavacia.com) | feed — src/config/feeds.ts |
| 773 | www.ledevoir.com (www.ledevoir.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 774 | www.lemonde.fr (www.lemonde.fr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 775 | www.lennysnewsletter.com (www.lennysnewsletter.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 776 | www.liberal.gr (www.liberal.gr) | Excluded / candidate — No current fetch observed |
| 777 | www.lighthousereports.com (www.lighthousereports.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 778 | www.linkedin.com (www.linkedin.com) | structured — server/worldmonitor/leads/v1/register-interest.ts, src/services/story-share.ts |
| 779 | www.livescience.com (www.livescience.com) | feed — src/config/feeds.ts |
| 780 | www.lrt.lt (www.lrt.lt) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 781 | www.mbie.govt.nz (www.mbie.govt.nz) | structured — scripts/seed-fuel-prices.mjs |
| 782 | www.miit.gov.cn (www.miit.gov.cn) | structured — scripts/china-policy/adapters.mjs |
| 783 | www.militarytimes.com (www.militarytimes.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 784 | www.mining-technology.com (www.mining-technology.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 785 | www.mining.com (www.mining.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 786 | www.mnd.gov.tw (www.mnd.gov.tw) | structured — scripts/cross-strait-activity/adapters.mjs, src/components/cross-strait-activity-summary.ts |
| 787 | www.mod.go.jp (www.mod.go.jp) | structured — scripts/cross-strait-activity/adapters.mjs, src/components/cross-strait-activity-summary.ts |
| 788 | www.myjoyonline.com (www.myjoyonline.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 789 | www.naftemporiki.gr (www.naftemporiki.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 790 | www.nature.com (www.nature.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 791 | www.ncei.noaa.gov (www.ncei.noaa.gov) | structured — scripts/seed-climate-ocean-ice.mjs |
| 792 | www.netlifystatus.com (www.netlifystatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 793 | www.newscientist.com (www.newscientist.com) | feed — src/config/feeds.ts |
| 794 | www.newyorkfed.org (www.newyorkfed.org) | structured — scripts/ais-relay.cjs |
| 795 | www.nfx.com (www.nfx.com) | structured — src/config/variants/tech.ts |
| 796 | www.northernminer.com (www.northernminer.com) | feed — src/config/feeds.ts |
| 797 | www.notion-status.com (www.notion-status.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 798 | www.nrc.nl (www.nrc.nl) | feed — src/config/feeds.ts |
| 799 | www.nrk.no (www.nrk.no) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 800 | www.occrp.org (www.occrp.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 801 | www.omanobserver.om (www.omanobserver.om) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 802 | www.opec.org (www.opec.org) | structured — scripts/seed-energy-intelligence.mjs |
| 803 | www.optimistdaily.com (www.optimistdaily.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 804 | www.oref.org.il (www.oref.org.il) | structured — scripts/ais-relay.cjs |
| 805 | www.oryxspioenkop.com (www.oryxspioenkop.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 806 | www.pbc.gov.cn (www.pbc.gov.cn) | structured — scripts/china-macro/source-contracts.mjs |
| 807 | www.pbs.org (www.pbs.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 808 | www.pizzint.watch (www.pizzint.watch) | structured — scripts/ais-relay.cjs, scripts/seed-conflict-intel.mjs |
| 809 | www.polsatnews.pl (www.polsatnews.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 810 | www.positive.news (www.positive.news) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 811 | www.premiumtimesng.com (www.premiumtimesng.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 812 | www.primicias.ec (www.primicias.ec) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 813 | www.producthunt.com (www.producthunt.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 814 | www.radiookapi.net (www.radiookapi.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 815 | www.radiotamazuj.org (www.radiotamazuj.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 816 | www.rand.org (www.rand.org) | feed — src/config/feeds.ts |
| 817 | www.ransomware.live (www.ransomware.live) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 818 | www.rappler.com (www.rappler.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 819 | www.reddit.com (www.reddit.com) | structured — scripts/ais-relay.cjs |
| 820 | www.replicatestatus.com (www.replicatestatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 821 | www.repubblica.it (www.repubblica.it) | feed — src/config/feeds.ts |
| 822 | www.rfi.fr (www.rfi.fr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 823 | www.rigzone.com (www.rigzone.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 824 | www.rp.pl (www.rp.pl) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 825 | www.rt.com (www.rt.com) | feed — src/config/feeds.ts |
| 826 | www.saastr.com (www.saastr.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 827 | www.safe.gov.cn (www.safe.gov.cn) | structured — scripts/china-macro/source-contracts.mjs |
| 828 | www.samr.gov.cn (www.samr.gov.cn) | structured — scripts/china-policy/adapters.mjs |
| 829 | www.schneier.com (www.schneier.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 830 | www.sciencedaily.com (www.sciencedaily.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 831 | www.scmp.com (www.scmp.com) | feed — src/config/feeds.ts |
| 832 | www.semianalysis.com (www.semianalysis.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/variants/tech.ts |
| 833 | www.sequoiacap.com (www.sequoiacap.com) | structured — src/config/variants/tech.ts |
| 834 | www.seznamzpravy.cz (www.seznamzpravy.cz) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 835 | www.shareable.net (www.shareable.net) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 836 | www.silverseek.com (www.silverseek.com) | feed — src/config/feeds.ts |
| 837 | www.smartraveller.gov.au (www.smartraveller.gov.au) | structured — scripts/seed-security-advisories.mjs |
| 838 | www.spdrgoldshares.com (www.spdrgoldshares.com) | structured — scripts/seed-gold-etf-flows.mjs |
| 839 | www.spiegel.de (www.spiegel.de) | feed — src/config/feeds.ts |
| 840 | www.statcan.gc.ca (www.statcan.gc.ca) | structured — server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 841 | www.stats.gov.cn (www.stats.gov.cn) | structured — scripts/china-macro/calendar.mjs, scripts/china-macro/source-contracts.mjs |
| 842 | www.stimson.org (www.stimson.org) | feed — src/config/feeds.ts |
| 843 | www.sunnyskyz.com (www.sunnyskyz.com) | feed — src/config/feeds.ts |
| 844 | www.svd.se (www.svd.se) | feed — src/config/feeds.ts |
| 845 | www.svt.se (www.svt.se) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 846 | www.szse.cn (www.szse.cn) | structured — scripts/china-corporate-disclosures/adapters.mjs, scripts/china-stock-connect/adapters.mjs |
| 847 | www.tagesschau.de (www.tagesschau.de) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 848 | www.tanea.gr (www.tanea.gr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 849 | www.techinasia.com (www.techinasia.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/variants/tech.ts |
| 850 | www.techmeme.com (www.techmeme.com) | feed+structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts, src/config/feeds.ts, +1 more |
| 851 | www.technologyreview.com (www.technologyreview.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 852 | www.techstars.com (www.techstars.com) | structured — src/config/variants/tech.ts |
| 853 | www.theglobeandmail.com (www.theglobeandmail.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 854 | www.theguardian.com (www.theguardian.com) | feed+structured — scripts/seed-climate-news.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 855 | www.thehindu.com (www.thehindu.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 856 | www.themoscowtimes.com (www.themoscowtimes.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 857 | www.thenationalnews.com (www.thenationalnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts |
| 858 | www.thereporterethiopia.com (www.thereporterethiopia.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 859 | www.thestar.com (www.thestar.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 860 | www.theverge.com (www.theverge.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 861 | www.thisdaylive.com (www.thisdaylive.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 862 | www.token2049.com (www.token2049.com) | structured — scripts/ais-relay.cjs, scripts/seed-research.mjs, server/worldmonitor/research/v1/list-tech-events.ts |
| 863 | www.tomshardware.com (www.tomshardware.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 864 | www.tvanouvelles.ca (www.tvanouvelles.ca) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 865 | www.twz.com (www.twz.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 866 | www.unep.org (www.unep.org) | structured — scripts/seed-climate-news.mjs |
| 867 | www.upworthy.com (www.upworthy.com) | feed — src/config/feeds.ts |
| 868 | www.vanguardngr.com (www.vanguardngr.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 869 | www.vercel-status.com (www.vercel-status.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 870 | www.war.gov (www.war.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 871 | www.weather.gov.hk (www.weather.gov.hk) | structured — scripts/natural/western-pacific-cyclones.mjs |
| 872 | www.whitehouse.gov (www.whitehouse.gov) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 873 | www.who.int (www.who.int) | feed+structured — scripts/seed-disease-outbreaks.mjs, scripts/seed-security-advisories.mjs, server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 874 | www.windy.com (www.windy.com) | structured — api/mcp/skill-extension/generated.ts, server/worldmonitor/webcam/v1/get-webcam-image.ts, src/services/webcams/index.ts |
| 875 | www.winnipegfreepress.com (www.winnipegfreepress.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 876 | www.worldbank.org (www.worldbank.org) | structured — server/worldmonitor/resilience/v1/_indicator-source-policy.ts |
| 877 | www.ycombinator.com (www.ycombinator.com) | feed+structured — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts, src/config/variants/tech.ts |
| 878 | www.yesmagazine.org (www.yesmagazine.org) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 879 | www.ynetnews.com (www.ynetnews.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 880 | www.yonhapnewstv.co.kr (www.yonhapnewstv.co.kr) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 881 | www.youtube.com (www.youtube.com) | feed+structured — api/youtube/embed.js, api/youtube/live.js, scripts/ais-relay.cjs, scripts/check-live-video-sources.mjs, +3 more |
| 882 | www.zdg.md (www.zdg.md) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 883 | www.zdnet.com (www.zdnet.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 884 | www.zoomstatus.com (www.zoomstatus.com) | operational-status — server/worldmonitor/infrastructure/v1/list-service-statuses.ts |
| 885 | wwwnc.cdc.gov (wwwnc.cdc.gov) | structured — scripts/seed-security-advisories.mjs |
| 886 | X API (api.x.com) | structured — scripts/lib/company-monitoring-x-provider.mjs, scripts/lib/x-news-accounts.cjs, scripts/lib/x-post-budget.cjs, scripts/verify-x-accounts.mjs |
| 887 | x.com (x.com) | structured — server/worldmonitor/leads/v1/register-interest.ts |
| 888 | xinhuanet.com (xinhuanet.com) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 889 | yandex.com (yandex.com) | structured — scripts/seo-indexnow-submit.mjs |
| 890 | Yemen Online (yemenonline.info) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 891 | yle.fi (yle.fi) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 892 | your-app.convex.site (your-app.convex.site) | structured — scripts/import-bounced-emails.mjs |
| 893 | yourstory.com (yourstory.com) | feed+structured — src/config/feeds.ts, src/config/variants/tech.ts |
| 894 | zdf-hls-19.akamaized.net (zdf-hls-19.akamaized.net) | feed — src/services/live-channels.ts |
| 895 | zerkalo.io (zerkalo.io) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
| 896 | zn.ua (zn.ua) | feed — server/worldmonitor/news/v1/_feeds.ts, src/config/feeds.ts |
