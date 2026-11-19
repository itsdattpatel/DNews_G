# Mobile APK Architecture & Delivery Specification
*AI World News Desk — Android Mobile Edition*

---

## 1. Core Architecture Decisions (User Confirmed)
1. **Architecture Mode**: **Option B — Embedded On-Device / Autonomous**.
   - Self-contained client-side data layer powered by on-device storage.
   - Direct RSS / news feed polling capability via CORS proxy fallbacks.
   - Zero reliance on external host setup for standard reading operations.
2. **Orientation Strategy**: **Dual Responsive Support (Horizontal Landscape + Vertical Portrait)**.
   - Screen dynamically adapts to portrait holding (reading phone in one hand) and full widescreen landscape (docking the phone horizontally to experience the laptop desk layout with the 3D CircularGallery).
3. **Packaging Tooling**: **Capacitor Android (Native Android Gradle Wrapper)**.
   - Native WebGL acceleration for the 3D Orbit Gallery and 3D Globe.
   - Built with local Android SDK and Gradle in user's environment.
4. **In-App Version Updates & Direct Downloads**:
   - In-app update checker querying GitHub Releases (`latest.json` / releases API).
   - Shows "New Version Available (vX.X.X)" banner with changelog.
   - One-click direct `.apk` download and Android package installer intent (`application/vnd.android.package-archive`).

---

## 2. Implementation Phasing
- *Phase 1*: Complete desktop suite features (Entity Dossier, Cross-Outlet Comparison, Custom Sources, Layout Modes, Touch Gestures).
- *Phase 2*: Build and verify desktop `.exe` installer.
- *Phase 3*: Initialize Capacitor Android project, configure dual orientation in `AndroidManifest.xml`, implement GitHub releases APK update checker, and build release `.apk`.
