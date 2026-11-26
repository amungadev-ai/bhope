import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { AiAccess } from '@bhope/shared';
import { api } from '../lib/api';
import { useApp } from '../lib/context';
import { navigate } from '../navigation/actions';
import { Body, Button, Icon, Label, Screen, Title, fonts, useUi } from '../components/ui';
export default function AiPlan() {
  const { colors, styles } = useUi();
  const { user, language } = useApp();
  const sw = language === 'sw';
  const [access, setAccess] = useState<AiAccess | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (user) {
        setLoading(true);
        void api<AiAccess>('/ai/access')
          .then((value) => {
            if (active) {
              setAccess(value);
              setError('');
            }
          })
          .catch((failure) => {
            if (active) setError(failure.message);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      }
      return () => {
        active = false;
      };
    }, [user]),
  );
  return (
    <Screen>
      <View style={{ gap: 10 }}>
        <Icon name="sparkles-outline" size={28} color={colors.green} />
        <Title>{sw ? 'Nafasi ya kutafakari zaidi.' : 'A little more room to reflect.'}</Title>
        <Body muted>
          {sw
            ? 'Matumizi 5 ya AI bure mara moja kwa kila akaunti. Kisha KES 150 kwa mwezi.'
            : 'Try AI with 5 free uses once per account. Then KES 150 per month for continued assistance.'}
        </Body>
      </View>
      <View style={styles.card}>
        <Label>{sw ? 'MPANGO WA AI' : 'AI REFLECTION PLAN'}</Label>
        <Text style={{ fontFamily: fonts.serif, color: colors.ink, fontSize: 34 }}>
          KES 150<Text style={{ fontSize: 16 }}> / {sw ? 'mwezi' : 'month'}</Text>
        </Text>
        <Body>
          {sw
            ? 'Muhtasari wa maelezo na maswali ya kutafakari unapochagua.'
            : 'Summaries and reflection questions, when you choose them.'}
        </Body>
        <Body muted>
          {sw
            ? 'Kikomo cha maombi ya kila siku kinatumika.'
            : `Up to ${access?.dailyLimit ?? 10} requests per day. Unsuccessful responses do not use a free credit.`}
        </Body>
      </View>
      {!user ? (
        <Button onPress={() => navigate('Account')}>
          {sw ? 'Ingia kwa matumizi yako 5 bure' : 'Sign in for your 5 free uses'}
        </Button>
      ) : loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : access ? (
        <View style={styles.card}>
          <Label>{sw ? 'MATUMIZI YAKO' : 'YOUR ACCESS'}</Label>
          <Body>
            {access.staff
              ? sw
                ? 'Akaunti ya wahariri'
                : 'Staff access'
              : access.active
                ? `${sw ? 'Inaendelea hadi' : 'Access until'} ${new Date(access.paidUntil!).toLocaleDateString()}`
                : `${access.freeRemaining} ${sw ? 'kati ya matumizi 5 bure yamebaki' : 'of 5 free uses remaining'}`}
          </Body>
          <Body muted>
            {access.dailyRemaining} {sw ? 'maombi yamebaki leo' : 'requests remaining today'}
          </Body>
          {!access.aiEnabled ? (
            <Body muted>
              {sw
                ? 'Huduma ya AI haijawezeshwa bado.'
                : 'AI assistance will be available once the service is connected.'}
            </Body>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Body muted>
        {sw
          ? 'Malipo ya mpango yatawezeshwa hivi karibuni. Hakuna malipo yanayotozwa sasa.'
          : 'Plan checkout is not available yet. No payment or recurring charge is started here.'}
      </Body>
      <Body muted>
        {sw
          ? 'Biblia, tafakari za kila siku na daftari hubaki bure. Michango hainunui mpango wa AI.'
          : 'Daily devotionals, the Bible, and your notebook remain free. Donations do not purchase AI access.'}
      </Body>
    </Screen>
  );
}
