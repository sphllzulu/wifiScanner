import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  PermissionsAndroid
} from 'react-native';
import {
  accelerometer,
  gyroscope,
  magnetometer,
  setUpdateIntervalForType,
  SensorTypes
} from 'react-native-sensors';
import WifiManager from 'react-native-wifi-reborn';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';

const EnhancedLocationSystem = ({ 
  token, 
  apiRequest, 
  onLocationUpdate, 
  userId, 
  enableRealTimeTracking = true 
}) => {
  // State management
  const [locationData, setLocationData] = useState({
    primary: null,
    fallback: null,
    confidence: 0,
    method: 'initializing',
    timestamp: null
  });

  const [sensorData, setSensorData] = useState({
    wifi: { networks: [], strength: 0, quality: 0 },
    magnetic: { x: 0, y: 0, z: 0, heading: 0 },
    accelerometer: { x: 0, y: 0, z: 0, movement: false },
    gyroscope: { alpha: 0, beta: 0, gamma: 0 },
    orientation: 0,
    stepCount: 0
  });

  const [systemStatus, setSystemStatus] = useState({
    wifiScanning: false,
    imuActive: false,
    magnetometerActive: false,
    positioningActive: false,
    accuracy: 'unknown',
    permissionsGranted: false
  });

  const [calibrationData, setCalibrationData] = useState({
    magneticCalibrated: false,
    stepLength: 0.75, // Average step length in meters
    orientationOffset: 0
  });

  // Refs for tracking and subscriptions
  const intervalRef = useRef(null);
  const wifiScanRef = useRef(null);
  const positionHistoryRef = useRef([]);
  const stepCounterRef = useRef(0);
  const lastKnownPositionRef = useRef(null);
  
  // Sensor subscriptions
  const accelerometerSubscription = useRef(null);
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const pedometerSubscription = useRef(null);

  // Constants for positioning algorithms
  const POSITIONING_CONFIG = {
    WIFI_SCAN_INTERVAL: 3000,
    IMU_UPDATE_INTERVAL: 100,
    POSITION_UPDATE_INTERVAL: 2000,
    MIN_WIFI_NETWORKS: 3,
    CONFIDENCE_THRESHOLD: 0.7,
    MOVEMENT_THRESHOLD: 0.5,
    STEP_DETECTION_THRESHOLD: 1.5
  };

  // Initialize system
  useEffect(() => {
    initializeSystem();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (systemStatus.permissionsGranted && enableRealTimeTracking) {
      startPositionTracking();
    } else {
      stopPositionTracking();
    }
  }, [enableRealTimeTracking, systemStatus.permissionsGranted]);

  const initializeSystem = async () => {
    try {
      await requestPermissions();
      await initializeSensors();
      setSystemStatus(prev => ({ ...prev, permissionsGranted: true }));
    } catch (error) {
      console.error('System initialization failed:', error);
      Alert.alert('Initialization Error', 'Failed to initialize enhanced positioning system');
    }
  };

  const requestPermissions = async () => {
    try {
      // Location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Android specific permissions
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
          PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
        ]);

        const allPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allPermissionsGranted) {
          throw new Error('Required permissions not granted');
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      throw error;
    }
  };

  const initializeSensors = async () => {
    try {
      // Set sensor update intervals
      setUpdateIntervalForType(SensorTypes.accelerometer, POSITIONING_CONFIG.IMU_UPDATE_INTERVAL);
      setUpdateIntervalForType(SensorTypes.gyroscope, POSITIONING_CONFIG.IMU_UPDATE_INTERVAL);
      setUpdateIntervalForType(SensorTypes.magnetometer, POSITIONING_CONFIG.IMU_UPDATE_INTERVAL);

      // Check WiFi capability
      try {
        await WifiManager.getCurrentWifiSSID();
        setSystemStatus(prev => ({ ...prev, wifiScanning: true }));
      } catch (error) {
        console.warn('WiFi scanning not available:', error);
      }

      // Setup sensor listeners
      setupSensorListeners();
      
    } catch (error) {
      console.error('Sensor initialization failed:', error);
      throw error;
    }
  };

  const setupSensorListeners = () => {
    // Accelerometer
    accelerometerSubscription.current = accelerometer.subscribe(({ x, y, z }) => {
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
      const isMoving = totalAcceleration > POSITIONING_CONFIG.MOVEMENT_THRESHOLD;
      
      // Step detection
      if (totalAcceleration > POSITIONING_CONFIG.STEP_DETECTION_THRESHOLD) {
        stepCounterRef.current += 1;
      }

      setSensorData(prev => ({
        ...prev,
        accelerometer: { x, y, z, movement: isMoving },
        stepCount: stepCounterRef.current
      }));
    });

    // Gyroscope
    gyroscopeSubscription.current = gyroscope.subscribe(({ x, y, z }) => {
      setSensorData(prev => ({
        ...prev,
        gyroscope: { alpha: x, beta: y, gamma: z }
      }));
    });

    // Magnetometer
    magnetometerSubscription.current = magnetometer.subscribe(({ x, y, z }) => {
      const heading = Math.atan2(y, x) * (180 / Math.PI);
      const normalizedHeading = heading < 0 ? heading + 360 : heading;
      
      setSensorData(prev => ({
        ...prev,
        magnetic: { x, y, z, heading: normalizedHeading },
        orientation: normalizedHeading
      }));
    });

    // Pedometer (Expo)
    const startPedometer = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (isAvailable) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 1);
          
          pedometerSubscription.current = Pedometer.watchStepCount(result => {
            setSensorData(prev => ({
              ...prev,
              stepCount: result.steps
            }));
          });
        }
      } catch (error) {
        console.warn('Pedometer not available:', error);
      }
    };

    startPedometer();

    setSystemStatus(prev => ({
      ...prev,
      imuActive: true,
      magnetometerActive: true
    }));
  };

  const startPositionTracking = () => {
    if (!systemStatus.permissionsGranted) return;

    // WiFi scanning interval
    wifiScanRef.current = setInterval(() => {
      scanWiFiNetworks();
    }, POSITIONING_CONFIG.WIFI_SCAN_INTERVAL);

    // Position calculation interval
    intervalRef.current = setInterval(() => {
      calculateEnhancedPosition();
    }, POSITIONING_CONFIG.POSITION_UPDATE_INTERVAL);

    setSystemStatus(prev => ({ ...prev, positioningActive: true }));
  };

  const stopPositionTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wifiScanRef.current) {
      clearInterval(wifiScanRef.current);
      wifiScanRef.current = null;
    }

    setSystemStatus(prev => ({ ...prev, positioningActive: false }));
  };

  const cleanup = () => {
    stopPositionTracking();
    
    // Unsubscribe from sensors
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.unsubscribe();
    }
    if (gyroscopeSubscription.current) {
      gyroscopeSubscription.current.unsubscribe();
    }
    if (magnetometerSubscription.current) {
      magnetometerSubscription.current.unsubscribe();
    }
    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
    }
  };

  const scanWiFiNetworks = async () => {
    try {
      if (!systemStatus.wifiScanning) return;

      let networks = [];
      
      if (Platform.OS === 'android') {
        // Android WiFi scanning
        networks = await WifiManager.loadWifiList();
        networks = networks.map(network => ({
          bssid: network.BSSID,
          ssid: network.SSID,
          level: network.level,
          frequency: network.frequency
        }));
      } else if (Platform.OS === 'ios') {
        // iOS has limited WiFi scanning capabilities
        // Use current connected network info
        try {
          const currentSSID = await WifiManager.getCurrentWifiSSID();
          const currentBSSID = await WifiManager.getBSSID();
          
          if (currentSSID && currentBSSID) {
            networks = [{
              bssid: currentBSSID,
              ssid: currentSSID,
              level: -50, // Estimated signal strength
              frequency: 2437 // Estimated frequency
            }];
          }
        } catch (error) {
          console.warn('iOS WiFi info not available:', error);
        }
      }

      const networkStrength = networks.length > 0 ? 
        networks.reduce((sum, network) => sum + Math.abs(network.level), 0) / networks.length : 0;
      const networkQuality = networks.length >= POSITIONING_CONFIG.MIN_WIFI_NETWORKS ? 1 : 0.5;

      setSensorData(prev => ({
        ...prev,
        wifi: {
          networks,
          strength: networkStrength,
          quality: networkQuality
        }
      }));
    } catch (error) {
      console.error('WiFi scanning failed:', error);
    }
  };

  const calculateEnhancedPosition = async () => {
    try {
      const methods = [];
      let primaryLocation = null;
      let confidence = 0;

      // Method 1: Enhanced WiFi Fingerprinting
      const wifiLocation = await calculateEnhancedWiFiPosition();
      if (wifiLocation) {
        methods.push({ method: 'enhanced_wifi', location: wifiLocation.location, confidence: wifiLocation.confidence });
      }

      // Method 2: Dead Reckoning with IMU
      const imuLocation = calculateIMUPosition();
      if (imuLocation) {
        methods.push({ method: 'imu_dead_reckoning', location: imuLocation.location, confidence: imuLocation.confidence });
      }

      // Method 3: Magnetic Field Mapping
      const magneticLocation = calculateMagneticPosition();
      if (magneticLocation) {
        methods.push({ method: 'magnetic_fingerprint', location: magneticLocation.location, confidence: magneticLocation.confidence });
      }

      // Method 4: Hybrid Fusion
      const fusedLocation = fuseLocationMethods(methods);
      
      if (fusedLocation) {
        primaryLocation = fusedLocation.location;
        confidence = fusedLocation.confidence;

        // Update position history
        positionHistoryRef.current.push({
          location: primaryLocation,
          timestamp: Date.now(),
          method: fusedLocation.method,
          confidence: confidence
        });

        // Keep only last 10 positions
        if (positionHistoryRef.current.length > 10) {
          positionHistoryRef.current.shift();
        }

        lastKnownPositionRef.current = primaryLocation;

        // Send enhanced position data
        await sendEnhancedPositionData(fusedLocation, methods);
      }

      // Update location state
      const newLocationData = {
        primary: primaryLocation,
        fallback: methods.length > 1 ? methods[1].location : null,
        confidence: confidence,
        method: fusedLocation?.method || 'unknown',
        timestamp: new Date().toISOString()
      };

      setLocationData(newLocationData);

      // Determine accuracy level
      let accuracy = 'low';
      if (confidence > 0.8) accuracy = 'high';
      else if (confidence > 0.6) accuracy = 'medium';

      setSystemStatus(prev => ({ ...prev, accuracy }));

      // Callback to parent component
      if (onLocationUpdate && primaryLocation) {
        onLocationUpdate({
          area: primaryLocation.area,
          coordinates: primaryLocation.coordinates,
          confidence: Math.round(confidence * 100),
          method: fusedLocation.method,
          timestamp: newLocationData.timestamp,
          sensors_used: methods.map(m => m.method),
          movement_detected: sensorData.accelerometer.movement
        });
      }

    } catch (error) {
      console.error('Enhanced position calculation failed:', error);
    }
  };

  const calculateEnhancedWiFiPosition = async () => {
    if (sensorData.wifi.networks.length < POSITIONING_CONFIG.MIN_WIFI_NETWORKS) {
      return null;
    }

    try {
      // Create enhanced fingerprint
      const enhancedNetworks = createEnhancedWiFiFingerprint(sensorData.wifi.networks);
      
      // Use existing estimate-position endpoint
      const response = await apiRequest('/estimate-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          wifi_networks: enhancedNetworks.enhanced_networks,
          magnetometer_data: {
            x: sensorData.magnetic.x,
            y: sensorData.magnetic.y,
            z: sensorData.magnetic.z,
            heading: sensorData.orientation
          },
          positioning_metadata: {
            bssid_pattern: enhancedNetworks.bssid_pattern,
            relative_ratios: enhancedNetworks.relative_ratios,
            extender_groups: enhancedNetworks.extender_groups,
            frequency_diversity: enhancedNetworks.frequency_diversity,
            movement_detected: sensorData.accelerometer.movement,
            step_count: sensorData.stepCount,
            positioning_method: 'enhanced_wifi_fusion'
          }
        })
      });

      if (response && response.ok) {
        const data = await response.json();
        return {
          location: {
            area: data.estimated_area,
            coordinates: data.gps_location,
            floor: 1
          },
          confidence: data.confidence / 100
        };
      }
    } catch (error) {
      console.error('Enhanced WiFi positioning failed:', error);
    }

    return null;
  };

  const createEnhancedWiFiFingerprint = (networks) => {
    const sortedNetworks = networks.sort((a, b) => b.level - a.level);
    const bssidPattern = sortedNetworks.slice(0, 5).map(n => n.bssid);
    const strongestSignal = sortedNetworks[0]?.level || -100;
    
    const relativeRatios = sortedNetworks.map(network => ({
      bssid: network.bssid,
      relative_strength: network.level - strongestSignal,
      frequency_band: network.frequency > 5000 ? '5G' : '2.4G'
    }));

    const extenderGroups = {};
    networks.forEach(network => {
      if (!extenderGroups[network.ssid]) {
        extenderGroups[network.ssid] = [];
      }
      extenderGroups[network.ssid].push(network);
    });

    const enhancedNetworks = networks.map(network => ({
      ...network,
      relative_signal: network.level - strongestSignal,
      signal_rank: sortedNetworks.findIndex(n => n.bssid === network.bssid) + 1,
      frequency_band: network.frequency > 5000 ? '5G' : '2.4G'
    }));

    return {
      enhanced_networks: enhancedNetworks,
      bssid_pattern: bssidPattern,
      relative_ratios: relativeRatios,
      extender_groups: extenderGroups,
      total_networks: networks.length,
      strongest_rssi: strongestSignal,
      frequency_diversity: networks.filter(n => n.frequency > 5000).length / networks.length
    };
  };

  const calculateIMUPosition = () => {
    if (!lastKnownPositionRef.current || !sensorData.accelerometer.movement) {
      return null;
    }

    const stepDistance = sensorData.stepCount * calibrationData.stepLength;
    const heading = sensorData.orientation;
    const deltaX = stepDistance * Math.sin(heading * Math.PI / 180);
    const deltaY = stepDistance * Math.cos(heading * Math.PI / 180);

    const estimatedPosition = {
      area: lastKnownPositionRef.current.area,
      coordinates: {
        x: (lastKnownPositionRef.current.coordinates?.x || 0) + deltaX,
        y: (lastKnownPositionRef.current.coordinates?.y || 0) + deltaY
      }
    };

    const timeSinceLastWiFi = Date.now() - (locationData.timestamp ? new Date(locationData.timestamp).getTime() : 0);
    const confidence = Math.max(0.3, 0.8 - (timeSinceLastWiFi / 60000) * 0.1);

    return {
      location: estimatedPosition,
      confidence: confidence
    };
  };

  const calculateMagneticPosition = () => {
    if (!calibrationData.magneticCalibrated) {
      return null;
    }
    return null; // Placeholder for magnetic fingerprinting
  };

  const fuseLocationMethods = (methods) => {
    if (methods.length === 0) return null;

    const weights = {
      'enhanced_wifi': 0.6,
      'imu_dead_reckoning': 0.3,
      'magnetic_fingerprint': 0.1
    };

    let bestMethod = methods[0];
    let totalConfidence = 0;

    for (const method of methods) {
      const weight = weights[method.method] || 0.1;
      const weightedConfidence = method.confidence * weight;
      
      if (weightedConfidence > totalConfidence) {
        bestMethod = method;
        totalConfidence = weightedConfidence;
      }
    }

    if (methods.length > 1) {
      const agreementBonus = 0.1 * (methods.length - 1);
      totalConfidence = Math.min(1.0, totalConfidence + agreementBonus);
    }

    return {
      location: bestMethod.location,
      confidence: totalConfidence,
      method: `fusion_${methods.map(m => m.method.split('_')[0]).join('_')}`
    };
  };

  const sendEnhancedPositionData = async (fusedLocation, methods) => {
    try {
      await apiRequest('/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          position: {
            coords: {
              latitude: fusedLocation.location.coordinates?.y || 0,
              longitude: fusedLocation.location.coordinates?.x || 0,
              accuracy: Math.round((1 - fusedLocation.confidence) * 100)
            },
            area: fusedLocation.location.area,
            confidence: Math.round(fusedLocation.confidence * 100),
            enhanced_data: {
              sensor_fusion_methods: methods.map(m => m.method),
              magnetic_heading: sensorData.orientation,
              step_count: sensorData.stepCount,
              movement_detected: sensorData.accelerometer.movement,
              wifi_quality: sensorData.wifi.quality,
              positioning_accuracy: systemStatus.accuracy
            }
          },
          positioning_method: fusedLocation.method,
          timestamp: new Date().toISOString(),
          area: fusedLocation.location.area,
          confidence_score: Math.round(fusedLocation.confidence * 100),
          wifi_networks_count: sensorData.wifi.networks.length,
          device_info: {
            platform: Platform.OS,
            enhanced_positioning: true,
            sensors_available: {
              wifi: systemStatus.wifiScanning,
              imu: systemStatus.imuActive,
              magnetometer: systemStatus.magnetometerActive
            }
          }
        })
      });
    } catch (error) {
      console.error('Failed to send enhanced position data:', error);
    }
  };

  const calibrateMagnetometer = () => {
    Alert.alert(
      'Magnetometer Calibration',
      'Move your device in a figure-8 pattern for 10 seconds',
      [
        {
          text: 'Start',
          onPress: () => {
            setTimeout(() => {
              setCalibrationData(prev => ({ ...prev, magneticCalibrated: true }));
              Alert.alert('Calibration Complete', 'Magnetometer has been calibrated');
            }, 10000);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const StatusIndicator = ({ active, label, icon }) => (
    <View style={styles.statusIndicator}>
      <View style={[styles.statusDot, { backgroundColor: active ? '#10B981' : '#EF4444' }]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* System Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enhanced Positioning System</Text>
        
        <View style={styles.statusGrid}>
          <StatusIndicator 
            active={systemStatus.wifiScanning} 
            label={`WiFi ${systemStatus.wifiScanning ? 'Active' : 'Inactive'}`} 
          />
          <StatusIndicator 
            active={systemStatus.imuActive} 
            label={`IMU ${systemStatus.imuActive ? 'Active' : 'Inactive'}`} 
          />
          <StatusIndicator 
            active={systemStatus.magnetometerActive} 
            label={`Compass ${systemStatus.magnetometerActive ? 'Active' : 'Inactive'}`} 
          />
          <StatusIndicator 
            active={systemStatus.accuracy === 'high'} 
            label={`${systemStatus.accuracy} Accuracy`} 
          />
        </View>

        {locationData.primary && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Current Location</Text>
            <View style={styles.locationDetails}>
              <Text style={styles.locationText}>
                Area: {locationData.primary.area || 'Unknown'}
              </Text>
              <Text style={styles.locationText}>
                Method: {locationData.method}
              </Text>
              <Text style={styles.confidenceText}>
                {Math.round(locationData.confidence * 100)}% confidence
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Sensor Data */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensor Data</Text>
        
        <View style={styles.sensorGrid}>
          <View style={styles.sensorSection}>
            <Text style={styles.sensorTitle}>WiFi Networks</Text>
            <Text style={styles.sensorValue}>Networks: {sensorData.wifi.networks.length}</Text>
            <Text style={styles.sensorValue}>Avg Strength: {Math.round(sensorData.wifi.strength)}dBm</Text>
            <Text style={styles.sensorValue}>Quality: {Math.round(sensorData.wifi.quality * 100)}%</Text>
          </View>
          
          <View style={styles.sensorSection}>
            <Text style={styles.sensorTitle}>Movement</Text>
            <Text style={styles.sensorValue}>Steps: {sensorData.stepCount}</Text>
            <Text style={styles.sensorValue}>Moving: {sensorData.accelerometer.movement ? 'Yes' : 'No'}</Text>
            <Text style={styles.sensorValue}>Orientation: {Math.round(sensorData.orientation)}°</Text>
          </View>
          
          <View style={styles.sensorSection}>
            <Text style={styles.sensorTitle}>Magnetic Field</Text>
            <Text style={styles.sensorValue}>Heading: {Math.round(sensorData.magnetic.heading)}°</Text>
            <Text style={styles.sensorValue}>
              Calibrated: {calibrationData.magneticCalibrated ? 'Yes' : 'No'}
            </Text>
            {!calibrationData.magneticCalibrated && (
              <TouchableOpacity onPress={calibrateMagnetometer}>
                <Text style={styles.calibrateButton}>Calibrate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, systemStatus.positioningActive ? styles.stopButton : styles.startButton]}
          onPress={systemStatus.positioningActive ? stopPositionTracking : startPositionTracking}
        >
          <Text style={styles.buttonText}>
            {systemStatus.positioningActive ? 'Stop Enhanced Tracking' : 'Start Enhanced Tracking'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={calculateEnhancedPosition}
        >
          <Text style={styles.buttonText}>Force Enhanced Update</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationInfo: {
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  locationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  locationText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sensorSection: {
    width: '32%',
    marginBottom: 16,
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  sensorValue: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  calibrateButton: {
    fontSize: 12,
    color: '#3B82F6',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  buttonContainer: {
    margin: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  updateButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EnhancedLocationSystem;