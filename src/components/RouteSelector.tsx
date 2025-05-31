import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '@/store';
import { setSelectedRoute } from '@/store/navigationSlice';

const routeTypes = ['Fastest', 'Shortest', 'Scenic'] as const;

export const RouteSelector: React.FC = () => {
  const dispatch = useDispatch();
  const navigationState = useSelector((state: RootState) => state.navigation);
  const { route, alternativeRoutes, selectedRouteIndex } = navigationState;
  const [isSwitching, setIsSwitching] = useState(false);
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  // Log initial state and state changes
  useEffect(() => {
    console.log('[RouteSelector] State Update:', {
      hasRoute: !!route,
      alternativeRoutesCount: alternativeRoutes?.length ?? 0,
      selectedRouteIndex,
      isSwitching,
      routeData: route ? {
        hasPolyline: !!route.polyline,
        hasSteps: !!route.steps,
        distance: route.distance?.text,
        duration: route.duration?.text
      } : null,
      alternativeRoutesData: alternativeRoutes?.map(r => ({
        hasPolyline: !!r.polyline,
        hasSteps: !!r.steps,
        distance: r.distance?.text,
        duration: r.duration?.text
      }))
    });
  }, [route, alternativeRoutes, selectedRouteIndex, isSwitching]);

  if (!route || !Array.isArray(alternativeRoutes)) {
    console.log('[RouteSelector] Missing required data:', {
      hasRoute: !!route,
      isAlternativeRoutesArray: Array.isArray(alternativeRoutes)
    });
    return null;
  }

  const routes = [route, ...alternativeRoutes].filter(r => r && r.polyline && r.steps);
  
  console.log('[RouteSelector] Filtered routes:', {
    totalRoutes: routes.length,
    routesData: routes.map(r => ({
      hasPolyline: !!r.polyline,
      hasSteps: !!r.steps,
      distance: r.distance?.text,
      duration: r.duration?.text
    }))
  });

  if (routes.length === 0) {
    console.error('[RouteSelector] No valid routes available after filtering');
    return null;
  }

  const handleRouteSelect = useCallback((index: number) => {
    console.log('[RouteSelector] Route selection attempt:', {
      index,
      currentSelectedIndex: selectedRouteIndex,
      isSwitching,
      routesLength: routes.length,
      timestamp: new Date().toISOString()
    });

    if (isSwitching) {
      console.log('[RouteSelector] Already switching routes, ignoring click');
      return;
    }

    try {
      if (index < 0 || index >= routes.length) {
        console.error('[RouteSelector] Invalid route index:', { 
          index, 
          routesLength: routes.length,
          currentSelectedIndex: selectedRouteIndex
        });
        return;
      }

      const selectedRoute = routes[index];
      console.log('[RouteSelector] Selected route data:', {
        index,
        routeData: {
          hasPolyline: !!selectedRoute.polyline,
          hasSteps: !!selectedRoute.steps,
          distance: selectedRoute.distance?.text,
          duration: selectedRoute.duration?.text,
          stepsCount: selectedRoute.steps?.length
        }
      });
      
      if (!selectedRoute) {
        console.error('[RouteSelector] Selected route is undefined:', { 
          index, 
          routesLength: routes.length,
          routes: routes.map(r => ({
            hasPolyline: !!r.polyline,
            hasSteps: !!r.steps
          }))
        });
        return;
      }

      if (!selectedRoute.polyline || !selectedRoute.steps) {
        console.error('[RouteSelector] Invalid route data:', {
          index,
          polyline: !!selectedRoute.polyline,
          steps: !!selectedRoute.steps,
          routeData: selectedRoute
        });
        return;
      }

      console.log('[RouteSelector] Starting route switch animation');
      setIsSwitching(true);
      
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('[RouteSelector] Animation complete, dispatching route change');
        try {
          dispatch(setSelectedRoute(index));
          console.log('[RouteSelector] Route change dispatched successfully');
        } catch (error) {
          console.error('[RouteSelector] Error dispatching route change:', error);
        } finally {
          setTimeout(() => {
            console.log('[RouteSelector] Resetting switching state');
            setIsSwitching(false);
          }, 500);
        }
      });

    } catch (error) {
      console.error('[RouteSelector] Error in handleRouteSelect:', error);
      setIsSwitching(false);
    }
  }, [routes, dispatch, isSwitching, opacityAnim, selectedRouteIndex]);

  const getRouteIcon = (index: number) => {
    switch (index) {
      case 0:
        return 'time-outline';
      case 1:
        return 'speedometer-outline';
      case 2:
        return 'trail-sign-outline';
      default:
        return 'navigate-outline';
    }
  };

  const getRouteLabel = (index: number) => {
    if (index >= 0 && index < routeTypes.length) {
      return routeTypes[index];
    }
    return `Route ${index + 1}`;
  };

  return (
    <Animated.View testID="route-selector" style={[styles.container, { opacity: opacityAnim }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {routes.map((route, index) => {
          console.log('[RouteSelector] Rendering route button:', {
            index,
            isSelected: selectedRouteIndex === index,
            isSwitching,
            routeData: {
              distance: route.distance?.text,
              duration: route.duration?.text
            }
          });
          
          return (
            <TouchableOpacity
              key={`route-${index}-${route.distance.text}`}
              style={[
                styles.routeButton, 
                selectedRouteIndex === index && styles.selectedRoute,
                isSwitching && styles.switchingRoute
              ]}
              onPress={() => handleRouteSelect(index)}
              disabled={isSwitching}
            >
              <View style={styles.routeIconContainer}>
                <Ionicons
                  name={getRouteIcon(index)}
                  size={24}
                  color={selectedRouteIndex === index ? '#1a73e8' : '#666666'}
                />
              </View>
              <View style={styles.routeInfo}>
                <Text
                  style={[styles.routeType, selectedRouteIndex === index && styles.selectedRouteText]}
                >
                  {getRouteLabel(index)}
                </Text>
                <Text style={styles.routeDetails}>
                  {route.distance.text} • {route.duration.text}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContent: {
    padding: 12,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minWidth: 160,
  },
  selectedRoute: {
    backgroundColor: '#E8F0FE',
  },
  routeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    marginBottom: 4,
  },
  selectedRouteText: {
    color: '#1a73e8',
  },
  routeDetails: {
    fontSize: 14,
    color: '#666666',
  },
  switchingRoute: {
    opacity: 0.5,
    backgroundColor: '#F0F0F0',
  },
});
