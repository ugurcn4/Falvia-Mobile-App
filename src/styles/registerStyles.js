import { StyleSheet } from 'react-native';
import colors from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import shadows from './shadows';

export const registerStyles = StyleSheet.create({
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
    marginTop: spacing.xxxl + spacing.sm,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
    borderRadius: 60,
    ...shadows.md,
  },
  appName: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.lg,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.xl + spacing.sm,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 60,
    ...shadows.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
    color: colors.secondary,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    height: '100%',
  },
  eyeIcon: {
    padding: spacing.sm,
  },
  termsContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  termsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.md,
  },
  termsLink: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.semiBold,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.colored(colors.primary),
  },
  registerButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  registerButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleIcon: {
    marginRight: spacing.sm,
  },
  googleButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
  },
  loginLink: {
    color: colors.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.xs,
  },
});

export default registerStyles; 