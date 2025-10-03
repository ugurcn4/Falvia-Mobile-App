import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';

const STORAGE_PREFIX = '@home_banner';

function resolvePalettePath(path) {
  if (!path || typeof path !== 'string') return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), colors);
}

function resolveColor(paletteKey, fallbackHex) {
  const fromPalette = resolvePalettePath(paletteKey);
  if (typeof fromPalette === 'string') return fromPalette;
  if (Array.isArray(fromPalette)) return fromPalette[0];
  return fallbackHex || '#3B82F6';
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function getDismissKey(config) {
  return `${STORAGE_PREFIX}:dismiss:${config?.dismiss_storage_key || config?.id}`;
}

function getImpressionKey(config) {
  return `${STORAGE_PREFIX}:imp:${config?.id}:${todayKey()}`;
}

async function isDismissed(config) {
  try {
    const key = getDismissKey(config);
    const val = await AsyncStorage.getItem(key);
    return val === '1';
  } catch (e) {
    return false;
  }
}

async function dismiss(config) {
  try {
    const key = getDismissKey(config);
    await AsyncStorage.setItem(key, '1');
  } catch {}
}

async function checkImpressionCap(config) {
  if (!config?.max_impressions_per_day || config.max_impressions_per_day <= 0) return true;
  try {
    const key = getImpressionKey(config);
    const currentRaw = await AsyncStorage.getItem(key);
    const current = currentRaw ? parseInt(currentRaw, 10) : 0;
    return current < config.max_impressions_per_day;
  } catch (e) {
    return true;
  }
}

async function incrementImpression(config) {
  try {
    const key = getImpressionKey(config);
    const currentRaw = await AsyncStorage.getItem(key);
    const current = currentRaw ? parseInt(currentRaw, 10) : 0;
    await AsyncStorage.setItem(key, String(current + 1));
  } catch {}
}

function withinSchedule(config) {
  const now = new Date();
  const startOk = !config.start_at || new Date(config.start_at) <= now;
  const endOk = !config.end_at || new Date(config.end_at) >= now;
  return startOk && endOk;
}

function platformAllowed(config) {
  const platforms = config?.platforms || [];
  if (!platforms || platforms.length === 0) return true;
  const p = Platform.OS === 'ios' ? 'ios' : 'android';
  return platforms.includes(p);
}

function versionAllowed(config, appVersion) {
  if (!config?.min_app_version) return true;
  const toNum = (v) => (v || '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const a = toNum(appVersion || '0.0.0');
  const b = toNum(config.min_app_version || '0.0.0');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] || 0; const bi = b[i] || 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return true;
}

function tokensAllowed(config, currentUserTokens) {
  if (typeof config?.min_token_balance !== 'number') return true;
  return (currentUserTokens || 0) >= config.min_token_balance;
}

function buildQueryFilters(userId) {
  const filters = { userId };
  return filters;
}

async function getActiveHomeBanner(userId, options = {}) {
  const { appVersion, currentUserTokens } = options;
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_enabled', true)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const p = Platform.OS === 'ios' ? 'ios' : 'android';

  const first = (data || []).find((item) => {
    if (!withinSchedule(item)) return false;
    if (!platformAllowed(item)) return false;
    if (item.platforms && item.platforms.length > 0 && !item.platforms.includes(p)) return false;
    if (!versionAllowed(item, appVersion)) return false;
    if (!tokensAllowed(item, currentUserTokens)) return false;
    return true;
  });

  return first || null;
}

async function getActiveHomeBanners(userId, options = {}) {
  const { appVersion, currentUserTokens } = options;
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_enabled', true)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const p = Platform.OS === 'ios' ? 'ios' : 'android';

  const list = (data || []).filter((item) => {
    if (!withinSchedule(item)) return false;
    if (!platformAllowed(item)) return false;
    if (item.platforms && item.platforms.length > 0 && !item.platforms.includes(p)) return false;
    if (!versionAllowed(item, appVersion)) return false;
    if (!tokensAllowed(item, currentUserTokens)) return false;
    return true;
  });

  return list;
}

function resolveGradient(config) {
  const start = resolveColor(config.gradient_start_palette_key, config.gradient_start_hex);
  const end = resolveColor(config.gradient_end_palette_key, config.gradient_end_hex);
  return [start, end];
}

function resolveTextColor(config) {
  return resolveColor(config.text_color_palette_key, config.text_color_hex || '#FFFFFF');
}

function resolveSolidBackground(config) {
  return resolveColor(config.background_color_palette_key, config.background_color_hex || '#1F2937');
}

async function handleAction(config, navigation) {
  const type = config?.action_type;
  const payload = config?.action_payload || {};
  try {
    if (type === 'navigate' && navigation) {
      const route = payload?.route || 'BuyTokens';
      const params = payload?.params || {};
      navigation.navigate(route, params);
      return;
    }
    if (type === 'open_url' && payload?.url) {
      await Linking.openURL(payload.url);
      return;
    }
    if (type === 'new_fortune' && navigation) {
      navigation.navigate('NewFortune', { fortuneType: payload?.fortuneType || null });
      return;
    }
    if (type === 'buy_tokens' && navigation) {
      navigation.navigate('BuyTokens');
      return;
    }
  } catch (e) {
  }
}

const homeBannerService = {
  getActiveHomeBanner,
  getActiveHomeBanners,
  isDismissed,
  dismiss,
  checkImpressionCap,
  incrementImpression,
  handleAction,
  resolveGradient,
  resolveTextColor,
  resolveSolidBackground,
};

export default homeBannerService; 