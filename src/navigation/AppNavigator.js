import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FalScreen from '../screens/FalScreen';
import TokenStoreScreen from '../screens/TokenStoreScreen';
import NewFortuneScreen from '../screens/NewFortuneScreen';
import SupportScreen from '../screens/SupportScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import FortuneHistoryScreen from '../screens/FortuneHistoryScreen';
import ExploreScreen from '../screens/ExploreScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import AddFortuneTellerScreen from '../screens/AddFortuneTellerScreen';
import EditFortuneTellerScreen from '../screens/EditFortuneTellerScreen';
import ChatsListScreen from '../screens/ChatsListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import MessageRequestScreen from '../screens/MessageRequestScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import FortuneDetailScreen from '../screens/FortuneDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReferralInviteScreen from '../screens/ReferralInviteScreen';
import AstrologyAnalysisScreen from '../screens/AstrologyAnalysisScreen';

// Colors
import colors from '../styles/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigators for each tab
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false, // Ana Sayfa başlığını kaldırmak için
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.text.light,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen 
      name="HomeScreen" 
      component={HomeScreen} 
      options={{ title: 'Ana Sayfa' }} 
    />
    <Stack.Screen 
      name="BuyTokens" 
      component={TokenStoreScreen} 
      options={{ title: 'Jeton Mağazası' }} 
    />
    
    <Stack.Screen 
      name="FalScreen" 
      component={FalScreen} 
      options={{ title: 'Falınız' }} 
    />
    <Stack.Screen 
      name="FortuneDetail" 
      component={FortuneDetailScreen} 
      options={{ title: 'Fal Detayları' }} 
    />
    <Stack.Screen 
      name="NewFortune" 
      component={NewFortuneScreen} 
      options={{ title: 'Fal Baktır' }} 
    />
    <Stack.Screen 
      name="AstrologyAnalysis" 
      component={AstrologyAnalysisScreen} 
      options={{ title: 'Astroloji Analizi' }} 
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen} 
      options={{ title: 'Bildirimler' }} 
    />
  </Stack.Navigator>
);

const FalStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false, // Fal başlığını kaldırmak için
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.text.light,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen 
      name="FalScreen" 
      component={FalScreen} 
      options={{ title: 'Falınız' }} 
    />
    <Stack.Screen 
      name="NewFortune" 
      component={NewFortuneScreen} 
      options={{ title: 'Fal Baktır' }} 
    />
    <Stack.Screen 
      name="FortuneDetail" 
      component={FortuneDetailScreen} 
      options={{ title: 'Fal Detayları' }} 
    />
    <Stack.Screen 
      name="BuyTokens" 
      component={TokenStoreScreen} 
      options={{ title: 'Jeton Mağazası' }} 
    />
  </Stack.Navigator>
);

const StoreStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.text.light,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen 
      name="TokenStoreScreen" 
      component={TokenStoreScreen} 
      options={{ title: 'Jeton Mağazası' }} 
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false, // Profil başlığını kaldırmak için
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.text.light,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen 
      name="ProfileScreen" 
      component={ProfileScreen} 
      options={{ title: 'Profil' }} 
    />
    <Stack.Screen 
      name="EditProfile" 
      component={EditProfileScreen} 
      options={{ title: 'Profili Düzenle' }} 
    />
    <Stack.Screen 
      name="Support" 
      component={SupportScreen} 
      options={{ title: 'Yardım ve Destek' }} 
    />
    <Stack.Screen 
      name="AccountSettings" 
      component={AccountSettingsScreen} 
      options={{ title: 'Hesap Bilgileri' }} 
    />
    <Stack.Screen 
      name="FortuneHistory" 
      component={FortuneHistoryScreen} 
      options={{ title: 'Fal Geçmişim' }} 
    />
    <Stack.Screen 
      name="ReferralInvite" 
      component={ReferralInviteScreen} 
      options={{ title: 'Arkadaş Davet Et' }} 
    />
    <Stack.Screen 
      name="BuyTokens" 
      component={TokenStoreScreen} 
      options={{ title: 'Jeton Mağazası' }} 
    />
    <Stack.Screen 
      name="AdminPanel" 
      component={AdminPanelScreen} 
      options={{ title: 'Admin Paneli' }} 
    />
    <Stack.Screen 
      name="AddFortuneTellers" 
      component={AddFortuneTellerScreen} 
      options={{ title: 'Falcı Ekle' }} 
    />
    <Stack.Screen 
      name="EditFortuneTeller" 
      component={EditFortuneTellerScreen} 
      options={{ title: 'Falcı Düzenle' }} 
    />
    <Stack.Screen 
      name="FalScreen" 
      component={FalScreen} 
      options={{ title: 'Fal Baktır' }} 
    />
    <Stack.Screen 
      name="Onboarding" 
      component={OnboardingScreen} 
      options={{ 
        headerShown: false,
      }} 
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen} 
      options={{ title: 'Bildirimler' }} 
    />
  </Stack.Navigator>
);

const ExploreStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.text.light,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen 
      name="ExploreScreen" 
      component={ExploreScreen} 
      options={{ title: 'Keşfet' }} 
    />
    <Stack.Screen 
      name="ChatsList" 
      component={ChatsListScreen} 
      options={{ 
        title: 'Sohbetler',
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }} 
    />
    <Stack.Screen 
      name="ChatScreen" 
      component={ChatScreen} 
      options={{ 
        title: 'Sohbet',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }} 
    />
    <Stack.Screen 
      name="NewChat" 
      component={NewChatScreen} 
      options={{ 
        title: 'Yeni Sohbet',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }} 
    />
    <Stack.Screen 
      name="MessageRequest" 
      component={MessageRequestScreen} 
      options={{ 
        title: 'Mesaj İsteği',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }} 
    />
    <Stack.Screen 
      name="BuyTokens" 
      component={TokenStoreScreen} 
      options={{ title: 'Jeton Mağazası' }} 
    />
    <Stack.Screen 
      name="FalScreen" 
      component={FalScreen} 
      options={{ title: 'Falınız' }} 
    />
  </Stack.Navigator>
);

// Main navigator
const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Fal" 
        component={FalStack} 
        options={{
          tabBarLabel: 'Falınız',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'cafe' : 'cafe-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStack} 
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Store" 
        component={StoreStack} 
        options={{
          tabBarLabel: 'Mağaza',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={focused ? 'diamond' : 'diamond-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>yeni</Text>
              </View>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: 'rgba(255, 255, 255, 0.1)', 
    borderTopWidth: 1,
    height: 75,
    paddingBottom: 0,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadgeText: {
    color: colors.text.light,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.secondary,
    marginTop: 4,
  },
});

export default AppNavigator; 