# Play Console: Declarations & Submitting for Review

Use this checklist before and when submitting SwimSum for review (closed testing or production).

---

## 0. Where to open the declaration overview (for your screenshot)

1. Go to **Google Play Console:** [https://play.google.com/console](https://play.google.com/console)
2. Select your app **SwimSum**.
3. In the left sidebar, open **Policy** → **App content** (or in some layouts: **Release** → **App content**).
4. That **App content** page is the declarations overview: it lists Privacy policy, Ads, Data safety, App access, Content rating, Target audience, etc. Take your screenshot there.

Direct link pattern (replace with your app ID if needed):  
`https://play.google.com/console/developers/[YOUR_DEVELOPER_ID]/app/[YOUR_APP_ID]/app-content`

---

## 1. Declarations to double-check

### Data safety (App content → Data safety)
- **Data types collected:** Declare what the app actually collects.
  - **App activity / usage:** Yes – for **Analytics / product improvement**. Not required for core app functionality. Not shared with third parties (Firebase/Google only).
  - **Device or other IDs:** Yes if you use AdMob (advertising ID) and/or Firebase (installation ID, etc.). Same purpose: **Analytics / advertising**. Not required for core functionality. Not shared beyond Google.
  - **User IDs:** If you set Firebase Analytics `user_id` to the Firebase Auth UID, declare **Identifiers** (e.g. “User ID”) for **Analytics / product improvement**, optional for functionality, not shared beyond Google.
- **Not collected:** Do **not** claim you collect email/name in analytics if you don’t store them as analytics properties (you don’t).
- **Privacy policy URL:** Use **https://swimsum.com/privacy.html** everywhere (Store listing, Data safety, app links). The short URL https://swimsum.com/privacy only works after deploying with the firebase.json rewrite; .html always works.

### App content – other sections
- **Ads:** If the app shows ads (AdMob), complete the “Ads” declaration (app contains ads; use Google’s ad SDK).
- **App access:** If you have login (Google/email), say how testers or users get access (e.g. “All functionality available after sign-in; no special credentials”).
- **Content rating:** Questionnaire must be completed (age group, violence, etc.) and rating obtained.
- **Target audience:** Set the age group(s) you target.
- **News app / COVID:** Only if applicable; for SwimSum usually “No”.

### Permissions
- In **App content** or **Policy** (depending on console layout), confirm any **sensitive permissions** are declared and justified (e.g. INTERNET for ads/analytics, billing if you use in-app purchases). No undeclared permissions.

### Account deletion (if required in your region)
- **Account deletion:** If you offer account creation (Google/email), you must provide a way to request account/data deletion (e.g. web form or email). Declare the URL in the Data safety / App content section and use the same URL in your app and store listing.

---

## 2. Submitting for review – what you’ll do

### Closed testing
1. **Release:** Create or open the **Closed testing** release.
2. **App bundle:** Upload the signed AAB (e.g. from Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle). Attach it to this release.
3. **Release name / notes:** Add a short name (e.g. “1.0.16 – Premium Remove Ads fix”) and optional release notes for testers.
4. **Review and roll out:** Click **Save** then **Review release** (or **Start rollout to Closed testing**). Google will process the bundle; once approved, the release is live for your testers.
5. **Testers:** Ensure your tester list or email list is set so you (and others) can install from the Play Store link.

You usually don’t fill long “forms” for closed testing beyond the release details above. If the console shows any **draft** or **incomplete** items (e.g. Data safety, Content rating, Target audience), complete those first; they can block rollout.

### Production (when you go public)
1. **Production release:** Create a **Production** release and attach the same (or a new) signed AAB.
2. **Store listing:** Complete **Main store listing** (short/long description, screenshots, icon, feature graphic if required).
3. **Content rating:** Complete the questionnaire and upload the certificate if required.
4. **Target audience:** Set age groups.
5. **Data safety:** Must be complete and accurate (see §1).
6. **Ads declaration:** If the app shows ads, declare it.
7. **Policy and programs:** Accept the relevant policies (Developer Program Policies, etc.). Resolve any policy or declaration warnings.
8. **Submit:** Use **Send for review** (or equivalent) for the production release. Google will review; approval can take from a few hours to several days.

---

## 3. Quick reference – analytics and billing

- **Analytics:** Firebase Analytics via `AnalyticsBridge`; events (e.g. `app_open`, `generate_workout`, Remove Ads funnel) and optional `user_id` / `subscription_status`. No names or emails stored as analytics properties.
- **Billing:** Google Play Billing for `remove_ads_yearly` subscription only; no other in-app products.
- **Ads:** AdMob (banner + optional interstitial); test or production IDs as configured.

Declarations should match this: usage/identifiers for analytics and ads, not shared beyond Google, optional for functionality; billing only for the declared subscription.

---

---

## 4. Switching from test ads to live (production) ads

You do **not** need to publish the app first. Production ad units work in closed testing and in production; you just need to build the app with production AdMob IDs.

- **Current behaviour:** The app is built with `TEST_ADS` defaulting to `true`, so it uses Google’s **test** ad unit IDs. That’s why you only see test ads.
- **To use your real ads:** Build with production IDs, then sync and ship that build (closed testing or production).

**Steps:**

1. **Build with production ads**
   - From the project root run:
     - **Production build (real ads):**  
       `npm run build:prod`  
       then `npx cap sync android`
   - Or in one go: `npm run cap:build:prod`
2. **Build the AAB** in Android Studio (Generate Signed Bundle / APK) as usual and upload to Play (closed testing or production).

The same app can stay in closed testing with production ad IDs; you don’t have to go live first. In closed testing, real ads may still show to testers (or fill may be limited until the app is approved). When you later publish to production, the same build is already using your real ad units.

**What changes in the build:**  
`build:prod` sets `TEST_ADS=false` so `index.js` uses `BANNER_PROD_ID` and `INTERSTITIAL_PROD_ID` (your AdMob units `ca-app-pub-8975918152073391/...`) instead of the test IDs. Your AdMob app ID in `android/app/src/main/res/values/strings.xml` is already the production one (`ca-app-pub-8975918152073391~1783741253`).

---

*Update this file if Play Console structure or requirements change.*
