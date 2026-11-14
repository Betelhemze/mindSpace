import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { WritingEditor } from '@/components/WritingEditor';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useThoughts } from '@/hooks/useThoughts';
import { getRepositories } from '@/database';

export default function EditScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateThought } = useThoughts();

  const [content, setContent] = useState<string>('');
  const [richContent, setRichContent] = useState<string | null>(null);
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
          setRichContent(item.rich_content ?? null);
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
      await updateThought(id, content, category, richContent);
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
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.statusError }]}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <WritingEditor
        content={content}
        richContent={richContent}
        status="saved"
        onChangeContent={(plain, rich) => {
          setContent(plain);
          setRichContent(rich);
        }}
        onChangeText={(plain) => setContent(plain)}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        saveButtonLabel="Update thought"
        placeholder="Edit your thought..."
        autoFocus={false}
        footer={
          <View style={[styles.footerWrapper, { borderTopColor: theme.colors.borderLight }]}>
            <Text style={[styles.footerLabel, { color: theme.colors.textMuted }]}>Category</Text>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
  },
  footerWrapper: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 2,
  },
});
