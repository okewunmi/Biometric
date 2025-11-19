import Entypo from '@expo/vector-icons/Entypo';
import { router, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import 'react-native-url-polyfill/auto'
const index = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/home'); // Navigate to intro1.js after 3 seconds
    }, 3000);

    return () => clearTimeout(timer); // Clear timer on component unmount
  }, [navigation]);


 
  
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
                colors={['#4F46E5', '#9333EA']}
                
              >
      <View style={styles.view}>
        <View style={styles.Logo}>
          <Entypo name="fingerprint" size={32} color="black" />
        </View>

        <Text style={styles.txt}>Biometrics System</Text>
        <ActivityIndicator
          size="large"
          color="#fff"
          style={styles.customIndicator}
        />
      </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // backgroundColor: '#3273F6',
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
