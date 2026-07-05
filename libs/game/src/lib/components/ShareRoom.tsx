import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  rem,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandFacebook,
  IconBrandMessenger,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconBrandX,
  IconCheck,
  IconCopy,
  IconLink,
  IconMail,
  IconShare,
} from '@tabler/icons-react';

interface ShareRoomProps {
  /** Room id used as a fallback / for the "Copy Room ID" affordance. */
  roomId: string;
  /** Fully-qualified invite URL (e.g. https://app/?room=game-123). */
  inviteLink: string;
  /** Name of the person doing the sharing, used to personalise the message. */
  playerName?: string;
}

interface ShareTarget {
  key: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  /** Build the outbound share URL for this target. */
  href: (link: string, text: string) => string;
}

const ICON_SIZE = 22;

// Channels styled with their brand colours, matching how social apps present a
// share sheet. Each builds a standard web-intent / deep-link URL.
const SHARE_TARGETS: ShareTarget[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: <IconBrandWhatsapp size={ICON_SIZE} />,
    href: (link, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
  },
  {
    key: 'messenger',
    label: 'Messenger',
    color: '#0084FF',
    icon: <IconBrandMessenger size={ICON_SIZE} />,
    // Deep-links into the Messenger app on mobile and the web client on desktop.
    href: (link) => `fb-messenger://share/?link=${encodeURIComponent(link)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    color: '#0088CC',
    icon: <IconBrandTelegram size={ICON_SIZE} />,
    href: (link, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'x',
    label: 'X',
    color: '#000000',
    icon: <IconBrandX size={ICON_SIZE} />,
    href: (link, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: <IconBrandFacebook size={ICON_SIZE} />,
    href: (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    key: 'email',
    label: 'Email',
    color: '#6B7280',
    icon: <IconMail size={ICON_SIZE} />,
    href: (link, text) =>
      `mailto:?subject=${encodeURIComponent('Join my Go game')}&body=${encodeURIComponent(`${text}\n\n${link}`)}`,
  },
];

export function ShareRoom({ roomId, inviteLink, playerName }: ShareRoomProps) {
  const [nativeShareAvailable] = useState(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );

  const shareText = useMemo(
    () =>
      playerName
        ? `${playerName} invited you to play Go! Join the game:`
        : `Come play Go with me! Join my game:`,
    [playerName]
  );

  const openShareWindow = (target: ShareTarget) => {
    const url = target.href(inviteLink, shareText);

    // Deep-links (mailto/app schemes) must stay in the same tab to trigger the
    // OS handler; web intents open in a new tab so the game isn't navigated away.
    if (url.startsWith('mailto:') || url.startsWith('fb-messenger:')) {
      window.location.href = url;
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Join my Go game',
        text: shareText,
        url: inviteLink,
      });
    } catch (error) {
      // AbortError fires when the user dismisses the sheet — that's not a failure.
      if ((error as Error)?.name !== 'AbortError') {
        notifications.show({
          title: 'Could not open share sheet',
          message: 'Use one of the options below instead.',
          color: 'red',
        });
      }
    }
  };

  return (
    <Stack gap="sm">
      {/* Read-only link with an inline copy affordance (the social-media pattern). */}
      <div>
        <Text size="xs" c="dimmed" mb={4}>
          Invite link
        </Text>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={inviteLink}
            readOnly
            size="sm"
            style={{ flex: 1 }}
            onFocus={(event) => event.currentTarget.select()}
            styles={{ input: { fontFamily: 'monospace', fontSize: rem(12) } }}
          />
          <CopyButton value={inviteLink} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied!' : 'Copy link'} withArrow>
                <Button
                  size="sm"
                  variant={copied ? 'light' : 'filled'}
                  color={copied ? 'green' : undefined}
                  onClick={copy}
                  leftSection={copied ? <IconCheck size={16} /> : <IconLink size={16} />}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </div>

      {/* Native OS share sheet (mobile + supported desktops) — the fastest path. */}
      {nativeShareAvailable && (
        <Button
          variant="default"
          fullWidth
          leftSection={<IconShare size={16} />}
          onClick={handleNativeShare}
        >
          Share via…
        </Button>
      )}

      {/* Brand-coloured share channels. */}
      <div>
        <Text size="xs" c="dimmed" mb={6}>
          Share on
        </Text>
        <SimpleGrid cols={6} spacing="xs" verticalSpacing="xs">
          {SHARE_TARGETS.map((target) => (
            <Tooltip key={target.key} label={target.label} withArrow>
              <ActionIcon
                aria-label={`Share on ${target.label}`}
                size="xl"
                radius="xl"
                variant="filled"
                styles={{ root: { backgroundColor: target.color, color: '#fff' } }}
                onClick={() => openShareWindow(target)}
              >
                {target.icon}
              </ActionIcon>
            </Tooltip>
          ))}
        </SimpleGrid>
      </div>

      {/* Keep the raw room id available for manual entry / "join by code" flows. */}
      <CopyButton value={roomId} timeout={2000}>
        {({ copied, copy }) => (
          <Button
            size="xs"
            variant="subtle"
            color={copied ? 'green' : 'gray'}
            fullWidth
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={copy}
          >
            {copied ? 'Room ID copied' : `Copy Room ID (${roomId})`}
          </Button>
        )}
      </CopyButton>
    </Stack>
  );
}

export default ShareRoom;
