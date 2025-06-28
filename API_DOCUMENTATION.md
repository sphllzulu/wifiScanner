# API Documentation - Enhanced Indoor Positioning System

## Overview

This document describes the API endpoints used by the WiFi Scanner Enhanced Indoor Positioning System. The API provides authentication, positioning estimation, task management, and data collection services.

**Base URL**: `https://sanitapi-1.onrender.com/api`

## Authentication

All API requests (except login) require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### POST /auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "user_123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "cleaner",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

## Enhanced Positioning

### POST /estimate-position

Estimate indoor position using enhanced WiFi fingerprinting with sensor fusion.

**Request Body:**
```json
{
  "wifi_networks": [
    {
      "ssid": "Office_WiFi",
      "bssid": "aa:bb:cc:dd:ee:ff",
      "level": -45,
      "rssi": -45,
      "frequency": 2437,
      "capabilities": "WPA2",
      "timestamp": 1640995200000
    }
  ],
  "magnetometer_data": {
    "x": 0.123,
    "y": -0.456,
    "z": 0.789,
    "heading": 45.5
  },
  "accelerometer_data": {
    "x": 0.1,
    "y": 0.2,
    "z": 9.8
  },
  "positioning_metadata": {
    "bssid_pattern": ["aa:bb:cc:dd:ee:ff", "11:22:33:44:55:66"],
    "relative_ratios": [
      {
        "bssid": "aa:bb:cc:dd:ee:ff",
        "relative_strength": 0,
        "frequency_band": "2.4G"
      }
    ],
    "extender_groups": {
      "Office_WiFi": ["aa:bb:cc:dd:ee:ff", "aa:bb:cc:dd:ee:f0"]
    },
    "frequency_diversity": 0.6,
    "movement_detected": false,
    "step_count": 150,
    "positioning_method": "enhanced_wifi_fusion",
    "signal_stability": "stable",
    "positioning_accuracy": "high"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "estimated_area": "Main Office Area",
  "confidence": 85,
  "method": "Enhanced WiFi + IMU",
  "positioning_quality": "high",
  "gps_location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "enhanced_analysis": {
    "networks_used": 8,
    "extender_groups_detected": 2,
    "signal_stability": "stable",
    "magnetic_heading_consistency": 0.9,
    "positioning_factors": {
      "wifi_strength": 0.7,
      "pattern_match": 0.8,
      "extender_compensation": 0.1,
      "magnetic_consistency": 0.9
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Insufficient WiFi networks for positioning",
  "details": {
    "networks_provided": 2,
    "minimum_required": 3
  }
}
```

## Position Tracking

### POST /positions

Submit enhanced position data for tracking and analytics.

**Request Body:**
```json
{
  "position": {
    "coords": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 15.5
    },
    "area": "Main Office Area",
    "confidence": 85,
    "enhanced_data": {
      "positioning_accuracy": "high",
      "movement_detected": false,
      "magnetic_heading": 45.5,
      "step_count": 150,
      "sensor_fusion_methods": ["wifi", "magnetic", "accelerometer", "gyroscope"],
      "extender_groups_detected": 2,
      "wifi_stability": "stable",
      "enhanced_positioning": true
    }
  },
  "positioning_method": "enhanced_wifi_fusion",
  "timestamp": "2024-01-01T12:00:00Z",
  "area": "Main Office Area",
  "confidence_score": 85,
  "wifi_networks_count": 8,
  "device_info": {
    "platform": "android",
    "version": "13",
    "user_id": "user_123",
    "active_task_id": "task_456",
    "enhanced_positioning": true,
    "positioning_quality": "high"
  }
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "position_id": "pos_789",
  "message": "Enhanced position data recorded successfully",
  "analytics": {
    "accuracy_improvement": "15%",
    "confidence_score": 85,
    "positioning_quality": "high"
  }
}
```

## Fingerprint Collection

### POST /fingerprints

Submit enhanced WiFi fingerprint data for training the positioning system.

**Request Body:**
```json
{
  "area_label": "Conference Room A",
  "wifi_networks": [
    {
      "ssid": "Office_WiFi",
      "bssid": "aa:bb:cc:dd:ee:ff",
      "level": -45,
      "frequency": 2437,
      "capabilities": "WPA2",
      "timestamp": 1640995200000
    }
  ],
  "magnetometer_data": {
    "x": 0.123,
    "y": -0.456,
    "z": 0.789,
    "heading": 45.5
  },
  "accelerometer_data": {
    "x": 0.1,
    "y": 0.2,
    "z": 9.8
  },
  "gyroscope_data": {
    "x": 0.01,
    "y": 0.02,
    "z": 0.03
  },
  "gps_location": {
    "coords": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 25.0
    }
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "is_indoor": true,
  "device_info": {
    "platform": "android",
    "wifi_scanning_enabled": true,
    "user_id": "admin_123",
    "enhanced_positioning": true
  },
  "positioning_metadata": {
    "bssid_pattern": ["aa:bb:cc:dd:ee:ff", "11:22:33:44:55:66"],
    "relative_ratios": [
      {
        "bssid": "aa:bb:cc:dd:ee:ff",
        "relative_strength": 0,
        "frequency_band": "2.4G"
      }
    ],
    "extender_groups": {
      "Office_WiFi": ["aa:bb:cc:dd:ee:ff", "aa:bb:cc:dd:ee:f0"]
    },
    "total_networks": 8,
    "strongest_rssi": -35,
    "frequency_diversity": 0.6,
    "magnetic_heading": 45.5,
    "movement_state": "stationary",
    "step_count": 0,
    "positioning_accuracy": "high"
  }
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "fingerprint_id": "fp_456",
  "message": "Enhanced fingerprint saved successfully",
  "analysis": {
    "networks_captured": 8,
    "extender_groups": 2,
    "positioning_quality": "high",
    "magnetic_heading": 45.5,
    "enhancement_features": [
      "bssid_patterns",
      "relative_ratios",
      "extender_detection",
      "magnetic_fusion"
    ]
  }
}
```

## Task Management

### GET /my-tasks

Retrieve tasks assigned to the authenticated user.

**Response (Success - 200):**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task_123",
      "title": "Clean Conference Room A",
      "description": "Deep cleaning of conference room including tables, chairs, and whiteboard",
      "area_label": "Conference Room A",
      "priority": "high",
      "status": "assigned",
      "estimated_duration": 30,
      "due_date": "2024-01-01T15:00:00Z",
      "instructions": "Use disinfectant on all surfaces, vacuum carpet, empty trash",
      "assigned_to": "user_123",
      "assigned_by": "admin_456",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total_tasks": 1,
  "pending_tasks": 1,
  "in_progress_tasks": 0,
  "completed_today": 3
}
```

### POST /my-tasks/{task_id}/start

Start working on a specific task.

**Request Body:**
```json
{
  "current_location": {
    "coords": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 15.5
    }
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "task": {
    "id": "task_123",
    "title": "Clean Conference Room A",
    "status": "in_progress",
    "started_at": "2024-01-01T12:00:00Z",
    "area_label": "Conference Room A"
  },
  "message": "Task started successfully",
  "tracking_enabled": true
}
```

### POST /my-tasks/{task_id}/progress

Update task progress with current location and status.

**Request Body:**
```json
{
  "current_location": {
    "coords": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 15.5
    }
  },
  "detected_area": "Conference Room A",
  "confidence_score": 85,
  "wifi_networks_count": 8,
  "positioning_method": "enhanced_wifi_fusion"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Task progress updated",
  "location_verified": true,
  "area_match": true,
  "confidence_score": 85
}
```

### POST /my-tasks/{task_id}/complete

Complete a task with notes and quality rating.

**Request Body:**
```json
{
  "completion_notes": "All surfaces cleaned and disinfected. Carpet vacuumed thoroughly.",
  "current_location": {
    "coords": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 15.5
    }
  },
  "quality_rating": 5
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "task": {
    "id": "task_123",
    "title": "Clean Conference Room A",
    "status": "completed",
    "completed_at": "2024-01-01T12:30:00Z",
    "actual_duration": 28,
    "quality_rating": 5
  },
  "summary": {
    "estimated_duration": 30,
    "actual_duration": 28,
    "efficiency": "107%",
    "quality_rating": 5,
    "location_accuracy": "95%"
  },
  "message": "Task completed successfully"
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Login credentials are incorrect |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `TASK_NOT_FOUND` | 404 | Requested task does not exist |
| `TASK_ALREADY_STARTED` | 409 | Task is already in progress |
| `INSUFFICIENT_WIFI_DATA` | 400 | Not enough WiFi networks for positioning |
| `INVALID_LOCATION_DATA` | 400 | Location data is malformed or missing |
| `POSITIONING_FAILED` | 500 | Server-side positioning calculation failed |

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authentication**: 5 requests per minute per IP
- **Positioning**: 60 requests per minute per user
- **Task Management**: 30 requests per minute per user
- **Fingerprints**: 20 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995260
```

## Data Models

### WiFi Network Object
```json
{
  "ssid": "string",           // Network name
  "bssid": "string",          // MAC address (unique identifier)
  "level": "number",          // Signal strength in dBm
  "rssi": "number",           // Alias for level
  "frequency": "number",      // Frequency in MHz
  "capabilities": "string",   // Security capabilities
  "timestamp": "number"       // Scan timestamp
}
```

### Enhanced Positioning Metadata
```json
{
  "bssid_pattern": ["string"],              // Top 5 strongest BSSIDs
  "relative_ratios": [                      // Signal strength ratios
    {
      "bssid": "string",
      "relative_strength": "number",
      "frequency_band": "string"
    }
  ],
  "extender_groups": {                      // Detected WiFi extenders
    "ssid": ["bssid1", "bssid2"]
  },
  "frequency_diversity": "number",          // 5GHz vs 2.4GHz ratio
  "signal_stability": "string",             // stable|moderate|unstable
  "positioning_accuracy": "string",         // high|medium|low
  "magnetic_heading": "number",             // Compass heading in degrees
  "movement_state": "string",               // moving|stationary
  "step_count": "number",                   // Detected steps
  "sensor_fusion_methods": ["string"]       // Active sensor types
}
```

### Task Object
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "area_label": "string",
  "priority": "string",                     // low|medium|high|urgent
  "status": "string",                       // assigned|in_progress|completed|cancelled
  "estimated_duration": "number",           // Minutes
  "actual_duration": "number",              // Minutes (when completed)
  "due_date": "string",                     // ISO 8601 timestamp
  "instructions": "string",
  "assigned_to": "string",                  // User ID
  "assigned_by": "string",                  // Admin user ID
  "created_at": "string",                   // ISO 8601 timestamp
  "started_at": "string",                   // ISO 8601 timestamp
  "completed_at": "string",                 // ISO 8601 timestamp
  "quality_rating": "number",               // 1-5 stars
  "completion_notes": "string"
}
```

## SDK Integration Examples

### JavaScript/React Native
```javascript
// Initialize API client
const apiClient = {
  baseURL: 'https://sanitapi-1.onrender.com/api',
  token: null,
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token ? `Bearer ${this.token}` : '',
        ...options.headers,
      },
    });
    
    if (response.status === 401) {
      // Handle token expiration
      this.token = null;
      throw new Error('Authentication required');
    }
    
    return response.json();
  }
};

// Enhanced positioning request
const estimatePosition = async (wifiData, sensorData, metadata) => {
  return await apiClient.request('/estimate-position', {
    method: 'POST',
    body: JSON.stringify({
      wifi_networks: wifiData,
      magnetometer_data: sensorData.magnetometer,
      accelerometer_data: sensorData.accelerometer,
      positioning_metadata: metadata
    })
  });
};
```

## Testing & Development

### Test Credentials
```
Admin Account:
Email: testadmin@example.com
Password: testadmin

Cleaner Account:
Email: maria@company.com
Password: cleaner123
```

### Development Environment
- **Base URL**: `https://sanitapi-1.onrender.com/api`
- **CORS**: Enabled for development origins
- **Rate Limiting**: Relaxed for testing
- **Logging**: Enhanced logging for debugging

### Postman Collection
A Postman collection with all API endpoints and example requests is available for testing and development purposes.

---

This API documentation covers all endpoints used by the Enhanced Indoor Positioning System. For additional support or questions, please contact the development team.