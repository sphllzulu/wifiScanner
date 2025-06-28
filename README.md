# WiFi Scanner - Enhanced Indoor Positioning System

A React Native application that provides advanced indoor positioning using WiFi fingerprinting, IMU sensors, and magnetic field analysis for precise location tracking and task management.

## 🚀 Features

### Enhanced Positioning Technology
- **Multi-sensor Fusion**: Combines WiFi, accelerometer, gyroscope, and magnetometer data
- **WiFi Extender Detection**: Identifies and compensates for mesh network interference
- **BSSID Pattern Recognition**: Advanced fingerprinting with relative signal ratios
- **Magnetic Heading Integration**: Uses compass data for improved accuracy
- **Movement Analysis**: Real-time step counting and motion detection
- **Signal Stability Assessment**: Analyzes WiFi environment consistency

### Dual Mode Operation
- **Training Mode**: Collect enhanced WiFi fingerprints with sensor fusion
- **Cleaner Mode**: Real-time task management with precise location verification

### Task Management System
- **Authenticated Access**: Role-based login (Admin/Cleaner)
- **Real-time Task Assignment**: Dynamic task loading and status updates
- **Location Verification**: Ensures cleaners are in correct areas
- **Progress Tracking**: Automatic position updates during task execution
- **Quality Rating**: Task completion with notes and ratings

## 📱 Architecture

### Core Components

#### 1. App.js (Main Application)
- **Authentication System**: JWT-based login with role management
- **Task Management**: Real-time task loading, assignment, and completion
- **Enhanced Positioning**: Multi-sensor data fusion and analysis
- **UI Management**: Dynamic mode switching and responsive interface

#### 2. EnhancedLocation.js (Advanced Positioning Component)
- **Sensor Integration**: Accelerometer, gyroscope, magnetometer, pedometer
- **WiFi Analysis**: Network scanning, extender detection, pattern recognition
- **Position Calculation**: Server-side and local positioning algorithms
- **Real-time Updates**: Continuous tracking with configurable intervals

### Technology Stack

```javascript
// Core Framework
React Native 0.79.3
Expo SDK ~53.0.11

// Positioning & Sensors
expo-location: GPS and location services
expo-sensors: IMU sensors (accelerometer, gyroscope, magnetometer, pedometer)
react-native-sensors: Additional sensor access
react-native-wifi-reborn: WiFi network scanning

// Networking & Storage
@react-native-community/netinfo: Network connectivity
@react-native-async-storage/async-storage: Local data persistence

// Utilities
react-native-keep-awake: Background operation support
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation Steps

1. **Clone and Install**
```bash
git clone <repository-url>
cd wifiScanner-main
npm install
```

2. **Configure Environment**
```javascript
// Update API_BASE_URL in App.js
const API_BASE_URL = 'https://your-api-server.com/api';
```

3. **Run Development Server**
```bash
# Start Expo development server
npm start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS
npm run web      # Web browser
```

### Platform-Specific Setup

#### Android Configuration
- **Permissions**: Location, WiFi state, background location
- **API Level**: Minimum SDK 23 (Android 6.0)
- **WiFi Scanning**: Full network scanning capabilities

#### iOS Configuration
- **Permissions**: Location, motion sensors
- **Limitations**: Limited WiFi scanning (connected network only)
- **Background**: Location tracking with user consent

## 🔧 Configuration

### Positioning Configuration
```javascript
const POSITIONING_CONFIG = {
  WIFI_SCAN_INTERVAL: 3000,        // WiFi scan frequency (ms)
  IMU_UPDATE_INTERVAL: 100,        // Sensor update rate (ms)
  POSITION_UPDATE_INTERVAL: 2000,  // Position calculation frequency (ms)
  MIN_WIFI_NETWORKS: 3,            // Minimum networks for positioning
  CONFIDENCE_THRESHOLD: 0.7,       // Minimum confidence for reliable positioning
  MOVEMENT_THRESHOLD: 0.5,         // Acceleration threshold for movement detection
  STEP_DETECTION_THRESHOLD: 1.5    // Acceleration threshold for step counting
};
```

### Authentication Setup
```javascript
// Test Credentials (configured in backend)
Admin: testadmin@example.com / testadmin
Cleaner: maria@company.com / cleaner123
```

## 📊 API Integration

### Authentication Endpoints
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Positioning Endpoints
```javascript
// Enhanced position estimation
POST /api/estimate-position
{
  "wifi_networks": [...],
  "magnetometer_data": {...},
  "positioning_metadata": {...}
}

// Position tracking
POST /api/positions
{
  "position": {...},
  "enhanced_data": {...}
}

// Fingerprint collection
POST /api/fingerprints
{
  "area_label": "Office Area",
  "wifi_networks": [...],
  "positioning_metadata": {...}
}
```

### Task Management Endpoints
```javascript
// Get user tasks
GET /api/my-tasks

// Start task
POST /api/my-tasks/{id}/start

// Update progress
POST /api/my-tasks/{id}/progress

// Complete task
POST /api/my-tasks/{id}/complete
```

## 🧭 Enhanced Positioning Features

### WiFi Fingerprinting Enhancements
- **Extender Detection**: Identifies mesh networks and WiFi extenders
- **BSSID Patterns**: Creates unique fingerprints from MAC address sequences
- **Relative Signal Ratios**: Normalizes signal strengths for consistency
- **Frequency Analysis**: Separates 2.4GHz and 5GHz networks
- **Signal Stability**: Monitors WiFi environment consistency over time

### IMU Sensor Fusion
- **Magnetic Heading**: Compass-based orientation tracking
- **Step Detection**: Accelerometer-based step counting
- **Movement Analysis**: Real-time motion state detection
- **Dead Reckoning**: Position estimation using sensor data
- **Calibration**: Automatic sensor calibration and drift correction

### Positioning Algorithms
```javascript
// Enhanced local positioning with multiple factors
const calculateEnhancedPosition = (wifiData, sensorData) => {
  // 1. WiFi signal strength analysis
  // 2. Extender group compensation
  // 3. Magnetic heading consistency
  // 4. Movement state adjustment
  // 5. Signal stability assessment
  // 6. Confidence calculation with multiple factors
};
```

## 📱 User Interface

### Training Mode (Admin)
- **Enhanced Fingerprint Collection**: Multi-sensor data capture
- **WiFi Analysis Display**: Network details with extender detection
- **Sensor Data Visualization**: Real-time IMU and magnetic data
- **Progress Tracking**: Fingerprint collection statistics
- **Quality Assessment**: Positioning accuracy indicators

### Cleaner Mode (Staff)
- **Task Dashboard**: Real-time task assignment and status
- **Location Verification**: Enhanced position detection with confidence
- **Progress Tracking**: Automatic location updates during tasks
- **Quality Control**: Task completion with ratings and notes
- **Enhanced Features**: Extender warnings and positioning quality indicators

## 🔒 Security & Privacy

### Data Protection
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Admin and cleaner role separation
- **Local Storage**: Encrypted local data storage
- **Network Security**: HTTPS API communication

### Privacy Considerations
- **Location Data**: Used only for work-related positioning
- **Sensor Data**: Processed locally with minimal server transmission
- **WiFi Information**: Network scanning for positioning only
- **User Consent**: Clear permission requests and usage descriptions

## 🚀 Performance Optimization

### Battery Management
- **Adaptive Intervals**: Configurable update frequencies
- **Movement-based Optimization**: Reduced scanning when stationary
- **Background Efficiency**: Optimized background location tracking
- **Sensor Management**: Intelligent sensor activation/deactivation

### Accuracy Improvements
- **Multi-sensor Fusion**: Combines multiple data sources
- **Extender Compensation**: Reduces mesh network interference
- **Signal Filtering**: Removes unstable or unreliable signals
- **Confidence Scoring**: Multi-factor accuracy assessment

## 🧪 Testing & Validation

### Testing Scenarios
1. **Indoor Positioning Accuracy**: Test in various indoor environments
2. **WiFi Extender Handling**: Validate mesh network compensation
3. **Movement Detection**: Verify step counting and motion analysis
4. **Task Management**: Test complete workflow from assignment to completion
5. **Battery Performance**: Monitor power consumption during extended use

### Validation Metrics
- **Positioning Accuracy**: Room-level accuracy (2-5 meter precision)
- **Confidence Scores**: Reliability indicators (0-100%)
- **Response Time**: Real-time positioning updates (<2 seconds)
- **Battery Life**: 8+ hours of continuous tracking

## 🔧 Troubleshooting

### Common Issues

#### WiFi Scanning Problems
```javascript
// Check permissions
const hasLocationPermission = await Location.requestForegroundPermissionsAsync();

// Verify WiFi state
const wifiEnabled = await WifiManager.getCurrentWifiSSID();
```

#### Sensor Initialization Failures
```javascript
// Verify sensor availability
const magnetometerAvailable = await Magnetometer.isAvailableAsync();
const accelerometerAvailable = await Accelerometer.isAvailableAsync();
```

#### Authentication Issues
```javascript
// Check token validity
const token = await AsyncStorage.getItem('auth_token');
if (!token) {
  // Redirect to login
}
```

### Performance Issues
- **High Battery Usage**: Enable battery optimization mode
- **Slow Positioning**: Check WiFi network availability
- **Inaccurate Location**: Calibrate magnetometer and check for extenders

## 📈 Future Enhancements

### Planned Features
- **Machine Learning**: AI-based positioning improvement
- **Bluetooth Beacons**: Additional positioning technology
- **Augmented Reality**: Visual positioning assistance
- **Analytics Dashboard**: Detailed positioning and task analytics
- **Multi-building Support**: Campus-wide positioning system

### Technical Improvements
- **Edge Computing**: Local AI processing for faster positioning
- **5G Integration**: Enhanced connectivity for real-time updates
- **IoT Sensors**: Integration with building management systems
- **Cloud Sync**: Automatic fingerprint database synchronization

## 📄 License

This project is proprietary software developed for indoor positioning and task management applications.

## 🤝 Contributing

For development contributions or bug reports, please contact the development team.

## 📞 Support

For technical support or questions:
- **Documentation**: Refer to this README and inline code comments
- **API Documentation**: Check backend API documentation
- **Issues**: Report bugs through the issue tracking system
- **Contact**: Reach out to the development team for assistance

---

**Enhanced Indoor Positioning System** - Precision location tracking with advanced sensor fusion technology.