package com.spendwise.app;

import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            configureSystemBars();
        }
    }

    private void configureSystemBars() {
        // 1. Prevent drawing into display cutout / camera notch area
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
            getWindow().setAttributes(lp);
        }

        // 2. Ensure decor does not fit system windows automatically in an unpredictable way
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 3. Solid midnight status bar & navigation bar matching SpendWise background
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.parseColor("#0B0F19"));
        getWindow().setNavigationBarColor(Color.parseColor("#0B0F19"));

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        // 4. Calculate default status bar height from Android resources
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        final int defaultStatusBarHeight = (resourceId > 0) ? getResources().getDimensionPixelSize(resourceId) : 0;

        // 5. Apply top margin to the WebView immediately
        applyTopInset(defaultStatusBarHeight);

        // 6. Listen for dynamic window insets (handles cutouts, landscape/portrait, foldables)
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int top = Math.max(insets.top, defaultStatusBarHeight);
            applyTopInset(top);
            return windowInsets;
        });
    }

    private void applyTopInset(int top) {
        if (top <= 0) return;

        // Apply top margin to the Capacitor WebView so its content strictly starts below status bar and camera
        if (bridge != null && bridge.getWebView() != null) {
            View webView = bridge.getWebView();
            ViewGroup.LayoutParams params = webView.getLayoutParams();
            if (params instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
                if (marginParams.topMargin != top) {
                    marginParams.topMargin = top;
                    webView.setLayoutParams(marginParams);
                }
            }
            webView.setBackgroundColor(Color.parseColor("#0B0F19"));
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.parseColor("#0B0F19"));
        }
    }
}

