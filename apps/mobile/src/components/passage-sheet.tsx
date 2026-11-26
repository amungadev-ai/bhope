import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { formatReference, type Reference, type Verse } from '@bhope/shared';
import { useApp } from '../lib/context';
import { bible, getPassage } from '../lib/storage';
import { Body, Button, colors, fonts, Sheet } from './ui';
export function PassageSheet({
  reference,
  onClose,
  onInsert,
}: {
  reference: Reference | null;
  onClose: () => void;
  onInsert?: (text: string) => void;
}) {
  const { language, fontSize } = useApp();
  const key = reference
    ? `${language}:${reference.bookId}:${reference.chapter}:${reference.verseStart}:${reference.verseEnd}`
    : '';
  const [result, setResult] = useState<{ key: string; verses: Verse[]; error: string }>({
    key: '',
    verses: [],
    error: '',
  });
  const loading = Boolean(reference) && result.key !== key;
  const { verses, error } = result;
  useEffect(() => {
    if (!reference) return;
    let active = true;
    getPassage(reference, language)
      .then((items) => {
        if (active) setResult({ key, verses: items, error: '' });
      })
      .catch(() => {
        if (active) setResult({ key, verses: [], error: 'This passage could not be loaded.' });
      });
    return () => {
      active = false;
    };
  }, [reference, language, key]);
  return (
    <Sheet
      visible={Boolean(reference)}
      title={reference ? formatReference(reference, language) : ''}
      onClose={onClose}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : error ? (
        <Body>{error}</Body>
      ) : verses.length ? (
        <>
          <View style={{ gap: 14 }}>
            {verses.map((verse) => (
              <Text
                key={verse.verse}
                style={{
                  fontFamily: fonts.serif,
                  fontSize,
                  lineHeight: fontSize * 1.7,
                  color: colors.ink,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.muted }}>
                  {verse.verse}{' '}
                </Text>
                {verse.text}
              </Text>
            ))}
          </View>
          <Body muted>{bible.versions.find((version) => version.id === language)?.name}</Body>
          {onInsert ? (
            <Button
              onPress={() => {
                onInsert(
                  `${formatReference(reference!, language)}\n${verses.map((verse) => `${verse.verse} ${verse.text}`).join('\n')}`,
                );
                onClose();
              }}
              icon="add"
            >
              Insert passage into note
            </Button>
          ) : null}
        </>
      ) : (
        <Body>
          This reference is not available in your current library. The development sample includes
          Psalm 23, John 3:16, and Philippians 4:6–7.
        </Body>
      )}
    </Sheet>
  );
}
