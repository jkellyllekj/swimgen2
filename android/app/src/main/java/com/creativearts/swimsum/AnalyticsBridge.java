package com.creativearts.swimsum;

import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONException;

import java.util.Iterator;

@CapacitorPlugin(name = "AnalyticsBridge")
public class AnalyticsBridge extends Plugin {

    private FirebaseAnalytics analytics;

    @Override
    public void load() {
        super.load();
        analytics = FirebaseAnalytics.getInstance(getContext());
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        if (analytics == null) {
            call.reject("FirebaseAnalytics not initialised");
            return;
        }
        String userId = call.getString("userId");
        if (userId == null || userId.trim().isEmpty()) {
            call.reject("userId is required");
            return;
        }
        analytics.setUserId(userId.trim());
        call.resolve();
    }

    @PluginMethod
    public void setUserProperty(PluginCall call) {
        if (analytics == null) {
            call.reject("FirebaseAnalytics not initialised");
            return;
        }
        String name = call.getString("name");
        String value = call.getString("value");
        if (name == null || name.trim().isEmpty()) {
            call.reject("name is required");
            return;
        }
        // Firebase will ignore null value, which effectively clears the property.
        analytics.setUserProperty(name.trim(), value != null ? value : null);
        call.resolve();
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        if (analytics == null) {
            call.reject("FirebaseAnalytics not initialised");
            return;
        }
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) {
            call.reject("name is required");
            return;
        }

        Bundle bundle = new Bundle();
        JSObject data = call.getData();
        if (data != null) {
            try {
                Iterator<String> keys = data.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    if ("name".equals(key)) continue;
                    Object value = data.get(key);
                    if (value == null) {
                        continue;
                    }
                    // For simplicity and safety, send all parameters as strings.
                    bundle.putString(key, String.valueOf(value));
                }
            } catch (JSONException e) {
                // If we can't parse params, fall back to logging without extras.
            }
        }

        analytics.logEvent(name.trim(), bundle);
        call.resolve();
    }
}

