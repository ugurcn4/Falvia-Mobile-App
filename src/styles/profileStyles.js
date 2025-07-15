import { StyleSheet } from 'react-native';
import colors from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import shadows from './shadows';

export const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxxl + spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: radius.round,
    borderWidth: 3,
    borderColor: colors.card,
  },
  profileInfo: {
    marginLeft: spacing.lg,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  memberSince: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    ...shadows.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    margin: spacing.lg,
    ...shadows.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  logoutButtonDisabled: {
    backgroundColor: '#f1a9a0',
  },
  logoutText: {
    color: colors.text.light,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
  },
});

export default profileStyles; 