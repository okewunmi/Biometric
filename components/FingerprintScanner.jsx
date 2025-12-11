import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { NativeModules, NativeEventEmitter } from 'react-native';

const { FingerprintModule } = NativeModules;
const fingerprintEmitter = new NativeEventEmitter(FingerprintModule);

export default function FingerprintScanner({ onVerificationComplete }) {
  const [status, setStatus] = useState('Ready');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerAvailable, setScannerAvailable] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkScanner();
    
    // Listen to scan events
    const startListener = fingerprintEmitter.addListener('onScanStarted', () => {
      setStatus('Place finger on scanner...');
    });
    
    const completeListener = fingerprintEmitter.addListener('onScanComplete', (data) => {
      setStatus('Verifying...');
      verifyWithServer(data.imageData);
    });
    
    const errorListener = fingerprintEmitter.addListener('onScanError', (error) => {
      setStatus(`Error: ${error.error}`);
      setIsScanning(false);
    });
    
    return () => {
      startListener.remove();
      completeListener.remove();
      errorListener.remove();
      FingerprintModule.close();
    };
  }, []);

  const checkScanner = async () => {
    try {
      const availability = await FingerprintModule.isAvailable();
      setScannerAvailable(availability.available);
      
      if (availability.available) {
        setStatus('Scanner found! Initializing...');
        const initResult = await FingerprintModule.initialize();
        if (initResult.success) {
          setStatus('Ready to scan');
        }
      } else {
        setStatus('Scanner not found. Connect via OTG cable.');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleScan = async () => {
    if (!scannerAvailable) {
      Alert.alert('Scanner Not Available', 'Please connect the fingerprint scanner via OTG cable.');
      return;
    }

    setIsScanning(true);
    setStatus('Scanning...');

    try {
      const captureResult = await FingerprintModule.capturePrint({});
      
      if (!captureResult.success) {
        throw new Error(captureResult.message || 'Scan failed');
      }

      setStatus('Fingerprint captured! Verifying...');
      await verifyWithServer(captureResult.imageData);
      
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      Alert.alert('Scan Error', error.message);
      setIsScanning(false);
    }
  };

  const verifyWithServer = async (imageData) => {
    try {
      // Call your NBIS server
      const response = await fetch('https://your-nbis-server.onrender.com/api/fingerprint/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryImage: imageData
        })
      });

      const result = await response.json();

      if (result.success && result.matched) {
        setResult(result);
        setStatus('Match found!');
        onVerificationComplete?.(result);
      } else {
        setStatus('No match found');
        Alert.alert('No Match', result.message || 'Student not found in database');
      }
    } catch (error) {
      setStatus(`Server error: ${error.message}`);
      Alert.alert('Verification Error', 'Could not verify with server');
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setStatus('Ready to scan');
  };

  if (result && result.matched) {
    // Show matched student
    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          
          <Text style={styles.successTitle}>Match Found!</Text>
          
          {result.student.profilePictureUrl && (
            <Image 
              source={{ uri: result.student.profilePictureUrl }} 
              style={styles.studentPhoto}
            />
          )}
          
          <Text style={styles.studentName}>
            {result.student.firstName} {result.student.surname}
          </Text>
          <Text style={styles.matricNumber}>{result.student.matricNumber}</Text>
          
          <View style={styles.detailsCard}>
            <Text style={styles.detailLabel}>Level: {result.student.level}</Text>
            <Text style={styles.detailLabel}>Department: {result.student.department}</Text>
            <Text style={styles.detailLabel}>Course: {result.student.course}</Text>
            <Text style={styles.confidenceText}>Confidence: {result.confidence}%</Text>
          </View>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetScan}>
            <Text style={styles.resetButtonText}>Verify Another Student</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scannerCard}>
        <View style={styles.fingerprintIcon}>
          <Text style={styles.fingerprintEmoji}>👆</Text>
        </View>
        
        <Text style={styles.title}>Fingerprint Verification</Text>
        <Text style={styles.status}>{status}</Text>
        
        <TouchableOpacity
          style={[styles.scanButton, !scannerAvailable && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={isScanning || !scannerAvailable}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan Fingerprint'}
          </Text>
        </TouchableOpacity>
        
        {!scannerAvailable && (
          <TouchableOpacity style={styles.retryButton} onPress={checkScanner}>
            <Text style={styles.retryButtonText}>Check Scanner</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  scannerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  fingerprintIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fingerprintEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
  },
  scanButtonDisabled: {
    backgroundColor: '#ccc',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    padding: 10,
  },
  retryButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    fontSize: 50,
    color: 'white',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  studentPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  studentName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  matricNumber: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});