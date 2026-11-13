import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { WritingEditor } from '@/components/WritingEditor';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useThoughts } from '@/hooks/useThoughts';
import { getRepositories } from '@/database';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateThought } = useThoughts();

  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadThought() {
      if (!id) return;
      try {
        const repos = await getRepositories();
        const item = await repos.thoughts.getById(id);
        if (item) {
          setContent(item.content);
          setCategory(item.category ?? null);
        } else {
          setError('Journal entry not found.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load entry');
      } finally {
        setInitialLoading(false);
      }
    }
    loadThought();
  }, [id]);

  const handleSave = async () => {
    if (!content.trim() || !id || isSaving) return;

    setIsSaving(true);
    try {
      await updateThought(id, content, category);
      router.back();
    } catch (err: any) {
      Alert.alert('Update error', err?.message || 'Could not update thought.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (initialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <WritingEditor
        content={content}
        status="saved"
        onChangeText={setContent}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        saveButtonLabel="Update thought"
        placeholder="Edit your thought..."
        autoFocus={false}
        footer={
          <View style={styles.footerWrapper}>
            <Text style={styles.footerLabel}>Category</Text>
            <CategoryPicker
              selected={category}
              onSelect={setCategory}
              showNone
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.statusError,
  },
  footerWrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  footerLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 2,
  },
});
