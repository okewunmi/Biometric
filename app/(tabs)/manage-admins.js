import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, router } from 'expo-router';
import Entypo from '@expo/vector-icons/Entypo';

const index = () => {
  

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.view}>
        
        <Text style={styles.txt}>Voxify</Text>
        <ActivityIndicator
          size="large"
          color="#fff"
          style={styles.customIndicator}
        />
      </View>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#3273F6',
    color: '#fff',
  },
  view: {
    height: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 90,
  },
  txt: {
    color: '#fff',
    fontSize: 30,
    marginTop: 35,
  },
  customIndicator: {
    marginTop: 180,
    transform: [{ scale: 1.3 }],
  },
  Logo: {
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 15,
  },
});