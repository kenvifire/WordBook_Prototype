# WordBook Setup Guide

## Prerequisites

- Flutter 3.7.2 or higher
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)
- FlutterFire CLI (`dart pub global activate flutterfire_cli`)

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select an existing project
3. Follow the setup wizard

### 2. Enable Authentication Providers

In the Firebase Console:

1. Navigate to **Authentication** > **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Click "Enable" toggle
   - **Google**: Click "Enable" and configure OAuth consent screen
   - **Facebook**: Click "Enable" and add your Facebook App ID and App Secret
   - **Apple**: Click "Enable" and configure (iOS/macOS only)

### 3. Set up Firestore Database

1. Navigate to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" for development (update security rules for production)
4. Select a Cloud Firestore location

### 4. Set up Firebase Storage

1. Navigate to **Storage**
2. Click "Get started"
3. Start in test mode for development

### 5. Configure FlutterFire

Run the following command in the project root:

```bash
cd wordbook
flutterfire configure
```

This will:
- Create `lib/firebase_options.dart` with your Firebase configuration
- Configure Firebase for iOS, Android, Web, macOS, Windows, and Linux platforms

### 6. Platform-Specific Configuration

#### iOS

Edit `ios/Runner/Info.plist` and add:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
    </array>
  </dict>
</array>
```

For Facebook, add:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fbYOUR-FACEBOOK-APP-ID</string>
    </array>
  </dict>
</array>
<key>FacebookAppID</key>
<string>YOUR-FACEBOOK-APP-ID</string>
<key>FacebookDisplayName</key>
<string>WordBook</string>
```

#### Android

Edit `android/app/build.gradle` and ensure `minSdkVersion` is at least 21:

```gradle
defaultConfig {
    minSdkVersion 21
    ...
}
```

For Facebook, add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="facebook_app_id">YOUR-FACEBOOK-APP-ID</string>
<string name="fb_login_protocol_scheme">fbYOUR-FACEBOOK-APP-ID</string>
```

Edit `android/app/src/main/AndroidManifest.xml` and add:

```xml
<meta-data
    android:name="com.facebook.sdk.ApplicationId"
    android:value="@string/facebook_app_id"/>
```

#### Web

The configuration is automatically handled by flutterfire configure.

## Running the App

```bash
cd wordbook

# For iOS
flutter run -d ios

# For Android
flutter run -d android

# For Web
flutter run -d chrome

# For macOS
flutter run -d macos
```

## Development Notes

- The app uses Isar for local database (offline support)
- Translation API calls have rate limits
- PDF parsing is handled by pdfx library
- EPUB parsing is handled by epub_parser
- MOBI format requires conversion to EPUB

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
flutter clean
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

### Firebase Connection Issues

Ensure you've run `flutterfire configure` and the `firebase_options.dart` file exists in `lib/`.

### Authentication Issues

- Verify authentication providers are enabled in Firebase Console
- Check that OAuth configurations are correct
- Ensure redirect URIs are properly configured
