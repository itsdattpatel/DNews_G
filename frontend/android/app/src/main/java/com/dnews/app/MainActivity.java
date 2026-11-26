package com.dnews.app;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                final String dir = keyCode == KeyEvent.KEYCODE_VOLUME_UP ? "prev" : "next";
                this.bridge.getWebView().post(() ->
                    this.bridge.getWebView().evaluateJavascript(
                        "if (window.__DNEWS_VOLUME_NAV__) { window.dispatchEvent(new CustomEvent('dnews-volume-key', { detail: { direction: '" + dir + "' } })); }",
                        null
                    )
                );
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
