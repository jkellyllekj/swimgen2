package com.creativearts.swimsum;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;

@CapacitorPlugin(name = "AuthBridge")
public class AuthBridge extends Plugin {

    private FirebaseAuth firebaseAuth;
    private GoogleSignInClient googleClient;

    @Override
    public void load() {
        super.load();
        firebaseAuth = FirebaseAuth.getInstance();

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getContext().getString(R.string.default_web_client_id))
                .requestEmail()
                .build();

        googleClient = GoogleSignIn.getClient(getContext(), gso);
    }

    @PluginMethod
    public void getCurrentUser(PluginCall call) {
        JSObject ret = new JSObject();
        FirebaseUser user = firebaseAuth.getCurrentUser();
        if (user != null) {
            JSObject u = new JSObject();
            u.put("uid", user.getUid());
            u.put("email", user.getEmail());
            u.put("displayName", user.getDisplayName());
            u.put("emailVerified", user.isEmailVerified());
            ret.put("user", u);
        } else {
            ret.put("user", null);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        firebaseAuth.signOut();
        googleClient.signOut();
        call.resolve();
    }

    @PluginMethod
    public void signInWithGoogle(PluginCall call) {
        Intent signInIntent = googleClient.getSignInIntent();
        startActivityForResult(call, signInIntent, "handleGoogleSignIn");
    }

    @ActivityCallback
    private void handleGoogleSignIn(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK) {
            if (call != null) {
                call.reject("Google sign-in cancelled");
            }
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            if (call != null) {
                call.reject("No Google account");
            }
            return;
        }

        try {
            GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(data)
                    .getResult(ApiException.class);
            if (account == null) {
                if (call != null) {
                    call.reject("No Google account");
                }
                return;
            }

            AuthCredential credential = GoogleAuthProvider.getCredential(account.getIdToken(), null);
            firebaseAuth
                    .signInWithCredential(credential)
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            if (call != null) {
                                call.reject("Firebase sign-in failed");
                            }
                            return;
                        }

                        JSObject ret = new JSObject();
                        FirebaseUser user = firebaseAuth.getCurrentUser();
                        if (user != null) {
                            JSObject u = new JSObject();
                            u.put("uid", user.getUid());
                            u.put("email", user.getEmail());
                            u.put("displayName", user.getDisplayName());
                            ret.put("user", u);
                        } else {
                            ret.put("user", null);
                        }
                        if (call != null) {
                            call.resolve(ret);
                        }
                    });
        } catch (ApiException e) {
            if (call != null) {
                call.reject("Google sign-in failed: " + e.getMessage(), e);
            }
        }
    }

    @PluginMethod
    public void signInWithEmail(PluginCall call) {
        // Capacitor may pass args at top level or inside getData()
        String email = call.getString("email");
        String password = call.getString("password");
        if (email == null && call.getData() != null && call.getData().has("email")) {
            email = call.getData().getString("email");
        }
        if (password == null && call.getData() != null && call.getData().has("password")) {
            password = call.getData().getString("password");
        }
        if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
            call.reject("Email and password are required");
            return;
        }
        final String emailFinal = email.trim();
        final String passwordFinal = password;

        firebaseAuth.signInWithEmailAndPassword(emailFinal, passwordFinal)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        resolveUserAndFinish(call);
                        return;
                    }
                    // Sign-in failed: try creating account (Firebase often returns generic "invalid credential" for non-existent user)
                    firebaseAuth.createUserWithEmailAndPassword(emailFinal, passwordFinal)
                            .addOnCompleteListener(createTask -> {
                                if (createTask.isSuccessful()) {
                                    FirebaseUser newUser = firebaseAuth.getCurrentUser();
                                    if (newUser != null) {
                                        newUser.sendEmailVerification().addOnCompleteListener(verificationTask ->
                                                resolveUserAndFinish(call, true));
                                    } else {
                                        resolveUserAndFinish(call, false);
                                    }
                                    return;
                                }
                                if (call == null) return;
                                Exception ce = createTask.getException();
                                String msg = ce != null ? ce.getMessage() : "Unknown error";
                                if (msg != null && (msg.contains("already in use") || msg.contains("email-already-in-use"))) {
                                    call.reject("That email is already registered. Use the correct password, or sign in with Google if you use that for this email.");
                                } else {
                                    call.reject("Email sign-in failed: " + msg);
                                }
                            });
                });
    }

    private void resolveUserAndFinish(PluginCall call) {
        resolveUserAndFinish(call, false);
    }

    private void resolveUserAndFinish(PluginCall call, boolean verificationEmailSent) {
        if (call == null) return;
        JSObject ret = new JSObject();
        FirebaseUser user = firebaseAuth.getCurrentUser();
        if (user != null) {
            JSObject u = new JSObject();
            u.put("uid", user.getUid());
            u.put("email", user.getEmail());
            u.put("displayName", user.getDisplayName());
            u.put("emailVerified", user.isEmailVerified());
            ret.put("user", u);
        } else {
            ret.put("user", null);
        }
        ret.put("verificationEmailSent", verificationEmailSent);
        call.resolve(ret);
    }
}

