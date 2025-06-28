# Deployment Guide - Enhanced Indoor Positioning System

## Overview

This guide covers the complete deployment process for the WiFi Scanner Enhanced Indoor Positioning System, including development setup, testing, and production deployment for both Android and iOS platforms.

## Prerequisites

### Development Environment
- **Node.js**: Version 16.x or higher
- **npm/yarn**: Latest stable version
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli`

### Platform-Specific Requirements

#### Android Development
- **Android Studio**: Latest stable version
- **Android SDK**: API Level 23+ (Android 6.0+)
- **Java Development Kit**: JDK 11 or higher
- **Android Device/Emulator**: For testing

#### iOS Development (macOS only)
- **Xcode**: Latest stable version
- **iOS Simulator**: For testing
- **Apple Developer Account**: For App Store deployment
- **CocoaPods**: `sudo gem install cocoapods`

## Project Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd wifiScanner-main

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Environment Configuration

Create environment configuration files:

```bash
# Create .env file for environment variables
touch .env
```

Add the following to `.env`:
```env
# API Configuration
API_BASE_URL=https://sanitapi-1.onrender.com/api
API_TIMEOUT=10000

# App Configuration
APP_NAME=WiFi Scanner - Indoor Positioning
APP_VERSION=1.0.0

# Development Settings
DEBUG_MODE=true
LOG_LEVEL=debug

# Production Settings (for production builds)
PRODUCTION_API_URL=https://your-production-api.com/api
SENTRY_DSN=your-sentry-dsn-here
```

### 3. Update Configuration Files

#### Update app.json
```json
{
  "expo": {
    "name": "WiFi Scanner - Indoor Positioning",
    "slug": "wifiScanner",
    "version": "1.0.0",
    "extra": {
      "apiUrl": "https://sanitapi-1.onrender.com/api",
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

#### Update package.json scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios"
  }
}
```

## Development Workflow

### 1. Local Development

```bash
# Start development server
npm start

# Run on specific platform
npm run android  # Android device/emulator
npm run ios      # iOS simulator
npm run web      # Web browser
```

### 2. Testing on Physical Devices

#### Android Testing
```bash
# Install Expo Go from Google Play Store
# Scan QR code from development server
# Or use USB debugging with Android Studio
```

#### iOS Testing
```bash
# Install Expo Go from App Store
# Scan QR code from development server
# Or use iOS Simulator
```

### 3. Development Best Practices

#### Code Quality
```bash
# Install development tools
npm install --save-dev eslint prettier

# Add linting scripts to package.json
"scripts": {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write ."
}
```

#### Environment-Specific Configuration
```javascript
// config/environment.js
const isDevelopment = __DEV__;
const isProduction = !__DEV__;

export const config = {
  apiUrl: isDevelopment 
    ? 'https://sanitapi-1.onrender.com/api'
    : 'https://your-production-api.com/api',
  
  positioning: {
    wifiScanInterval: isDevelopment ? 5000 : 3000,
    debugMode: isDevelopment,
    enhancedLogging: isDevelopment
  }
};
```

## Build Configuration

### 1. EAS Build Setup

Initialize EAS build:
```bash
# Login to Expo account
eas login

# Initialize EAS configuration
eas build:configure
```

This creates `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2. Platform-Specific Build Configuration

#### Android Build Configuration
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease",
        "env": {
          "ENVIRONMENT": "production"
        }
      }
    }
  }
}
```

#### iOS Build Configuration
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "scheme": "wifiScanner",
        "env": {
          "ENVIRONMENT": "production"
        }
      }
    }
  }
}
```

## Production Builds

### 1. Android Production Build

```bash
# Build Android App Bundle (recommended for Play Store)
eas build --platform android --profile production

# Build APK for direct distribution
eas build --platform android --profile preview
```

#### Android Signing Configuration
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "credentials": {
          "keystore": {
            "keystorePath": "path/to/keystore.jks",
            "keystorePassword": "keystore_password",
            "keyAlias": "key_alias",
            "keyPassword": "key_password"
          }
        }
      }
    }
  }
}
```

### 2. iOS Production Build

```bash
# Build iOS app for App Store
eas build --platform ios --profile production
```

#### iOS Provisioning Configuration
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "credentials": {
          "provisioningProfile": "path/to/profile.mobileprovision",
          "distributionCertificate": "path/to/certificate.p12"
        }
      }
    }
  }
}
```

## Deployment Strategies

### 1. Development Deployment

#### Internal Testing
```bash
# Build development version
eas build --platform android --profile development
eas build --platform ios --profile development

# Share with internal testers
# Use Expo Go or development builds
```

#### Staging Environment
```bash
# Deploy to staging API
# Update environment variables
# Test with production-like data
```

### 2. Production Deployment

#### Google Play Store (Android)
```bash
# Build production app bundle
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production

# Or manual upload to Play Console
```

#### Apple App Store (iOS)
```bash
# Build production app
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Or manual upload via Xcode/Transporter
```

## Environment-Specific Configuration

### 1. API Configuration

#### Development
```javascript
const API_CONFIG = {
  baseURL: 'https://sanitapi-1.onrender.com/api',
  timeout: 10000,
  retries: 3,
  debug: true
};
```

#### Production
```javascript
const API_CONFIG = {
  baseURL: 'https://your-production-api.com/api',
  timeout: 5000,
  retries: 1,
  debug: false
};
```

### 2. Positioning Configuration

#### Development Settings
```javascript
const POSITIONING_CONFIG = {
  WIFI_SCAN_INTERVAL: 5000,     // Slower for debugging
  DEBUG_POSITIONING: true,       // Enable debug logs
  MOCK_SENSORS: false,          // Use real sensors
  ENHANCED_LOGGING: true        // Detailed logs
};
```

#### Production Settings
```javascript
const POSITIONING_CONFIG = {
  WIFI_SCAN_INTERVAL: 3000,     // Optimized for performance
  DEBUG_POSITIONING: false,      // Disable debug logs
  MOCK_SENSORS: false,          // Use real sensors
  ENHANCED_LOGGING: false       // Minimal logs
};
```

## Monitoring and Analytics

### 1. Error Tracking

#### Sentry Integration
```bash
# Install Sentry
npm install @sentry/react-native

# Configure in App.js
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn-here',
  environment: __DEV__ ? 'development' : 'production'
});
```

### 2. Performance Monitoring

#### Custom Analytics
```javascript
// utils/analytics.js
export const trackPositioningAccuracy = (accuracy, method) => {
  if (!__DEV__) {
    // Send to analytics service
    analytics.track('positioning_accuracy', {
      accuracy,
      method,
      timestamp: new Date().toISOString()
    });
  }
};

export const trackTaskCompletion = (taskId, duration, quality) => {
  if (!__DEV__) {
    analytics.track('task_completed', {
      taskId,
      duration,
      quality,
      timestamp: new Date().toISOString()
    });
  }
};
```

## Security Considerations

### 1. API Security

#### Token Management
```javascript
// utils/auth.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const secureTokenStorage = {
  async store(token) {
    await AsyncStorage.setItem('auth_token', token);
  },
  
  async retrieve() {
    return await AsyncStorage.getItem('auth_token');
  },
  
  async remove() {
    await AsyncStorage.removeItem('auth_token');
  }
};
```

#### API Request Security
```javascript
// utils/api.js
const apiRequest = async (endpoint, options = {}) => {
  const token = await secureTokenStorage.retrieve();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-App-Version': APP_VERSION,
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    await secureTokenStorage.remove();
    // Redirect to login
  }
  
  return response;
};
```

### 2. Data Protection

#### Sensitive Data Handling
```javascript
// Only store necessary data locally
// Encrypt sensitive information
// Clear data on logout
// Implement data retention policies
```

## Performance Optimization

### 1. Bundle Size Optimization

```bash
# Analyze bundle size
npx expo install @expo/webpack-config
npx expo customize:web

# Remove unused dependencies
npm prune

# Use dynamic imports for large components
const EnhancedLocation = React.lazy(() => import('./EnhancedLocation'));
```

### 2. Runtime Performance

#### Memory Management
```javascript
// Proper cleanup in useEffect
useEffect(() => {
  const subscription = startSensorMonitoring();
  
  return () => {
    subscription.unsubscribe();
    cleanup();
  };
}, []);
```

#### Battery Optimization
```javascript
// Adaptive update intervals
const getUpdateInterval = () => {
  const isBackground = AppState.currentState === 'background';
  const isMoving = sensorData.accelerometer.movement;
  
  if (isBackground) return 30000;  // 30s in background
  if (isMoving) return 5000;       // 5s when moving
  return 10000;                    // 10s when stationary
};
```

## Testing Strategy

### 1. Unit Testing

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

### 2. Integration Testing

```bash
# Install Detox for E2E testing
npm install --save-dev detox

# Configure and run E2E tests
npx detox test
```

### 3. Device Testing

#### Test Matrix
- **Android**: API levels 23, 28, 30, 33
- **iOS**: iOS 13, 14, 15, 16
- **Screen sizes**: Phone, tablet, foldable
- **Network conditions**: WiFi, cellular, offline

## Troubleshooting

### Common Build Issues

#### Android Build Failures
```bash
# Clear cache
expo r -c

# Update dependencies
npm update

# Check Android SDK configuration
```

#### iOS Build Failures
```bash
# Clear iOS cache
rm -rf ios/build
cd ios && pod install

# Update CocoaPods
sudo gem update cocoapods
```

### Runtime Issues

#### Permission Errors
```javascript
// Check permission status
const checkPermissions = async () => {
  const location = await Location.getForegroundPermissionsAsync();
  const motion = await Permissions.getAsync(Permissions.MOTION);
  
  console.log('Permissions:', { location, motion });
};
```

#### Sensor Failures
```javascript
// Graceful sensor fallback
const initializeSensors = async () => {
  try {
    await startMagnetometer();
  } catch (error) {
    console.warn('Magnetometer unavailable, using GPS only');
    fallbackToGPS();
  }
};
```

## Maintenance and Updates

### 1. Regular Updates

#### Dependency Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update Expo SDK
expo upgrade
```

#### Security Updates
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

### 2. Monitoring and Maintenance

#### Performance Monitoring
- Monitor app performance metrics
- Track positioning accuracy
- Monitor battery usage
- Track user engagement

#### Bug Tracking
- Set up crash reporting
- Monitor error rates
- Track user feedback
- Implement feature flags

## Conclusion

This deployment guide provides comprehensive instructions for setting up, building, and deploying the Enhanced Indoor Positioning System. Follow the guidelines for your specific platform and environment to ensure successful deployment and optimal performance.

For additional support or questions, refer to the project documentation or contact the development team.