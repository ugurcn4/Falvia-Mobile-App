import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import homeBannerService from '../services/homeBannerService';

const HomeAdminBanner = ({ config, onClose, onPress, styles }) => {
	useEffect(() => {
		if (config) {
			homeBannerService.incrementImpression(config);
		}
	}, [config]);

	if (!config) return null;

	const gradient = config.use_gradient
		? homeBannerService.resolveGradient(config)
		: null;

	const textColor = homeBannerService.resolveTextColor(config);

	const content = (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={onPress}
			style={styles?.container}
		>
			{config.use_gradient ? (
				<LinearGradient
					colors={gradient}
					style={styles?.gradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<RowContent config={config} textColor={textColor} styles={styles} onClose={onClose} />
				</LinearGradient>
			) : (
				<View style={[styles?.gradient, { backgroundColor: homeBannerService.resolveSolidBackground(config) }]}>
					<RowContent config={config} textColor={textColor} styles={styles} onClose={onClose} />
				</View>
			)}
		</TouchableOpacity>
	);

	return content;
};

const RowContent = ({ config, textColor, styles, onClose }) => {
	return (
		<View style={styles?.contentRow}>
			<View style={styles?.left}>
				{config.icon_type === 'material' && config.icon_name ? (
					<MaterialCommunityIcons name={config.icon_name} size={24} color={textColor} />
				) : config.icon_type === 'ion' && config.icon_name ? (
					<Ionicons name={config.icon_name} size={24} color={textColor} />
				) : config.image_url ? (
					<Image source={{ uri: config.image_url }} style={styles?.image} />
				) : null}
			</View>
			<View style={styles?.center}>
				{config.title ? (
					<Text style={[styles?.title, { color: textColor }]} numberOfLines={1}>
						{config.title}
					</Text>
				) : null}
				{config.subtitle ? (
					<Text style={[styles?.subtitle, { color: textColor, opacity: 0.9 }]} numberOfLines={2}>
						{config.subtitle}
					</Text>
				) : null}
			</View>
			{config.show_close_button ? (
				<TouchableOpacity style={styles?.close} onPress={onClose}>
					<Ionicons name="close" size={18} color={textColor} />
				</TouchableOpacity>
			) : null}
		</View>
	);
};

export default HomeAdminBanner; 