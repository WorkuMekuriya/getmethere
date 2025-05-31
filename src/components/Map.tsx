import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform, Modal, Animated, ScrollView } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  MapType,
  Region,
  LatLng,
} from 'react-native-maps';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { decodePolyline } from '@/services/navigationService';
import { RootState } from '@/store';
import { Location, Route } from '@/types/navigation';
import { NIGHT_STYLE, RETRO_STYLE, GRAYSCALE_STYLE } from './mapStylesData';

// Type for coordinates from polyline decoding
type Coordinate = {
  latitude: number;
  longitude: number;
};

// Add this type definition near the top with other types
type TrafficSegment = {
  startIndex: number;
  endIndex: number;
  severity: 'low' | 'medium' | 'high';
};

interface MapProps {
  onMapPress?: (location: Location) => void;
  testID?: string;
  mapRef?: React.RefObject<MapView | null>;
}

interface MapControlsProps {
  mapType: MapType;
  showTraffic: boolean;
  onMapTypeChange: (type: MapType) => void;
  onTrafficToggle: (show: boolean) => void;
  onClose: () => void;
}

const CUSTOM_STYLES = [
  {
    key: 'night',
    icon: 'moon-outline',
    label: 'Night',
    description: 'Dark mode for night driving',
    style: NIGHT_STYLE,
  },
  {
    key: 'retro',
    icon: 'color-filter-outline',
    label: 'Retro',
    description: 'Vintage map colors',
    style: RETRO_STYLE,
  },
  {
    key: 'grayscale',
    icon: 'contrast-outline',
    label: 'Grayscale',
    description: 'Minimal black & white',
    style: GRAYSCALE_STYLE,
  },
];

const MapControls: React.FC<MapControlsProps & {
  customStyleKey: string | null;
  onCustomStyleChange: (key: string | null) => void;
}> = ({
  mapType,
  showTraffic,
  onMapTypeChange,
  onTrafficToggle,
  onClose,
  customStyleKey,
  onCustomStyleChange,
}) => {
  const mapStyles = [
    { 
      type: 'standard' as MapType, 
      icon: 'navigate-outline', 
      label: 'Default Map',
      description: 'Standard road map view',
      custom: false,
    },
    { 
      type: 'satellite' as MapType, 
      icon: 'planet-outline', 
      label: 'Satellite',
      description: 'Satellite imagery',
      custom: false,
    },
    { 
      type: 'hybrid' as MapType, 
      icon: 'globe-outline', 
      label: 'Hybrid',
      description: 'Satellite with labels',
      custom: false,
    },
    { 
      type: 'terrain' as MapType, 
      icon: 'analytics-outline', 
      label: 'Terrain',
      description: 'Topographic view',
      custom: false,
    },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.mapControlsContainer}>
          <View style={styles.mapControlsHeader}>
            <Text style={styles.mapControlsTitle}>Map Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.mapControlsContent}>
            <View style={styles.mapControlsSection}>
              <Text style={styles.mapControlsSectionTitle}>Map Style</Text>
              <View style={styles.mapStyleGrid}>
                {mapStyles.map((style) => (
                  <TouchableOpacity
                    key={style.type}
                    style={[
                      styles.mapStyleOption,
                      mapType === style.type && !customStyleKey && styles.selectedMapStyle,
                    ]}
                    onPress={() => {
                      onMapTypeChange(style.type);
                      onCustomStyleChange(null);
                    }}
                  >
                    <View style={styles.mapStyleIconContainer}>
                      <Ionicons
                        name={style.icon as any}
                        size={28}
                        color={mapType === style.type && !customStyleKey ? '#1a73e8' : '#000000'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.mapStyleLabel,
                        mapType === style.type && !customStyleKey && styles.selectedMapStyleLabel,
                      ]}
                    >
                      {style.label}
                    </Text>
                    <Text style={styles.mapStyleDescription}>
                      {style.description}
                    </Text>
                  </TouchableOpacity>
                ))}
                {CUSTOM_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style.key}
                    style={[
                      styles.mapStyleOption,
                      customStyleKey === style.key && styles.selectedMapStyle,
                    ]}
                    onPress={() => {
                      onMapTypeChange('standard');
                      onCustomStyleChange(style.key);
                    }}
                  >
                    <View style={styles.mapStyleIconContainer}>
                      <Ionicons
                        name={style.icon as any}
                        size={28}
                        color={customStyleKey === style.key ? '#1a73e8' : '#000000'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.mapStyleLabel,
                        customStyleKey === style.key && styles.selectedMapStyleLabel,
                      ]}
                    >
                      {style.label}
                    </Text>
                    <Text style={styles.mapStyleDescription}>
                      {style.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.mapControlsSection}>
              <Text style={styles.mapControlsSectionTitle}>Features</Text>
              <View style={styles.mapFeaturesList}>
                <TouchableOpacity
                  style={[
                    styles.mapFeatureOption,
                    showTraffic && styles.selectedMapFeature,
                  ]}
                  onPress={() => onTrafficToggle(!showTraffic)}
                >
                  <Ionicons
                    name={'car-sport-outline'}
                    size={24}
                    color={showTraffic ? '#1a73e8' : '#000000'}
                  />
                  <Text
                    style={[
                      styles.mapFeatureLabel,
                      showTraffic && styles.selectedMapFeatureLabel,
                    ]}
                  >
                    Traffic
                  </Text>
                  <View style={styles.mapFeatureToggle}>
                    <View
                      style={[
                        styles.toggleTrack,
                        showTraffic && styles.toggleTrackActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          showTraffic && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Update the helper function to use standard traffic colors
const getTrafficColor = (severity: 'low' | 'medium' | 'high'): string => {
  switch (severity) {
    case 'low':
      return '#4CAF50'; // Green - Free flow
    case 'medium':
      return '#FFC107'; // Yellow - Moderate traffic
    case 'high':
      return '#F44336'; // Red - Heavy traffic
    default:
      return '#1a73e8'; // Default blue
  }
};

export const Map: React.FC<MapProps> = ({ onMapPress, testID, mapRef: externalMapRef }) => {
  const internalMapRef = useRef<MapView | null>(null);
  const mapRef = externalMapRef || internalMapRef;
  const [mapType, setMapType] = useState<MapType>('standard');
  const [heading, setHeading] = useState(0);
  const [showCompass, setShowCompass] = useState(false);
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false);
  const compassRotation = useRef(new Animated.Value(0)).current;
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [currentZoom, setCurrentZoom] = useState(15);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [customStyleKey, setCustomStyleKey] = useState<string | null>(null);
  const [customMapStyle, setCustomMapStyle] = useState<any>(null);

  // Get only the essential navigation state
  const {
    currentLocation,
    waypoints,
    route,
    alternativeRoutes,
    selectedRouteIndex,
    heading: routeHeading,
    speed,
  } = useSelector((state: RootState) => state.navigation);

  // Add persistence for map settings
  useEffect(() => {
    const loadMapSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('@map_settings');
        if (savedSettings) {
          const { mapType: savedMapType, showTraffic: savedShowTraffic, customStyleKey: savedCustomStyleKey } = JSON.parse(savedSettings);
          setMapType(savedMapType);
          setShowTraffic(savedShowTraffic);
          setCustomStyleKey(savedCustomStyleKey || null);
          if (savedCustomStyleKey) {
            const found = CUSTOM_STYLES.find(s => s.key === savedCustomStyleKey);
            setCustomMapStyle(found ? found.style : null);
          }
        }
      } catch (error) {
        console.error('Error loading map settings:', error);
      }
    };
    loadMapSettings();
  }, []);

  const saveMapSettings = async (newMapType: MapType, newShowTraffic: boolean, newCustomStyleKey: string | null) => {
    try {
      await AsyncStorage.setItem(
        '@map_settings',
        JSON.stringify({
          mapType: newMapType,
          showTraffic: newShowTraffic,
          customStyleKey: newCustomStyleKey,
        })
      );
    } catch (error) {
      console.error('Error saving map settings:', error);
    }
  };

  const handleMapTypeChange = (type: MapType) => {
    setMapType(type);
    setCustomStyleKey(null);
    setCustomMapStyle(null);
    saveMapSettings(type, showTraffic, null);
  };

  const handleCustomStyleChange = (key: string | null) => {
    setCustomStyleKey(key);
    if (key) {
      const found = CUSTOM_STYLES.find(s => s.key === key);
      setCustomMapStyle(found ? found.style : null);
      setMapType('standard');
      saveMapSettings('standard', showTraffic, key);
    } else {
      setCustomMapStyle(null);
      saveMapSettings(mapType, showTraffic, null);
    }
  };

  const handleTrafficToggle = (show: boolean) => {
    setShowTraffic(show);
    saveMapSettings(mapType, show, customStyleKey);
  };

  // Simple click handler with timeout
  const handleMapPress = (event: any) => {
    if (clickTimeoutRef.current) {
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 500);

    if (onMapPress && event?.nativeEvent?.coordinate) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onMapPress({
        latitude,
        longitude,
        accuracy: 0,
        altitude: null,
        speed: null,
        heading: null,
      });
    }
  };

  // Simple location button handler
  const handleMyLocationPress = () => {
    if (clickTimeoutRef.current) {
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 500);

    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Simple compass handler
  const handleCompassPress = () => {
    if (clickTimeoutRef.current) {
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 500);

    setShowCompass(!showCompass);
    if (!showCompass && mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentRegion?.latitude || currentLocation.latitude,
        longitude: currentRegion?.longitude || currentLocation.longitude,
        latitudeDelta: currentRegion?.latitudeDelta || 0.01,
        longitudeDelta: currentRegion?.longitudeDelta || 0.01,
      });
    }
  };

  // Simple map type handler
  const handleMapTypePress = () => {
    if (clickTimeoutRef.current) {
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 500);

    setShowMapTypeMenu(!showMapTypeMenu);
  };

  const handleMapTypeSelect = (type: MapType) => {
    setMapType(type);
    setShowMapTypeMenu(false);
  };

  // Simple region change handler
  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
    setCurrentZoom(Math.log2(360 / region.latitudeDelta));
  };

  // Simple map rotate handler
  const handleMapRotate = (event: any) => {
    if (!showCompass || !event?.nativeEvent?.heading) {
      return;
    }

    const newHeading = event.nativeEvent.heading || 0;
    setHeading(newHeading);
    compassRotation.setValue(-newHeading);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Update the renderRoute function to reduce line widths
  const renderRoute = () => {
    if (!route?.polyline) {
      return null;
    }

    try {
      const routes = alternativeRoutes 
        ? [route, ...alternativeRoutes].filter(r => r?.polyline)
        : [route];

      const selectedRoute = routes[selectedRouteIndex] || routes[0];
      if (!selectedRoute?.polyline) {
        return null;
      }

      // Draw alternative routes with reduced width
      const alternativeRoutePolylines = routes.map((r, index) => {
        if (index === selectedRouteIndex || !r?.polyline) {
          return null;
        }

        try {
          const coordinates = decodePolyline(r.polyline);
          if (!coordinates?.length) {
            return null;
          }

          return (
            <Polyline
              key={`alt-route-${index}`}
              coordinates={coordinates}
              strokeWidth={2} // Reduced from 4
              strokeColor="rgba(102, 102, 102, 0.5)"
              lineDashPattern={[1, 2]}
              zIndex={1}
            />
          );
        } catch (error) {
          return null;
        }
      }).filter(Boolean);

      // Draw selected route with traffic
      try {
        const coordinates = decodePolyline(selectedRoute.polyline);
        if (!coordinates?.length) {
          return alternativeRoutePolylines;
        }

        // Get traffic segments from route data
        const trafficSegments: TrafficSegment[] = [];
        if (selectedRoute.legsCoordinates) {
          selectedRoute.legsCoordinates.forEach((leg, legIndex) => {
            const segmentLength = Math.floor(leg.length / 3);
            if (segmentLength > 0) {
              trafficSegments.push({
                startIndex: legIndex * segmentLength,
                endIndex: (legIndex + 1) * segmentLength,
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high'
              });
            }
          });
        }

        // Create polylines for each traffic segment with reduced width
        const trafficPolylines = trafficSegments.map((segment, index) => {
          const segmentCoordinates = coordinates.slice(segment.startIndex, segment.endIndex);
          if (segmentCoordinates.length < 2) return null;

          return (
            <Polyline
              key={`traffic-${index}`}
              coordinates={segmentCoordinates}
              strokeWidth={4} // Reduced from 8
              strokeColor={getTrafficColor(segment.severity)}
              lineCap="round"
              lineJoin="round"
              zIndex={3}
            />
          );
        });

        // Draw the base route outline with reduced width
        const baseRoute = (
          <Polyline
            key="selected-route-base"
            coordinates={coordinates}
            strokeWidth={5} // Reduced from 10
            strokeColor={mapType === 'satellite' ? '#000000' : '#FFFFFF'}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        );

        return (
          <>
            {alternativeRoutePolylines}
            {baseRoute}
            {trafficPolylines}
          </>
        );
      } catch (error) {
        return alternativeRoutePolylines;
      }
    } catch (error) {
      return null;
    }
  };

  // Simple marker rendering
  const renderUserMarker = () => {
    if (!currentLocation) {
      return null;
    }

    return (
      <Marker
        coordinate={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        flat
        rotation={routeHeading || 0}
      >
        <View style={styles.userMarkerContainer}>
          <View style={styles.userMarkerCircle} />
          <View style={styles.userMarkerWedge} />
          <View style={[styles.userMarker, { transform: [{ rotate: `${routeHeading || 0}deg` }] }]}>
            <Ionicons name="navigate" size={24} color="#1a73e8" />
          </View>
          {speed !== null && speed > 0 && (
            <View style={styles.speedContainer}>
              <Text style={styles.speedText}>{Math.round(speed * 2.237)} mph</Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  // Simple waypoint rendering
  const renderWaypointMarkers = () => {
    if (!waypoints?.length) {
      return null;
    }

    return waypoints.map((waypoint, index) => (
      <Marker
        key={`waypoint-${index}`}
        coordinate={{
          latitude: waypoint.location.latitude,
          longitude: waypoint.location.longitude,
        }}
        title={waypoint.name}
        description={`Stop ${index + 1}`}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.waypointMarkerContainer}>
          <View style={[
            styles.waypointMarker,
            index === waypoints.length - 1 && styles.destinationMarker
          ]}>
            {index === waypoints.length - 1 ? (
              <Ionicons name="flag" size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.waypointNumber}>{index + 1}</Text>
            )}
          </View>
          {index === 0 && (
            <View style={styles.waypointPulse} />
          )}
        </View>
      </Marker>
    ));
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        onRegionChange={handleMapRotate}
        mapType={mapType}
        showsTraffic={showTraffic}
        rotateEnabled={showCompass}
        scrollEnabled
        zoomEnabled
        pitchEnabled={showCompass}
        maxZoomLevel={20}
        minZoomLevel={3}
        testID={testID}
        customMapStyle={customMapStyle}
      >
        {renderUserMarker()}
        {renderWaypointMarkers()}
        {renderRoute()}
      </MapView>

      <TouchableOpacity
        style={[styles.compassButton, showCompass && styles.activeCompassButton]}
        onPress={handleCompassPress}
        testID="compass-button"
      >
        <Animated.View
          style={[
            styles.compassContainer,
            {
              transform: [
                {
                  rotate: compassRotation.interpolate({
                    inputRange: [-360, 0, 360],
                    outputRange: ['-360deg', '0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="compass" size={24} color={showCompass ? '#1a73e8' : '#000000'} />
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.layerButton}
        onPress={() => setShowMapControls(true)}
        testID="layer-button"
      >
        <Ionicons name="layers" size={24} color="#000000" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={handleMyLocationPress}
        testID="location-button"
      >
        <Ionicons name="locate" size={24} color="#000000" />
      </TouchableOpacity>

      {showMapControls && (
        <MapControls
          mapType={mapType}
          showTraffic={showTraffic}
          onMapTypeChange={handleMapTypeChange}
          onTrafficToggle={handleTrafficToggle}
          onClose={() => setShowMapControls(false)}
          customStyleKey={customStyleKey}
          onCustomStyleChange={handleCustomStyleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  compassButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 110,
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
    transform: [{ rotate: '0deg' }],
  },
  activeCompassButton: {
    backgroundColor: '#E8F0FE',
  },
  layerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 180 : 170,
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mapControlsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  mapControlsContent: {
    padding: 16,
  },
  mapControlsSection: {
    marginBottom: 24,
  },
  mapControlsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
  },
  mapStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  mapStyleOption: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  mapStyleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedMapStyle: {
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
  },
  mapStyleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedMapStyleLabel: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  mapStyleDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  mapFeaturesList: {
    gap: 12,
  },
  mapFeatureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  selectedMapFeature: {
    backgroundColor: '#E8F0FE',
  },
  mapFeatureLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  selectedMapFeatureLabel: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  mapFeatureToggle: {
    marginLeft: 12,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#1a73e8',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }],
  },
  compassContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarkerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a73e8',
    borderColor: '#ffffff',
    borderWidth: 2,
    position: 'absolute',
  },
  userMarkerWedge: {
    position: 'absolute',
    top: -30,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 30,
    borderRightWidth: 15,
    borderBottomWidth: 0,
    borderLeftWidth: 15,
    borderTopColor: '#1a73e8',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  speedContainer: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  waypointMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    backgroundColor: '#FF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  waypointNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  waypointPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 115, 232, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(26, 115, 232, 0.3)',
    zIndex: -1,
  },
});
