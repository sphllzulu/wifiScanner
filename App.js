// Real Implementation App.js - No Simulation, Real Wi-Fi Scanning
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   Alert,
//   ScrollView,
//   Switch,
//   ActivityIndicator,
//   Platform,
//   PermissionsAndroid,
//   AppState
// } from 'react-native';
// import * as Location from 'expo-location';
// import { Magnetometer, Accelerometer, Gyroscope } from 'expo-sensors';
// import NetInfo from '@react-native-community/netinfo';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import WifiManager from 'react-native-wifi-reborn';

// const API_BASE_URL = 'https://sanitapi.onrender.com/api'; // Your production API

// const App = () => {
//   // App State
//   const [mode, setMode] = useState('training');
//   const [isTracking, setIsTracking] = useState(false);
//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [currentArea, setCurrentArea] = useState('Unknown');
//   const [areaLabel, setAreaLabel] = useState('');
//   const [isIndoor, setIsIndoor] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [connectionStatus, setConnectionStatus] = useState('unknown');
//   const [batteryOptimized, setBatteryOptimized] = useState(true);

//   // Real sensor data
//   const [wifiNetworks, setWifiNetworks] = useState([]);
//   const [magnetometer, setMagnetometer] = useState({ x: 0, y: 0, z: 0 });
//   const [accelerometer, setAccelerometer] = useState({ x: 0, y: 0, z: 0 });
//   const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
//   const [confidence, setConfidence] = useState(0);
//   const [positioningMethod, setPositioningMethod] = useState('unknown');
//   const [wifiScanningEnabled, setWifiScanningEnabled] = useState(true);

//   // Tracking state
//   const [collectedFingerprints, setCollectedFingerprints] = useState(0);
//   const [lastSaveTime, setLastSaveTime] = useState(null);
//   const [lastWifiScan, setLastWifiScan] = useState(null);

//   // Refs for cleanup
//   const locationSubscription = useRef(null);
//   const trackingInterval = useRef(null);
//   const wifiScanInterval = useRef(null);

//   useEffect(() => {
//     initializeApp();
//     setupAppStateListener();
    
//     return () => {
//       cleanup();
//     };
//   }, []);

//   useEffect(() => {
//     const unsubscribe = NetInfo.addEventListener(state => {
//       setConnectionStatus(state.isConnected ? 'connected' : 'disconnected');
//     });

//     return () => unsubscribe();
//   }, []);

//   const setupAppStateListener = () => {
//     const subscription = AppState.addEventListener('change', (nextAppState) => {
//       if (nextAppState === 'background' && isTracking) {
//         // Continue tracking in background for cleaner mode
//         console.log('App went to background, continuing location tracking');
//       } else if (nextAppState === 'active') {
//         // Refresh when app comes back to foreground
//         if (isTracking) {
//           updateCurrentLocation();
//         }
//       }
//     });

//     return () => subscription?.remove();
//   };

//   const initializeApp = async () => {
//     try {
//       setLoading(true);
      
//       // Request all necessary permissions
//       await requestAllPermissions();
      
//       // Initialize sensors
//       await startSensorMonitoring();
      
//       // Get initial location
//       await updateCurrentLocation();
      
//       // Load stored data
//       await loadStoredData();
      
//       console.log('App initialized successfully');
//     } catch (error) {
//       console.error('Initialization error:', error);
//       Alert.alert('Setup Error', `Failed to initialize: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//  const requestAllPermissions = async () => {
//   try {
//     // Location permissions first
//     const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
//     if (locationStatus !== 'granted') {
//       throw new Error('Location permission denied');
//     }

//     // Background location for Android
//     if (Platform.OS === 'android') {
//       try {
//         const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
//         if (backgroundStatus !== 'granted') {
//           Alert.alert('Background Location', 'Background location is recommended for continuous tracking');
//         }
//       } catch (error) {
//         console.log('Background location permission skipped:', error.message);
//       }
//     }

//     // Android-specific Wi-Fi permissions with better error handling
//     if (Platform.OS === 'android') {
//       try {
//         // Check Android version and request appropriate permissions
//         const permissions = [
//           'android.permission.ACCESS_FINE_LOCATION',
//           'android.permission.ACCESS_COARSE_LOCATION',
//         ];

//         // Only add these if they exist in the current API level
//         if (Platform.Version >= 23) {
//           permissions.push('android.permission.ACCESS_WIFI_STATE');
//         }

//         if (Platform.Version >= 29) {
//           permissions.push('android.permission.ACCESS_BACKGROUND_LOCATION');
//         }

//         const results = {};
//         for (const permission of permissions) {
//           try {
//             const result = await PermissionsAndroid.request(permission);
//             results[permission] = result;
//           } catch (permError) {
//             console.log(`Permission ${permission} failed:`, permError.message);
//             results[permission] = PermissionsAndroid.RESULTS.DENIED;
//           }
//         }

//         const hasLocationPermission = 
//           results['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
//           results['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

//         if (hasLocationPermission) {
//           setWifiScanningEnabled(true);
//           console.log('Wi-Fi scanning enabled');
//         } else {
//           Alert.alert('Location Required', 'Location permission is required for Wi-Fi scanning');
//           setWifiScanningEnabled(false);
//         }

//       } catch (androidError) {
//         console.log('Android permission error:', androidError.message);
//         // Still try to enable Wi-Fi scanning - permissions might already be granted
//         setWifiScanningEnabled(true);
//       }
//     } else {
//       // iOS - limited Wi-Fi scanning
//       setWifiScanningEnabled(false);
//       Alert.alert('iOS Limitation', 'iOS only provides limited Wi-Fi information');
//     }

//   } catch (error) {
//     console.error('Permission request error:', error);
//     // Don't throw - continue with limited functionality
//     Alert.alert('Permission Error', `Some permissions failed: ${error.message}`);
//   }
// };
//   const loadStoredData = async () => {
//     try {
//       const storedFingerprints = await AsyncStorage.getItem('fingerprint_count');
//       if (storedFingerprints) {
//         setCollectedFingerprints(parseInt(storedFingerprints));
//       }
//     } catch (error) {
//       console.error('Error loading stored data:', error);
//     }
//   };

//   const startSensorMonitoring = async () => {
//     const updateInterval = batteryOptimized ? 2000 : 1000;

//     // Magnetometer
//     Magnetometer.setUpdateInterval(updateInterval);
//     Magnetometer.addListener((data) => {
//       setMagnetometer(data);
//     });

//     // Accelerometer
//     Accelerometer.setUpdateInterval(100);
//     Accelerometer.addListener((data) => {
//       setAccelerometer(data);
      
//       // Detect movement for battery optimization
//       const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
//       const isMoving = Math.abs(magnitude - 9.81) > 2;
      
//       if (isMoving && batteryOptimized) {
//         Magnetometer.setUpdateInterval(500);
//       }
//     });

//     // Gyroscope
//     Gyroscope.setUpdateInterval(200);
//     Gyroscope.addListener((data) => {
//       setGyroscope(data);
//     });

//     console.log('Sensors started');
//   };

// const scanWiFiNetworks = async () => {
//   if (!wifiScanningEnabled) {
//     console.log('Wi-Fi scanning not enabled');
//     return [];
//   }

//   try {
//     if (Platform.OS === 'android') {
//       console.log('Starting Wi-Fi scan...');
      
//       // Force a new scan
//       const wifiList = await WifiManager.loadWifiList();
//       console.log(`Raw Wi-Fi scan result: ${wifiList.length} networks`);
      
//       const networks = wifiList
//         .filter(network => network.BSSID && network.BSSID !== '02:00:00:00:00:00')
//         .map(network => ({
//           ssid: network.SSID || 'Hidden Network',
//           bssid: network.BSSID,
//           level: network.level || -100,
//           frequency: network.frequency || 2400,
//           capabilities: network.capabilities || '',
//           timestamp: Date.now()
//         }));

//       console.log(`Filtered networks: ${networks.length}`);
//       console.log('Network details:', networks.slice(0, 3)); // Log first 3 for debugging
      
//       setLastWifiScan(new Date());
//       return networks;
      
//     } else {
//       // iOS fallback
//       const netInfo = await NetInfo.fetch();
//       if (netInfo.type === 'wifi' && netInfo.details) {
//         const connectedNetwork = {
//           ssid: netInfo.details.ssid || 'Connected Network',
//           bssid: 'ios-connected-network',
//           level: -50,
//           frequency: 2400,
//           isConnected: true,
//           timestamp: Date.now()
//         };
//         return [connectedNetwork];
//       }
//       return [];
//     }
//   } catch (error) {
//     console.error('Wi-Fi scan error:', error);
    
//     if (error.message.includes('location')) {
//       Alert.alert('Location Required', 'Wi-Fi scanning requires location permission and enabled location services');
//     } else if (error.message.includes('wifi')) {
//       Alert.alert('Wi-Fi Error', 'Please ensure Wi-Fi is enabled');
//     }
    
//     return [];
//   }
// };

//   const updateCurrentLocation = async () => {
//     try {
//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High,
//         timeout: 15000,
//         maximumAge: 10000,
//       });
      
//       setCurrentLocation(location);
      
//       // Determine indoor/outdoor based on GPS accuracy
//       const gpsAccuracy = location.coords.accuracy;
//       const isLikelyOutdoor = gpsAccuracy < 15;
//       const isLikelyIndoor = gpsAccuracy > 25;
      
//       if (isLikelyOutdoor) {
//         setIsIndoor(false);
//         setPositioningMethod('GPS');
//         setConfidence(Math.max(0, Math.min(100, 100 - gpsAccuracy * 2)));
//         setCurrentArea('Outdoor');
//       } else if (isLikelyIndoor) {
//         setIsIndoor(true);
//         await performIndoorPositioning();
//       } else {
//         // Transition zone
//         setPositioningMethod('Hybrid');
//         await performIndoorPositioning();
//       }
      
//     } catch (error) {
//       console.error('Location update error:', error);
//       setCurrentArea('Location Unavailable');
//       setConfidence(0);
      
//       if (error.code === 'E_LOCATION_TIMEOUT') {
//         Alert.alert('Location Timeout', 'GPS signal is weak. Moving to indoor mode.');
//         setIsIndoor(true);
//         await performIndoorPositioning();
//       }
//     }
//   };

//   const performIndoorPositioning = async () => {
//     try {
//       // Scan Wi-Fi networks
//       const wifiData = await scanWiFiNetworks();
//       setWifiNetworks(wifiData);
      
//       if (wifiData.length === 0) {
//         setCurrentArea('No Wi-Fi Detected');
//         setConfidence(0);
//         setPositioningMethod('IMU + Magnetic Only');
//         return;
//       }

//       // Get position estimate from server or local algorithm
//       const estimatedPosition = await estimateIndoorPosition(wifiData, magnetometer);
      
//       setCurrentArea(estimatedPosition.area);
//       setConfidence(estimatedPosition.confidence);
//       setPositioningMethod('Wi-Fi + IMU + Magnetic');
      
//       return estimatedPosition;
      
//     } catch (error) {
//       console.error('Indoor positioning error:', error);
//       setCurrentArea('Positioning Failed');
//       setConfidence(0);
//     }
//   };

//   const estimateIndoorPosition = async (wifiData, magneticData) => {
//     try {
//       // Try server-based positioning first
//       const response = await fetch(`${API_BASE_URL}/estimate-position`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': 'Bearer your-token-here' // Add authentication
//         },
//         body: JSON.stringify({
//           wifi_networks: wifiData,
//           magnetometer_data: magneticData,
//           accelerometer_data: accelerometer,
//           timestamp: new Date().toISOString()
//         }),
//         timeout: 8000
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log('Server positioning result:', result);
//         return {
//           area: result.estimated_area,
//           confidence: result.confidence,
//           method: 'server'
//         };
//       } else {
//         console.log('Server positioning failed, using local algorithm');
//       }
//     } catch (error) {
//       console.log('Network error, using local positioning:', error.message);
//     }

//     // Fallback to local positioning
//     return performLocalPositioning(wifiData);
//   };

//   const performLocalPositioning = (wifiData) => {
//     if (!wifiData || wifiData.length === 0) {
//       return { area: 'Unknown', confidence: 0, method: 'local' };
//     }

//     // Sort networks by signal strength
//     const sortedNetworks = wifiData.sort((a, b) => b.level - a.level);
//     const strongestSignal = sortedNetworks[0];
    
//     let estimatedArea = 'Unknown';
//     let confidence = 0;

//     // Enhanced area detection logic
//     const signalStrength = strongestSignal.level;
//     const networkCount = wifiData.length;
    
//     // Use signal strength and network density for area estimation
//     if (signalStrength > -40 && networkCount >= 3) {
//       estimatedArea = 'Main Office Area';
//       confidence = 85;
//     } else if (signalStrength > -60 && networkCount >= 2) {
//       estimatedArea = 'Office Zone';
//       confidence = 70;
//     } else if (signalStrength > -70) {
//       estimatedArea = 'Corridor/Transition';
//       confidence = 55;
//     } else {
//       estimatedArea = 'Remote Area';
//       confidence = 30;
//     }

//     // Adjust confidence based on network count and signal consistency
//     const signalVariance = calculateSignalVariance(wifiData);
//     confidence = Math.max(0, confidence - signalVariance);

//     console.log(`Local positioning: ${estimatedArea} (${confidence}% confidence)`);
    
//     return { 
//       area: estimatedArea, 
//       confidence: Math.round(confidence), 
//       method: 'local',
//       networksUsed: wifiData.length
//     };
//   };

//   const calculateSignalVariance = (networks) => {
//     if (networks.length < 2) return 0;
    
//     const levels = networks.map(n => n.level);
//     const mean = levels.reduce((a, b) => a + b) / levels.length;
//     const variance = levels.reduce((acc, level) => acc + Math.pow(level - mean, 2), 0) / levels.length;
    
//     return Math.min(30, variance / 10); // Cap at 30% confidence reduction
//   };

//   const startContinuousTracking = () => {
//     if (trackingInterval.current) return;
    
//     const interval = batteryOptimized ? 15000 : 8000; // 15s or 8s intervals
    
//     console.log(`Starting continuous tracking with ${interval}ms interval`);
    
//     trackingInterval.current = setInterval(async () => {
//       await updateCurrentLocation();
//       if (mode === 'cleaner') {
//         await sendPositionUpdate();
//       }
//     }, interval);

//     // Start Wi-Fi scanning interval
//     if (wifiScanningEnabled) {
//       const wifiInterval = batteryOptimized ? 20000 : 10000;
//       wifiScanInterval.current = setInterval(async () => {
//         if (isIndoor) {
//           await performIndoorPositioning();
//         }
//       }, wifiInterval);
//     }
//   };

//   const stopContinuousTracking = () => {
//     if (trackingInterval.current) {
//       clearInterval(trackingInterval.current);
//       trackingInterval.current = null;
//     }
    
//     if (wifiScanInterval.current) {
//       clearInterval(wifiScanInterval.current);
//       wifiScanInterval.current = null;
//     }
    
//     console.log('Stopped continuous tracking');
//   };

//   const sendPositionUpdate = async () => {
//     try {
//       const positionData = {
//         user_id: await AsyncStorage.getItem('user_id') || 'cleaner_001',
//         position: {
//           coords: currentLocation?.coords || {},
//           area: currentArea,
//           confidence: confidence
//         },
//         positioning_method: positioningMethod.toLowerCase().replace(/\s+/g, '_'),
//         timestamp: new Date().toISOString(),
//         area: currentArea,
//         confidence_score: confidence,
//         wifi_networks_count: wifiNetworks.length,
//         device_info: {
//           platform: Platform.OS,
//           version: Platform.Version
//         }
//       };

//       const response = await fetch(`${API_BASE_URL}/positions`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': 'Bearer your-token-here'
//         },
//         body: JSON.stringify(positionData),
//         timeout: 10000
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}`);
//       }
      
//       console.log('Position update sent successfully');
//     } catch (error) {
//       console.error('Position update failed:', error);
//       await storePositionLocally(positionData);
//     }
//   };

//   const storePositionLocally = async (positionData) => {
//     try {
//       const stored = await AsyncStorage.getItem('offline_positions') || '[]';
//       const positions = JSON.parse(stored);
//       positions.push(positionData);
      
//       const recentPositions = positions.slice(-100);
//       await AsyncStorage.setItem('offline_positions', JSON.stringify(recentPositions));
//       console.log('Position stored locally for later sync');
//     } catch (error) {
//       console.error('Failed to store position locally:', error);
//     }
//   };

// const saveFingerprint = async () => {
//   if (!areaLabel.trim()) {
//     Alert.alert('Error', 'Please enter an area label');
//     return;
//   }

//   setLoading(true);
//   try {
//     // Get fresh Wi-Fi scan
//     const wifiData = await scanWiFiNetworks();
//     setWifiNetworks(wifiData);
    
//     const fingerprintData = {
//       area_label: areaLabel.trim(),
//       wifi_networks: wifiData,
//       magnetometer_data: magnetometer,
//       accelerometer_data: accelerometer,
//       gyroscope_data: gyroscope,
//       gps_location: currentLocation,
//       timestamp: new Date().toISOString(),
//       is_indoor: isIndoor,
//       device_info: {
//         platform: Platform.OS,
//         wifi_scanning_enabled: wifiScanningEnabled
//       }
//     };

//     // TRY server first, fall back to local storage
//     try {
//       const response = await fetch(`${API_BASE_URL}/fingerprints`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(fingerprintData),
//         timeout: 5000
//       });

//       if (response.ok) {
//         console.log('Fingerprint saved to server');
//       } else {
//         throw new Error('Server error');
//       }
//     } catch (networkError) {
//       console.log('Server unavailable, saving locally:', networkError.message);
      
//       // Save locally for now
//       const storedData = await AsyncStorage.getItem('fingerprints') || '[]';
//       const fingerprints = JSON.parse(storedData);
//       fingerprints.push(fingerprintData);
//       await AsyncStorage.setItem('fingerprints', JSON.stringify(fingerprints));
      
//       console.log('Fingerprint saved locally');
//     }

//     const newCount = collectedFingerprints + 1;
//     setCollectedFingerprints(newCount);
//     await AsyncStorage.setItem('fingerprint_count', newCount.toString());
    
//     setLastSaveTime(new Date());
//     Alert.alert(
//       'Success', 
//       `Fingerprint saved for ${areaLabel}!\nWi-Fi networks: ${wifiData.length}\nTotal collected: ${newCount}\n${wifiData.length === 0 ? '⚠️ No networks detected' : '✅ Networks detected'}`
//     );
//     setAreaLabel('');

//   } catch (error) {
//     console.error('Save fingerprint error:', error);
//     Alert.alert('Error', `Failed to save fingerprint: ${error.message}`);
//   } finally {
//     setLoading(false);
//   }
// };

//   const toggleTracking = () => {
//     if (!isTracking) {
//       startContinuousTracking();
//       setIsTracking(true);
//       Alert.alert(
//         'Tracking Started', 
//         'Your position will be tracked continuously. The app will work in the background.'
//       );
//     } else {
//       stopContinuousTracking();
//       setIsTracking(false);
//       Alert.alert('Tracking Stopped', 'Position tracking has been paused');
//     }
//   };

//   const cleanup = () => {
//     console.log('Cleaning up app resources');
    
//     Magnetometer.removeAllListeners();
//     Accelerometer.removeAllListeners();
//     Gyroscope.removeAllListeners();
    
//     if (locationSubscription.current) {
//       locationSubscription.current.remove();
//     }
    
//     stopContinuousTracking();
//   };

//   useEffect(() => {
//     if (mode === 'cleaner' && isTracking) {
//       startContinuousTracking();
//     } else {
//       stopContinuousTracking();
//     }
//   }, [mode, isTracking, batteryOptimized]);

//   const renderStatusCard = () => (
//     <View style={styles.card}>
//       <Text style={styles.cardTitle}>System Status</Text>
//       <View style={styles.statusRow}>
//         <Text style={styles.statusLabel}>Environment:</Text>
//         <Text style={[styles.statusValue, { color: isIndoor ? '#e74c3c' : '#27ae60' }]}>
//           {isIndoor ? '🏢 Indoor' : '🌍 Outdoor'}
//         </Text>
//       </View>
//       <View style={styles.statusRow}>
//         <Text style={styles.statusLabel}>Method:</Text>
//         <Text style={styles.statusValue}>{positioningMethod}</Text>
//       </View>
//       <View style={styles.statusRow}>
//         <Text style={styles.statusLabel}>Confidence:</Text>
//         <Text style={[styles.statusValue, { 
//           color: confidence > 70 ? '#27ae60' : confidence > 40 ? '#f39c12' : '#e74c3c' 
//         }]}>
//           {confidence}%
//         </Text>
//       </View>
//       <View style={styles.statusRow}>
//         <Text style={styles.statusLabel}>Wi-Fi Scanning:</Text>
//         <Text style={[styles.statusValue, { 
//           color: wifiScanningEnabled ? '#27ae60' : '#e74c3c' 
//         }]}>
//           {wifiScanningEnabled ? '✅ Enabled' : '❌ Limited'}
//         </Text>
//       </View>
//       <View style={styles.statusRow}>
//         <Text style={styles.statusLabel}>Connection:</Text>
//         <Text style={[styles.statusValue, { 
//           color: connectionStatus === 'connected' ? '#27ae60' : '#e74c3c' 
//         }]}>
//           {connectionStatus === 'connected' ? '✅ Online' : '❌ Offline'}
//         </Text>
//       </View>
//       {currentLocation && (
//         <View style={styles.statusRow}>
//           <Text style={styles.statusLabel}>GPS Accuracy:</Text>
//           <Text style={styles.statusValue}>{currentLocation.coords.accuracy.toFixed(1)}m</Text>
//         </View>
//       )}
//       {lastWifiScan && (
//         <View style={styles.statusRow}>
//           <Text style={styles.statusLabel}>Last Wi-Fi Scan:</Text>
//           <Text style={styles.statusValue}>{lastWifiScan.toLocaleTimeString()}</Text>
//         </View>
//       )}
//     </View>
//   );

//   const renderTrainingMode = () => (
//     <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Training Mode</Text>
//         <Text style={styles.subtitle}>Collect real Wi-Fi fingerprints for indoor positioning</Text>
//       </View>

//       {loading && (
//         <View style={styles.loadingCard}>
//           <ActivityIndicator size="large" color="#007AFF" />
//           <Text style={styles.loadingText}>Initializing sensors and permissions...</Text>
//         </View>
//       )}

//       {renderStatusCard()}

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Training Progress</Text>
//         <Text style={styles.progressText}>
//           Fingerprints Collected: {collectedFingerprints}
//         </Text>
//         {lastSaveTime && (
//           <Text style={styles.infoText}>
//             Last saved: {lastSaveTime.toLocaleTimeString()}
//           </Text>
//         )}
//         {Platform.OS === 'ios' && (
//           <Text style={styles.warningText}>
//             ⚠️ iOS provides limited Wi-Fi data. Positioning will rely more on other sensors.
//           </Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Collect Fingerprint</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter area name (e.g., Kitchen, Office, Lobby)"
//           value={areaLabel}
//           onChangeText={setAreaLabel}
//           returnKeyType="done"
//           onSubmitEditing={saveFingerprint}
//         />
//         <TouchableOpacity 
//           style={[styles.button, loading && styles.buttonDisabled]} 
//           onPress={saveFingerprint}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="white" />
//           ) : (
//             <Text style={styles.buttonText}>Scan & Save Fingerprint</Text>
//           )}
//         </TouchableOpacity>
//         {wifiNetworks.length > 0 && (
//           <Text style={styles.scanInfo}>
//             Last scan found {wifiNetworks.length} Wi-Fi networks
//           </Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Current Wi-Fi Networks</Text>
//         {wifiNetworks.length === 0 ? (
//           <Text style={styles.noDataText}>
//             {wifiScanningEnabled ? 'No networks detected' : 'Wi-Fi scanning not available'}
//           </Text>
//         ) : (
//           wifiNetworks.slice(0, 5).map((network, index) => (
//             <View key={index} style={styles.wifiRow}>
//               <View style={styles.wifiInfo}>
//                 <Text style={styles.wifiSSID}>{network.ssid}</Text>
//                 <Text style={styles.wifiBSSID}>{network.bssid}</Text>
//               </View>
//               <View style={styles.wifiSignalContainer}>
//                 <Text style={[styles.wifiSignal, {
//                   color: network.level > -50 ? '#27ae60' : network.level > -70 ? '#f39c12' : '#e74c3c'
//                 }]}>
//                   {network.level}dBm
//                 </Text>
//                 <Text style={styles.wifiFreq}>{network.frequency}MHz</Text>
//               </View>
//             </View>
//           ))
//         )}
//         {wifiNetworks.length > 5 && (
//           <Text style={styles.moreNetworksText}>
//             +{wifiNetworks.length - 5} more networks detected
//           </Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Sensor Data</Text>
//         <Text style={styles.sensorText}>
//           Magnetometer: X:{magnetometer.x.toFixed(2)} Y:{magnetometer.y.toFixed(2)} Z:{magnetometer.z.toFixed(2)} μT
//         </Text>
//         <Text style={styles.sensorText}>
//           Accelerometer: X:{accelerometer.x.toFixed(2)} Y:{accelerometer.y.toFixed(2)} Z:{accelerometer.z.toFixed(2)} m/s²
//         </Text>
//         <Text style={styles.sensorText}>
//           Gyroscope: X:{gyroscope.x.toFixed(3)} Y:{gyroscope.y.toFixed(3)} Z:{gyroscope.z.toFixed(3)} rad/s
//         </Text>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Settings</Text>
//         <View style={styles.settingRow}>
//           <Text style={styles.settingLabel}>Battery Optimization</Text>
//           <Switch
//             value={batteryOptimized}
//             onValueChange={setBatteryOptimized}
//           />
//         </View>
//         <Text style={styles.settingDescription}>
//           {batteryOptimized ? 
//             'Reduced sensor frequency for longer battery life' : 
//             'High frequency sensing for maximum accuracy'
//           }
//         </Text>
//       </View>
//     </ScrollView>
//   );

//   const renderCleanerMode = () => (
//     <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Cleaner Mode</Text>
//         <Text style={styles.subtitle}>Real-time position tracking</Text>
//       </View>

//       {renderStatusCard()}

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Tracking Control</Text>
//         <View style={styles.trackingContainer}>
//           <View style={styles.trackingInfo}>
//             <Text style={styles.trackingText}>
//               {isTracking ? '✅ Tracking Active' : '⏸️ Tracking Paused'}
//             </Text>
//             <Text style={styles.trackingSubtext}>
//               {isTracking ? 
//                 `Updates every ${batteryOptimized ? '15' : '8'} seconds` : 
//                 'Tap to start tracking'
//               }
//             </Text>
//           </View>
//           <Switch
//             value={isTracking}
//             onValueChange={toggleTracking}
//           />
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Current Position</Text>
//         <Text style={styles.locationText}>
//           📍 {currentArea}
//         </Text>
//         <Text style={styles.methodText}>
//           Method: {positioningMethod}
//         </Text>
//         <Text style={styles.confidenceText}>
//           Confidence: {confidence}%
//         </Text>
//         {currentLocation && (
//           <Text style={styles.infoText}>
//             GPS: {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
//           </Text>
//         )}
//         {wifiNetworks.length > 0 && (
//           <Text style={styles.infoText}>
//             Using {wifiNetworks.length} Wi-Fi networks for positioning
//           </Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Real-time Wi-Fi Environment</Text>
//         {wifiNetworks.length === 0 ? (
//           <View>
//             <Text style={styles.noDataText}>No Wi-Fi networks detected</Text>
//             <TouchableOpacity 
//               style={styles.scanButton} 
//               onPress={performIndoorPositioning}
//             >
//               <Text style={styles.scanButtonText}>Manual Wi-Fi Scan</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <View>
//             <Text style={styles.infoText}>
//               Networks detected: {wifiNetworks.length} | 
//               Last scan: {lastWifiScan ? lastWifiScan.toLocaleTimeString() : 'Never'}
//             </Text>
//             {wifiNetworks.slice(0, 4).map((network, index) => (
//               <View key={index} style={styles.wifiRow}>
//                 <View style={styles.wifiInfo}>
//                   <Text style={styles.wifiSSID}>{network.ssid}</Text>
//                   <Text style={styles.wifiBSSID}>{network.bssid}</Text>
//                 </View>
//                 <View style={styles.wifiSignalContainer}>
//                   <Text style={[styles.wifiSignal, {
//                     color: network.level > -50 ? '#27ae60' : network.level > -70 ? '#f39c12' : '#e74c3c'
//                   }]}>
//                     {network.level}dBm
//                   </Text>
//                   <Text style={styles.wifiFreq}>{network.frequency}MHz</Text>
//                 </View>
//               </View>
//             ))}
//             {wifiNetworks.length > 4 && (
//               <Text style={styles.moreNetworksText}>
//                 +{wifiNetworks.length - 4} more networks
//               </Text>
//             )}
//           </View>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Settings</Text>
//         <View style={styles.settingRow}>
//           <Text style={styles.settingLabel}>Battery Optimization</Text>
//           <Switch
//             value={batteryOptimized}
//             onValueChange={setBatteryOptimized}
//           />
//         </View>
//         <Text style={styles.settingDescription}>
//           {batteryOptimized ? 
//             'Extended battery life mode - updates every 15s' : 
//             'High accuracy mode - updates every 8s'
//           }
//         </Text>
//       </View>

//       {Platform.OS === 'ios' && (
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>iOS Limitations</Text>
//           <Text style={styles.warningText}>
//             ⚠️ iOS only provides connected Wi-Fi network information. 
//             For better indoor positioning, consider using Android devices.
//           </Text>
//         </View>
//       )}
//     </ScrollView>
//   );

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//         <Text style={styles.loadingText}>Initializing Indoor Positioning System...</Text>
//         <Text style={styles.loadingSubtext}>Setting up sensors and permissions</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.app}>
//       <View style={styles.modeSelector}>
//         <TouchableOpacity
//           style={[styles.modeButton, mode === 'training' && styles.modeButtonActive]}
//           onPress={() => setMode('training')}
//         >
//           <Text style={[styles.modeButtonText, mode === 'training' && styles.modeButtonTextActive]}>
//             Training
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.modeButton, mode === 'cleaner' && styles.modeButtonActive]}
//           onPress={() => setMode('cleaner')}
//         >
//           <Text style={[styles.modeButtonText, mode === 'cleaner' && styles.modeButtonTextActive]}>
//             Cleaner
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {mode === 'training' ? renderTrainingMode() : renderCleanerMode()}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   app: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f8f9fa',
//   },
//   loadingCard: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 20,
//     marginBottom: 16,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   loadingText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#2c3e50',
//     marginTop: 16,
//     textAlign: 'center',
//   },
//   loadingSubtext: {
//     fontSize: 14,
//     color: '#7f8c8d',
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   modeSelector: {
//     flexDirection: 'row',
//     backgroundColor: 'white',
//     marginTop: 50,
//     marginHorizontal: 20,
//     borderRadius: 25,
//     padding: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   modeButton: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//     borderRadius: 20,
//   },
//   modeButtonActive: {
//     backgroundColor: '#007AFF',
//   },
//   modeButtonText: {
//     fontSize: 16,
//     color: '#666',
//     fontWeight: '600',
//   },
//   modeButtonTextActive: {
//     color: 'white',
//   },
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   header: {
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#7f8c8d',
//     marginTop: 5,
//   },
//   card: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#2c3e50',
//     marginBottom: 12,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   statusLabel: {
//     fontSize: 14,
//     color: '#7f8c8d',
//     fontWeight: '500',
//   },
//   statusValue: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2c3e50',
//   },
//   progressText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#27ae60',
//     marginBottom: 8,
//   },
//   warningText: {
//     fontSize: 12,
//     color: '#e67e22',
//     fontStyle: 'italic',
//     marginTop: 8,
//     lineHeight: 16,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     marginBottom: 16,
//     backgroundColor: '#f8f9fa',
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     borderRadius: 8,
//     padding: 16,
//     alignItems: 'center',
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   scanButton: {
//     backgroundColor: '#3498db',
//     borderRadius: 6,
//     padding: 12,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   scanButtonText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   scanInfo: {
//     fontSize: 12,
//     color: '#27ae60',
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   trackingContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   trackingInfo: {
//     flex: 1,
//   },
//   trackingText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#2c3e50',
//   },
//   trackingSubtext: {
//     fontSize: 12,
//     color: '#7f8c8d',
//     marginTop: 2,
//   },
//   locationText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#e74c3c',
//     marginBottom: 8,
//   },
//   methodText: {
//     fontSize: 16,
//     color: '#7f8c8d',
//     marginBottom: 4,
//   },
//   confidenceText: {
//     fontSize: 14,
//     color: '#95a5a6',
//     marginBottom: 8,
//   },
//   infoText: {
//     fontSize: 12,
//     color: '#bdc3c7',
//     marginBottom: 4,
//   },
//   noDataText: {
//     fontSize: 14,
//     color: '#95a5a6',
//     textAlign: 'center',
//     marginVertical: 16,
//   },
//   sensorText: {
//     fontSize: 12,
//     color: '#7f8c8d',
//     marginBottom: 4,
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   wifiRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ecf0f1',
//   },
//   wifiInfo: {
//     flex: 1,
//     marginRight: 12,
//   },
//   wifiSSID: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2c3e50',
//   },
//   wifiBSSID: {
//     fontSize: 11,
//     color: '#95a5a6',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   wifiSignalContainer: {
//     alignItems: 'flex-end',
//   },
//   wifiSignal: {
//     fontSize: 12,
//     fontWeight: '600',
//     minWidth: 50,
//     textAlign: 'right',
//   },
//   wifiFreq: {
//     fontSize: 10,
//     color: '#bdc3c7',
//   },
//   moreNetworksText: {
//     fontSize: 12,
//     color: '#7f8c8d',
//     textAlign: 'center',
//     marginTop: 8,
//     fontStyle: 'italic',
//   },
//   settingRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   settingLabel: {
//     fontSize: 16,
//     color: '#2c3e50',
//     fontWeight: '500',
//   },
//   settingDescription: {
//     fontSize: 12,
//     color: '#95a5a6',
//     fontStyle: 'italic',
//   },
// });

// export default App;

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
  AppState,
  Modal,
  FlatList
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

  // Task Management State
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [qualityRating, setQualityRating] = useState(5);
  const [lastTaskRefresh, setLastTaskRefresh] = useState(null);

  // Enhanced positioning data
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [magnetometer, setMagnetometer] = useState({ x: 0, y: 0, z: 0, heading: 0 });
  const [accelerometer, setAccelerometer] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
  const [confidence, setConfidence] = useState(0);
  const [positioningMethod, setPositioningMethod] = useState('unknown');
  const [wifiScanningEnabled, setWifiScanningEnabled] = useState(true);
  
  // Enhanced positioning features
  const [positioningQuality, setPositioningQuality] = useState('unknown');
  const [extenderGroups, setExtenderGroups] = useState({});
  const [movementState, setMovementState] = useState('stationary');
  const [stepCount, setStepCount] = useState(0);
  const [lastStepTime, setLastStepTime] = useState(0);
  const [magneticHeading, setMagneticHeading] = useState(0);
  const [wifiHistory, setWifiHistory] = useState([]);

  // Tracking state
  const [collectedFingerprints, setCollectedFingerprints] = useState(0);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [lastWifiScan, setLastWifiScan] = useState(null);

  // Refs for cleanup
  const locationSubscription = useRef(null);
  const trackingInterval = useRef(null);
  const wifiScanInterval = useRef(null);
  const taskRefreshInterval = useRef(null);

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
      if (user.role === 'cleaner') {
        loadTasks();
        setupTaskRefresh();
      }
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
      setActiveTask(null);
      setTasks([]);
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
  // TASK MANAGEMENT FUNCTIONS
  // ============================================================================

  const setupTaskRefresh = () => {
    // Refresh tasks every 30 seconds
    taskRefreshInterval.current = setInterval(() => {
      if (connectionStatus === 'connected') {
        loadTasks(false); // Silent refresh
      }
    }, 30000);
  };

 const loadTasks = async (showLoading = true) => {
  if (showLoading) setLoading(true);
  
  try {
    const response = await apiRequest('/my-tasks');
    
    if (response && response.ok) {
      const data = await response.json();
      setTasks(data.tasks || []);
      setLastTaskRefresh(new Date());
      
      // 🔥 ADD THIS LOGIC - Auto-detect active task
      const inProgressTask = data.tasks.find(t => t.status === 'in_progress');
      
      if (inProgressTask && !activeTask) {
        console.log('🎯 Found in-progress task, setting as active:', inProgressTask.id);
        setActiveTask(inProgressTask);
        setIsTracking(true);
        startContinuousTracking();
      } else if (activeTask) {
        // Check if current active task is still active
        const updatedActiveTask = data.tasks.find(t => t.id === activeTask.id);
        console.log('🔄 Checking active task update:', updatedActiveTask);
        
        if (updatedActiveTask && updatedActiveTask.status === 'in_progress') {
          console.log('✅ Active task still in progress, updating:', updatedActiveTask);
          setActiveTask(updatedActiveTask);
        } else if (updatedActiveTask && updatedActiveTask.status !== 'in_progress') {
          console.log('❌ Active task no longer in progress, clearing:', updatedActiveTask.status);
          setActiveTask(null);
          setIsTracking(false);
        }
      }
      
      console.log(`📋 Loaded ${data.tasks.length} tasks for ${user.user_id}`);
    }
  } catch (error) {
    console.error('Load tasks error:', error);
    if (showLoading) {
      Alert.alert('Error', 'Failed to load tasks');
    }
  } finally {
    if (showLoading) setLoading(false);
  }
};

  const startTask = async (task) => {
    if (activeTask) {
      Alert.alert('Task In Progress', 'You already have a task in progress. Please complete it first.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/my-tasks/${task.id}/start`, {
        method: 'POST',
        body: JSON.stringify({
          current_location: currentLocation
        }),
      });

      if (response && response.ok) {
        const data = await response.json();
        setActiveTask(data.task);
        setIsTracking(true);
        startContinuousTracking();
        
        Alert.alert(
          'Task Started', 
          `You are now working on: ${task.title}\nArea: ${task.area_label}\n\nYour location will be tracked to verify you are in the correct area.`
        );
        
        // Load tasks to update status
        loadTasks(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to start task');
      }
    } catch (error) {
      console.error('Start task error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async () => {
    if (!activeTask) return;

    setLoading(true);
    try {
      const response = await apiRequest(`/my-tasks/${activeTask.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          completion_notes: completionNotes,
          current_location: currentLocation,
          quality_rating: qualityRating
        }),
      });

      if (response && response.ok) {
        const data = await response.json();
        setActiveTask(null);
        setIsTracking(false);
        setCompletionNotes('');
        setQualityRating(5);
        setTaskModalVisible(false);
        stopContinuousTracking();
        
        Alert.alert(
          'Task Completed', 
          `Great job! You completed "${data.task.title}" in ${data.summary.actual_duration || 'unknown'} minutes.`
        );
        
        // Reload tasks
        loadTasks(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Complete task error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async () => {
    if (!activeTask || !currentLocation) return;

    try {
      await apiRequest(`/my-tasks/${activeTask.id}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          current_location: currentLocation,
          detected_area: currentArea,
          confidence_score: confidence,
          wifi_networks_count: wifiNetworks.length,
          positioning_method: positioningMethod
        }),
      });
    } catch (error) {
      console.error('Update task progress error:', error);
    }
  };

  // ============================================================================
  // APP INITIALIZATION (Enhanced with task management)
  // ============================================================================

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isTracking) {
        console.log('App went to background, continuing location tracking');
      } else if (nextAppState === 'active') {
        if (isTracking) {
          updateCurrentLocation();
        }
        if (user?.role === 'cleaner') {
          loadTasks(false); // Refresh tasks when app becomes active
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

    // Enhanced magnetometer with heading calculation
    Magnetometer.setUpdateInterval(updateInterval);
    Magnetometer.addListener((data) => {
      setMagnetometer(data);
      
      // Calculate magnetic heading
      const heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
      const normalizedHeading = (heading + 360) % 360;
      setMagneticHeading(normalizedHeading);
      
      setMagnetometer(prev => ({ ...prev, heading: normalizedHeading }));
    });

    // Enhanced accelerometer with step detection and movement analysis
    Accelerometer.setUpdateInterval(100);
    Accelerometer.addListener((data) => {
      setAccelerometer(data);
      
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      const isMoving = Math.abs(magnitude - 9.81) > 2;
      
      // Step detection algorithm
      const currentTime = Date.now();
      if (magnitude > 11 && currentTime - lastStepTime > 300) { // Min 300ms between steps
        setStepCount(prev => prev + 1);
        setLastStepTime(currentTime);
      }
      
      // Movement state detection
      setMovementState(isMoving ? 'moving' : 'stationary');
      
      if (isMoving && batteryOptimized) {
        Magnetometer.setUpdateInterval(500);
      }
    });

    Gyroscope.setUpdateInterval(200);
    Gyroscope.addListener((data) => {
      setGyroscope(data);
    });

    console.log('Enhanced sensors started with IMU + magnetic fusion');
  };

  // ============================================================================
  // ENHANCED WI-FI AND POSITIONING FUNCTIONS
  // ============================================================================

  const scanWiFiNetworks = async () => {
    if (!wifiScanningEnabled) {
      console.log('Wi-Fi scanning not enabled');
      return [];
    }

    try {
      if (Platform.OS === 'android') {
        console.log('Starting enhanced Wi-Fi scan...');
        
        const wifiList = await WifiManager.loadWifiList();
        console.log(`Raw Wi-Fi scan result: ${wifiList.length} networks`);
        
        const networks = wifiList
          .filter(network => network.BSSID && network.BSSID !== '02:00:00:00:00:00')
          .map(network => ({
            ssid: network.SSID || 'Hidden Network',
            bssid: network.BSSID,
            level: network.level || -100,
            rssi: network.level || -100, // Alias for consistency
            frequency: network.frequency || 2400,
            capabilities: network.capabilities || '',
            timestamp: Date.now()
          }))
          .sort((a, b) => b.level - a.level); // Sort by signal strength

        console.log(`Enhanced networks: ${networks.length}`);
        
        // Store in history for pattern analysis
        setWifiHistory(prev => [...prev.slice(-10), { networks, timestamp: Date.now() }]);
        
        setLastWifiScan(new Date());
        return networks;
        
      } else {
        const netInfo = await NetInfo.fetch();
        if (netInfo.type === 'wifi' && netInfo.details) {
          const connectedNetwork = {
            ssid: netInfo.details.ssid || 'Connected Network',
            bssid: 'ios-connected-network',
            level: -50,
            rssi: -50,
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

  // Enhanced WiFi analysis with extender detection and pattern recognition
  const analyzeWiFiNetworks = (networks) => {
    const analysis = {
      extender_groups: {},
      bssid_pattern: [],
      relative_ratios: [],
      signal_stability: 'unknown',
      positioning_method: 'enhanced_wifi_fingerprinting'
    };

    if (networks.length === 0) return analysis;

    // Group networks by SSID to detect extenders/mesh networks
    const ssidGroups = {};
    networks.forEach(network => {
      if (!ssidGroups[network.ssid]) {
        ssidGroups[network.ssid] = [];
      }
      ssidGroups[network.ssid].push(network);
    });

    // Detect extender groups (same SSID, different BSSID)
    Object.keys(ssidGroups).forEach(ssid => {
      if (ssidGroups[ssid].length > 1) {
        analysis.extender_groups[ssid] = ssidGroups[ssid].map(n => n.bssid);
      }
    });

    // Create BSSID pattern from top 5 strongest networks
    analysis.bssid_pattern = networks.slice(0, 5).map(n => n.bssid);

    // Calculate relative signal ratios
    if (networks.length > 0) {
      const strongestSignal = networks[0].level;
      analysis.relative_ratios = networks.slice(0, 8).map(network => ({
        bssid: network.bssid,
        relative_strength: network.level - strongestSignal,
        frequency: network.frequency
      }));
    }

    // Analyze signal stability from history
    if (wifiHistory.length >= 2) {
      const prevScan = wifiHistory[wifiHistory.length - 2];
      const currentBSSIDs = new Set(networks.map(n => n.bssid));
      const prevBSSIDs = new Set(prevScan.networks.map(n => n.bssid));
      
      const overlap = [...currentBSSIDs].filter(bssid => prevBSSIDs.has(bssid)).length;
      const stability = overlap / Math.max(currentBSSIDs.size, prevBSSIDs.size);
      
      analysis.signal_stability = stability > 0.7 ? 'stable' : stability > 0.4 ? 'moderate' : 'unstable';
    }

    console.log('WiFi Analysis:', {
      extenderGroups: Object.keys(analysis.extender_groups).length,
      patternLength: analysis.bssid_pattern.length,
      stability: analysis.signal_stability
    });

    return analysis;
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
        setPositioningQuality('high');
      } else if (isLikelyIndoor) {
        setIsIndoor(true);
        await performEnhancedIndoorPositioning();
      } else {
        setPositioningMethod('Hybrid GPS + WiFi');
        await performEnhancedIndoorPositioning();
      }

      // Update task progress if task is active
      if (activeTask && isTracking) {
        await updateTaskProgress();
      }
      
    } catch (error) {
      console.error('Location update error:', error);
      setCurrentArea('Location Unavailable');
      setConfidence(0);
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        Alert.alert('Location Timeout', 'GPS signal is weak. Moving to enhanced indoor mode.');
        setIsIndoor(true);
        await performEnhancedIndoorPositioning();
      }
    }
  };

  const performEnhancedIndoorPositioning = async () => {
    try {
      const wifiData = await scanWiFiNetworks();
      setWifiNetworks(wifiData);
      
      if (wifiData.length === 0) {
        setCurrentArea('No Wi-Fi Detected');
        setConfidence(0);
        setPositioningMethod('IMU + Magnetic Only');
        setPositioningQuality('low');
        return;
      }

      // Enhanced WiFi analysis
      const wifiAnalysis = analyzeWiFiNetworks(wifiData);
      setExtenderGroups(wifiAnalysis.extender_groups);

      // Create enhanced positioning metadata
      const positioningMetadata = {
        ...wifiAnalysis,
        magnetic_heading: magneticHeading,
        movement_state: movementState,
        step_count: stepCount,
        sensor_fusion_methods: ['wifi', 'magnetic', 'accelerometer'],
        wifi_stability: wifiAnalysis.signal_stability,
        positioning_accuracy: calculatePositioningAccuracy(wifiData, wifiAnalysis)
      };

      const estimatedPosition = await estimateEnhancedIndoorPosition(wifiData, magnetometer, positioningMetadata);
      
      setCurrentArea(estimatedPosition.area);
      setConfidence(estimatedPosition.confidence);
      setPositioningMethod(estimatedPosition.method);
      setPositioningQuality(estimatedPosition.quality || 'medium');
      
      console.log('Enhanced positioning result:', {
        area: estimatedPosition.area,
        confidence: estimatedPosition.confidence,
        method: estimatedPosition.method,
        extenderGroups: Object.keys(wifiAnalysis.extender_groups).length
      });
      
      return estimatedPosition;
      
    } catch (error) {
      console.error('Enhanced indoor positioning error:', error);
      setCurrentArea('Positioning Failed');
      setConfidence(0);
      setPositioningQuality('low');
    }
  };

  const calculatePositioningAccuracy = (wifiData, analysis) => {
    let accuracy = 'medium';
    
    // High accuracy conditions
    if (wifiData.length >= 5 && 
        analysis.signal_stability === 'stable' && 
        Object.keys(analysis.extender_groups).length === 0) {
      accuracy = 'high';
    }
    // Low accuracy conditions
    else if (wifiData.length < 3 || 
             analysis.signal_stability === 'unstable' ||
             Object.keys(analysis.extender_groups).length > 2) {
      accuracy = 'low';
    }
    
    return accuracy;
  };

  const estimateEnhancedIndoorPosition = async (wifiData, magneticData, positioningMetadata) => {
    try {
      // Enhanced server-side positioning
      const response = await apiRequest('/estimate-position', {
        method: 'POST',
        body: JSON.stringify({
          wifi_networks: wifiData,
          magnetometer_data: magneticData,
          accelerometer_data: accelerometer,
          positioning_metadata: positioningMetadata,
          timestamp: new Date().toISOString()
        }),
      });

      if (response && response.ok) {
        const result = await response.json();
        console.log('Enhanced server positioning result:', result);
        
        return {
          area: result.estimated_area,
          confidence: result.confidence,
          method: result.method || 'Enhanced WiFi + IMU',
          quality: result.positioning_quality || 'medium',
          serverBased: true
        };
      } else {
        console.log('Server positioning failed, using enhanced local algorithm');
      }
    } catch (error) {
      console.log('Network error, using enhanced local positioning:', error.message);
    }

    return performEnhancedLocalPositioning(wifiData, positioningMetadata);
  };

  const performEnhancedLocalPositioning = (wifiData, metadata) => {
    if (!wifiData || wifiData.length === 0) {
      return { 
        area: 'Unknown', 
        confidence: 0, 
        method: 'IMU Only',
        quality: 'low'
      };
    }

    const sortedNetworks = wifiData.sort((a, b) => b.level - a.level);
    const strongestSignal = sortedNetworks[0];
    
    let estimatedArea = 'Unknown';
    let confidence = 0;
    let quality = 'medium';

    const signalStrength = strongestSignal.level;
    const networkCount = wifiData.length;
    const extenderCount = Object.keys(metadata.extender_groups || {}).length;
    
    // Enhanced confidence calculation
    if (signalStrength > -40 && networkCount >= 5) {
      estimatedArea = 'Main Office Area';
      confidence = 90;
      quality = 'high';
    } else if (signalStrength > -55 && networkCount >= 3) {
      estimatedArea = 'Office Zone';
      confidence = 75;
      quality = 'high';
    } else if (signalStrength > -65 && networkCount >= 2) {
      estimatedArea = 'Corridor/Transition';
      confidence = 60;
      quality = 'medium';
    } else if (signalStrength > -75) {
      estimatedArea = 'Remote Area';
      confidence = 45;
      quality = 'low';
    } else {
      estimatedArea = 'Weak Signal Area';
      confidence = 25;
      quality = 'low';
    }

    // Apply confidence adjustments based on enhanced analysis
    
    // Reduce confidence for extenders (signal confusion)
    if (extenderCount > 0) {
      const extenderPenalty = Math.min(30, extenderCount * 10);
      confidence = Math.max(0, confidence - extenderPenalty);
      console.log(`Extender penalty applied: -${extenderPenalty}% (${extenderCount} groups)`);
    }
    
    // Boost confidence for signal stability
    if (metadata.signal_stability === 'stable') {
      confidence = Math.min(100, confidence + 10);
    } else if (metadata.signal_stability === 'unstable') {
      confidence = Math.max(0, confidence - 15);
    }
    
    // Boost confidence with magnetic heading consistency
    if (magneticHeading > 0 && wifiHistory.length >= 2) {
      const headingConsistency = analyzeHeadingConsistency();
      if (headingConsistency > 0.8) {
        confidence = Math.min(100, confidence + 8);
      }
    }
    
    // Movement state adjustment
    if (movementState === 'moving') {
      confidence = Math.max(0, confidence - 5); // Slightly reduce confidence when moving
    }

    const signalVariance = calculateSignalVariance(wifiData);
    confidence = Math.max(0, confidence - signalVariance);

    // Final quality assessment
    if (confidence >= 80) quality = 'high';
    else if (confidence >= 60) quality = 'medium';
    else quality = 'low';

    console.log(`Enhanced local positioning: ${estimatedArea} (${confidence}% confidence, ${quality} quality)`);
    console.log(`Analysis: ${networkCount} networks, ${extenderCount} extender groups, ${metadata.signal_stability} stability`);
    
    return { 
      area: estimatedArea, 
      confidence: Math.round(confidence), 
      method: 'Enhanced WiFi + IMU + Magnetic',
      quality: quality,
      networksUsed: wifiData.length,
      enhancedFeatures: true
    };
  };

  const analyzeHeadingConsistency = () => {
    if (wifiHistory.length < 2) return 0;
    
    // Check if magnetic heading has been consistent over recent scans
    const recentHeadings = wifiHistory.slice(-3).map(() => magneticHeading);
    const headingVariance = calculateHeadingVariance(recentHeadings);
    
    // Return consistency score (0-1)
    return Math.max(0, 1 - headingVariance / 30); // 30 degrees variance = 0 consistency
  };

  const calculateHeadingVariance = (headings) => {
    if (headings.length < 2) return 0;
    
    // Handle circular nature of headings (0/360 wrap)
    let variance = 0;
    for (let i = 1; i < headings.length; i++) {
      let diff = Math.abs(headings[i] - headings[i-1]);
      if (diff > 180) diff = 360 - diff; // Handle wrap-around
      variance += diff;
    }
    
    return variance / (headings.length - 1);
  };

  const calculateSignalVariance = (networks) => {
    if (networks.length < 2) return 0;
    
    const levels = networks.map(n => n.level);
    const mean = levels.reduce((a, b) => a + b) / levels.length;
    const variance = levels.reduce((acc, level) => acc + Math.pow(level - mean, 2), 0) / levels.length;
    
    return Math.min(30, variance / 10);
  };

  // ============================================================================
  // ENHANCED TRACKING FUNCTIONS
  // ============================================================================

  const startContinuousTracking = () => {
    if (trackingInterval.current) return;
    
    const interval = batteryOptimized ? 15000 : 8000;
    
    console.log(`Starting enhanced continuous tracking with ${interval}ms interval`);
    
    trackingInterval.current = setInterval(async () => {
      await updateCurrentLocation();
      if (mode === 'cleaner') {
        await sendEnhancedPositionUpdate();
      }
    }, interval);

    if (wifiScanningEnabled) {
      const wifiInterval = batteryOptimized ? 20000 : 10000;
      wifiScanInterval.current = setInterval(async () => {
        if (isIndoor) {
          await performEnhancedIndoorPositioning();
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
    
    console.log('Stopped enhanced continuous tracking');
  };

  const sendEnhancedPositionUpdate = async () => {
    try {
      const enhancedData = {
        positioning_accuracy: positioningQuality,
        movement_detected: movementState === 'moving',
        magnetic_heading: magneticHeading,
        step_count: stepCount,
        sensor_fusion_methods: ['wifi', 'magnetic', 'accelerometer', 'gyroscope'],
        extender_groups_detected: Object.keys(extenderGroups).length,
        wifi_stability: wifiHistory.length >= 2 ? 'analyzed' : 'insufficient_data',
        enhanced_positioning: true
      };

      const positionData = {
        position: {
          coords: currentLocation?.coords || {},
          area: currentArea,
          confidence: confidence,
          enhanced_data: enhancedData
        },
        positioning_method: positioningMethod.toLowerCase().replace(/\s+/g, '_'),
        timestamp: new Date().toISOString(),
        area: currentArea,
        confidence_score: confidence,
        wifi_networks_count: wifiNetworks.length,
        device_info: {
          platform: Platform.OS,
          version: Platform.Version,
          user_id: user?.user_id,
          active_task_id: activeTask?.id || null,
          enhanced_positioning: true,
          positioning_quality: positioningQuality
        }
      };

      const response = await apiRequest('/positions', {
        method: 'POST',
        body: JSON.stringify(positionData),
      });

      if (response && response.ok) {
        console.log('Enhanced position update sent successfully');
      } else {
        throw new Error(`HTTP ${response?.status || 'Unknown'}`);
      }
      
    } catch (error) {
      console.error('Enhanced position update failed:', error);
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
      console.log('Enhanced position stored locally for later sync');
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
      
      // Enhanced fingerprint with additional metadata
      const wifiAnalysis = analyzeWiFiNetworks(wifiData);
      
      const fingerprintData = {
        area_label: areaLabel.trim(),
        wifi_networks: wifiData,
        magnetometer_data: { ...magnetometer, heading: magneticHeading },
        accelerometer_data: accelerometer,
        gyroscope_data: gyroscope,
        gps_location: currentLocation,
        timestamp: new Date().toISOString(),
        is_indoor: isIndoor,
        device_info: {
          platform: Platform.OS,
          wifi_scanning_enabled: wifiScanningEnabled,
          user_id: user?.user_id,
          enhanced_positioning: true
        },
        // Enhanced metadata
        positioning_metadata: {
          ...wifiAnalysis,
          magnetic_heading: magneticHeading,
          movement_state: movementState,
          step_count: stepCount,
          positioning_accuracy: calculatePositioningAccuracy(wifiData, wifiAnalysis)
        }
      };

      const response = await apiRequest('/fingerprints', {
        method: 'POST',
        body: JSON.stringify(fingerprintData),
      });

      if (response && response.ok) {
        console.log('Enhanced fingerprint saved to server');
        
        const newCount = collectedFingerprints + 1;
        setCollectedFingerprints(newCount);
        await AsyncStorage.setItem('fingerprint_count', newCount.toString());
        
        setLastSaveTime(new Date());
        
        const extenderInfo = Object.keys(wifiAnalysis.extender_groups).length > 0 
          ? `\n🔗 ${Object.keys(wifiAnalysis.extender_groups).length} extender groups detected`
          : '';
        
        Alert.alert(
          'Enhanced Fingerprint Saved', 
          `Area: ${areaLabel}\nWi-Fi networks: ${wifiData.length}\nMagnetic heading: ${magneticHeading.toFixed(1)}°\nTotal collected: ${newCount}${extenderInfo}\n${wifiData.length === 0 ? '⚠️ No networks detected' : '✅ Enhanced data captured'}`
        );
        setAreaLabel('');
      } else {
        throw new Error('Server error');
      }

    } catch (error) {
      console.error('Save enhanced fingerprint error:', error);
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
        'Enhanced Tracking Started', 
        'Your position will be tracked using enhanced WiFi fingerprinting, IMU sensors, and magnetic heading. The app will work in the background with improved accuracy.'
      );
    } else {
      stopContinuousTracking();
      setIsTracking(false);
      Alert.alert('Tracking Stopped', 'Enhanced position tracking has been paused');
    }
  };

  const cleanup = () => {
    console.log('Cleaning up enhanced app resources');
    
    Magnetometer.removeAllListeners();
    Accelerometer.removeAllListeners();
    Gyroscope.removeAllListeners();
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    if (taskRefreshInterval.current) {
      clearInterval(taskRefreshInterval.current);
      taskRefreshInterval.current = null;
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
        <Text style={styles.loginTitle}>Enhanced Indoor Positioning System</Text>
        <Text style={styles.loginSubtitle}>Advanced WiFi + IMU + Magnetic positioning</Text>

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
          <Text style={styles.testCredentialsText}>Admin: testadmin@example.com / testadmin</Text>
          <Text style={styles.testCredentialsText}>Cleaner: maria@company.com / cleaner123</Text>
        </View>
      </View>
    </View>
  );

  const renderEnhancedStatusCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Enhanced System Status</Text>
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
          {confidence}% ({positioningQuality})
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Movement:</Text>
        <Text style={[styles.statusValue, { 
          color: movementState === 'moving' ? '#f39c12' : '#27ae60' 
        }]}>
          {movementState === 'moving' ? '🚶 Moving' : '🧍 Stationary'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Magnetic Heading:</Text>
        <Text style={styles.statusValue}>{magneticHeading.toFixed(1)}°</Text>
      </View>
      {Object.keys(extenderGroups).length > 0 && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Extender Groups:</Text>
          <Text style={[styles.statusValue, { color: '#e74c3c' }]}>
            {Object.keys(extenderGroups).length} detected
          </Text>
        </View>
      )}
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
      {activeTask && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Active Task:</Text>
          <Text style={[styles.statusValue, { color: '#007AFF', fontWeight: 'bold' }]}>
            {activeTask.area_label}
          </Text>
        </View>
      )}
      {stepCount > 0 && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Steps:</Text>
          <Text style={styles.statusValue}>{stepCount}</Text>
        </View>
      )}
    </View>
  );

  const renderTaskCard = (task) => {
    const isActive = activeTask && activeTask.id === task.id;
    const canStart = task.status === 'assigned' && !activeTask;
    const canComplete = isActive && (task.status === 'in_progress' || activeTask?.status === 'in_progress');

  
    return (
      <View key={task.id} style={[styles.taskCard, isActive && styles.activeTaskCard]}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.taskStatus, { backgroundColor: getTaskStatusColor(task.status) }]}>
            <Text style={styles.taskStatusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.taskArea}>📍 {task.area_label}</Text>
        
        {task.description && (
          <Text style={styles.taskDescription}>{task.description}</Text>
        )}
        
        <View style={styles.taskDetails}>
          <Text style={styles.taskDetail}>Priority: {task.priority}</Text>
          {task.estimated_duration && (
            <Text style={styles.taskDetail}>Est. Time: {task.estimated_duration}min</Text>
          )}
          {task.due_date && (
            <Text style={styles.taskDetail}>Due: {new Date(task.due_date).toLocaleString()}</Text>
          )}
        </View>

        {task.instructions && (
          <Text style={styles.taskInstructions}>📋 {task.instructions}</Text>
        )}

        <View style={styles.taskActions}>
        {canStart && (
          <TouchableOpacity 
            style={styles.startTaskButton} 
            onPress={() => startTask(task)}
            disabled={loading}
          >
            <Text style={styles.startTaskButtonText}>Start Task</Text>
          </TouchableOpacity>
        )}
        
        {canComplete && (
          <TouchableOpacity 
            style={styles.completeTaskButton} 
            onPress={() => {
              console.log('🎯 Complete button clicked for task:', task.id);
              setSelectedTask(task);
              setTaskModalVisible(true);
            }}
            disabled={loading}
          >
            <Text style={styles.completeTaskButtonText}>Complete Task</Text>
          </TouchableOpacity>
        )}
      </View>


        {isActive && (
          <View style={styles.locationVerification}>
            <Text style={styles.verificationTitle}>Enhanced Location Verification:</Text>
            <Text style={[styles.verificationStatus, { 
              color: currentArea === task.area_label ? '#27ae60' : '#e74c3c' 
            }]}>
              {currentArea === task.area_label ? 
                `✅ Correct area ` : 
                ` Expected area: ${task.area_label}, Detected: ${currentArea} `
              }
            </Text>
            {Object.keys(extenderGroups).length > 0 && (
              <Text style={styles.extenderWarning}>
                🔗 {Object.keys(extenderGroups).length} WiFi extender groups detected - may affect accuracy
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'assigned': return '#f39c12';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const renderTaskCompletionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={taskModalVisible}
      onRequestClose={() => setTaskModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Complete Task</Text>
          <Text style={styles.modalSubtitle}>{selectedTask?.title}</Text>
          
          <Text style={styles.inputLabel}>Completion Notes (Optional):</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Any notes about the completed work..."
            value={completionNotes}
            onChangeText={setCompletionNotes}
            multiline
            numberOfLines={4}
          />
          
          <Text style={styles.inputLabel}>Quality Rating:</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  qualityRating >= rating && styles.ratingButtonActive
                ]}
                onPress={() => setQualityRating(rating)}
              >
                <Text style={[
                  styles.ratingButtonText,
                  qualityRating >= rating && styles.ratingButtonTextActive
                ]}>
                  ⭐
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setTaskModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={completeTask}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
            Enhanced Training
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'cleaner' && styles.modeButtonActive]}
          onPress={() => setMode('cleaner')}
        >
          <Text style={[styles.modeButtonText, mode === 'cleaner' && styles.modeButtonTextActive]}>
            Smart Cleaner
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEnhancedTrainingMode = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Training Mode</Text>
        <Text style={styles.subtitle}>Advanced WiFi fingerprinting with IMU + magnetic fusion</Text>
      </View>

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing enhanced sensors and permissions...</Text>
        </View>
      )}

      {renderEnhancedStatusCard()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enhanced Training Progress</Text>
        <Text style={styles.progressText}>
          Fingerprints Collected: {collectedFingerprints}
        </Text>
        {lastSaveTime && (
          <Text style={styles.infoText}>
            Last saved: {lastSaveTime.toLocaleTimeString()}
          </Text>
        )}
        <Text style={styles.enhancedFeatures}>
          🚀 Enhanced features: Extender detection, BSSID patterns, relative ratios, magnetic heading
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Collect Enhanced Fingerprint</Text>
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
            <Text style={styles.buttonText}>Scan & Save Enhanced Fingerprint</Text>
          )}
        </TouchableOpacity>
        {wifiNetworks.length > 0 && (
          <View style={styles.scanInfoContainer}>
            <Text style={styles.scanInfo}>
              📡 {wifiNetworks.length} Wi-Fi networks • 🧭 {magneticHeading.toFixed(1)}° heading
            </Text>
            {Object.keys(extenderGroups).length > 0 && (
              <Text style={styles.extenderInfo}>
                🔗 {Object.keys(extenderGroups).length} extender groups detected
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enhanced Wi-Fi Analysis</Text>
        {wifiNetworks.length === 0 ? (
          <Text style={styles.noDataText}>
            {wifiScanningEnabled ? 'No networks detected' : 'Wi-Fi scanning not available'}
          </Text>
        ) : (
          <>
            {wifiNetworks.slice(0, 5).map((network, index) => (
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
            {Object.keys(extenderGroups).length > 0 && (
              <View style={styles.extenderGroupsContainer}>
                <Text style={styles.extenderGroupsTitle}>🔗 Detected Extender Groups:</Text>
                {Object.entries(extenderGroups).map(([ssid, bssids]) => (
                  <Text key={ssid} style={styles.extenderGroup}>
                    {ssid}: {bssids.length} access points
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
        {wifiNetworks.length > 5 && (
          <Text style={styles.moreNetworksText}>
            +{wifiNetworks.length - 5} more networks detected
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>IMU & Magnetic Sensors</Text>
        <View style={styles.sensorRow}>
          <Text style={styles.sensorLabel}>Magnetic Heading:</Text>
          <Text style={styles.sensorValue}>{magneticHeading.toFixed(1)}°</Text>
        </View>
        <View style={styles.sensorRow}>
          <Text style={styles.sensorLabel}>Movement State:</Text>
          <Text style={[styles.sensorValue, { 
            color: movementState === 'moving' ? '#f39c12' : '#27ae60' 
          }]}>
            {movementState}
          </Text>
        </View>
        <View style={styles.sensorRow}>
          <Text style={styles.sensorLabel}>Step Count:</Text>
          <Text style={styles.sensorValue}>{stepCount}</Text>
        </View>
        <View style={styles.sensorRow}>
          <Text style={styles.sensorLabel}>Accelerometer:</Text>
          <Text style={styles.sensorValue}>
            x: {accelerometer.x.toFixed(2)}, y: {accelerometer.y.toFixed(2)}, z: {accelerometer.z.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enhanced Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Battery Optimization</Text>
          <Switch
            value={batteryOptimized}
            onValueChange={setBatteryOptimized}
          />
        </View>
        <Text style={styles.settingDescription}>
          {batteryOptimized ? 
            'Enhanced mode with reduced sensor frequency for longer battery life' : 
            'High frequency enhanced sensing for maximum accuracy'
          }
        </Text>
      </View>
    </ScrollView>
  );

  const renderEnhancedCleanerMode = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Cleaner Mode</Text>
        <Text style={styles.subtitle}>Enhanced task management with precise positioning</Text>
      </View>

      {renderEnhancedStatusCard()}

      {/* Active Task Section */}
      {activeTask && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Active Task</Text>
          {renderTaskCard(activeTask)}
        </View>
      )}

      {/* Task List Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 My Tasks</Text>
          <TouchableOpacity 
            onPress={() => loadTasks(true)} 
            style={styles.refreshButton}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? '...' : '🔄'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {lastTaskRefresh && (
          <Text style={styles.infoText}>
            Last updated: {lastTaskRefresh.toLocaleTimeString()}
          </Text>
        )}
        
        {tasks.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Text style={styles.noTasksText}>No tasks assigned</Text>
            <Text style={styles.noTasksSubtext}>New tasks will appear here when assigned by your supervisor</Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks
              .filter(task => task.status !== 'completed' && task.status !== 'cancelled')
              .map(task => renderTaskCard(task))}
            
            {/* Completed tasks section */}
            {tasks.filter(task => task.status === 'completed').length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.sectionTitle}>✅ Completed Today</Text>
                {tasks
                  .filter(task => task.status === 'completed' && 
                    new Date(task.completed_at).toDateString() === new Date().toDateString())
                  .map(task => (
                    <View key={task.id} style={styles.completedTaskCard}>
                      <Text style={styles.completedTaskTitle}>{task.title}</Text>
                      <Text style={styles.completedTaskArea}>📍 {task.area_label}</Text>
                      {task.actual_duration && (
                        <Text style={styles.completedTaskTime}>
                          ⏱️ Completed in {task.actual_duration} minutes
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Enhanced Current Position */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Enhanced Position Detection</Text>
        <Text style={styles.locationText}>
          {currentArea}
        </Text>
        <Text style={styles.methodText}>
          Method: {positioningMethod}
        </Text>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>
            Confidence: {confidence}%
          </Text>
          <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(positioningQuality) }]}>
            <Text style={styles.qualityText}>{positioningQuality.toUpperCase()}</Text>
          </View>
        </View>
        
        {/* Enhanced positioning details */}
        <View style={styles.positioningDetails}>
          <Text style={styles.detailText}>🧭 Heading: {magneticHeading.toFixed(1)}°</Text>
          <Text style={styles.detailText}>📡 Networks: {wifiNetworks.length}</Text>
          <Text style={styles.detailText}>🚶 {movementState === 'moving' ? 'Moving' : 'Stationary'}</Text>
          {stepCount > 0 && (
            <Text style={styles.detailText}>👟 Steps: {stepCount}</Text>
          )}
        </View>

        {Object.keys(extenderGroups).length > 0 && (
          <View style={styles.extenderWarningCard}>
            <Text style={styles.extenderWarningText}>
              🔗 {Object.keys(extenderGroups).length} WiFi extender groups detected
            </Text>
            <Text style={styles.extenderWarningSubtext}>
              Position accuracy may be affected by network extenders
            </Text>
          </View>
        )}

        {currentLocation && (
          <Text style={styles.infoText}>
            GPS: {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
          </Text>
        )}
        
        {activeTask && currentArea !== activeTask.area_label && (
          <View style={styles.locationWarning}>
            <Text style={styles.warningText}>
              ⚠️ You should be in: {activeTask.area_label}
            </Text>
            <Text style={styles.warningSubtext}>
              Move to the assigned area to complete your task
            </Text>
          </View>
        )}
      </View>

      {/* Enhanced Tracking Control */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛰️ Enhanced Tracking Control</Text>
        <View style={styles.trackingContainer}>
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingText}>
              {isTracking ? '✅ Smart Tracking Active' : '⏸️ Tracking Paused'}
            </Text>
            <Text style={styles.trackingSubtext}>
              {isTracking ? 
                `Enhanced updates every ${batteryOptimized ? '15' : '8'} seconds with WiFi + IMU fusion` : 
                activeTask ? 'Automatic enhanced tracking when task is active' : 'Tap to start enhanced tracking'
              }
            </Text>
          </View>
          {!activeTask && (
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
            />
          )}
        </View>
        {activeTask && (
          <Text style={styles.autoTrackingNote}>
            🤖 Automatic enhanced tracking with extender detection is enabled for your active task
          </Text>
        )}
      </View>

      {/* Enhanced WiFi Networks Display */}
      {wifiNetworks.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📡 Current WiFi Environment</Text>
          <Text style={styles.wifiSummary}>
            {wifiNetworks.length} networks detected • Quality: {positioningQuality}
          </Text>
          
          {Object.keys(extenderGroups).length > 0 && (
            <View style={styles.extenderSummary}>
              <Text style={styles.extenderSummaryText}>
                🔗 Extender Groups: {Object.keys(extenderGroups).length}
              </Text>
              {Object.entries(extenderGroups).slice(0, 2).map(([ssid, bssids]) => (
                <Text key={ssid} style={styles.extenderDetail}>
                  • {ssid}: {bssids.length} access points
                </Text>
              ))}
            </View>
          )}
          
          <View style={styles.topNetworks}>
            <Text style={styles.topNetworksTitle}>🏆 Strongest Networks:</Text>
            {wifiNetworks.slice(0, 3).map((network, index) => (
              <View key={index} style={styles.networkSummary}>
                <Text style={styles.networkSSID}>{network.ssid}</Text>
                <Text style={[styles.networkSignal, {
                  color: network.level > -50 ? '#27ae60' : network.level > -70 ? '#f39c12' : '#e74c3c'
                }]}>
                  {network.level}dBm
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Enhanced Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚙️ Enhanced Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Battery Optimization</Text>
          <Switch
            value={batteryOptimized}
            onValueChange={setBatteryOptimized}
          />
        </View>
        <Text style={styles.settingDescription}>
          {batteryOptimized ? 
            'Extended battery life mode - enhanced updates every 15s' : 
            'High accuracy mode - enhanced updates every 8s with full sensor fusion'
          }
        </Text>
        
        <View style={styles.enhancedFeaturesInfo}>
          <Text style={styles.enhancedFeaturesTitle}>🚀 Enhanced Features Active:</Text>
          <Text style={styles.featureItem}>• BSSID pattern recognition</Text>
          <Text style={styles.featureItem}>• Relative signal ratio analysis</Text>
          <Text style={styles.featureItem}>• WiFi extender detection & compensation</Text>
          <Text style={styles.featureItem}>• IMU + magnetic heading fusion</Text>
          <Text style={styles.featureItem}>• Movement state analysis</Text>
          <Text style={styles.featureItem}>• Step counting integration</Text>
        </View>
      </View>

      {/* Task Completion Modal */}
      {renderTaskCompletionModal()}
    </ScrollView>
  );

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'high': return '#27ae60';
      case 'medium': return '#f39c12';
      case 'low': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Enhanced Positioning System...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return renderLoginScreen();
  }

  if (loading && (!tasks || tasks.length === 0) && user?.role === 'cleaner') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Enhanced Indoor Positioning System...</Text>
        <Text style={styles.loadingSubtext}>Setting up WiFi + IMU + magnetic sensors for precise tracking</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      {renderModeSelector()}
      {mode === 'training' ? renderEnhancedTrainingMode() : renderEnhancedCleanerMode()}
      {renderTaskCompletionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  // Login Styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  loginSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testCredentials: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  testCredentialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  testCredentialsText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },

  // Header Styles
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: 'white',
  },

  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  
  // Enhanced Status Styles
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Enhanced Positioning Styles
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  positioningDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginRight: 15,
    marginBottom: 5,
  },
  extenderWarningCard: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  extenderWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
  },
  extenderWarningSubtext: {
    fontSize: 11,
    color: '#856404',
    marginTop: 2,
  },

  // Task Styles
  taskCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeTaskCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  taskStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  taskArea: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  taskDetail: {
    fontSize: 12,
    color: '#999',
    marginRight: 15,
    marginBottom: 5,
  },
  taskInstructions: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  startTaskButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  startTaskButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  completeTaskButton: {
    backgroundColor: 'red',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  completeTaskButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  locationVerification: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  verificationStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  extenderWarning: {
    fontSize: 11,
    color: '#856404',
    marginTop: 5,
    fontStyle: 'italic',
  },
  
  // Enhanced Features Styles
  enhancedFeatures: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 5,
  },
  scanInfoContainer: {
    marginTop: 10,
  },
  scanInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  extenderInfo: {
    fontSize: 11,
    color: '#856404',
    textAlign: 'center',
    marginTop: 5,
  },
  extenderGroupsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
  },
  extenderGroupsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 5,
  },
  extenderGroup: {
    fontSize: 11,
    color: '#856404',
    marginLeft: 10,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sensorLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sensorValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  wifiSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  extenderSummary: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  extenderSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 5,
  },
  extenderDetail: {
    fontSize: 11,
    color: '#856404',
    marginLeft: 10,
  },
  topNetworks: {
    marginTop: 10,
  },
  topNetworksTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  networkSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  networkSSID: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  networkSignal: {
    fontSize: 12,
    fontWeight: '600',
  },
  enhancedFeaturesInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  enhancedFeaturesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 11,
    color: '#1976d2',
    marginBottom: 3,
  },

  // Task List Styles
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTasksText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  noTasksSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  tasksList: {
    marginTop: 10,
  },
  completedSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  completedTaskCard: {
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  completedTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#155724',
  },
  completedTaskArea: {
    fontSize: 12,
    color: '#155724',
    marginTop: 2,
  },
  completedTaskTime: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingButton: {
    padding: 10,
    marginHorizontal: 5,
  },
  ratingButtonActive: {
    backgroundColor: '#ffc107',
    borderRadius: 20,
  },
  ratingButtonText: {
    fontSize: 20,
  },
  ratingButtonTextActive: {
    fontSize: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginLeft: 10,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  locationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  methodText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 10,
  },
  locationWarning: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    marginTop: 2,
  },

  // Tracking Styles
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
    color: '#333',
  },
  trackingSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  autoTrackingNote: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },

  // Settings Styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  completeTaskButton: {
  backgroundColor: '#007AFF',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 6,
  marginLeft: 10,
},
completeTaskButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '600',
},
  })

  export default App;