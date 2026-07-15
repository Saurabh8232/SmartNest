// Jest setup for React Native app tests.
module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@react-native-async-storage|react-native-vector-icons|react-native-safe-area-context|react-native-screens)/)',
  ],
};
