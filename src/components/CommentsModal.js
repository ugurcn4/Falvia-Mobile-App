import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import { getComments, addComment } from '../services/supabaseService';

const CommentsModal = ({
  visible,
  onClose,
  postId,
  user,
  postType = 'user_post',
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchComments();
    } else {
      setComments([]);
      setCommentText('');
      setError(null);
    }
  }, [visible, postId, postType]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getComments(postId, postType);
      if (error) throw error;
      setComments(data);
    } catch (err) {
      setError('Yorumlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error } = await addComment(user.id, postId, commentText.trim(), postType);
      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText('');
    } catch (err) {
      setError('Yorum eklenemedi: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.avatarCircle}>
        {item.user.avatar ? (
          <View style={styles.avatarImageWrapper}>
            <Ionicons name="person-circle" size={32} color={colors.secondary} />
          </View>
        ) : (
          <Ionicons name="person-circle-outline" size={32} color={colors.secondary} />
        )}
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.commentName}>{item.user.name}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
        <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Yorumlar</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contentContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                </View>
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.commentsList}
                  ListEmptyComponent={<Text style={styles.emptyText}>Henüz yorum yok.</Text>}
                  showsVerticalScrollIndicator={false}
                  style={styles.flatListStyle}
                />
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Yorum ekle..."
                placeholderTextColor={colors.text.tertiary}
                value={commentText}
                onChangeText={setCommentText}
                editable={!submitting}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons name="send" size={22} color={colors.background} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18,18,37,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    minHeight: '50%',
    ...shadows.lg,
  },
  contentContainer: {
    flex: 1,
    minHeight: 200,
  },
  flatListStyle: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    margin: spacing.lg,
  },
  commentsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  emptyText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  avatarImageWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  commentContent: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  commentName: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.semiBold,
    fontSize: typography.fontSize.sm,
  },
  commentText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  commentDate: {
    color: colors.text.tertiary,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.5,
  },
});

export default CommentsModal; 