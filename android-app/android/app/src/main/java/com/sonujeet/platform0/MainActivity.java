package com.sonujeet.platform0;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) {
            wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
            wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
            wv.setBackgroundColor(0xFF000000);
        }
        // Back button / back gesture = pause (resume when paused); on the title screen the app goes to background.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView w = getBridge() != null ? getBridge().getWebView() : null;
                if (w == null) { moveTaskToBack(true); return; }
                w.evaluateJavascript("(window.__p0Back && window.__p0Back()) ? 'y' : 'n'", value -> {
                    if (value == null || !value.contains("y")) moveTaskToBack(true);
                });
            }
        });
        hideSystemBars();
        // v3.4: hand the real safe area (camera cutout, any bar that is showing) to the game's HUD layout, in CSS px.
        // (Android WebView does not report env(safe-area-inset-*) for a cutout in this full-screen mode.)
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets c = insets.getInsets(WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.systemBars());
            pushInsets(c.left, c.top, c.right, c.bottom);
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
        // the page may load after the first insets pass: hand them over again once it is up
        for (int ms : new int[] { 1500, 4000, 9000 }) decor.postDelayed(() -> pushInsets(lastInsets[0], lastInsets[1], lastInsets[2], lastInsets[3]), ms);
    }

    private int[] lastInsets = new int[] { 0, 0, 0, 0 };

    private void pushInsets(int l, int t, int r, int b) {
        lastInsets = new int[] { l, t, r, b };
        WebView w = getBridge() != null ? getBridge().getWebView() : null;
        if (w == null) return;
        float d = getResources().getDisplayMetrics().density;
        final String js = String.format(java.util.Locale.US,
            "window.__p0Insets={l:%.1f,t:%.1f,r:%.1f,b:%.1f};window.__p0SetInsets&&window.__p0SetInsets(window.__p0Insets);",
            l / d, t / d, r / d, b / d);
        w.post(() -> w.evaluateJavascript(js, null));
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) { hideSystemBars(); pushInsets(lastInsets[0], lastInsets[1], lastInsets[2], lastInsets[3]); }
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }
}
