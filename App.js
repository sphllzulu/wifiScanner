// Real Implementation App.js - No Simulation, Real Wi-Fi Scanning
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  AppState
} from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer, Accelerometer, Gyroscope } from 'expo-sensors';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WifiManager from 'react-native-wifi-reborn';

const API_BASE_URL = 'https://sanitapi.onrender.com/api'; // Your production API

const App = () => {
  // App State
  const [mode, setMode] = useState('training');
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentArea, setCurrentArea] = useState('Unknown');
  const [areaLabel, setAreaLabel] = useState('');
  const [isIndoor, setIsIndoor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [batteryOptimized, setBatteryOptimized] = useState(true);

  // Real sensor data
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [magnetometer, setMagnetometer] = useState({ x: 0, y: 0, z: 0 });
  const [accelerometer, setAccelerometer] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
  const [confidence, setConfidence] = useState(0);
  const [positioningMethod, setPositioningMethod] = useState('unknown');
  const [wifiScanningEnabled, setWifiScanningEnabled] = useState(true);

  // Tracking state
  const [collectedFingerprints, setCollectedFingerprints] = useState(0);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [lastWifiScan, setLastWifiScan] = useState(null);

  // Refs for cleanup
  const locationSubscription = useRef(null);
  const trackingInterval = useRef(null);
  const wifiScanInterval = useRef(null);

  useEffect(() => {
    initializeApp();
    setupAppStateListener();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnectionStatus(state.isConnected ? 'connected' : 'disconnected');
    });

    return () => unsubscribe();
  }, []);

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isTracking) {
        // Continue tracking in background for cleaner mode
        console.log('App went to background, continuing location tracking');
      } else if (nextAppState === 'active') {
        // Refresh when app comes back to foreground
        if (isTracking) {
          updateCurrentLocation();
        }
      }
    });

    return () => subscription?.remove();
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Request all necessary permissions
      await requestAllPermissions();
      
      // Initialize sensors
      await startSensorMonitoring();
      
      // Get initial location
      await updateCurrentLocation();
      
      // Load stored data
      await loadStoredData();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Setup Error', `Failed to initialize: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

 const requestAllPermissions = async () => {
  try {
    // Location permissions first
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Background location for Android
    if (Platform.OS === 'android') {
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert('Background Location', 'Background location is recommended for continuous tracking');
        }
      } catch (error) {
        console.log('Background location permission skipped:', error.message);
      }
    }

    // Android-specific Wi-Fi permissions with better error handling
    if (Platform.OS === 'android') {
      try {
        // Check Android version and request appropriate permissions
        const permissions = [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
        ];

        // Only add these if they exist in the current API level
        if (Platform.Version >= 23) {
          permissions.push('android.permission.ACCESS_WIFI_STATE');
        }

        if (Platform.Version >= 29) {
          permissions.push('android.permission.ACCESS_BACKGROUND_LOCATION');
        }

        const results = {};
        for (const permission of permissions) {
          try {
            const result = await PermissionsAndroid.request(permission);
            results[permission] = result;
          } catch (permError) {
            console.log(`Permission ${permission} failed:`, permError.message);
            results[permission] = PermissionsAndroid.RESULTS.DENIED;
          }
        }

        const hasLocationPermission = 
          results['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
          results['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

        if (hasLocationPermission) {
          setWifiScanningEnabled(true);
          console.log('Wi-Fi scanning enabled');
        } else {
          Alert.alert('Location Required', 'Location permission is required for Wi-Fi scanning');
          setWifiScanningEnabled(false);
        }

      } catch (androidError) {
        console.log('Android permission error:', androidError.message);
        // Still try to enable Wi-Fi scanning - permissions might already be granted
        setWifiScanningEnabled(true);
      }
    } else {
      // iOS - limited Wi-Fi scanning
      setWifiScanningEnabled(false);
      Alert.alert('iOS Limitation', 'iOS only provides limited Wi-Fi information');
    }

  } catch (error) {
    console.error('Permission request error:', error);
    // Don't throw - continue with limited functionality
    Alert.alert('Permission Error', `Some permissions failed: ${error.message}`);
  }
};
  const loadStoredData = async () => {
    try {
      const storedFingerprints = await AsyncStorage.getItem('fingerprint_count');
      if (storedFingerprints) {
        setCollectedFingerprints(parseInt(storedFingerprints));
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  const startSensorMonitoring = async () => {
    const updateInterval = batteryOptimized ? 2000 : 1000;

    // Magnetometer
    Magnetometer.setUpdateInterval(updateInterval);
    Magnetometer.addListener((data) => {
      setMagnetometer(data);
    });

    // Accelerometer
    Accelerometer.setUpdateInterval(100);
    Accelerometer.addListener((data) => {
      setAccelerometer(data);
      
      // Detect movement for battery optimization
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      const isMoving = Math.abs(magnitude - 9.81) > 2;
      
      if (isMoving && batteryOptimized) {
        Magnetometer.setUpdateInterval(500);
      }
    });

    // Gyroscope
    Gyroscope.setUpdateInterval(200);
    Gyroscope.addListener((data) => {
      setGyroscope(data);
    });

    console.log('Sensors started');
  };

const scanWiFiNetworks = async () => {
  if (!wifiScanningEnabled) {
    console.log('Wi-Fi scanning not enabled');
    return [];
  }

  try {
    if (Platform.OS === 'android') {
      console.log('Starting Wi-Fi scan...');
      
      // Force a new scan
      const wifiList = await WifiManager.loadWifiList();
      console.log(`Raw Wi-Fi scan result: ${wifiList.length} networks`);
      
      const networks = wifiList
        .filter(network => network.BSSID && network.BSSID !== '02:00:00:00:00:00')
        .map(network => ({
          ssid: network.SSID || 'Hidden Network',
          bssid: network.BSSID,
          level: network.level || -100,
          frequency: network.frequency || 2400,
          capabilities: network.capabilities || '',
          timestamp: Date.now()
        }));

      console.log(`Filtered networks: ${networks.length}`);
      console.log('Network details:', networks.slice(0, 3)); // Log first 3 for debugging
      
      setLastWifiScan(new Date());
      return networks;
      
    } else {
      // iOS fallback
      const netInfo = await NetInfo.fetch();
      if (netInfo.type === 'wifi' && netInfo.details) {
        const connectedNetwork = {
          ssid: netInfo.details.ssid || 'Connected Network',
          bssid: 'ios-connected-network',
          level: -50,
          frequency: 2400,
          isConnected: true,
          timestamp: Date.now()
        };
        return [connectedNetwork];
      }
      return [];
    }
  } catch (error) {
    console.error('Wi-Fi scan error:', error);
    
    if (error.message.includes('location')) {
      Alert.alert('Location Required', 'Wi-Fi scanning requires location permission and enabled location services');
    } else if (error.message.includes('wifi')) {
      Alert.alert('Wi-Fi Error', 'Please ensure Wi-Fi is enabled');
    }
    
    return [];
  }
};

  const updateCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });
      
      setCurrentLocation(location);
      
      // Determine indoor/outdoor based on GPS accuracy
      const gpsAccuracy = location.coords.accuracy;
      const isLikelyOutdoor = gpsAccuracy < 15;
      const isLikelyIndoor = gpsAccuracy > 25;
      
      if (isLikelyOutdoor) {
        setIsIndoor(false);
        setPositioningMethod('GPS');
        setConfidence(Math.max(0, Math.min(100, 100 - gpsAccuracy * 2)));
        setCurrentArea('Outdoor');
      } else if (isLikelyIndoor) {
        setIsIndoor(true);
        await performIndoorPositioning();
      } else {
        // Transition zone
        setPositioningMethod('Hybrid');
        await performIndoorPositioning();
      }
      
    } catch (error) {
      console.error('Location update error:', error);
      setCurrentArea('Location Unavailable');
      setConfidence(0);
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        Alert.alert('Location Timeout', 'GPS signal is weak. Moving to indoor mode.');
        setIsIndoor(true);
        await performIndoorPositioning();
      }
    }
  };

  const performIndoorPositioning = async () => {
    try {
      // Scan Wi-Fi networks
      const wifiData = await scanWiFiNetworks();
      setWifiNetworks(wifiData);
      
      if (wifiData.length === 0) {
        setCurrentArea('No Wi-Fi Detected');
        setConfidence(0);
        setPositioningMethod('IMU + Magnetic Only');
        return;
      }

      // Get position estimate from server or local algorithm
      const estimatedPosition = await estimateIndoorPosition(wifiData, magnetometer);
      
      setCurrentArea(estimatedPosition.area);
      setConfidence(estimatedPosition.confidence);
      setPositioningMethod('Wi-Fi + IMU + Magnetic');
      
      return estimatedPosition;
      
    } catch (error) {
      console.error('Indoor positioning error:', error);
      setCurrentArea('Positioning Failed');
      setConfidence(0);
    }
  };

  const estimateIndoorPosition = async (wifiData, magneticData) => {
    try {
      // Try server-based positioning first
      const response = await fetch(`${API_BASE_URL}/estimate-position`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-token-here' // Add authentication
        },
        body: JSON.stringify({
          wifi_networks: wifiData,
          magnetometer_data: magneticData,
          accelerometer_data: accelerometer,
          timestamp: new Date().toISOString()
        }),
        timeout: 8000
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Server positioning result:', result);
        return {
          area: result.estimated_area,
          confidence: result.confidence,
          method: 'server'
        };
      } else {
        console.log('Server positioning failed, using local algorithm');
      }
    } catch (error) {
      console.log('Network error, using local positioning:', error.message);
    }

    // Fallback to local positioning
    return performLocalPositioning(wifiData);
  };

  const performLocalPositioning = (wifiData) => {
    if (!wifiData || wifiData.length === 0) {
      return { area: 'Unknown', confidence: 0, method: 'local' };
    }

    // Sort networks by signal strength
    const sortedNetworks = wifiData.sort((a, b) => b.level - a.level);
    const strongestSignal = sortedNetworks[0];
    
    let estimatedArea = 'Unknown';
    let confidence = 0;

    // Enhanced area detection logic
    const signalStrength = strongestSignal.level;
    const networkCount = wifiData.length;
    
    // Use signal strength and network density for area estimation
    if (signalStrength > -40 && networkCount >= 3) {
      estimatedArea = 'Main Office Area';
      confidence = 85;
    } else if (signalStrength > -60 && networkCount >= 2) {
      estimatedArea = 'Office Zone';
      confidence = 70;
    } else if (signalStrength > -70) {
      estimatedArea = 'Corridor/Transition';
      confidence = 55;
    } else {
      estimatedArea = 'Remote Area';
      confidence = 30;
    }

    // Adjust confidence based on network count and signal consistency
    const signalVariance = calculateSignalVariance(wifiData);
    confidence = Math.max(0, confidence - signalVariance);

    console.log(`Local positioning: ${estimatedArea} (${confidence}% confidence)`);
    
    return { 
      area: estimatedArea, 
      confidence: Math.round(confidence), 
      method: 'local',
      networksUsed: wifiData.length
    };
  };

  const calculateSignalVariance = (networks) => {
    if (networks.length < 2) return 0;
    
    const levels = networks.map(n => n.level);
    const mean = levels.reduce((a, b) => a + b) / levels.length;
    const variance = levels.reduce((acc, level) => acc + Math.pow(level - mean, 2), 0) / levels.length;
    
    return Math.min(30, variance / 10); // Cap at 30% confidence reduction
  };

  const startContinuousTracking = () => {
    if (trackingInterval.current) return;
    
    const interval = batteryOptimized ? 15000 : 8000; // 15s or 8s intervals
    
    console.log(`Starting continuous tracking with ${interval}ms interval`);
    
    trackingInterval.current = setInterval(async () => {
      await updateCurrentLocation();
      if (mode === 'cleaner') {
        await sendPositionUpdate();
      }
    }, interval);

    // Start Wi-Fi scanning interval
    if (wifiScanningEnabled) {
      const wifiInterval = batteryOptimized ? 20000 : 10000;
      wifiScanInterval.current = setInterval(async () => {
        if (isIndoor) {
          await performIndoorPositioning();
        }
      }, wifiInterval);
    }
  };

  const stopContinuousTracking = () => {
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
    
    if (wifiScanInterval.current) {
      clearInterval(wifiScanInterval.current);
      wifiScanInterval.current = null;
    }
    
    console.log('Stopped continuous tracking');
  };

  const sendPositionUpdate = async () => {
    try {
      const positionData = {
        user_id: await AsyncStorage.getItem('user_id') || 'cleaner_001',
        position: {
          coords: currentLocation?.coords || {},
          area: currentArea,
          confidence: confidence
        },
        positioning_method: positioningMethod.toLowerCase().replace(/\s+/g, '_'),
        timestamp: new Date().toISOString(),
        area: currentArea,
        confidence_score: confidence,
        wifi_networks_count: wifiNetworks.length,
        device_info: {
          platform: Platform.OS,
          version: Platform.Version
        }
      };

      const response = await fetch(`${API_BASE_URL}/positions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-token-here'
        },
        body: JSON.stringify(positionData),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log('Position update sent successfully');
    } catch (error) {
      console.error('Position update failed:', error);
      await storePositionLocally(positionData);
    }
  };

  const storePositionLocally = async (positionData) => {
    try {
      const stored = await AsyncStorage.getItem('offline_positions') || '[]';
      const positions = JSON.parse(stored);
      positions.push(positionData);
      
      const recentPositions = positions.slice(-100);
      await AsyncStorage.setItem('offline_positions', JSON.stringify(recentPositions));
      console.log('Position stored locally for later sync');
    } catch (error) {
      console.error('Failed to store position locally:', error);
    }
  };

const saveFingerprint = async () => {
  if (!areaLabel.trim()) {
    Alert.alert('Error', 'Please enter an area label');
    return;
  }

  setLoading(true);
  try {
    // Get fresh Wi-Fi scan
    const wifiData = await scanWiFiNetworks();
    setWifiNetworks(wifiData);
    
    const fingerprintData = {
      area_label: areaLabel.trim(),
      wifi_networks: wifiData,
      magnetometer_data: magnetometer,
      accelerometer_data: accelerometer,
      gyroscope_data: gyroscope,
      gps_location: currentLocation,
      timestamp: new Date().toISOString(),
      is_indoor: isIndoor,
      device_info: {
        platform: Platform.OS,
        wifi_scanning_enabled: wifiScanningEnabled
      }
    };

    // TRY server first, fall back to local storage
    try {
      const response = await fetch(`${API_BASE_URL}/fingerprints`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fingerprintData),
        timeout: 5000
      });

      if (response.ok) {
        console.log('Fingerprint saved to server');
      } else {
        throw new Error('Server error');
      }
    } catch (networkError) {
      console.log('Server unavailable, saving locally:', networkError.message);
      
      // Save locally for now
      const storedData = await AsyncStorage.getItem('fingerprints') || '[]';
      const fingerprints = JSON.parse(storedData);
      fingerprints.push(fingerprintData);
      await AsyncStorage.setItem('fingerprints', JSON.stringify(fingerprints));
      
      console.log('Fingerprint saved locally');
    }

    const newCount = collectedFingerprints + 1;
    setCollectedFingerprints(newCount);
    await AsyncStorage.setItem('fingerprint_count', newCount.toString());
    
    setLastSaveTime(new Date());
    Alert.alert(
      'Success', 
      `Fingerprint saved for ${areaLabel}!\nWi-Fi networks: ${wifiData.length}\nTotal collected: ${newCount}\n${wifiData.length === 0 ? '⚠️ No networks detected' : '✅ Networks detected'}`
    );
    setAreaLabel('');

  } catch (error) {
    console.error('Save fingerprint error:', error);
    Alert.alert('Error', `Failed to save fingerprint: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const toggleTracking = () => {
    if (!isTracking) {
      startContinuousTracking();
      setIsTracking(true);
      Alert.alert(
        'Tracking Started', 
        'Your position will be tracked continuously. The app will work in the background.'
      );
    } else {
      stopContinuousTracking();
      setIsTracking(false);
      Alert.alert('Tracking Stopped', 'Position tracking has been paused');
    }
  };

  const cleanup = () => {
    console.log('Cleaning up app resources');
    
    Magnetometer.removeAllListeners();
    Accelerometer.removeAllListeners();
    Gyroscope.removeAllListeners();
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    stopContinuousTracking();
  };

  useEffect(() => {
    if (mode === 'cleaner' && isTracking) {
      startContinuousTracking();
    } else {
      stopContinuousTracking();
    }
  }, [mode, isTracking, batteryOptimized]);

  const renderStatusCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>System Status</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Environment:</Text>
        <Text style={[styles.statusValue, { color: isIndoor ? '#e74c3c' : '#27ae60' }]}>
          {isIndoor ? '🏢 Indoor' : '🌍 Outdoor'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Method:</Text>
        <Text style={styles.statusValue}>{positioningMethod}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Confidence:</Text>
        <Text style={[styles.statusValue, { 
          color: confidence > 70 ? '#27ae60' : confidence > 40 ? '#f39c12' : '#e74c3c' 
        }]}>
          {confidence}%
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Wi-Fi Scanning:</Text>
        <Text style={[styles.statusValue, { 
          color: wifiScanningEnabled ? '#27ae60' : '#e74c3c' 
        }]}>
          {wifiScanningEnabled ? '✅ Enabled' : '❌ Limited'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, { 
          color: connectionStatus === 'connected' ? '#27ae60' : '#e74c3c' 
        }]}>
          {connectionStatus === 'connected' ? '✅ Online' : '❌ Offline'}
        </Text>
      </View>
      {currentLocation && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>GPS Accuracy:</Text>
          <Text style={styles.statusValue}>{currentLocation.coords.accuracy.toFixed(1)}m</Text>
        </View>
      )}
      {lastWifiScan && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Wi-Fi Scan:</Text>
          <Text style={styles.statusValue}>{lastWifiScan.toLocaleTimeString()}</Text>
        </View>
      )}
    </View>
  );

  const renderTrainingMode = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Training Mode</Text>
        <Text style={styles.subtitle}>Collect real Wi-Fi fingerprints for indoor positioning</Text>
      </View>

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing sensors and permissions...</Text>
        </View>
      )}

      {renderStatusCard()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Training Progress</Text>
        <Text style={styles.progressText}>
          Fingerprints Collected: {collectedFingerprints}
        </Text>
        {lastSaveTime && (
          <Text style={styles.infoText}>
            Last saved: {lastSaveTime.toLocaleTimeString()}
          </Text>
        )}
        {Platform.OS === 'ios' && (
          <Text style={styles.warningText}>
            ⚠️ iOS provides limited Wi-Fi data. Positioning will rely more on other sensors.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Collect Fingerprint</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter area name (e.g., Kitchen, Office, Lobby)"
          value={areaLabel}
          onChangeText={setAreaLabel}
          returnKeyType="done"
          onSubmitEditing={saveFingerprint}
        />
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={saveFingerprint}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Scan & Save Fingerprint</Text>
          )}
        </TouchableOpacity>
        {wifiNetworks.length > 0 && (
          <Text style={styles.scanInfo}>
            Last scan found {wifiNetworks.length} Wi-Fi networks
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Wi-Fi Networks</Text>
        {wifiNetworks.length === 0 ? (
          <Text style={styles.noDataText}>
            {wifiScanningEnabled ? 'No networks detected' : 'Wi-Fi scanning not available'}
          </Text>
        ) : (
          wifiNetworks.slice(0, 5).map((network, index) => (
            <View key={index} style={styles.wifiRow}>
              <View style={styles.wifiInfo}>
                <Text style={styles.wifiSSID}>{network.ssid}</Text>
                <Text style={styles.wifiBSSID}>{network.bssid}</Text>
              </View>
              <View style={styles.wifiSignalContainer}>
                <Text style={[styles.wifiSignal, {
                  color: network.level > -50 ? '#27ae60' : network.level > -70 ? '#f39c12' : '#e74c3c'
                }]}>
                  {network.level}dBm
                </Text>
                <Text style={styles.wifiFreq}>{network.frequency}MHz</Text>
              </View>
            </View>
          ))
        )}
        {wifiNetworks.length > 5 && (
          <Text style={styles.moreNetworksText}>
            +{wifiNetworks.length - 5} more networks detected
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensor Data</Text>
        <Text style={styles.sensorText}>
          Magnetometer: X:{magnetometer.x.toFixed(2)} Y:{magnetometer.y.toFixed(2)} Z:{magnetometer.z.toFixed(2)} μT
        </Text>
        <Text style={styles.sensorText}>
          Accelerometer: X:{accelerometer.x.toFixed(2)} Y:{accelerometer.y.toFixed(2)} Z:{accelerometer.z.toFixed(2)} m/s²
        </Text>
        <Text style={styles.sensorText}>
          Gyroscope: X:{gyroscope.x.toFixed(3)} Y:{gyroscope.y.toFixed(3)} Z:{gyroscope.z.toFixed(3)} rad/s
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Battery Optimization</Text>
          <Switch
            value={batteryOptimized}
            onValueChange={setBatteryOptimized}
          />
        </View>
        <Text style={styles.settingDescription}>
          {batteryOptimized ? 
            'Reduced sensor frequency for longer battery life' : 
            'High frequency sensing for maximum accuracy'
          }
        </Text>
      </View>
    </ScrollView>
  );

  const renderCleanerMode = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Cleaner Mode</Text>
        <Text style={styles.subtitle}>Real-time position tracking</Text>
      </View>

      {renderStatusCard()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tracking Control</Text>
        <View style={styles.trackingContainer}>
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingText}>
              {isTracking ? '✅ Tracking Active' : '⏸️ Tracking Paused'}
            </Text>
            <Text style={styles.trackingSubtext}>
              {isTracking ? 
                `Updates every ${batteryOptimized ? '15' : '8'} seconds` : 
                'Tap to start tracking'
              }
            </Text>
          </View>
          <Switch
            value={isTracking}
            onValueChange={toggleTracking}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Position</Text>
        <Text style={styles.locationText}>
          📍 {currentArea}
        </Text>
        <Text style={styles.methodText}>
          Method: {positioningMethod}
        </Text>
        <Text style={styles.confidenceText}>
          Confidence: {confidence}%
        </Text>
        {currentLocation && (
          <Text style={styles.infoText}>
            GPS: {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
          </Text>
        )}
        {wifiNetworks.length > 0 && (
          <Text style={styles.infoText}>
            Using {wifiNetworks.length} Wi-Fi networks for positioning
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real-time Wi-Fi Environment</Text>
        {wifiNetworks.length === 0 ? (
          <View>
            <Text style={styles.noDataText}>No Wi-Fi networks detected</Text>
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={performIndoorPositioning}
            >
              <Text style={styles.scanButtonText}>Manual Wi-Fi Scan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.infoText}>
              Networks detected: {wifiNetworks.length} | 
              Last scan: {lastWifiScan ? lastWifiScan.toLocaleTimeString() : 'Never'}
            </Text>
            {wifiNetworks.slice(0, 4).map((network, index) => (
              <View key={index} style={styles.wifiRow}>
                <View style={styles.wifiInfo}>
                  <Text style={styles.wifiSSID}>{network.ssid}</Text>
                  <Text style={styles.wifiBSSID}>{network.bssid}</Text>
                </View>
                <View style={styles.wifiSignalContainer}>
                  <Text style={[styles.wifiSignal, {
                    color: network.level > -50 ? '#27ae60' : network.level > -70 ? '#f39c12' : '#e74c3c'
                  }]}>
                    {network.level}dBm
                  </Text>
                  <Text style={styles.wifiFreq}>{network.frequency}MHz</Text>
                </View>
              </View>
            ))}
            {wifiNetworks.length > 4 && (
              <Text style={styles.moreNetworksText}>
                +{wifiNetworks.length - 4} more networks
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Battery Optimization</Text>
          <Switch
            value={batteryOptimized}
            onValueChange={setBatteryOptimized}
          />
        </View>
        <Text style={styles.settingDescription}>
          {batteryOptimized ? 
            'Extended battery life mode - updates every 15s' : 
            'High accuracy mode - updates every 8s'
          }
        </Text>
      </View>

      {Platform.OS === 'ios' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>iOS Limitations</Text>
          <Text style={styles.warningText}>
            ⚠️ iOS only provides connected Wi-Fi network information. 
            For better indoor positioning, consider using Android devices.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Indoor Positioning System...</Text>
        <Text style={styles.loadingSubtext}>Setting up sensors and permissions</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'training' && styles.modeButtonActive]}
          onPress={() => setMode('training')}
        >
          <Text style={[styles.modeButtonText, mode === 'training' && styles.modeButtonTextActive]}>
            Training
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'cleaner' && styles.modeButtonActive]}
          onPress={() => setMode('cleaner')}
        >
          <Text style={[styles.modeButtonText, mode === 'cleaner' && styles.modeButtonTextActive]}>
            Cleaner
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'training' ? renderTrainingMode() : renderCleanerMode()}
    </View>
  );
};

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 50,
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#e67e22',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scanInfo: {
    fontSize: 12,
    color: '#27ae60',
    marginTop: 8,
    textAlign: 'center',
  },
  trackingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingInfo: {
    flex: 1,
  },
  trackingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  trackingSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  locationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  methodText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#bdc3c7',
    marginBottom: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginVertical: 16,
  },
  sensorText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  wifiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  wifiInfo: {
    flex: 1,
    marginRight: 12,
  },
  wifiSSID: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  wifiBSSID: {
    fontSize: 11,
    color: '#95a5a6',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  wifiSignalContainer: {
    alignItems: 'flex-end',
  },
  wifiSignal: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  wifiFreq: {
    fontSize: 10,
    color: '#bdc3c7',
  },
  moreNetworksText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});

export default App;