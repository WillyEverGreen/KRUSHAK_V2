# Krushak V2 Product And Engineering Research

Date: 2026-04-22
Scope: Full research for a web application serving both farmers and household plant users, with zero mock/dummy runtime data.

## 1) Product Direction

Build one web platform with two experiences from the same codebase:

- Farmer mode: field crops, mandi decisions, village advisories, disease risk, irrigation planning.
- Home plant mode: indoor/outdoor pots, watering schedules, pet safety, growth tracking.

Core thesis:

- People do not need "more features"; they need "daily confidence".
- The platform should answer, each day: what to do now, why, and what happens if delayed.

North-star outcomes:

- Reduce plant/crop loss.
- Improve action timeliness (watering, diagnosis, pest response).
- Increase user retention through reliable, location-aware guidance.

## 2) Primary Users And Jobs-To-Be-Done

### A) Farmer users

Jobs:

- Detect disease/pest early.
- Decide irrigation and spray timing from weather + crop stage.
- Track reminders across multiple plots/crops.
- See market rates and choose where/when to sell.

Pain points:

- Generic advice not suited to local weather.
- Delayed action due to missing reminders.
- Inconsistent source trust for prices/news.

### B) Household plant users

Jobs:

- Keep plants alive with species-appropriate routines.
- Identify unknown plants and diagnose leaf issues.
- Avoid overwatering, under-lighting, and pet-toxic choices.

Pain points:

- Hard to know exact watering frequency by season.
- Conflicting internet advice.
- No single dashboard for multiple pots/plants.

## 3) What You Should Put In The Web Application (Recommended Scope)

### Tier 1: Must-have (launch)

1. Account + profile + location
- User type: farmer / home grower / hybrid.
- Village/city, district/state, language, unit preferences.

2. Plant/Crop inventory
- Farmers: fields, plots, crop, sowing date, stage.
- Home users: plant species, pot size, indoor/outdoor, light level.

3. Dynamic daily care feed
- "Today" card with top 3 actions generated from:
	- weather forecast,
	- plant/crop stage,
	- pending reminders,
	- recent diagnosis risk.

4. Smart reminders
- Recurring and condition-based reminders (example: skip watering if rainfall probability is high).

5. Diagnose flow (image + symptoms)
- Upload image, receive ranked possible issues with confidence and next actions.
- Save diagnosis history with images and notes.

6. Care guides from live species data
- Species-specific water, sunlight, soil, pruning, pests, toxicity.

7. Weather intelligence
- Current + 3-7 day weather and irrigation-relevant metrics (rain, ET0, humidity, wind).

8. Farmer market module
- Mandi prices by crop/state/market with freshness timestamp.

9. News/advisory module
- Global agri and local region advisories with source attribution.

10. Chat assistant (grounded)
- Answers grounded in user profile, plant history, and trusted knowledge sources.

### Tier 2: Should-have (first scaling milestone)

1. Regional language + voice notes + text-to-speech summaries.
2. Community reports ("aphid seen in my area") with moderation.
3. Yield diary for farmers, growth diary for home users.
4. Pet-safe and child-safe alerts for houseplants.
5. "Explain confidence" UI for diagnosis and recommendations.

### Tier 3: Later (advanced)

1. Satellite/NDVI health trends for farms.
2. IoT sensor sync (soil moisture, temp, EC).
3. Marketplace connections (input suppliers, advisory experts).
4. Hyperlocal model fine-tuning per district/season.

## 4) What You Should Remove Or Rework Immediately

Your current codebase has placeholders that are fine for a prototype but must be removed for production dynamic behavior.

### Remove hardcoded server data

- server/src/controllers/homeController.js
	- static greeting/location/weather/instructions/risk meters/village alert.

- server/src/controllers/farmController.js
	- static cropCards and livestockTips arrays.
	- demo reminders fallback when user has no reminders.

- server/src/controllers/diagnoseController.js
	- commonDiseases static array.

- server/src/controllers/marketController.js
	- samplePrices static array.

- server/src/controllers/newsController.js
	- static global/local news arrays.

- server/src/controllers/chatController.js
	- static suggestions and rule-based response-only approach.

### Remove hardcoded client fallback assumptions

- client/src/screens/HomeScreen.jsx
	- fallbackData object should be removed for production and replaced with proper loading/error states.

- client/src/screens/CareGuidesScreen.jsx
	- fallbackCareGuide static object should come from species/care API.

- client/src/screens/MarketScreen.jsx
	- static states and commodities arrays should come from dynamic metadata endpoint.

- client/src/screens/NewsScreen.jsx
	- fixed local location value should come from user profile or geolocation.

### Remove placeholder UX behavior

- window.alert placeholders in Diagnose and Profile screens should be replaced with real flows.
- local-only reminder mutations in MyFarm screen should be replaced by API writes.
- default user placeholders like "Village Name" and "District" should be replaced with onboarding-required profile fields.

## 5) Dynamic Data Architecture (No Mock/Dummy Runtime Data)

## 5.1 Design principle

Never let the frontend call third-party providers directly. Always route through your backend using provider adapters.

Why:

- hide API keys,
- normalize data from multiple providers,
- enforce quality/freshness rules,
- support provider failover.

## 5.2 Data source strategy (researched options)

### Weather and agro-climate

- Open-Meteo:
	- strong free path for non-commercial/limited usage,
	- extensive variables including precipitation, soil moisture, ET0, weather codes,
	- optional API key for commercial reserved resources.

- OpenWeather:
	- broad commercial-grade coverage (current/forecast/history, geocoding, alerts).

Recommendation:

- Start with Open-Meteo for development and early pilots.
- Keep OpenWeather as enterprise/backup option based on SLA and pricing.

### Plant knowledge and identification

- Pl@ntNet API:
	- dedicated identification service at scale,
	- references API docs/pricing/getting-started.

- Perenual Plant API:
	- species list/details/care guide/pest-disease endpoints,
	- requires API key and has pricing tiers.

- GBIF API:
	- strong biodiversity/species metadata API,
	- RESTful JSON, mostly no auth for read operations, rate limit aware.

Recommendation:

- Use Pl@ntNet or Perenual for practical identification/care UX.
- Use GBIF for enrichment, taxonomy normalization, and scientific naming consistency.

Important note:

- OpenFarm is archived/shutdown (2025), so do not use it as a production dependency.

### Market and public datasets (India)

- data.gov.in has large API catalog and sector datasets, including market-related datasets depending on publisher.

Recommendation:

- Build a source adapter for available market APIs from official portals.
- Maintain a "source quality registry" by dataset with freshness tracking and fallback hierarchy.

### News

- NewsAPI provides REST search/top headlines/sources with API keys.

Recommendation:

- Use a blended pipeline:
	- national/global via news API,
	- local advisories via official agriculture department/public feeds.

## 5.3 Backend architecture blueprint

### A) Provider adapter layer

Create modules like:

- providers/weather/openMeteoAdapter.js
- providers/weather/openWeatherAdapter.js
- providers/plants/plantNetAdapter.js
- providers/plants/perenualAdapter.js
- providers/market/govDataAdapter.js
- providers/news/newsApiAdapter.js

Each adapter returns a normalized schema.

### B) Domain services

- services/weatherService.js
- services/plantKnowledgeService.js
- services/diagnosisService.js
- services/marketService.js
- services/newsService.js
- services/recommendationService.js

These services combine user context + provider data + business logic.

### C) Persistence and freshness

Store raw + normalized snapshots:

- weather_snapshots
- market_price_snapshots
- news_articles
- species_cache
- diagnosis_results

Each record should include:

- source,
- fetchedAt,
- validUntil,
- confidence,
- checksum/hash.

### D) Background jobs

Use queue/scheduler (BullMQ/Agenda/Cron):

- refresh weather hourly,
- refresh market data every 30-60 minutes,
- refresh news every 30-120 minutes,
- precompute morning action feed at 5 AM local time.

### E) API gateway behavior

For each response, include metadata:

- generatedAt,
- dataAgeSeconds,
- stale(boolean),
- sources[].

This keeps UI honest and trustworthy.

## 5.4 Frontend dynamic behavior rules

1. No hardcoded fallback business data.
2. Loading skeletons for first load.
3. Last-known-good cache only for offline continuity, clearly marked as "last updated".
4. Distinguish states:
	 - loading,
	 - success-fresh,
	 - success-stale,
	 - empty,
	 - error.
5. Query invalidation after writes (add reminder, save diagnosis, etc.).

## 5.5 Suggested data model additions

Beyond current User/Reminder/ScanRecord, add:

- PlantProfile
	- userId, mode(home/farm), speciesId, nickname, stage, plantedAt, location, potOrPlot metadata.

- CarePlan
	- plantProfileId, wateringFrequency, sunlightTarget, fertilizerSchedule, generatedFrom, validUntil.

- Task
	- userId, plantProfileId, type, dueAt, recurrence, conditionRules, status.

- WeatherSnapshot
	- locationKey, forecast payload, generatedAt, validUntil, provider.

- MarketPriceSnapshot
	- commodity, market, district, state, min/modal/max, observedAt, provider.

- NewsItem
	- title, summary, url, source, regionTags, publishedAt, fetchedAt.

- ChatSession and ChatMessage
	- grounded context references and safety flags.

- UserPreference
	- language, notification channels, risk appetite, crop focus.

## 6) Product Logic To Make It Truly Useful

### Daily Action Engine

Scoring formula (example):

Priority score = urgency + risk + weather impact + user goal weight.

Where each component is normalized to 0-100 and weighted per user type.

For home users:

- higher weight on watering/light/plant-toxicity.

For farmers:

- higher weight on pest spread risk, irrigation timing, market timing.

### Diagnosis confidence policy

- If confidence < threshold (for example 0.65), show "possible causes" and request another image angle.
- If confidence >= threshold, show primary diagnosis with treatment options.
- Always show source/model confidence and escalation option (expert consult).

### Recommendation safety policy

- Label advice by category: informational vs actionable.
- For actionable chemistry recommendations, provide local regulation disclaimer and alternatives.

## 7) KPI Framework (What Success Looks Like)

Acquisition and activation:

- Day-1 activation rate = users who add at least one plant/crop.

Engagement:

- WAU/MAU,
- average reminders completed per week,
- weekly diagnosis usage.

Outcome KPIs:

- reduced reported plant loss rate,
- improved adherence to care tasks,
- better sale timing confidence for farmers.

System quality KPIs:

- API success rate,
- median response time,
- percentage of stale responses,
- external provider failure recovery time.

## 8) Security, Privacy, And Trust

Must implement:

- Encrypt sensitive user data at rest and in transit.
- Role-based access for admin functions.
- Signed URLs or secure media storage for uploaded plant images.
- Consent for location usage and clear data retention policy.
- Rate limiting, audit logs, and abuse monitoring for chat endpoints.

## 9) Rollout Plan (Practical Phases)

### Phase 0 (1-2 weeks): Foundation cleanup

- Remove all static business data from controllers/screens.
- Add strict API response schemas and metadata fields.
- Implement proper empty/loading/error/stale UI states.

### Phase 1 (2-4 weeks): Core dynamic data

- Integrate weather provider.
- Integrate plant species + care provider.
- Persist dynamic data snapshots.
- Move reminders to full server-backed CRUD in UI.

### Phase 2 (3-5 weeks): Diagnosis + recommendations

- Integrate image diagnosis provider and confidence pipeline.
- Launch dynamic daily action engine.
- Add recommendation explainability card.

### Phase 3 (2-4 weeks): Farmer intelligence

- Integrate market prices + source reliability scoring.
- Integrate local advisories/news with source labels.

### Phase 4 (2-3 weeks): Scale and retention

- Notifications, localization, performance tuning.
- Add analytics dashboards and A/B experiments.

## 10) Concrete Implementation Checklist For This Repo

1. Replace static controllers with service-driven dynamic providers:
- homeController
- farmController
- diagnoseController
- marketController
- newsController
- chatController

2. Replace frontend fallback/static arrays and placeholder alerts:
- HomeScreen fallbackData
- CareGuides fallbackCareGuide
- MarketScreen static filter arrays
- NewsScreen fixed location
- Diagnose/Profile placeholder alerts
- MyFarm local-only reminder updates

3. Add provider configuration in environment schema:
- WEATHER_PROVIDER
- WEATHER_API_KEY
- PLANT_PROVIDER
- PLANT_API_KEY
- MARKET_PROVIDER
- MARKET_API_KEY
- NEWS_API_KEY

4. Add ingestion jobs + freshness metadata to responses.

5. Add source attribution UI everywhere data influences decisions.

## 11) Risks And Mitigation

Risk: External API downtime
- Mitigation: provider abstraction + secondary provider + stale cache + outage banners.

Risk: Inconsistent data quality across sources
- Mitigation: confidence scoring, source ranking, and schema validation.

Risk: Overly generic recommendations
- Mitigation: stricter profile capture (crop type, stage, local weather, plant context).

Risk: User trust loss due to wrong diagnosis
- Mitigation: uncertainty handling, second-image prompts, and explicit confidence levels.

## 12) Final Recommendation

Do not add many new screens immediately.

First, convert existing screens into reliable dynamic modules with source-aware data and trustworthy state handling. Once that foundation is stable, then add advanced intelligence (satellite, sensors, marketplace expansion).

This gives you a production-grade web application that is useful for both farmers and household plant users without relying on mock or dummy runtime data.
