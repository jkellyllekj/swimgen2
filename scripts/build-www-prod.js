// Build with production AdMob IDs (real ads). Sets TEST_ADS=false so the
// built app uses BANNER_PROD_ID and INTERSTITIAL_PROD_ID instead of test IDs.
process.env.TEST_ADS = 'false';
require('./build-www.js');
