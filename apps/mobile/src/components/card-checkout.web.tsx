import { Body, Button } from './ui';
export function CardCheckout({
  url,
  onFinished,
}: {
  url: string;
  onFinished: () => void;
  onError: () => void;
}) {
  return (
    <>
      <Body>Your card details are entered directly on Paystack’s secure checkout page.</Body>
      <Button
        icon="open-outline"
        onPress={() => {
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        Open secure card checkout
      </Button>
      <Button secondary onPress={onFinished}>
        I’ve finished · check my gift
      </Button>
    </>
  );
}
