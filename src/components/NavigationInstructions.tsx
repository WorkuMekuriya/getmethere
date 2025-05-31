import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '@/store';
import { RouteStep } from '@/types/navigation';
import { setNavigationCardVisible, setSelectedRoute, setCardState } from '@/store/navigationSlice';

type IconName = keyof typeof Ionicons.glyphMap;

const routeTypes = ['Fastest', 'Shortest', 'Scenic'] as const;

export interface NavigationInstructionsProps {
  testID?: string;
}

export const NavigationInstructions: React.FC<NavigationInstructionsProps> = ({ testID }) => {
  const dispatch = useDispatch();
  const {
    route,
    alternativeRoutes,
    selectedRouteIndex,
    waypoints,
    cardState,
    isNavigationCardVisible,
  } = useSelector((state: RootState) => state.navigation);

  const [isExpanded, setIsExpanded] = React.useState(false);

  // Add logging to track card visibility state
  React.useEffect(() => {
    console.log('[NavigationInstructions] Card state:', {
      cardState,
      isNavigationCardVisible,
      hasWaypoints: waypoints.length > 0,
      hasRoute: !!route,
      waypointsCount: waypoints.length,
      routeData: route ? {
        hasPolyline: !!route.polyline,
        hasSteps: !!route.steps,
        distance: route.distance?.text,
        duration: route.duration?.text
      } : null
    });
  }, [cardState, isNavigationCardVisible, waypoints, route]);

  const handleClose = () => {
    dispatch(setCardState('minimized'));
  };

  const handleExpand = () => {
    dispatch(setCardState('expanded'));
  };

  const handleRouteSelect = (index: number) => {
    const routeIndex = Number(index);
    
    // Basic validation
    if (isNaN(routeIndex) || routeIndex < 0) {
      console.log('Invalid route index:', routeIndex);
      return;
    }

    // Get total number of available routes
    const totalRoutes = alternativeRoutes 
      ? 1 + alternativeRoutes.length 
      : 1;

    console.log('Route selection validation:', {
      routeIndex,
      totalRoutes,
      isValid: routeIndex < totalRoutes
    });

    // Only dispatch if index is within bounds
    if (routeIndex < totalRoutes) {
      try {
        dispatch(setSelectedRoute(routeIndex));
      } catch (error) {
        console.error('Route selection failed:', error);
      }
    }
  };

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

  // Don't show anything if there are no waypoints
  if (waypoints.length === 0) {
    console.log('[NavigationInstructions] Not rendering: No waypoints');
    return null;
  }

  // Don't show if there's no route yet
  if (!route) {
    console.log('[NavigationInstructions] Not rendering: No route');
    return null;
  }

  // Safely get the selected route
  const routes = alternativeRoutes ? [route, ...alternativeRoutes] : [route];
  const selectedRoute = routes[selectedRouteIndex] || route;

  // If minimized, show a smaller view
  if (cardState === 'minimized') {
    return (
      <TouchableOpacity 
        style={styles.minimizedContainer} 
        onPress={handleExpand}
        activeOpacity={0.9}
        testID={testID ? `${testID}-minimized` : 'navigation-instructions-minimized'}
      >
        <View style={styles.minimizedContent}>
          <Text style={styles.minimizedText} numberOfLines={1}>
            {selectedRoute?.distance.text} • {selectedRoute?.duration.text}
          </Text>
          <Ionicons name="chevron-up" size={24} color="#000000" />
        </View>
      </TouchableOpacity>
    );
  }

  // If hidden, don't render anything
  if (cardState === 'hidden') {
    console.log('[NavigationInstructions] Not rendering: Card is hidden');
    return null;
  }

  // If expanded, show the full view
  if (!selectedRoute?.steps) return null;

  const renderDestinations = () => (
    <View style={styles.destinationsContainer}>
      {waypoints.map((waypoint, index) => (
        <View key={index} style={styles.destinationRow}>
          <View style={styles.destinationIconContainer}>
            <Ionicons 
              name={index === waypoints.length - 1 ? 'flag' : 'location'} 
              size={20} 
              color="#1a73e8" 
            />
          </View>
          <Text style={styles.destinationText} numberOfLines={1}>
            {waypoint.name}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderRouteSelector = () => {
    if (!alternativeRoutes || alternativeRoutes.length === 0) return null;

    return (
      <View style={styles.routeSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.routeSelectorScroll}
        >
          {routes.map((route, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.routeButton, selectedRouteIndex === index && styles.selectedRoute]}
              onPress={() => handleRouteSelect(index)}
            >
              <View style={styles.routeIconContainer}>
                <Ionicons
                  name={getRouteIcon(index)}
                  size={24}
                  color={selectedRouteIndex === index ? '#1a73e8' : '#666666'}
                />
              </View>
              <View style={styles.routeInfo}>
                <Text style={[styles.routeType, selectedRouteIndex === index && styles.selectedRouteText]}>
                  {getRouteLabel(index)}
                </Text>
                <Text style={styles.routeDetails}>
                  {route.distance.text} • {route.duration.text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStep = (step: RouteStep, index: number) => (
    <View key={index} style={styles.stepContainer}>
      <View style={styles.stepIconContainer}>
        <Ionicons name={getStepIcon(step.instruction)} size={24} color="#1a73e8" />
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.instruction}>{step.instruction}</Text>
        <Text style={styles.distance}>
          {step.distance.text} • {step.duration.text}
        </Text>
      </View>
    </View>
  );

  const getStepIcon = (instruction: string): IconName => {
    const lowerInstruction = instruction.toLowerCase();

    // Basic directions
    if (lowerInstruction.includes('turn left')) return 'arrow-back';
    if (lowerInstruction.includes('turn right')) return 'arrow-forward';
    if (lowerInstruction.includes('u-turn')) return 'swap-horizontal';
    if (lowerInstruction.includes('sharp left')) return 'arrow-back';
    if (lowerInstruction.includes('sharp right')) return 'arrow-forward';
    if (lowerInstruction.includes('slight left')) return 'arrow-back-outline';
    if (lowerInstruction.includes('slight right')) return 'arrow-forward-outline';

    // Highway and road features
    if (lowerInstruction.includes('merge')) return 'git-merge';
    if (lowerInstruction.includes('exit')) return 'exit-outline';
    if (lowerInstruction.includes('roundabout')) return 'repeat';
    if (lowerInstruction.includes('fork')) return 'git-branch';
    if (lowerInstruction.includes('ramp')) return 'trending-up';

    // Special instructions
    if (lowerInstruction.includes('arrive')) return 'flag';
    if (lowerInstruction.includes('destination')) return 'flag';
    if (lowerInstruction.includes('keep left')) return 'arrow-back-outline';
    if (lowerInstruction.includes('keep right')) return 'arrow-forward-outline';
    if (lowerInstruction.includes('straight')) return 'arrow-up';

    // Default icon
    return 'navigate';
  };

  return (
    <View testID={testID} style={[styles.container, { maxHeight: isExpanded ? '100%' : '50%' }]}>
      <TouchableOpacity onPress={handleExpand}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Navigation</Text>
            <Text style={styles.summary}>
              {selectedRoute.distance.text} • {selectedRoute.duration.text}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="close-navigation"
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {renderDestinations()}
      {renderRouteSelector()}
      <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
        {selectedRoute.steps.map(renderStep)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  summary: {
    fontSize: 15,
    color: '#666666',
  },
  closeButton: {
    padding: 8,
  },
  stepsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  instruction: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
    lineHeight: 22,
  },
  distance: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  destinationsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  destinationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  routeSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  routeSelectorScroll: {
    paddingVertical: 4,
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
  minimizedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    height: 50,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  minimizedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimizedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flexShrink: 1,
    marginRight: 8,
  },
});
