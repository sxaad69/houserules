// Web: the native stack uses platform navigation primitives that don't
// exist on web. Use the JS-based stack navigator instead. Metro picks this
// file over stack.ts for web builds.
export { createStackNavigator as createNativeStackNavigator } from '@react-navigation/stack';
