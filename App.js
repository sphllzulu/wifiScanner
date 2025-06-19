// Real Implementation App.js - No Simulation, Real Wi-Fi Scanning
// Enhanced Mobile App with Authentication - App.js
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

const API_BASE_URL = 'https://sanitapi-1.onrender.com/api';

const App = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Login State
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // App State
  const [mode, setMode] = useState('cleaner');
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
    checkAuthStatus();
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

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeApp();
    }
  }, [isAuthenticated, user]);

  // ============================================================================
  // AUTHENTICATION FUNCTIONS
  // ============================================================================

  const checkAuthStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Set mode based on user role
        const userData = JSON.parse(storedUser);
        if (userData.role === 'admin') {
          setMode('training'); // Admin defaults to training mode
        } else {
          setMode('cleaner'); // Cleaners can only use cleaner mode
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoginLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);

        // Set appropriate mode based on role
        if (data.user.role === 'admin') {
          setMode('training');
        } else {
          setMode('cleaner');
        }

        Alert.alert('Success', `Welcome back, ${data.user.name}!`);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsTracking(false);
      cleanup();
      Alert.alert('Logged Out', 'You have been logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const apiRequest = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        await handleLogout();
        Alert.alert('Session Expired', 'Please log in again');
        return null;
      }

      return response;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };

  // ============================================================================
  // APP INITIALIZATION (Same as before but with auth)
  // ============================================================================

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isTracking) {
        console.log('App went to background, continuing location tracking');
      } else if (nextAppState === 'active') {
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
      await requestAllPermissions();
      await startSensorMonitoring();
      await updateCurrentLocation();
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
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

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

      if (Platform.OS === 'android') {
        try {
          const permissions = [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
          ];

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
          setWifiScanningEnabled(true);
        }
      } else {
        setWifiScanningEnabled(false);
        Alert.alert('iOS Limitation', 'iOS only provides limited Wi-Fi information');
      }

    } catch (error) {
      console.error('Permission request error:', error);
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

    Magnetometer.setUpdateInterval(updateInterval);
    Magnetometer.addListener((data) => {
      setMagnetometer(data);
    });

    Accelerometer.setUpdateInterval(100);
    Accelerometer.addListener((data) => {
      setAccelerometer(data);
      
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      const isMoving = Math.abs(magnitude - 9.81) > 2;
      
      if (isMoving && batteryOptimized) {
        Magnetometer.setUpdateInterval(500);
      }
    });

    Gyroscope.setUpdateInterval(200);
    Gyroscope.addListener((data) => {
      setGyroscope(data);
    });

    console.log('Sensors started');
  };

  // ============================================================================
  // WI-FI AND POSITIONING FUNCTIONS (Enhanced with auth)
  // ============================================================================

  const scanWiFiNetworks = async () => {
    if (!wifiScanningEnabled) {
      console.log('Wi-Fi scanning not enabled');
      return [];
    }

    try {
      if (Platform.OS === 'android') {
        console.log('Starting Wi-Fi scan...');
        
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
        console.log('Network details:', networks.slice(0, 3));
        
        setLastWifiScan(new Date());
        return networks;
        
      } else {
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
      const wifiData = await scanWiFiNetworks();
      setWifiNetworks(wifiData);
      
      if (wifiData.length === 0) {
        setCurrentArea('No Wi-Fi Detected');
        setConfidence(0);
        setPositioningMethod('IMU + Magnetic Only');
        return;
      }

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
      const response = await apiRequest('/estimate-position', {
        method: 'POST',
        body: JSON.stringify({
          wifi_networks: wifiData,
          magnetometer_data: magneticData,
          accelerometer_data: accelerometer,
          timestamp: new Date().toISOString()
        }),
      });

      if (response && response.ok) {
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

    return performLocalPositioning(wifiData);
  };

  const performLocalPositioning = (wifiData) => {
    if (!wifiData || wifiData.length === 0) {
      return { area: 'Unknown', confidence: 0, method: 'local' };
    }

    const sortedNetworks = wifiData.sort((a, b) => b.level - a.level);
    const strongestSignal = sortedNetworks[0];
    
    let estimatedArea = 'Unknown';
    let confidence = 0;

    const signalStrength = strongestSignal.level;
    const networkCount = wifiData.length;
    
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
    
    return Math.min(30, variance / 10);
  };

  // ============================================================================
  // TRACKING FUNCTIONS (Enhanced with auth)
  // ============================================================================

  const startContinuousTracking = () => {
    if (trackingInterval.current) return;
    
    const interval = batteryOptimized ? 15000 : 8000;
    
    console.log(`Starting continuous tracking with ${interval}ms interval`);
    
    trackingInterval.current = setInterval(async () => {
      await updateCurrentLocation();
      if (mode === 'cleaner') {
        await sendPositionUpdate();
      }
    }, interval);

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
          version: Platform.Version,
          user_id: user?.user_id
        }
      };

      const response = await apiRequest('/positions', {
        method: 'POST',
        body: JSON.stringify(positionData),
      });

      if (response && response.ok) {
        console.log('Position update sent successfully');
      } else {
        throw new Error(`HTTP ${response?.status || 'Unknown'}`);
      }
      
    } catch (error) {
      console.error('Position update failed:', error);
      await storePositionLocally(positionData);
    }
  };

  const storePositionLocally = async (positionData) => {
    try {
      const stored = await AsyncStorage.getItem('offline_positions') || '[]';
      const positions = JSON.parse(stored);
      positions.push({ ...positionData, user_id: user?.user_id });
      
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
          wifi_scanning_enabled: wifiScanningEnabled,
          user_id: user?.user_id
        }
      };

      const response = await apiRequest('/fingerprints', {
        method: 'POST',
        body: JSON.stringify(fingerprintData),
      });

      if (response && response.ok) {
        console.log('Fingerprint saved to server');
        
        const newCount = collectedFingerprints + 1;
        setCollectedFingerprints(newCount);
        await AsyncStorage.setItem('fingerprint_count', newCount.toString());
        
        setLastSaveTime(new Date());
        Alert.alert(
          'Success', 
          `Fingerprint saved for ${areaLabel}!\nWi-Fi networks: ${wifiData.length}\nTotal collected: ${newCount}\n${wifiData.length === 0 ? '⚠️ No networks detected' : '✅ Networks detected'}`
        );
        setAreaLabel('');
      } else {
        throw new Error('Server error');
      }

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

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderLoginScreen = () => (
    <View style={styles.loginContainer}>
      <View style={styles.loginCard}>
        <Text style={styles.loginTitle}>Indoor Positioning System</Text>
        <Text style={styles.loginSubtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.loginInput}
          placeholder="Email"
          value={loginForm.email}
          onChangeText={(text) => setLoginForm({...loginForm, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.loginInput}
          placeholder="Password"
          value={loginForm.password}
          onChangeText={(text) => setLoginForm({...loginForm, password: text})}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity 
          style={[styles.loginButton, isLoginLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoginLoading}
        >
          {isLoginLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.testCredentials}>
          <Text style={styles.testCredentialsTitle}>Test Credentials:</Text>
          <Text style={styles.testCredentialsText}>Admin: admin@indoorpositioning.com / admin123</Text>
          <Text style={styles.testCredentialsText}>Cleaner: maria@company.com / cleaner123</Text>
        </View>
      </View>
    </View>
  );

  const renderStatusCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>System Status</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>User:</Text>
        <Text style={styles.statusValue}>{user?.name} ({user?.role})</Text>
      </View>
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
    </View>
  );

  const renderModeSelector = () => {
    // Only show mode selector for admins
    if (user?.role !== 'admin') return null;

    return (
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
    );
  };

  const renderTrainingMode = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Training Mode</Text>
        <Text style={styles.subtitle}>Collect Wi-Fi fingerprints for indoor positioning</Text>
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
    </ScrollView>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return renderLoginScreen();
  }

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
      {renderModeSelector()}
      {mode === 'training' ? renderTrainingMode() : renderCleanerMode()}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
  // Login Styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  testCredentials: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  testCredentialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  testCredentialsText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Mode Selector Styles
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
  // Main App Styles
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    flex: 1,
    textAlign: 'right',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
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
});

export default App;