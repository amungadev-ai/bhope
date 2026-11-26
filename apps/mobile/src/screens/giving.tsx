import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import type { Donation } from '@bhope/shared';
import { api, apiUrl } from '../lib/api';
import { getGivingRecovery, setGivingRecovery, clearGivingRecovery } from '../lib/giving-recovery';
import { useApp } from '../lib/context';
import { navigate } from '../navigation/actions';
import {
  Body,
  Button,
  Empty,
  fonts,
  Icon,
  Input,
  Label,
  Screen,
  Sheet,
  Title,
  useUi,
} from '../components/ui';
import { CardCheckout } from '../components/card-checkout';
type Capabilities = { mpesa: boolean; card: boolean; minimum: number; maximum: number };
type StartedGift = {
  donation: Donation;
  token?: string;
  checkoutUrl: string | null;
  message?: string;
};
const newToken = () => `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '');
export function Giving() {
  const { colors, styles } = useUi();
  const { language, user } = useApp();
  const sw = language === 'sw';
  const [capabilities, setCapabilities] = useState<Capabilities>({
    mpesa: false,
    card: false,
    minimum: 10,
    maximum: 50000,
  });
  const [amount, setAmount] = useState('250');
  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gift, setGift] = useState<StartedGift | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const identity = useRef({ key: Crypto.randomUUID(), token: newToken() });
  useEffect(() => {
    let active = true;
    void getGivingRecovery()
      .then((raw) => {
        if (!raw || !active) return;
        const saved = JSON.parse(raw);
        if (saved.apiUrl !== apiUrl || !saved.identity?.key || !saved.identity?.token) return;
        identity.current = saved.identity;
        setAmount(String(saved.amount));
        setMethod(saved.method === 'card' ? 'card' : 'mpesa');
        if (saved.gift?.donation?.id) setGift(saved.gift);
      })
      .catch(() => {
        if (active)
          setError(
            'Your previous gift could not be restored. Check your payment messages before starting another gift.',
          );
      })
      .finally(() => {
        if (active) setRecoveryReady(true);
      });
    if (apiUrl)
      void api<{ giving: Capabilities }>('/config')
        .then((result) => {
          if (active) setCapabilities(result.giving);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const rememberGift = (result?: StartedGift) =>
    setGivingRecovery(
      JSON.stringify({
        apiUrl,
        identity: identity.current,
        amount: result?.donation.amount ?? Number(amount),
        method: result?.donation.method ?? method,
        gift: result,
      }),
    );
  async function check() {
    if (!gift) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<Donation>(
        `/donations/${gift.donation.id}/refresh${gift.token ? `?token=${gift.token}` : ''}`,
        { method: 'POST', body: '{}' },
      );
      setGift((old) => (old ? { ...old, donation: result } : old));
      await rememberGift({ ...gift, donation: result });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The payment status is unavailable.');
    } finally {
      setBusy(false);
    }
  }
  async function give() {
    if (
      !Number.isInteger(Number(amount)) ||
      Number(amount) < capabilities.minimum ||
      Number(amount) > capabilities.maximum
    ) {
      setError(
        `Choose a whole amount between KES ${capabilities.minimum} and ${capabilities.maximum}.`,
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Persist before making the request so an uncertain response can safely use the same key.
      await rememberGift();
      const result = await api<StartedGift>('/donations', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          method,
          phone: method === 'mpesa' ? phone : undefined,
          email: method === 'card' ? email || user?.email : undefined,
          idempotencyKey: identity.current.key,
          clientToken: identity.current.token,
        }),
      });
      setGift(result);
      await rememberGift(result);
      if (result.checkoutUrl) setCheckout(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'This giving request could not be started.',
      );
    } finally {
      setBusy(false);
    }
  }
  const confirmed = gift?.donation.status === 'success';
  return (
    <Screen>
      <View style={{ gap: 10 }}>
        <Label>{sw ? 'WEMA UNAENDELEA' : 'A LITTLE KINDNESS GOES ON'}</Label>
        <Title>{sw ? 'Saidia mwanga\nuendelee.' : 'Help keep\nthe light shining.'}</Title>
        <Body muted>
          {sw
            ? 'Kila zawadi ni ya hiari. Tumaini linabaki bure.'
            : 'Every gift is optional. Hope stays freely available.'}
        </Body>
      </View>
      <View style={[styles.card, { backgroundColor: colors.ink, borderWidth: 0 }]}>
        <Icon name="heart-outline" size={30} color="#E0D5A9" />
        <Text style={{ fontFamily: fonts.serif, color: '#F9F8E9', fontSize: 27, lineHeight: 38 }}>
          {sw
            ? 'Kwa huduma hii.\nKwa watu wanaohitaji.'
            : 'For this little space.\nFor people who need hope.'}
        </Text>
        <Text style={{ fontFamily: fonts.body, color: '#D0DBCA', fontSize: 13, lineHeight: 23 }}>
          {sw
            ? 'Lengo letu ni kuendeleza jukwaa hili na kusaidia watu wenye uhitaji. Tutashiriki taarifa kuhusu matumizi ya fedha.'
            : 'Our aim is to sustain this platform and support people in need. We will share updates on how funds are used.'}
        </Text>
      </View>
      <View style={{ gap: 14 }}>
        <Label>{sw ? 'CHAGUA ZAWADI YAKO · KES' : 'CHOOSE YOUR GIFT · KES'}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[100, 250, 500, 1000].map((value) => (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => setAmount(String(value))}
              style={[
                styles.chip,
                { flex: 1, justifyContent: 'center', minWidth: 64, paddingVertical: 15 },
                amount === String(value) && { backgroundColor: colors.ink },
              ]}
            >
              <Text style={[styles.chipText, amount === String(value) && { color: '#fff' }]}>
                {value.toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Input
          accessibilityLabel="Donation amount in KES"
          placeholder="Another amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
      </View>
      <Button
        disabled={!recoveryReady}
        icon="heart-outline"
        onPress={() => {
          setSheet(true);
          setError('');
        }}
      >
        {gift
          ? sw
            ? 'Angalia zawadi yako'
            : 'View your latest gift'
          : sw
            ? 'Chagua njia ya kutoa'
            : 'Choose how to give'}
      </Button>
      {!capabilities.mpesa && !capabilities.card ? (
        <Body muted>
          {sw
            ? 'Njia za kutoa zitawezeshwa hivi karibuni.'
            : 'Giving methods will be available here once the ministry’s payment setup is ready.'}
        </Body>
      ) : null}
      {!user ? (
        <View style={styles.card}>
          <Body>
            You can give as a guest. Sign in first if you want this gift included in your account’s
            donation history.
          </Body>
          <Button secondary onPress={() => navigate('Account')}>
            Sign in for giving history
          </Button>
        </View>
      ) : null}
      <Body muted>
        Daily devotionals, Bible reading, and your notebook remain free. Giving does not unlock
        content or features.
      </Body>
      <Sheet
        visible={sheet}
        title={
          confirmed
            ? sw
              ? 'Asante kwa tumaini.'
              : 'Thank you for a little hope.'
            : sw
              ? 'Zawadi yako ya tumaini'
              : 'Your gift of hope'
        }
        onClose={() => {
          setSheet(false);
          setCheckout(false);
        }}
      >
        {gift ? (
          <>
            {confirmed ? (
              <Icon name="checkmark-circle-outline" size={42} color={colors.green} />
            ) : null}
            <Title style={{ fontSize: 30 }}>KES {gift.donation.amount.toLocaleString()}</Title>
            <Body>
              {gift.donation.status === 'success'
                ? 'Your gift has been confirmed. Thank you for helping this ministry grow.'
                : gift.donation.status === 'failed'
                  ? 'This payment was not completed. No successful donation has been recorded.'
                  : gift.donation.status === 'reversed'
                    ? 'The provider reports that this payment was reversed.'
                    : gift.message ||
                      (gift.donation.method === 'mpesa'
                        ? 'Check your phone for the M-Pesa prompt. Your donation remains pending until Safaricom confirms it.'
                        : 'Complete your payment in Paystack’s secure checkout. We will verify it with the provider.')}
            </Body>
            {checkout && gift.checkoutUrl ? (
              <CardCheckout
                url={gift.checkoutUrl}
                onFinished={() => {
                  setCheckout(false);
                  void check();
                }}
                onError={() =>
                  setError(
                    'Checkout could not load. Check the payment status before starting another gift.',
                  )
                }
              />
            ) : null}
            {gift.donation.status === 'pending' ? (
              <>
                {gift.checkoutUrl && !checkout ? (
                  <Button secondary onPress={() => setCheckout(true)}>
                    Resume secure card checkout
                  </Button>
                ) : null}
                <Button secondary busy={busy} onPress={() => void check()} icon="refresh-outline">
                  Check payment status
                </Button>
              </>
            ) : (
              <Button
                secondary
                onPress={() => {
                  void clearGivingRecovery()
                    .then(() => {
                      setGift(null);
                      identity.current = { key: Crypto.randomUUID(), token: newToken() };
                    })
                    .catch(() =>
                      setError('The previous gift could not be cleared. Please try again.'),
                    );
                }}
              >
                Start a new gift
              </Button>
            )}
            <Body muted>Reference: {gift.donation.reference}</Body>
          </>
        ) : (
          <>
            <Title style={{ fontSize: 30 }}>KES {Number(amount || 0).toLocaleString()}</Title>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['mpesa', 'card'] as const).map((value) => (
                <Pressable
                  accessibilityRole="button"
                  key={value}
                  onPress={() => setMethod(value)}
                  style={[
                    styles.chip,
                    { flex: 1, justifyContent: 'center', paddingVertical: 15 },
                    method === value && { backgroundColor: colors.ink },
                  ]}
                >
                  <Icon
                    name={value === 'mpesa' ? 'phone-portrait-outline' : 'card-outline'}
                    color={method === value ? '#fff' : colors.ink}
                    size={18}
                  />
                  <Text style={[styles.chipText, method === value && { color: '#fff' }]}>
                    {value === 'mpesa' ? 'M-Pesa' : 'Card'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {method === 'mpesa' ? (
              <Input
                accessibilityLabel="M-Pesa phone number"
                placeholder="07… or 2547…"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            ) : (
              <Input
                accessibilityLabel="Receipt email"
                placeholder="Email for your receipt"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email || user?.email || ''}
                onChangeText={setEmail}
              />
            )}
            <Body muted>
              {method === 'mpesa'
                ? 'Safaricom will ask you to confirm the amount on your phone. Your M-Pesa PIN stays with Safaricom.'
                : 'Enter card details directly in Paystack’s hosted checkout. Beacon of Hope does not receive your card number or security code.'}
            </Body>
            {!capabilities[method] ? (
              <Body muted>This payment method is not available yet.</Body>
            ) : null}
            <Button disabled={!capabilities[method]} busy={busy} onPress={() => void give()}>
              {method === 'mpesa' ? 'Request M-Pesa prompt' : 'Continue to secure card checkout'}
            </Button>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Sheet>
    </Screen>
  );
}
export function DonationHistory() {
  const { colors, styles } = useUi();
  const { user, language } = useApp();
  const sw = language === 'sw';
  const [items, setItems] = useState<Donation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      api<Donation[]>('/donations/history')
        .then((result) => {
          if (active) {
            setItems(result);
            setError('');
          }
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user]),
  );
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>{sw ? 'WEMA WAKO UNAHESABIWA' : 'A RECORD OF YOUR KINDNESS'}</Label>
        <Title>{sw ? 'Safari yako ya kutoa.' : 'Your giving journey.'}</Title>
        <Body muted>
          {sw
            ? 'Zawadi zilizopewa uthibitisho huonyeshwa kando na zinazosubiri.'
            : 'Confirmed gifts are shown separately from payments still in progress.'}
        </Body>
      </View>
      {!user ? (
        <>
          <Empty icon="receipt-outline" title="Your giving, together in one place">
            Sign in to view gifts linked to your account. You can still give without creating an
            account.
          </Empty>
          <Button onPress={() => navigate('Account')}>Sign in / Create account</Button>
        </>
      ) : loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 25, color: colors.ink }}>
                KES {item.amount.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.medium,
                  color: item.status === 'success' ? colors.green : colors.muted,
                  fontSize: 12,
                }}
              >
                {item.status === 'success'
                  ? 'Confirmed'
                  : item.status === 'pending'
                    ? 'Pending'
                    : item.status === 'reversed'
                      ? 'Reversed'
                      : 'Not completed'}
              </Text>
            </View>
            <Body muted>
              {item.method === 'mpesa' ? 'M-Pesa' : 'Card'} ·{' '}
              {new Date(item.createdAt).toLocaleDateString()}
            </Body>
            <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
              {item.reference}
            </Text>
          </View>
        ))
      ) : (
        <Empty icon="heart-outline" title="No gifts recorded yet">
          Your account-linked giving history will appear here. Gifts made as a guest are not
          automatically linked.
        </Empty>
      )}
    </Screen>
  );
}
