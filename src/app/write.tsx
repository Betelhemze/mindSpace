import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { WritingEditor } from '@/components/WritingEditor';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useDraft } from '@/hooks/useDraft';
import { useThoughts } from '@/hooks/useThoughts';

export default function WriteScreen() {
  const { theme } = useTheme();
  const { content, richContent, status, updateContent, clearDraft } = useDraft();
  const { addThought } = useThoughts();
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const created = await addThought(content, category, richContent);
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <WritingEditor
        content={content}
        richContent={richContent}
        status={status}
        onChangeContent={(plain, rich) => updateContent(plain, rich)}
        onChangeText={(plain) => updateContent(plain)}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        saveButtonLabel="Save thought"
        placeholder="What's on your mind?"
        autoFocus
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
