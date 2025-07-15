import { StyleSheet } from 'react-native';
import colors from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import shadows from './shadows';

export const verifyEmailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl + spacing.lg,
    marginBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  formContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    height: 60,
    ...shadows.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
    color: colors.primary,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    height: '100%',
    letterSpacing: 2, // Doğrulama kodu için daha geniş harf aralığı
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.colored(colors.primary),
  },
  verifyButtonDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  verifyButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
  },
  resendLink: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.xs,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 