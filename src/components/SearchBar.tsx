import { GOOGLE_MAPS_API_KEY } from '@env';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  Platform,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  GooglePlacesAutocomplete,
  GooglePlaceData,
  GooglePlaceDetail,
  Point,
} from 'react-native-google-places-autocomplete';
import { useDispatch, useSelector } from 'react-redux';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { getPlaceDetails } from '@/services/navigationService';
import { RootState } from '@/store';
import { addWaypoint, setError, setLoading } from '@/store/navigationSlice';

interface ExtendedGooglePlaceData extends GooglePlaceData {
  types?: string[];
}

interface SearchBarProps {
  testID?: string;
}

export const SearchBar: React.FC<SearchBarProps> = memo(({ testID }) => {
  const dispatch = useDispatch();
  const { withErrorHandling, handleError } = useErrorHandler();
  const searchRef = useRef<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { currentLocation, waypoints } = useSelector((state: RootState) => state.navigation);

  // Memoize the location string to prevent unnecessary updates
  const locationString = useMemo(
    () =>
      currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : undefined,
    [currentLocation?.latitude, currentLocation?.longitude]
  );

  // Memoize the query object
  const query = useMemo(
    () => ({
      key: GOOGLE_MAPS_API_KEY,
      language: 'en',
      types: 'geocode|establishment',
      // components: 'country:us',
      location: locationString,
      radius: '50000',
    }),
    [locationString]
  );

  // Memoize predefined places
  const predefinedPlaces = useMemo(
    () =>
      currentLocation
        ? []: [],
    [currentLocation?.latitude, currentLocation?.longitude]
  );

  // Memoize handlers to prevent unnecessary re-renders
  const handlePlaceSelect = useCallback(
    async (data: GooglePlaceData, details: GooglePlaceDetail | null) => {
      if (!GOOGLE_MAPS_API_KEY) {
        handleError('Google Maps API key is missing');
        return;
      }

      if (!data?.place_id) {
        handleError('Invalid place selected');
        return;
      }

      // Handle current location selection
      if (data.place_id === 'current_location' && currentLocation) {
        dispatch(
          addWaypoint({
            location: currentLocation,
            name: 'Current Location',
            order: waypoints.length,
          })
        );
        searchRef.current?.setAddressText('');
        return;
      }

      setIsSearching(true);
      try {
        await withErrorHandling(async () => {
          const location = await getPlaceDetails(data.place_id);
          if (!location) {
            throw new Error('Could not get location details');
          }

          dispatch(
            addWaypoint({
              location,
              name: data.description || data.structured_formatting?.main_text || 'Selected location',
              order: waypoints.length,
            })
          );

          searchRef.current?.setAddressText('');
        }, 'Error selecting destination');
      } finally {
        setIsSearching(false);
      }
    },
    [currentLocation, dispatch, handleError, withErrorHandling, waypoints.length]
  );

  const handleSearchStart = useCallback(() => {
    setIsSearching(true);
  }, []);

  const handleSearchEnd = useCallback(() => {
    setIsSearching(false);
  }, []);

  const handleClear = useCallback(() => {
    searchRef.current?.setAddressText('');
    dispatch(setError(null));
    dispatch(setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      handleError('Google Maps API key is missing', 'Configuration Error');
      Alert.alert(
        'Configuration Error',
        'Google Maps API key is missing. Please check your environment configuration.'
      );
    }
  }, [handleError]);

  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.searchWrapper}>
        <GooglePlacesAutocomplete
          ref={searchRef}
          placeholder="Search destination"
          onPress={handlePlaceSelect}
          query={query}
          styles={{
            container: styles.searchContainer,
            textInput: styles.searchInput,
            listView: styles.searchResults,
            row: styles.searchRow,
            description: styles.searchDescription,
            separator: styles.separator,
            poweredContainer: styles.poweredContainer,
            loader: styles.loader,
          }}
          fetchDetails
          enablePoweredByContainer={false}
          minLength={2}
          debounce={500}
          textInputProps={{
            placeholderTextColor: '#666',
            autoCapitalize: 'none',
            autoCorrect: false,
            returnKeyType: 'search',
            clearButtonMode: 'while-editing',
            onFocus: handleSearchStart,
            onBlur: handleSearchEnd,
          }}
          nearbyPlacesAPI="GooglePlacesSearch"
          GooglePlacesDetailsQuery={{
            fields: 'geometry,name,formatted_address,place_id',
            language: 'en',
          }}
          filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']}
          listViewDisplayed="auto"
          keyboardShouldPersistTaps="handled"
          enableHighAccuracyLocation
          isRowScrollable
          predefinedPlaces={predefinedPlaces}
          predefinedPlacesAlwaysVisible={Boolean(currentLocation)}
          currentLocation={false}
          currentLocationLabel="Current Location"
          renderRow={useCallback(
            (data: ExtendedGooglePlaceData) => (
              <View style={styles.rowContainer}>
                <View style={styles.rowIcon}>
                  <Ionicons
                    name={data.types?.includes('establishment') ? 'business' : 'location'}
                    size={20}
                    color="#666"
                  />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {data.structured_formatting?.main_text}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {data.structured_formatting?.secondary_text}
                  </Text>
                </View>
              </View>
            ),
            []
          )}
          renderLeftButton={useCallback(
            () => (
              <View style={styles.searchIconContainer}>
                <Ionicons name="search" size={20} color="#666" />
              </View>
            ),
            []
          )}
          renderRightButton={useCallback(
            () =>
              isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2196F3" />
                </View>
              ) : (
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ),
            [isSearching, handleClear]
          )}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  searchContainer: {
    flex: 0,
  },
  searchInput: {
    height: 48,
    fontSize: 16,
    backgroundColor: 'transparent',
    paddingLeft: 48,
    paddingRight: 48,
    borderRadius: 24,
    color: '#000000',
  },
  searchIconContainer: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 1,
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  searchRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchDescription: {
    fontSize: 14,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 48,
  },
  poweredContainer: {
    display: 'none',
  },
  loader: {
    marginRight: 16,
  },
});
