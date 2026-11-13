import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { WritingEditor } from '@/components/WritingEditor';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useDraft } from '@/hooks/useDraft';
import { useThoughts } from '@/hooks/useThoughts';

export default function WriteScreen() {
  const { content, status, updateContent, clearDraft } = useDraft();
  const { addThought } = useThoughts();
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const created = await addThought(content, category);
      if (created) {
        await clearDraft();
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Save error', err?.message || 'Unable to save thought to the database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <WritingEditor
        content={content}
        status={status}
        onChangeText={updateContent}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        saveButtonLabel="Save thought"
        placeholder="What's on your mind?"
        autoFocus
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
