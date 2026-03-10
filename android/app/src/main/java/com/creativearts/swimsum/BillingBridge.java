package com.creativearts.swimsum;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "BillingBridge")
public class BillingBridge extends Plugin implements PurchasesUpdatedListener {

    private static final String REMOVE_ADS_PRODUCT_ID = "remove_ads_yearly";

    private BillingClient billingClient;
    private boolean billingReady = false;
    private final List<PluginCall> pendingCheckCalls = new ArrayList<>();
    // We keep at most one active purchase call at a time – the in‑progress flow.
    private PluginCall activePurchaseCall = null;

    @Override
    public void load() {
        super.load();
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                billingReady = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                if (billingReady) {
                    for (PluginCall c : new ArrayList<>(pendingCheckCalls)) {
                        runCheckEntitlement(c);
                    }
                    pendingCheckCalls.clear();
                } else {
                    String msg = "Billing setup failed: " + billingResult.getDebugMessage();
                    for (PluginCall c : pendingCheckCalls) {
                        c.reject(msg);
                    }
                    pendingCheckCalls.clear();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
            }
        });
    }

    @PluginMethod
    public void checkRemoveAdsEntitlement(PluginCall call) {
        if (billingClient == null) {
            call.reject("BillingClient not initialised");
            return;
        }
        if (!billingReady) {
            pendingCheckCalls.add(call);
            return;
        }
        runCheckEntitlement(call);
    }

    private void runCheckEntitlement(PluginCall call) {

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchasesList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                return;
            }
            boolean hasEntitlement = false;
            if (purchasesList != null) {
                for (Purchase p : purchasesList) {
                    if (p.getProducts().contains(REMOVE_ADS_PRODUCT_ID)
                            && p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                        hasEntitlement = true;
                        break;
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("hasRemoveAds", hasEntitlement);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void purchaseRemoveAds(PluginCall call) {
        if (billingClient == null) {
            call.reject("BillingClient not initialised");
            return;
        }
        if (!billingReady) {
            call.reject("Billing service not ready yet. Please try again in a moment.");
            return;
        }

        // Only allow one in‑flight purchase at a time to keep state simple.
        activePurchaseCall = call;
        runPurchaseFlow(call);
    }

    private void runPurchaseFlow(PluginCall call) {

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(REMOVE_ADS_PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || productDetailsList == null
                    || productDetailsList.isEmpty()) {
                call.reject("Unable to load product details: " + billingResult.getDebugMessage());
                if (call == activePurchaseCall) {
                    activePurchaseCall = null;
                }
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);

            List<ProductDetails.SubscriptionOfferDetails> offerDetailsList =
                    productDetails.getSubscriptionOfferDetails();
            if (offerDetailsList == null || offerDetailsList.isEmpty()) {
                call.reject("No subscription offers configured for remove_ads_yearly.");
                if (call == activePurchaseCall) {
                    activePurchaseCall = null;
                }
                return;
            }

            String offerToken = offerDetailsList.get(0).getOfferToken();

            List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList =
                    Collections.singletonList(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
                                    .setOfferToken(offerToken)
                                    .build()
                    );

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productDetailsParamsList)
                    .build();

            Activity activity = getActivity();
            if (activity == null) {
                call.reject("No active Activity for billing flow");
                if (call == activePurchaseCall) {
                    activePurchaseCall = null;
                }
                return;
            }

            int responseCode = billingClient.launchBillingFlow(activity, flowParams).getResponseCode();
            if (responseCode != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to launch billing flow: code " + responseCode);
                if (call == activePurchaseCall) {
                    activePurchaseCall = null;
                }
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = activePurchaseCall;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getProducts().contains(REMOVE_ADS_PRODUCT_ID)
                        && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {

                    if (!purchase.isAcknowledged()) {
                        AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                                .setPurchaseToken(purchase.getPurchaseToken())
                                .build();
                        billingClient.acknowledgePurchase(ackParams, ackResult -> {
                            // No extra handling needed on acknowledgement completion.
                        });
                    }

                    JSObject ret = new JSObject();
                    ret.put("hasRemoveAds", true);
                    if (call != null) {
                        call.resolve(ret);
                    }
                    activePurchaseCall = null;
                    return;
                }
            }
            if (call != null) {
                call.reject("Purchase did not complete for remove_ads_yearly");
            }
            activePurchaseCall = null;
            return;
        }

        String message;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            message = "User cancelled purchase";
        } else {
            message = "Purchase failed: " + billingResult.getDebugMessage();
        }

        if (call != null) {
            call.reject(message);
        }
        activePurchaseCall = null;
    }
}

